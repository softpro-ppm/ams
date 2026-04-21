<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\LedgerClosure;
use App\Models\LedgerEntry;
use App\Models\User;
use App\Services\LedgerApprovalOtpService;
use App\Services\LedgerCsvImportParser;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Response;
use Illuminate\Validation\Rule;
use Symfony\Component\HttpFoundation\StreamedResponse;

class LedgerController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $userId = $request->user()->bookOwnerId();

        $dir = $request->query('sort') === 'asc' ? 'asc' : 'desc';

        $query = LedgerEntry::query()
            ->where('user_id', $userId)
            ->with(['enteredBy:id,name', 'approvedBy:id,name'])
            ->when($request->filled('ledger'), fn ($q) => $q->where('ledger', $request->string('ledger')))
            ->when($request->filled('status'), fn ($q) => $q->where('status', $request->string('status')))
            ->when($request->filled('date_from'), fn ($q) => $q->whereDate('entry_date', '>=', $request->date('date_from')))
            ->when($request->filled('date_to'), fn ($q) => $q->whereDate('entry_date', '<=', $request->date('date_to')))
            ->orderBy('entry_date', $dir)
            ->orderBy('id', $dir);

        $data = $query->get()->map(function (LedgerEntry $e) {
            $arr = $e->toArray();
            $arr['entered_by_name'] = $e->enteredBy?->name;
            $arr['approved_by_name'] = $e->approvedBy?->name;

            return $arr;
        });

        return response()->json([
            'data' => $data,
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'entry_date' => ['required', 'date'],
            'ledger' => ['required', 'in:cash,bank'],
            'direction' => ['required', 'in:received,paid'],
            'amount' => ['required', 'numeric', 'min:0.01'],
            'particulars' => ['required', 'string', 'max:255'],
            'note' => ['required', 'string', 'max:255'],
        ]);

        $bookId = $request->user()->bookOwnerId();
        $this->assertEntryDateNotLocked($bookId, $validated['entry_date']);

        $entry = LedgerEntry::create([
            'user_id' => $bookId,
            'entered_by' => $request->user()->id,
            'entry_date' => $validated['entry_date'],
            'ledger' => $validated['ledger'],
            'direction' => $validated['direction'],
            'amount' => $validated['amount'],
            'particulars' => $validated['particulars'],
            'note' => $validated['note'],
            'status' => LedgerEntry::STATUS_PENDING,
        ]);

        $entry->load(['enteredBy:id,name', 'approvedBy:id,name']);

        return response()->json([
            'data' => array_merge($entry->toArray(), [
                'entered_by_name' => $entry->enteredBy?->name,
                'approved_by_name' => $entry->approvedBy?->name,
            ]),
        ], 201);
    }

    public function update(Request $request, LedgerEntry $ledgerEntry): JsonResponse
    {
        $this->assertEntryInUserBook($request, $ledgerEntry);
        $this->assertUserCanModifyLedgerEntry($request->user(), $ledgerEntry);

        $validated = $request->validate([
            'entry_date' => ['required', 'date'],
            'ledger' => ['required', 'in:cash,bank'],
            'direction' => ['required', 'in:received,paid'],
            'amount' => ['required', 'numeric', 'min:0.01'],
            'particulars' => ['required', 'string', 'max:255'],
            'note' => ['required', 'string', 'max:255'],
        ]);

        $bookId = $request->user()->bookOwnerId();
        $this->assertEntryDateNotLocked($bookId, $validated['entry_date']);

        $ledgerEntry->update([
            'entry_date' => $validated['entry_date'],
            'ledger' => $validated['ledger'],
            'direction' => $validated['direction'],
            'amount' => $validated['amount'],
            'particulars' => $validated['particulars'],
            'note' => $validated['note'],
        ]);

        $ledgerEntry->refresh();
        $ledgerEntry->load(['enteredBy:id,name', 'approvedBy:id,name']);

        return response()->json([
            'data' => array_merge($ledgerEntry->toArray(), [
                'entered_by_name' => $ledgerEntry->enteredBy?->name,
                'approved_by_name' => $ledgerEntry->approvedBy?->name,
            ]),
        ]);
    }

    public function destroy(Request $request, LedgerEntry $ledgerEntry): JsonResponse
    {
        $this->assertEntryInUserBook($request, $ledgerEntry);
        $this->assertUserCanModifyLedgerEntry($request->user(), $ledgerEntry);

        $ledgerEntry->delete();

        return response()->json(['message' => 'Entry deleted.']);
    }

    /**
     * Bulk import pending ledger lines from CSV (same rules as single create; admin approves in UI).
     */
    public function importCsv(Request $request): JsonResponse
    {
        $request->validate([
            'file' => ['required', 'file', 'max:5120'],
        ]);

        $uploaded = $request->file('file');
        $path = $uploaded?->getRealPath();
        if (! is_string($path) || $path === '' || ! is_file($path)) {
            return response()->json([
                'message' => 'Upload could not be read.',
                'errors' => [],
            ], 422);
        }

        $parser = new LedgerCsvImportParser;
        $result = $parser->parse($path);

        if ($result['header_error'] !== null) {
            return response()->json([
                'message' => $result['header_error'],
                'errors' => [],
            ], 422);
        }

        if (count($result['rows']) > 500) {
            return response()->json([
                'message' => 'Too many data rows (maximum 500 per upload). Split into smaller files.',
                'errors' => [],
            ], 422);
        }

        if ($result['rows'] === [] && $result['errors'] === []) {
            return response()->json([
                'message' => 'No data rows found after the header row.',
                'errors' => [],
            ], 422);
        }

        $bookId = $request->user()->bookOwnerId();
        $enteredBy = $request->user()->id;

        $errors = $result['errors'];
        $latest = $this->latestClosureRow($bookId);
        $closedThrough = $latest?->closed_through_date?->toDateString();

        foreach ($result['rows'] as $r) {
            if ($closedThrough && Carbon::parse($r['entry_date'])->lte(Carbon::parse($closedThrough))) {
                $errors[] = [
                    'line' => $r['line'],
                    'message' => 'Cannot add entries on or before '.$closedThrough.' (books closed through that date).',
                ];
            }
        }

        if ($errors !== []) {
            return response()->json([
                'message' => 'Import validation failed. Fix the CSV and try again.',
                'errors' => $errors,
            ], 422);
        }

        $imported = 0;
        DB::transaction(function () use ($result, $bookId, $enteredBy, &$imported) {
            foreach ($result['rows'] as $r) {
                LedgerEntry::create([
                    'user_id' => $bookId,
                    'entered_by' => $enteredBy,
                    'approved_by' => null,
                    'entry_date' => $r['entry_date'],
                    'ledger' => $r['ledger'],
                    'direction' => $r['direction'],
                    'amount' => $r['amount'],
                    'particulars' => $r['particulars'],
                    'note' => $r['note'],
                    'status' => LedgerEntry::STATUS_PENDING,
                    'approved_at' => null,
                ]);
                $imported++;
            }
        });

        $msg = $imported === 1
            ? '1 pending entry imported. Admin can approve it from Ledgers.'
            : "{$imported} pending entries imported. Admin can approve them from Ledgers.";

        return response()->json([
            'imported' => $imported,
            'message' => $msg,
        ], 201);
    }

    public function sendApprovalOtp(Request $request): JsonResponse
    {
        abort_unless($request->user()->isAdmin(), 403);

        $svc = app(LedgerApprovalOtpService::class);
        if (! $svc->isEnabled()) {
            return response()->json([
                'message' => 'Ledger approval WhatsApp OTP is not enabled. Set LEDGER_APPROVAL_OTP_ENABLED and LEDGER_APPROVAL_OTP_WEBHOOK_URL on the server.',
            ], 422);
        }

        $svc->send($request->user());

        return response()->json([
            'message' => 'OTP sent to your WhatsApp.',
            'expires_in' => (int) config('ledger_approval_otp.ttl_seconds', 300),
        ]);
    }

    public function approve(Request $request, LedgerEntry $ledgerEntry): JsonResponse
    {
        $this->assertAdminCanApproveEntry($request, $ledgerEntry);
        $this->validateLedgerApprovalOtpPayload($request);
        $this->assertLedgerApprovalOtp($request);
        $this->applyApproval($request->user(), $ledgerEntry);

        return response()->json(['data' => $ledgerEntry->fresh()]);
    }

    public function approveBulk(Request $request): JsonResponse
    {
        abort_unless($request->user()->isAdmin(), 403);

        $otpEnabled = app(LedgerApprovalOtpService::class)->isEnabled();
        $digits = (int) config('ledger_approval_otp.digits', 6);

        $validated = $request->validate([
            'ids' => ['required', 'array', 'min:1'],
            'ids.*' => ['integer', 'distinct', 'exists:ledger_entries,id'],
            'otp' => [
                Rule::requiredIf($otpEnabled),
                'nullable',
                'string',
                'size:'.$digits,
            ],
        ]);

        $this->assertLedgerApprovalOtp($request);

        $ids = $validated['ids'];

        $approved = DB::transaction(function () use ($request, $ids) {
            $entries = LedgerEntry::query()
                ->whereIn('id', $ids)
                ->where('status', LedgerEntry::STATUS_PENDING)
                ->lockForUpdate()
                ->orderBy('id')
                ->get();

            if ($entries->count() !== count($ids)) {
                abort(422, 'One or more entries are missing or already processed.');
            }

            foreach ($entries as $ledgerEntry) {
                $this->assertAdminCanApproveEntry($request, $ledgerEntry);
            }

            foreach ($entries as $ledgerEntry) {
                $this->applyApproval($request->user(), $ledgerEntry);
            }

            return $entries->pluck('id')->all();
        });

        $fresh = LedgerEntry::query()->whereIn('id', $approved)->get();

        return response()->json([
            'approved' => count($approved),
            'data' => $fresh,
        ]);
    }

    public function statement(Request $request): JsonResponse
    {
        return response()->json($this->buildStatementPayload($request));
    }

    public function statementExportCsv(Request $request): StreamedResponse
    {
        $payload = $this->buildStatementPayload($request);

        $headers = [
            'Content-Type' => 'text/csv; charset=UTF-8',
            'Content-Disposition' => 'attachment; filename="ledger-statement-'.$payload['ledger'].'.csv"',
        ];

        $callback = function () use ($payload) {
            $handle = fopen('php://output', 'w');
            fprintf($handle, chr(0xEF).chr(0xBB).chr(0xBF));
            fputcsv($handle, ['Ledger statement', $payload['ledger'], $payload['date_from'].' → '.$payload['date_to']]);
            fputcsv($handle, ['Opening', number_format($payload['opening_balance'], 2, '.', '')]);
            fputcsv($handle, ['Closing', number_format($payload['closing_balance'], 2, '.', '')]);
            fputcsv($handle, []);
            fputcsv($handle, ['Sl.', 'Date', 'Status', 'Received', 'Paid', 'Particulars', 'Description', 'Balance', 'Entered by']);

            $sn = 0;
            foreach ($payload['data'] as $row) {
                $sn++;
                fputcsv($handle, [
                    $sn,
                    $row['entry_date'] ?? '',
                    'approved',
                    number_format($row['received_amount'] ?? 0, 2, '.', ''),
                    number_format($row['paid_amount'] ?? 0, 2, '.', ''),
                    $row['particulars'] ?? '',
                    $row['note'] ?? '',
                    number_format($row['balance_after'] ?? 0, 2, '.', ''),
                    $row['entered_by_name'] ?? '',
                ]);
            }

            if (! empty($payload['pending_in_period'])) {
                fputcsv($handle, []);
                fputcsv($handle, ['Pending in period (not in running balance)']);
                fputcsv($handle, ['Sl.', 'Date', 'Status', 'Received', 'Paid', 'Particulars', 'Description', 'Entered by']);
                $pn = 0;
                foreach ($payload['pending_in_period'] as $row) {
                    $pn++;
                    fputcsv($handle, [
                        $pn,
                        $row['entry_date'] ?? '',
                        'pending',
                        number_format($row['received_amount'] ?? 0, 2, '.', ''),
                        number_format($row['paid_amount'] ?? 0, 2, '.', ''),
                        $row['particulars'] ?? '',
                        $row['note'] ?? '',
                        $row['entered_by_name'] ?? '',
                    ]);
                }
            }

            fclose($handle);
        };

        return Response::stream($callback, 200, $headers);
    }

    public function statementExportPdf(Request $request)
    {
        $payload = $this->buildStatementPayload($request);

        $pdf = Pdf::loadView('ledgers.statement-pdf', ['payload' => $payload])
            ->setPaper('a4', 'landscape');

        return $pdf->download('ledger-statement-'.$payload['ledger'].'.pdf');
    }

    public function closureStatus(Request $request): JsonResponse
    {
        $bookId = $request->user()->bookOwnerId();
        $latest = $this->latestClosureRow($bookId);

        return response()->json([
            'closed_through_date' => $latest?->closed_through_date?->toDateString(),
            'cash_balance_snapshot' => $latest ? (float) $latest->cash_balance_snapshot : null,
            'bank_balance_snapshot' => $latest ? (float) $latest->bank_balance_snapshot : null,
            'closure_id' => $latest?->id,
        ]);
    }

    public function closures(Request $request): JsonResponse
    {
        $bookId = $request->user()->bookOwnerId();
        $rows = LedgerClosure::query()
            ->where('user_id', $bookId)
            ->with('closedByUser:id,name')
            ->orderByDesc('closed_through_date')
            ->orderByDesc('id')
            ->get()
            ->map(fn (LedgerClosure $c) => [
                'id' => $c->id,
                'closed_through_date' => $c->closed_through_date->toDateString(),
                'cash_balance_snapshot' => (float) $c->cash_balance_snapshot,
                'bank_balance_snapshot' => (float) $c->bank_balance_snapshot,
                'notes' => $c->notes,
                'closed_by_name' => $c->closedByUser?->name,
                'created_at' => $c->created_at?->toIso8601String(),
            ]);

        return response()->json(['data' => $rows]);
    }

    public function closeStore(Request $request): JsonResponse
    {
        abort_unless($request->user()->isAdmin(), 403);

        $validated = $request->validate([
            'closed_through_date' => ['required', 'date'],
            'notes' => ['nullable', 'string', 'max:2000'],
        ]);

        $bookId = $request->user()->bookOwnerId();
        $closeDate = Carbon::parse($validated['closed_through_date'])->toDateString();

        $latest = $this->latestClosureRow($bookId);
        if ($latest && Carbon::parse($closeDate)->lte($latest->closed_through_date)) {
            abort(422, 'Books are already closed through '.$latest->closed_through_date->toDateString().'. Choose a later date or remove the latest closure to reopen.');
        }

        $cash = $this->approvedLedgerBalance($bookId, LedgerEntry::LEDGER_CASH, $closeDate);
        $bank = $this->approvedLedgerBalance($bookId, LedgerEntry::LEDGER_BANK, $closeDate);

        $closure = LedgerClosure::create([
            'user_id' => $bookId,
            'closed_through_date' => $closeDate,
            'cash_balance_snapshot' => $cash,
            'bank_balance_snapshot' => $bank,
            'closed_by' => $request->user()->id,
            'notes' => $validated['notes'] ?? null,
        ]);

        return response()->json([
            'data' => [
                'id' => $closure->id,
                'closed_through_date' => $closure->closed_through_date->toDateString(),
                'cash_balance_snapshot' => (float) $closure->cash_balance_snapshot,
                'bank_balance_snapshot' => (float) $closure->bank_balance_snapshot,
            ],
        ], 201);
    }

    public function closeDestroy(Request $request, LedgerClosure $ledgerClosure): JsonResponse
    {
        abort_unless($request->user()->isAdmin(), 403);

        $bookId = $request->user()->bookOwnerId();
        abort_unless($ledgerClosure->user_id === $bookId, 403);

        $latest = LedgerClosure::query()
            ->where('user_id', $bookId)
            ->orderByDesc('closed_through_date')
            ->orderByDesc('id')
            ->first();

        abort_unless($latest && $latest->id === $ledgerClosure->id, 422, 'Only the most recent closure can be removed to reopen the book.');

        $ledgerClosure->delete();

        return response()->json(['message' => 'Closure removed. You can post entries after the previous close date again.']);
    }

    private function buildStatementPayload(Request $request): array
    {
        $validated = $request->validate([
            'ledger' => ['required', 'in:cash,bank'],
            'date_from' => ['required', 'date'],
            'date_to' => ['required', 'date', 'after_or_equal:date_from'],
            'include_pending' => ['sometimes', 'boolean'],
        ]);

        $includePending = $request->boolean('include_pending');

        $userId = $request->user()->bookOwnerId();
        $ledger = $validated['ledger'];
        $from = $validated['date_from'];
        $to = $validated['date_to'];

        $opening = $this->sumApprovedBeforeDate($userId, $ledger, $from);

        $rows = LedgerEntry::query()
            ->where('user_id', $userId)
            ->where('status', LedgerEntry::STATUS_APPROVED)
            ->where('ledger', $ledger)
            ->whereDate('entry_date', '>=', $from)
            ->whereDate('entry_date', '<=', $to)
            ->orderBy('entry_date')
            ->orderBy('id')
            ->with(['enteredBy:id,name', 'approvedBy:id,name'])
            ->get();

        $balance = $opening;
        $out = [];
        foreach ($rows as $r) {
            $amt = (float) $r->amount;
            $received = $r->direction === LedgerEntry::DIR_RECEIVED ? $amt : 0.0;
            $paid = $r->direction === LedgerEntry::DIR_PAID ? $amt : 0.0;
            $balance += $r->direction === LedgerEntry::DIR_RECEIVED ? $amt : -$amt;
            $out[] = array_merge($r->toArray(), [
                'balance_after' => round($balance, 2),
                'received_amount' => round($received, 2),
                'paid_amount' => round($paid, 2),
                'entered_by_name' => $r->enteredBy?->name,
                'approved_by_name' => $r->approvedBy?->name,
            ]);
        }

        $pendingOut = [];
        if ($includePending) {
            $pending = LedgerEntry::query()
                ->where('user_id', $userId)
                ->where('status', LedgerEntry::STATUS_PENDING)
                ->where('ledger', $ledger)
                ->whereDate('entry_date', '>=', $from)
                ->whereDate('entry_date', '<=', $to)
                ->orderBy('entry_date')
                ->orderBy('id')
                ->with(['enteredBy:id,name', 'approvedBy:id,name'])
                ->get();

            foreach ($pending as $r) {
                $amt = (float) $r->amount;
                $pendingOut[] = array_merge($r->toArray(), [
                    'received_amount' => round($r->direction === LedgerEntry::DIR_RECEIVED ? $amt : 0, 2),
                    'paid_amount' => round($r->direction === LedgerEntry::DIR_PAID ? $amt : 0, 2),
                    'entered_by_name' => $r->enteredBy?->name,
                    'approved_by_name' => $r->approvedBy?->name,
                ]);
            }
        }

        return [
            'ledger' => $ledger,
            'date_from' => $from,
            'date_to' => $to,
            'include_pending' => $includePending,
            'opening_balance' => round($opening, 2),
            'closing_balance' => round($balance, 2),
            'data' => $out,
            'pending_in_period' => $pendingOut,
        ];
    }

    private function sumApprovedBeforeDate(int $userId, string $ledger, string $beforeDate): float
    {
        $sum = 0.0;
        $q = LedgerEntry::query()
            ->where('user_id', $userId)
            ->where('status', LedgerEntry::STATUS_APPROVED)
            ->where('ledger', $ledger)
            ->whereDate('entry_date', '<', $beforeDate)
            ->orderBy('entry_date')
            ->orderBy('id');

        foreach ($q->get(['direction', 'amount']) as $r) {
            $amt = (float) $r->amount;
            $sum += $r->direction === LedgerEntry::DIR_RECEIVED ? $amt : -$amt;
        }

        return $sum;
    }

    private function approvedLedgerBalance(int $bookUserId, string $ledger, string $asOfDate): float
    {
        $sum = 0.0;
        $rows = LedgerEntry::query()
            ->where('user_id', $bookUserId)
            ->where('status', LedgerEntry::STATUS_APPROVED)
            ->where('ledger', $ledger)
            ->whereDate('entry_date', '<=', $asOfDate)
            ->get(['direction', 'amount']);

        foreach ($rows as $r) {
            $amt = (float) $r->amount;
            $sum += $r->direction === LedgerEntry::DIR_RECEIVED ? $amt : -$amt;
        }

        return round($sum, 2);
    }

    private function latestClosureRow(int $bookUserId): ?LedgerClosure
    {
        return LedgerClosure::query()
            ->where('user_id', $bookUserId)
            ->orderByDesc('closed_through_date')
            ->orderByDesc('id')
            ->first();
    }

    private function validateLedgerApprovalOtpPayload(Request $request): void
    {
        $enabled = app(LedgerApprovalOtpService::class)->isEnabled();
        $digits = (int) config('ledger_approval_otp.digits', 6);
        $request->validate([
            'otp' => [
                Rule::requiredIf($enabled),
                'nullable',
                'string',
                'size:'.$digits,
            ],
        ]);
    }

    private function assertLedgerApprovalOtp(Request $request): void
    {
        $svc = app(LedgerApprovalOtpService::class);
        if (! $svc->isEnabled()) {
            return;
        }
        $otp = (string) $request->input('otp', '');
        abort_unless($svc->verifyAndConsume($request->user(), $otp), 422, 'Invalid or expired OTP. Request a new code.');
    }

    private function assertEntryDateNotLocked(int $bookUserId, string $entryDate): void
    {
        $latest = $this->latestClosureRow($bookUserId);
        if (! $latest) {
            return;
        }

        if (Carbon::parse($entryDate)->lte(Carbon::parse($latest->closed_through_date))) {
            abort(422, 'Cannot add entries on or before '.$latest->closed_through_date->toDateString().' (books closed through that date).');
        }
    }

    private function assertAdminCanApproveEntry(Request $request, LedgerEntry $ledgerEntry): void
    {
        abort_unless($request->user()->isAdmin(), 403);

        $adminBookId = $request->user()->bookOwnerId();
        $entryBookId = $this->ledgerEntryBookId($ledgerEntry);
        abort_unless($entryBookId === $adminBookId, 403, 'Entry does not belong to this account.');

        abort_if($ledgerEntry->status !== LedgerEntry::STATUS_PENDING, 422, 'Only pending entries can be approved.');
    }

    private function applyApproval(User $user, LedgerEntry $ledgerEntry): void
    {
        $adminBookId = $user->bookOwnerId();
        $ledgerEntry->update([
            'user_id' => $adminBookId,
            'status' => LedgerEntry::STATUS_APPROVED,
            'approved_by' => $user->id,
            'approved_at' => now(),
        ]);
    }

    private function ledgerEntryBookId(LedgerEntry $entry): int
    {
        $owner = User::find($entry->user_id);
        if ($owner) {
            return $owner->bookOwnerId();
        }
        if ($entry->entered_by) {
            $enteredBy = User::find($entry->entered_by);

            return $enteredBy ? $enteredBy->bookOwnerId() : (int) $entry->entered_by;
        }

        return (int) $entry->user_id;
    }

    public function summary(Request $request): JsonResponse
    {
        $userId = $request->user()->bookOwnerId();
        $date = $request->query('date') ? Carbon::parse($request->query('date'))->toDateString() : now()->toDateString();

        $cashApproved = $this->approvedLedgerBalance($userId, LedgerEntry::LEDGER_CASH, $date);
        $bankApproved = $this->approvedLedgerBalance($userId, LedgerEntry::LEDGER_BANK, $date);
        $cashRealtime = round($cashApproved + $this->pendingImpactOnLedger($userId, LedgerEntry::LEDGER_CASH, $date), 2);
        $bankRealtime = round($bankApproved + $this->pendingImpactOnLedger($userId, LedgerEntry::LEDGER_BANK, $date), 2);

        return response()->json([
            'date' => $date,
            'cash_balance' => $cashApproved,
            'bank_balance' => $bankApproved,
            'cash_balance_realtime' => $cashRealtime,
            'bank_balance_realtime' => $bankRealtime,
            'total_balance_approved' => round($cashApproved + $bankApproved, 2),
            'total_balance_realtime' => round($cashRealtime + $bankRealtime, 2),
            'pending_count' => LedgerEntry::query()->where('user_id', $userId)->where('status', LedgerEntry::STATUS_PENDING)->count(),
        ]);
    }

    private function pendingImpactOnLedger(int $bookUserId, string $ledger, string $asOfDate): float
    {
        $sum = 0.0;
        $rows = LedgerEntry::query()
            ->where('user_id', $bookUserId)
            ->where('status', LedgerEntry::STATUS_PENDING)
            ->where('ledger', $ledger)
            ->whereDate('entry_date', '<=', $asOfDate)
            ->get(['direction', 'amount']);

        foreach ($rows as $r) {
            $amt = (float) $r->amount;
            $sum += $r->direction === LedgerEntry::DIR_RECEIVED ? $amt : -$amt;
        }

        return $sum;
    }

    private function assertEntryInUserBook(Request $request, LedgerEntry $ledgerEntry): void
    {
        abort_unless($this->ledgerEntryBookId($ledgerEntry) === $request->user()->bookOwnerId(), 403, 'Entry not in this account.');
    }

    private function assertUserCanModifyLedgerEntry(User $user, LedgerEntry $entry): void
    {
        if ($user->isAdmin()) {
            return;
        }

        abort_unless($entry->status === LedgerEntry::STATUS_PENDING, 403, 'Only pending entries can be changed by reception.');
        abort_unless((int) $entry->entered_by === (int) $user->id, 403, 'You can only change lines you created.');
    }
}
