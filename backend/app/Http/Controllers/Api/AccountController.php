<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Account\AccountStoreRequest;
use App\Http\Requests\Account\AccountUpdateRequest;
use App\Http\Resources\AccountResource;
use App\Models\Account;
use App\Models\UserAccountPermission;
use App\Services\AccountLedgerService;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;

class AccountController extends Controller
{
    public function index(Request $request)
    {
        $query = Account::query()->active()->orderBy('sort_order')->orderBy('name');

        if (! $request->user()->isAdmin()) {
            $ids = UserAccountPermission::query()
                ->where('user_id', $request->user()->id)
                ->where('can_view', true)
                ->pluck('account_id');
            $query->whereIn('id', $ids);
        }

        return AccountResource::collection($query->get());
    }

    public function show(Request $request, Account $account): AccountResource
    {
        $this->ensureAccountVisible($request, $account);

        return new AccountResource($account);
    }

    public function store(AccountStoreRequest $request): AccountResource
    {
        $account = Account::create(array_merge($request->validated(), [
            'created_by' => $request->user()->id,
        ]));

        return new AccountResource($account);
    }

    public function update(AccountUpdateRequest $request, Account $account): AccountResource
    {
        $account->update($request->validated());

        return new AccountResource($account->fresh());
    }

    public function destroy(Request $request, Account $account): JsonResponse
    {
        $account->delete();

        return response()->json(['message' => 'Account deleted.']);
    }

    public function ledger(Request $request, Account $account, AccountLedgerService $ledger): JsonResponse
    {
        $this->ensureAccountVisible($request, $account);

        $bookUserId = $request->user()->bookOwnerId();
        $rows = $ledger->ledgerRows(
            $account,
            $request->query('date_from'),
            $request->query('date_to'),
            $request->query('search'),
            $request->query('entry_source'),
            $request->query('status'),
            $bookUserId,
        );

        return response()->json([
            'account' => new AccountResource($account),
            'opening_balance' => (float) $account->opening_balance,
            'rows' => $rows,
        ]);
    }

    public function balance(Request $request, Account $account, AccountLedgerService $ledger): JsonResponse
    {
        $this->ensureAccountVisible($request, $account);
        $date = $request->query('date', now()->toDateString());
        $bookUserId = $request->user()->bookOwnerId();
        $bal = $ledger->balanceAsOf($account, $date, $bookUserId);

        return response()->json([
            'account_id' => $account->id,
            'date' => $date,
            'balance' => $bal,
        ]);
    }

    private function ensureAccountVisible(Request $request, Account $account): void
    {
        if ($request->user()->isAdmin()) {
            return;
        }

        $ok = UserAccountPermission::query()
            ->where('user_id', $request->user()->id)
            ->where('account_id', $account->id)
            ->where('can_view', true)
            ->exists();

        abort_unless($ok, 403, 'No access to this account.');
    }
}
