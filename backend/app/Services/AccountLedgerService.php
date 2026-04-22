<?php

namespace App\Services;

use App\Models\Account;
use App\Models\Transaction;
use Illuminate\Support\Collection;

class AccountLedgerService
{
    /**
     * @return Collection<int, array{date: string, transaction_id: int|null, type: string|null, entry_source: string|null, description: string|null, reference: string|null, in_amount: float, out_amount: float, running_balance: float, status: string|null, entered_by: int|null}>
     */
    public function ledgerRows(
        Account $account,
        ?string $dateFrom = null,
        ?string $dateTo = null,
        ?string $search = null,
        ?string $entrySource = null,
        ?string $status = null,
        ?int $bookUserId = null,
    ): Collection {
        $balance = (float) $account->opening_balance;

        $query = Transaction::query()
            ->where('account_id', $account->id)
            ->when($bookUserId, fn ($q) => $q->where('user_id', $bookUserId))
            ->when($dateFrom, fn ($q) => $q->whereDate('transaction_date', '>=', $dateFrom))
            ->when($dateTo, fn ($q) => $q->whereDate('transaction_date', '<=', $dateTo))
            ->when($entrySource, fn ($q) => $q->where('entry_source', $entrySource))
            ->when($status, fn ($q) => $q->where('status', $status))
            ->when($search, function ($q) use ($search) {
                $s = '%'.$search.'%';
                $q->where(function ($inner) use ($s) {
                    $inner->where('description', 'like', $s)
                        ->orWhere('reference', 'like', $s);
                });
            })
            ->orderBy('transaction_date')
            ->orderBy('created_at')
            ->orderBy('id');

        $rows = collect();

        /** @var Transaction $tx */
        foreach ($query->cursor() as $tx) {
            $in = 0.0;
            $out = 0.0;
            if ($tx->type === 'income') {
                $in = (float) $tx->amount;
                $balance += $in;
            } else {
                $out = (float) $tx->amount;
                $balance -= $out;
            }

            $rows->push([
                'date' => $tx->transaction_date->toDateString(),
                'transaction_id' => $tx->id,
                'type' => $tx->type,
                'entry_source' => $tx->entry_source,
                'description' => $tx->description,
                'reference' => $tx->reference,
                'in_amount' => $in,
                'out_amount' => $out,
                'running_balance' => $balance,
                'status' => $tx->status,
                'entered_by' => $tx->entered_by,
            ]);
        }

        return $rows;
    }

    public function balanceAsOf(Account $account, string $date, ?int $bookUserId = null): float
    {
        $rows = $this->ledgerRows($account, null, $date, null, null, null, $bookUserId);

        return $rows->isEmpty()
            ? (float) $account->opening_balance
            : (float) $rows->last()['running_balance'];
    }
}
