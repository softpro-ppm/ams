<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\LoginRequest;
use App\Http\Resources\SettingResource;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
class AuthController extends Controller
{
    private function userPayload(\App\Models\User $user): array
    {
        $user->loadMissing('settings');
        $arr = $user->toArray();
        $arr['ledger_approval_otp_enabled'] = app(\App\Services\LedgerApprovalOtpService::class)->isEnabled();

        return $arr;
    }

    public function login(LoginRequest $request): JsonResponse
    {
        $credentials = $request->only('email', 'password');

        if (! Auth::attempt($credentials, $request->boolean('remember'))) {
            return response()->json([
                'message' => 'Invalid credentials.',
            ], 422);
        }

        $request->session()->regenerate();

        return response()->json([
            'user' => $this->userPayload($request->user()),
        ]);
    }

    public function me(Request $request): JsonResponse
    {
        return response()->json([
            'user' => $this->userPayload($request->user()),
            'settings' => SettingResource::collection($request->user()->settings),
        ]);
    }

    public function updateProfile(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'phone' => ['nullable', 'string', 'max:32'],
        ]);

        $phone = isset($validated['phone']) ? trim((string) $validated['phone']) : null;
        if ($phone === '') {
            $phone = null;
        }

        $request->user()->update(['phone' => $phone]);

        return response()->json([
            'user' => $this->userPayload($request->user()->fresh()),
        ]);
    }

    public function logout(Request $request): JsonResponse
    {
        Auth::guard('web')->logout();
        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return response()->json(['message' => 'Logged out']);
    }
}
