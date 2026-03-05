<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Project\ProjectRequest;
use App\Http\Resources\ProjectResource;
use App\Models\Project;
use Illuminate\Http\Request;

class ProjectController extends Controller
{
    public function index(Request $request)
    {
        $query = Project::query()
            ->where('user_id', $request->user()->id)
            ->when(! $request->boolean('include_inactive'), fn ($q) => $q->where('is_active', true))
            ->withSum(['transactions as income_total' => fn ($q) => $q->where('type', 'income')], 'amount')
            ->withSum(['transactions as expense_total' => fn ($q) => $q->where('type', 'expense')], 'amount')
            ->orderBy('name')
            ->orderBy('created_at', 'desc');

        return ProjectResource::collection($query->get());
    }

    public function store(ProjectRequest $request)
    {
        try {
            $validated = $request->validated();
            $userId = $request->user()->id;
            
            // Check for duplicate name
            $existing = Project::where('user_id', $userId)
                ->where('name', $validated['name'])
                ->first();
            
            if ($existing) {
                return response()->json([
                    'message' => 'A project with this name already exists.',
                    'errors' => ['name' => ['A project with this name already exists.']]
                ], 422);
            }
            
            $project = Project::create([
                'name' => $validated['name'],
                'color' => $validated['color'] ?? '#2563eb',
                'is_active' => $validated['is_active'] ?? true,
                'description' => $validated['description'] ?? null,
                'user_id' => $userId,
            ]);

            return new ProjectResource($project);
        } catch (\Illuminate\Database\QueryException $e) {
            if ($e->getCode() === '23000') { // Integrity constraint violation
                return response()->json([
                    'message' => 'A project with this name already exists.',
                    'errors' => ['name' => ['A project with this name already exists.']]
                ], 422);
            }
            throw $e;
        }
    }

    public function show(Request $request, Project $project)
    {
        $this->authorizeProject($request, $project);

        return new ProjectResource($project);
    }

    public function update(ProjectRequest $request, Project $project)
    {
        $this->authorizeProject($request, $project);

        $project->update($request->validated());

        return new ProjectResource($project->fresh());
    }

    public function destroy(Request $request, Project $project)
    {
        $this->authorizeProject($request, $project);

        $project->delete();

        return response()->noContent();
    }

    private function authorizeProject(Request $request, Project $project): void
    {
        abort_unless($project->user_id === $request->user()->id, 403, 'Unauthorized project access');
    }
}
