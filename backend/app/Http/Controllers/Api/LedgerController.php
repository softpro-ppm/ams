<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\LedgerEntry;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;

class LedgerController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $userId = $request->user()->id;

        $query = LedgerEntry::query()
            ->where('user_id', $userId)
            ->when($request->filled('ledger'), fn ($q) => $q->where('ledger', $request->string('ledger')))
            ->when($request->filled('status'), fn ($q) => $q->where('status', $request->string('status')))
            ->when($request->filled('date_from'), fn ($q) => $q->whereDate('entry_date', '>=', $request->date('date_from')))
            ->when($request->filled('date_to'), fn ($q) => $q->whereDate('entry_date', '<=', $request->date('date_to')))
            ->orderByDesc('entry_date')
            ->orderByDesc('id');

        return response()->json([
            'data' => $query->get(),
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'entry_date' => ['required', 'date'],
            'ledger' => ['required', 'in:cash,bank'],
            'direction' => ['required', 'in:received,paid'],
            'amount' => ['required', 'numeric', 'min:0.01'],
            'note' => ['nullable', 'string', 'max:255'],
        ]);

        $entry = LedgerEntry::create([
            'user_id' => $request->user()->id,
            'entered_by' => $request->user()->id,
            'entry_date' => $validated['entry_date'],
            'ledger' => $validated['ledger'],
            'direction' => $validated['direction'],
            'amount' => $validated['amount'],
            'note' => $validated['note'] ?? null,
            'status' => LedgerEntry::STATUS_PENDING,
        ]);

        return response()->json(['data' => $entry], 201);
    }

    public function approve(Request $request, LedgerEntry $ledgerEntry): JsonResponse
    {
        abort_unless($request->user()->isAdmin(), 403);
        abort_unless($ledgerEntry->user_id === $request->user()->id, 403);
        abort_if($ledgerEntry->status !== LedgerEntry::STATUS_PENDING, 422, 'Only pending entries can be approved.');

        $ledgerEntry->update([
            'status' => LedgerEntry::STATUS_APPROVED,
            'approved_by' => $request->user()->id,
            'approved_at' => now(),
        ]);

        return response()->json(['data' => $ledgerEntry->fresh()]);
    }

    public function summary(Request $request): JsonResponse
    {
        $userId = $request->user()->id;
        $date = $request->query('date') ? Carbon::parse($request->query('date'))->toDateString() : now()->toDateString();

        $rows = LedgerEntry::query()
            ->where('user_id', $userId)
            ->where('status', LedgerEntry::STATUS_APPROVED)
            ->whereDate('entry_date', '<=', $date)
            ->get(['ledger', 'direction', 'amount']);

        $calc = function (string $ledger) use ($rows): float {
            $sum = 0.0;
            foreach ($rows as $r) {
                if ($r->ledger !== $ledger) {
                    continue;
                }
                $amt = (float) $r->amount;
                $sum += $r->direction === LedgerEntry::DIR_RECEIVED ? $amt : -$amt;
            }
            return $sum;
        };

        return response()->json([
            'date' => $date,
            'cash_balance' => $calc(LedgerEntry::LEDGER_CASH),
            'bank_balance' => $calc(LedgerEntry::LEDGER_BANK),
            'pending_count' => LedgerEntry::query()->where('user_id', $userId)->where('status', LedgerEntry::STATUS_PENDING)->count(),
        ]);
    }
}

