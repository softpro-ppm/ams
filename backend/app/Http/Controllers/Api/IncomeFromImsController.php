<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Income\IncomeFromImsRequest;
use App\Models\Transaction;
use Illuminate\Http\JsonResponse;

class IncomeFromImsController extends Controller
{
    /**
     * Receive policy revenue as income from IMS. Idempotent: skips insert if a transaction
     * with the same meta.ims_policy_id (new policies) or meta.ims_renewal_id (renewals) exists.
     */
    public function store(IncomeFromImsRequest $request): JsonResponse
    {
        $data = $request->validated();
        $meta = $data['meta'] ?? [];

        $existing = null;
        if (! empty($meta['ims_policy_id'])) {
            $existing = Transaction::where('user_id', $data['user_id'])
                ->whereJsonContains('meta->ims_policy_id', $meta['ims_policy_id'])
                ->first();
        } elseif (! empty($meta['ims_renewal_id'])) {
            $existing = Transaction::where('user_id', $data['user_id'])
                ->whereJsonContains('meta->ims_renewal_id', $meta['ims_renewal_id'])
                ->first();
        }

        if ($existing) {
            return response()->json([
                'success' => true,
                'message' => 'Transaction already exists (idempotent).',
                'transaction_id' => $existing->id,
                'duplicate' => true,
            ], 200);
        }

        $transaction = Transaction::create([
            'user_id' => $data['user_id'],
            'project_id' => $data['project_id'],
            'category_id' => $data['category_id'],
            'subcategory_id' => $data['subcategory_id'],
            'type' => 'income',
            'amount' => $data['amount'],
            'paid_amount' => $data['paid_amount'],
            'transaction_date' => $data['transaction_date'],
            'description' => $data['description'],
            'reference' => $data['reference'],
            'phone_number' => $data['phone_number'] ?? null,
            'meta' => $data['meta'] ?? null,
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Income recorded successfully.',
            'transaction_id' => $transaction->id,
        ], 201);
    }
}
