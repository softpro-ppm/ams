<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Income\IncomeFromSmsRequest;
use App\Models\Transaction;
use Illuminate\Http\JsonResponse;

class IncomeFromSmsController extends Controller
{
    /**
     * Receive fee/tuition income from SMS. Idempotent: skips insert if a transaction
     * with the same meta.sms_payment_id exists.
     */
    public function store(IncomeFromSmsRequest $request): JsonResponse
    {
        $data = $request->validated();
        $meta = $data['meta'] ?? [];

        $existing = null;
        if (! empty($meta['sms_payment_id'])) {
            $existing = Transaction::where('user_id', $data['user_id'])
                ->whereJsonContains('meta->sms_payment_id', $meta['sms_payment_id'])
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
