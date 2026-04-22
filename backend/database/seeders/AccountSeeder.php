<?php

namespace Database\Seeders;

use App\Models\Account;
use App\Models\User;
use App\Models\UserAccountPermission;
use Illuminate\Database\Seeder;

class AccountSeeder extends Seeder
{
    /**
     * Seed the four canonical AMS accounts and grant admins full permissions.
     */
    public function run(): void
    {
        $rows = [
            ['name' => 'Company Cash', 'type' => Account::TYPE_CASH, 'owner_scope' => Account::SCOPE_COMPANY, 'is_reconcilable' => true, 'sort_order' => 1],
            ['name' => 'Company Bank', 'type' => Account::TYPE_BANK, 'owner_scope' => Account::SCOPE_COMPANY, 'is_reconcilable' => true, 'sort_order' => 2],
            ['name' => 'Admin Cash', 'type' => Account::TYPE_CASH, 'owner_scope' => Account::SCOPE_ADMIN, 'is_reconcilable' => false, 'sort_order' => 3],
            ['name' => 'Admin Bank', 'type' => Account::TYPE_BANK, 'owner_scope' => Account::SCOPE_ADMIN, 'is_reconcilable' => false, 'sort_order' => 4],
        ];

        foreach ($rows as $row) {
            Account::updateOrCreate(
                ['name' => $row['name']],
                array_merge($row, [
                    'opening_balance' => 0,
                    'is_active' => true,
                    'created_by' => null,
                ])
            );
        }

        $adminUsers = User::query()
            ->where(function ($q) {
                $q->where('role', 'admin')->orWhereNull('role');
            })
            ->get();

        foreach ($adminUsers as $user) {
            foreach (Account::all() as $account) {
                UserAccountPermission::updateOrCreate(
                    ['user_id' => $user->id, 'account_id' => $account->id],
                    [
                        'can_view' => true,
                        'can_create' => true,
                        'can_edit_same_day' => true,
                        'can_reconcile' => true,
                    ]
                );
            }
        }
    }
}
