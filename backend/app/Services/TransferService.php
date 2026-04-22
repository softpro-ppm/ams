<?php

namespace App\Services;

use App\Models\Account;
use App\Models\Category;
use App\Models\Transaction;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class TransferService
{
    /**
     * @return array{group_id: string, out: Transaction, in: Transaction}
     */
    public function createTransfer(
        User $actor,
        int $bookUserId,
        int $fromAccountId,
        int $toAccountId,
        string $date,
        float $amount,
        ?string $remarks = null,
    ): array {
        if ($fromAccountId === $toAccountId) {
            abort(422, 'Source and destination account must differ.');
        }
        if ($amount <= 0) {
            abort(422, 'Amount must be greater than zero.');
        }

        $from = Account::whereKey($fromAccountId)->where('is_active', true)->firstOrFail();
        $to = Account::whereKey($toAccountId)->where('is_active', true)->firstOrFail();

        [$expenseCategoryId, $incomeCategoryId] = $this->transferCategoryIds($bookUserId);

        $groupId = (string) Str::uuid();

        return DB::transaction(function () use ($actor, $bookUserId, $from, $to, $date, $amount, $remarks, $groupId, $expenseCategoryId, $incomeCategoryId) {
            $base = [
                'user_id' => $bookUserId,
                'entered_by' => $actor->id,
                'entry_source' => Transaction::ENTRY_TRANSFER,
                'transfer_group_id' => $groupId,
                'status' => 'posted',
                'transaction_date' => $date,
                'amount' => $amount,
                'paid_amount' => $amount,
                'description' => $remarks ?? 'Inter-account transfer',
                'reference' => 'TRF-'.substr($groupId, 0, 8),
            ];

            $out = Transaction::create(array_merge($base, [
                'account_id' => $from->id,
                'type' => 'expense',
                'category_id' => $expenseCategoryId,
                'subcategory_id' => null,
            ]));

            $in = Transaction::create(array_merge($base, [
                'account_id' => $to->id,
                'type' => 'income',
                'category_id' => $incomeCategoryId,
                'subcategory_id' => null,
            ]));

            AuditLogger::log('create_transfer', Transaction::class, $out->id, null, [
                'transfer_group_id' => $groupId,
                'from_account_id' => $from->id,
                'to_account_id' => $to->id,
                'amount' => $amount,
            ], $remarks, $actor->id);

            return [
                'group_id' => $groupId,
                'out' => $out->fresh(['account', 'category']),
                'in' => $in->fresh(['account', 'category']),
            ];
        });
    }

    /**
     * @return array{0: int, 1: int}
     */
    private function transferCategoryIds(int $bookUserId): array
    {
        $expName = config('ams.transfer_expense_category');
        $incName = config('ams.transfer_income_category');

        $exp = Category::firstOrCreate(
            ['user_id' => $bookUserId, 'name' => $expName, 'type' => 'expense'],
            ['color' => '#64748b', 'is_active' => true]
        );

        $inc = Category::firstOrCreate(
            ['user_id' => $bookUserId, 'name' => $incName, 'type' => 'income'],
            ['color' => '#64748b', 'is_active' => true]
        );

        return [$exp->id, $inc->id];
    }
}
