<?php

namespace App\Policies;

use App\Models\Transaction;
use App\Models\User;
use App\Models\UserAccountPermission;
use App\Services\TransactionClosingLock;

class TransactionPolicy
{
    public function viewAny(User $user): bool
    {
        return $user->is_active;
    }

    public function view(User $user, Transaction $transaction): bool
    {
        return $user->is_active && $transaction->user_id === $user->bookOwnerId();
    }

    public function create(User $user): bool
    {
        return $user->is_active;
    }

    public function update(User $user, Transaction $transaction): bool
    {
        if (! $user->is_active || $transaction->user_id !== $user->bookOwnerId()) {
            return false;
        }

        $lock = app(TransactionClosingLock::class);
        if ($user->isReceptionist() && $lock->isLockedForUser($transaction, $user)) {
            return false;
        }

        if ($user->isAdmin()) {
            return true;
        }

        if (! $user->isReceptionist()) {
            return false;
        }

        if ($transaction->transaction_date->toDateString() !== now()->toDateString()) {
            return false;
        }

        if ($transaction->entered_by !== $user->id) {
            return false;
        }

        if (in_array($transaction->entry_source, [Transaction::ENTRY_TRANSFER, Transaction::ENTRY_SMS, Transaction::ENTRY_IMS], true)) {
            return false;
        }

        if (! $transaction->account_id) {
            return false;
        }

        $p = UserAccountPermission::where('user_id', $user->id)
            ->where('account_id', $transaction->account_id)
            ->first();

        return (bool) ($p?->can_edit_same_day);
    }

    public function delete(User $user, Transaction $transaction): bool
    {
        if (! $user->is_active || $transaction->user_id !== $user->bookOwnerId()) {
            return false;
        }

        $lock = app(TransactionClosingLock::class);
        if ($user->isReceptionist() && $lock->isLockedForUser($transaction, $user)) {
            return false;
        }

        return $user->isAdmin();
    }
}
