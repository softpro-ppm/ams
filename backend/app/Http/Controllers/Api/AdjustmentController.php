<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\TransactionResource;
use App\Models\Account;
use App\Models\Category;
use App\Models\Project;
use App\Models\Subcategory;
use App\Models\Transaction;
use App\Services\AuditLogger;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AdjustmentController extends Controller
{
    public function store(Request $request): JsonResponse
    {
        abort_unless($request->user()->isAdmin(), 403);

        $validated = $request->validate([
            'account_id' => ['required', 'integer', 'exists:accounts,id'],
            'type' => ['required', 'in:income,expense'],
            'amount' => ['required', 'numeric', 'min:0.01'],
            'transaction_date' => ['required', 'date', 'date_format:Y-m-d'],
            'category_id' => ['required', 'integer', 'exists:categories,id'],
            'subcategory_id' => ['nullable', 'integer', 'exists:subcategories,id'],
            'project_id' => ['nullable', 'integer', 'exists:projects,id'],
            'reason' => ['required', 'string', 'max:2000'],
            'reference' => ['nullable', 'string', 'max:120'],
        ]);

        $bookUserId = $request->user()->bookOwnerId();

        $category = Category::where('id', $validated['category_id'])->where('user_id', $bookUserId)->firstOrFail();
        abort_unless($category->type === $validated['type'], 422, 'Category type must match transaction type.');

        if (! empty($validated['subcategory_id'])) {
            $sub = Subcategory::where('id', $validated['subcategory_id'])->where('user_id', $bookUserId)->firstOrFail();
            abort_unless($sub->category_id === $category->id, 422, 'Invalid subcategory.');
        }

        if (! empty($validated['project_id'])) {
            Project::where('id', $validated['project_id'])->where('user_id', $bookUserId)->firstOrFail();
        }

        Account::whereKey($validated['account_id'])->active()->firstOrFail();

        $tx = Transaction::create([
            'user_id' => $bookUserId,
            'account_id' => $validated['account_id'],
            'entered_by' => $request->user()->id,
            'entry_source' => Transaction::ENTRY_ADJUSTMENT,
            'type' => $validated['type'],
            'amount' => $validated['amount'],
            'paid_amount' => $validated['amount'],
            'transaction_date' => $validated['transaction_date'],
            'category_id' => $validated['category_id'],
            'subcategory_id' => $validated['subcategory_id'] ?? null,
            'project_id' => $validated['project_id'] ?? null,
            'description' => $validated['reason'],
            'reference' => $validated['reference'] ?? 'ADJ',
            'status' => 'posted',
        ]);

        AuditLogger::log('create_adjustment', Transaction::class, $tx->id, null, $tx->toArray(), $validated['reason'], $request->user()->id);

        return response()->json(['data' => new TransactionResource($tx->load(['account', 'category']))], 201);
    }
}
