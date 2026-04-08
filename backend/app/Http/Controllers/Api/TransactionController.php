<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Transaction\TransactionRequest;
use App\Http\Resources\TransactionResource;
use App\Models\Category;
use App\Models\Project;
use App\Models\Subcategory;
use App\Models\Transaction;
use Illuminate\Http\Request;

class TransactionController extends Controller
{
    public function index(Request $request)
    {
        $userId = $request->user()->bookOwnerId();
        $perPage = min(100, $request->integer('per_page', 15));

        $query = Transaction::with(['project', 'category', 'subcategory'])
            ->where('user_id', $userId)
            ->when($request->filled('type'), fn ($q) => $q->where('type', $request->string('type')))
            ->when($request->filled('project_id'), fn ($q) => $q->where('project_id', $request->integer('project_id')))
            ->when($request->filled('category_id'), fn ($q) => $q->where('category_id', $request->integer('category_id')))
            ->when($request->filled('subcategory_id'), fn ($q) => $q->where('subcategory_id', $request->integer('subcategory_id')))
            ->when($request->filled('date_from'), fn ($q) => $q->whereDate('transaction_date', '>=', $request->date('date_from')))
            ->when($request->filled('date_to'), fn ($q) => $q->whereDate('transaction_date', '<=', $request->date('date_to')))
            ->when($request->filled('search'), function ($q) use ($request) {
                $search = '%'.$request->string('search').'%';
                $q->where(function ($inner) use ($search) {
                    $inner->where('description', 'like', $search)
                        ->orWhere('reference', 'like', $search);
                });
            })
            ->orderByDesc('transaction_date')
            ->orderByDesc('id');

        return TransactionResource::collection($query->paginate($perPage)->withQueryString());
    }

    public function store(TransactionRequest $request)
    {
        [$category, $subcategory, $project] = $this->validateRelations($request);

        $transaction = Transaction::create([
            ...$request->validated(),
            'user_id' => $request->user()->bookOwnerId(),
        ]);

        return new TransactionResource($transaction->load(['project', 'category', 'subcategory']));
    }

    public function show(Request $request, Transaction $transaction)
    {
        $this->authorizeTransaction($request, $transaction);

        return new TransactionResource($transaction->load(['project', 'category', 'subcategory']));
    }

    public function update(TransactionRequest $request, Transaction $transaction)
    {
        $this->authorizeTransaction($request, $transaction);
        [$category, $subcategory, $project] = $this->validateRelations($request);

        $transaction->update($request->validated());

        return new TransactionResource($transaction->fresh()->load(['project', 'category', 'subcategory']));
    }

    public function destroy(Request $request, Transaction $transaction)
    {
        $this->authorizeTransaction($request, $transaction);

        $transaction->delete();

        return response()->noContent();
    }

    private function authorizeTransaction(Request $request, Transaction $transaction): void
    {
        abort_unless($transaction->user_id === $request->user()->bookOwnerId(), 403, 'Unauthorized transaction access');
    }

    private function validateRelations(Request $request): array
    {
        $userId = $request->user()->bookOwnerId();

        $category = Category::where('id', $request->category_id)
            ->where('user_id', $userId)
            ->firstOrFail();

        if ($category->type !== $request->type) {
            abort(422, 'Category type mismatch with transaction type');
        }

        $subcategory = null;
        if ($request->filled('subcategory_id')) {
            $subcategory = Subcategory::where('id', $request->subcategory_id)
                ->where('user_id', $userId)
                ->firstOrFail();

            abort_if($subcategory->category_id !== $category->id, 422, 'Subcategory must belong to the selected category');
        }

        $project = null;
        if ($request->filled('project_id')) {
            $project = Project::where('id', $request->project_id)
                ->where('user_id', $userId)
                ->firstOrFail();
        }

        return [$category, $subcategory, $project];
    }
}
