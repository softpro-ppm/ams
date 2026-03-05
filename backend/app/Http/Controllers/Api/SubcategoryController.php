<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Subcategory\SubcategoryRequest;
use App\Http\Resources\SubcategoryResource;
use App\Models\Category;
use App\Models\Subcategory;
use App\Models\Transaction;
use Illuminate\Http\Request;

class SubcategoryController extends Controller
{
    public function index(Request $request)
    {
        $query = Subcategory::where('user_id', $request->user()->id)
            ->when($request->filled('category_id'), fn ($q) => $q->where('category_id', $request->integer('category_id')))
            ->when(! $request->boolean('include_inactive'), fn ($q) => $q->where('is_active', true))
            ->orderBy('name');

        return SubcategoryResource::collection($query->get());
    }

    public function store(SubcategoryRequest $request)
    {
        $category = $this->validateCategoryOwnership($request->user()->id, (int) $request->category_id);

        $subcategory = Subcategory::create([
            ...$request->validated(),
            'user_id' => $request->user()->id,
        ]);

        return new SubcategoryResource($subcategory->load('category'));
    }

    public function show(Request $request, Subcategory $subcategory)
    {
        $this->authorizeSubcategory($request, $subcategory);

        return new SubcategoryResource($subcategory->load('category'));
    }

    public function update(SubcategoryRequest $request, Subcategory $subcategory)
    {
        $this->authorizeSubcategory($request, $subcategory);
        $this->validateCategoryOwnership($request->user()->id, (int) $request->category_id);

        $subcategory->update($request->validated());

        return new SubcategoryResource($subcategory->fresh('category'));
    }

    public function destroy(Request $request, Subcategory $subcategory)
    {
        $this->authorizeSubcategory($request, $subcategory);

        $inUse = Transaction::where('subcategory_id', $subcategory->id)->exists();

        if ($inUse) {
            return response()->json([
                'message' => 'Subcategory is in use and cannot be deleted.',
            ], 422);
        }

        $subcategory->delete();

        return response()->noContent();
    }

    private function authorizeSubcategory(Request $request, Subcategory $subcategory): void
    {
        abort_unless($subcategory->user_id === $request->user()->id, 403, 'Unauthorized subcategory access');
    }

    private function validateCategoryOwnership(int $userId, int $categoryId): Category
    {
        $category = Category::where('id', $categoryId)->where('user_id', $userId)->first();

        abort_unless($category, 422, 'Category invalid for this user');

        return $category;
    }
}
