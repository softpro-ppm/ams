<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AuditLogController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        abort_unless($request->user()->isAdmin(), 403);

        $perPage = min(100, $request->integer('per_page', 25));
        $q = AuditLog::query()
            ->with('user')
            ->when($request->filled('action'), fn ($qq) => $qq->where('action', $request->string('action')))
            ->when($request->filled('entity_type'), fn ($qq) => $qq->where('entity_type', $request->string('entity_type')))
            ->orderByDesc('id');

        return response()->json($q->paginate($perPage));
    }
}
