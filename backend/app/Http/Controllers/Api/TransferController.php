<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\TransactionResource;
use App\Services\TransferService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class TransferController extends Controller
{
    public function store(Request $request, TransferService $transfers): JsonResponse
    {
        if (! $request->user()->isAdmin()) {
            abort(403, 'Only administrators can create transfers.');
        }

        $validated = $request->validate([
            'from_account_id' => ['required', 'integer', 'exists:accounts,id'],
            'to_account_id' => ['required', 'integer', 'exists:accounts,id'],
            'amount' => ['required', 'numeric', 'min:0.01'],
            'transaction_date' => ['required', 'date', 'date_format:Y-m-d'],
            'remarks' => ['nullable', 'string', 'max:500'],
        ]);

        $bookUserId = $request->user()->bookOwnerId();

        $result = $transfers->createTransfer(
            $request->user(),
            $bookUserId,
            (int) $validated['from_account_id'],
            (int) $validated['to_account_id'],
            $validated['transaction_date'],
            (float) $validated['amount'],
            $validated['remarks'] ?? null,
        );

        return response()->json([
            'transfer_group_id' => $result['group_id'],
            'out' => new TransactionResource($result['out']),
            'in' => new TransactionResource($result['in']),
        ], 201);
    }
}
