<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;

class EnsureUserIsAdmin
{
    public function handle(Request $request, Closure $next)
    {
        $user = $request->user();
        abort_unless($user && $user->is_active && $user->isAdmin(), 403, 'Admin only.');

        return $next($request);
    }
}

<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureUserIsAdmin
{
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();
        if (! $user || ! $user->isAdmin()) {
            return response()->json(['message' => 'Forbidden.'], 403);
        }

        if (! $user->is_active) {
            return response()->json(['message' => 'Account inactive.'], 403);
        }

        return $next($request);
    }
}
