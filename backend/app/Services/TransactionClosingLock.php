<?php

namespace App\Services;

use App\Models\DailyClosing;
use App\Models\Transaction;
use App\Models\User;
use Carbon\Carbon;

class TransactionClosingLock
{
    public function isLockedForUser(Transaction $transaction, User $actor): bool
    {
        if ($actor->isAdmin()) {
            return false;
        }

        if ($transaction->is_locked_after_close) {
            return true;
        }

        if (! $transaction->account_id || ! $transaction->transaction_date) {
            return false;
        }

        return DailyClosing::query()
            ->where('account_id', $transaction->account_id)
            ->whereDate('closing_date', $transaction->transaction_date->toDateString())
            ->where('status', DailyClosing::STATUS_APPROVED)
            ->exists();
    }

    public function lockTransactionsForApprovedClosing(DailyClosing $closing): void
    {
        Transaction::query()
            ->where('account_id', $closing->account_id)
            ->whereDate('transaction_date', $closing->closing_date->toDateString())
            ->update(['is_locked_after_close' => true]);
    }

    public function unlockTransactionsForReopenedClosing(DailyClosing $closing): void
    {
        Transaction::query()
            ->where('account_id', $closing->account_id)
            ->whereDate('transaction_date', $closing->closing_date->toDateString())
            ->update(['is_locked_after_close' => false]);
    }
}
