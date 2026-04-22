<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Models\UserAccountPermission;
use App\Services\AuditLogger;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class AdminUserController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        abort_unless($request->user()->isAdmin(), 403);

        $users = User::query()
            ->orderBy('name')
            ->get(['id', 'name', 'email', 'role', 'is_active', 'book_owner_id', 'created_at']);

        return response()->json(['data' => $users]);
    }

    public function update(Request $request, User $user): JsonResponse
    {
        abort_unless($request->user()->isAdmin(), 403);

        $validated = $request->validate([
            'role' => ['sometimes', Rule::in(['admin', 'receptionist'])],
            'is_active' => ['sometimes', 'boolean'],
            'book_owner_id' => ['nullable', 'integer', 'exists:users,id'],
        ]);

        $before = $user->only(['role', 'is_active', 'book_owner_id']);
        $user->update($validated);
        AuditLogger::log('role_change', User::class, $user->id, $before, $user->only(['role', 'is_active', 'book_owner_id']), null, $request->user()->id);

        return response()->json(['data' => $user->fresh(['bookOwner'])]);
    }

    public function syncAccountPermissions(Request $request, User $user): JsonResponse
    {
        abort_unless($request->user()->isAdmin(), 403);

        $validated = $request->validate([
            'permissions' => ['required', 'array'],
            'permissions.*.account_id' => ['required', 'integer', 'exists:accounts,id'],
            'permissions.*.can_view' => ['boolean'],
            'permissions.*.can_create' => ['boolean'],
            'permissions.*.can_edit_same_day' => ['boolean'],
            'permissions.*.can_reconcile' => ['boolean'],
        ]);

        foreach ($validated['permissions'] as $row) {
            UserAccountPermission::updateOrCreate(
                ['user_id' => $user->id, 'account_id' => $row['account_id']],
                [
                    'can_view' => $row['can_view'] ?? true,
                    'can_create' => $row['can_create'] ?? false,
                    'can_edit_same_day' => $row['can_edit_same_day'] ?? false,
                    'can_reconcile' => $row['can_reconcile'] ?? false,
                ]
            );
        }

        AuditLogger::log('account_permissions_sync', User::class, $user->id, null, $validated, null, $request->user()->id);

        return response()->json([
            'data' => UserAccountPermission::where('user_id', $user->id)->with('account')->get(),
        ]);
    }
}
