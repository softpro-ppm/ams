<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class ValidateSmsApiKey
{
    /**
     * Handle an incoming request. Validate X-API-Key header against SMS_API_KEY config.
     */
    public function handle(Request $request, Closure $next): Response
    {
        $apiKey = config('services.sms.api_key');

        if (empty($apiKey)) {
            return response()->json(['message' => 'SMS integration is not configured.'], 500);
        }

        $providedKey = $request->header('X-API-Key');

        if ($providedKey !== $apiKey) {
            return response()->json(['message' => 'Invalid API key.'], 401);
        }

        return $next($request);
    }
}
