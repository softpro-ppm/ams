<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Category\CategoryRequest;
use App\Http\Resources\CategoryResource;
use App\Models\Category;
use App\Models\Transaction;
use Illuminate\Http\Request;

class CategoryController extends Controller
{
    public function index(Request $request)
    {
        $query = Category::where('user_id', $request->user()->id)
            ->when($request->filled('type'), fn ($q) => $q->where('type', $request->string('type')))
            ->when(! $request->boolean('include_inactive'), fn ($q) => $q->where('is_active', true))
            ->with(['subcategories' => fn ($q) => $q->orderBy('name')])
            ->orderBy('name');

        return CategoryResource::collection($query->get());
    }

    public function store(CategoryRequest $request)
    {
        $category = Category::create([
            ...$request->validated(),
            'user_id' => $request->user()->id,
        ]);

        return new CategoryResource($category);
    }

    public function show(Request $request, Category $category)
    {
        $this->authorizeCategory($request, $category);

        return new CategoryResource($category->load('subcategories'));
    }

    public function update(CategoryRequest $request, Category $category)
    {
        $this->authorizeCategory($request, $category);

        $category->update($request->validated());

        return new CategoryResource($category->fresh('subcategories'));
    }

    public function destroy(Request $request, Category $category)
    {
        $this->authorizeCategory($request, $category);

        $inUse = Transaction::where('category_id', $category->id)->exists()
            || Transaction::whereIn('subcategory_id', $category->subcategories()->pluck('id'))->exists();

        if ($inUse) {
            return response()->json([
                'message' => 'Category is in use and cannot be deleted.',
            ], 422);
        }

        $category->delete();

        return response()->noContent();
    }

    private function authorizeCategory(Request $request, Category $category): void
    {
        abort_unless($category->user_id === $request->user()->id, 403, 'Unauthorized category access');
    }
}
