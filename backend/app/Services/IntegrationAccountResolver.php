<?php

namespace App\Services;

use App\Models\Account;

class IntegrationAccountResolver
{
    public static function resolve(?int $accountId, string $defaultAccountName): ?int
    {
        if ($accountId) {
            $account = Account::query()->active()->whereKey($accountId)->first();
            abort_if(! $account, 422, 'Invalid or inactive account_id.');

            return $account->id;
        }

        $byName = Account::query()->active()->where('name', $defaultAccountName)->first();

        return $byName?->id;
    }
}
