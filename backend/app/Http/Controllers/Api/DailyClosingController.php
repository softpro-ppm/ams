<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Account;
use App\Models\DailyClosing;
use App\Models\UserAccountPermission;
use App\Services\AccountLedgerService;
use App\Services\AuditLogger;
use App\Services\TransactionClosingLock;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class DailyClosingController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $q = DailyClosing::query()
            ->with(['account', 'submittedBy', 'approvedBy'])
            ->when($request->filled('date'), fn ($qq) => $qq->whereDate('closing_date', $request->string('date')))
            ->when($request->filled('account_id'), fn ($qq) => $qq->where('account_id', $request->integer('account_id')))
            ->orderByDesc('closing_date');

        if (! $request->user()->isAdmin()) {
            $ids = UserAccountPermission::query()
                ->where('user_id', $request->user()->id)
                ->where('can_view', true)
                ->pluck('account_id');
            $q->whereIn('account_id', $ids);
        }

        return response()->json(['data' => $q->limit(200)->get()]);
    }

    public function summary(Request $request, AccountLedgerService $ledger): JsonResponse
    {
        $request->validate(['date' => ['required', 'date', 'date_format:Y-m-d']]);
        $date = $request->string('date')->toString();
        $bookUserId = $request->user()->bookOwnerId();

        $accounts = Account::query()->active()->where('is_reconcilable', true)->orderBy('sort_order')->get();
        if (! $request->user()->isAdmin()) {
            $ids = UserAccountPermission::query()
                ->where('user_id', $request->user()->id)
                ->where('can_view', true)
                ->pluck('account_id');
            $accounts = $accounts->whereIn('id', $ids->all());
        }

        $rows = [];
        foreach ($accounts as $account) {
            $system = $ledger->balanceAsOf($account, $date, $bookUserId);
            $closing = DailyClosing::query()
                ->where('account_id', $account->id)
                ->whereDate('closing_date', $date)
                ->first();

            $rows[] = [
                'account' => ['id' => $account->id, 'name' => $account->name],
                'system_balance' => $system,
                'actual_balance' => $closing ? (float) $closing->actual_balance : null,
                'variance' => $closing ? (float) $closing->variance : null,
                'status' => $closing?->status,
                'closing_id' => $closing?->id,
            ];
        }

        return response()->json(['date' => $date, 'accounts' => $rows]);
    }

    public function store(Request $request, AccountLedgerService $ledger): JsonResponse
    {
        $validated = $request->validate([
            'closing_date' => ['required', 'date', 'date_format:Y-m-d'],
            'account_id' => ['required', 'integer', 'exists:accounts,id'],
            'actual_balance' => ['required', 'numeric'],
            'notes' => ['nullable', 'string', 'max:2000'],
        ]);

        $account = Account::whereKey($validated['account_id'])->active()->firstOrFail();
        abort_unless($account->is_reconcilable, 422, 'This account does not require daily closing.');

        $this->ensureClosingAccess($request, $account);

        $bookUserId = $request->user()->bookOwnerId();
        $system = $ledger->balanceAsOf($account, $validated['closing_date'], $bookUserId);
        $actual = (float) $validated['actual_balance'];
        $variance = round($actual - $system, 2);
        $status = abs($variance) < 0.005 ? DailyClosing::STATUS_MATCHED : DailyClosing::STATUS_MISMATCH;

        $closing = DailyClosing::updateOrCreate(
            [
                'account_id' => $account->id,
                'closing_date' => $validated['closing_date'],
            ],
            [
                'system_closing_balance' => $system,
                'actual_balance' => $actual,
                'variance' => $variance,
                'notes' => $validated['notes'] ?? null,
                'submitted_by' => $request->user()->id,
                'status' => $status,
                'approved_by' => null,
            ]
        );

        AuditLogger::log('submit_closing', DailyClosing::class, $closing->id, null, $closing->toArray(), null, $request->user()->id);

        return response()->json(['data' => $closing->load('account')], 201);
    }

    public function approve(Request $request, DailyClosing $dailyClosing, TransactionClosingLock $lock): JsonResponse
    {
        abort_unless($request->user()->isAdmin(), 403);

        $dailyClosing->update([
            'status' => DailyClosing::STATUS_APPROVED,
            'approved_by' => $request->user()->id,
        ]);

        $lock->lockTransactionsForApprovedClosing($dailyClosing);

        AuditLogger::log('approve_closing', DailyClosing::class, $dailyClosing->id, null, $dailyClosing->toArray(), null, $request->user()->id);

        return response()->json(['data' => $dailyClosing->fresh()]);
    }

    public function reject(Request $request, DailyClosing $dailyClosing): JsonResponse
    {
        abort_unless($request->user()->isAdmin(), 403);

        $dailyClosing->update([
            'status' => DailyClosing::STATUS_REJECTED,
            'approved_by' => $request->user()->id,
        ]);

        AuditLogger::log('reject_closing', DailyClosing::class, $dailyClosing->id, null, $dailyClosing->toArray(), null, $request->user()->id);

        return response()->json(['data' => $dailyClosing->fresh()]);
    }

    public function reopen(Request $request, DailyClosing $dailyClosing, TransactionClosingLock $lock): JsonResponse
    {
        abort_unless($request->user()->isAdmin(), 403);

        $request->validate([
            'remarks' => ['nullable', 'string', 'max:2000'],
        ]);

        $lock->unlockTransactionsForReopenedClosing($dailyClosing);

        $dailyClosing->update([
            'status' => DailyClosing::STATUS_PENDING,
            'approved_by' => null,
        ]);

        AuditLogger::log('reopen_closing', DailyClosing::class, $dailyClosing->id, null, $dailyClosing->toArray(), $request->input('remarks'), $request->user()->id);

        return response()->json(['data' => $dailyClosing->fresh()]);
    }

    private function ensureClosingAccess(Request $request, Account $account): void
    {
        if ($request->user()->isAdmin()) {
            return;
        }

        $perm = UserAccountPermission::query()
            ->where('user_id', $request->user()->id)
            ->where('account_id', $account->id)
            ->first();

        abort_unless($perm && $perm->can_create && $perm->can_view, 403, 'Cannot submit closing for this account.');
    }
}
