<?php

namespace App\Services;

use App\Models\User;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
class LedgerApprovalOtpService
{
    public function isEnabled(): bool
    {
        return (bool) config('ledger_approval_otp.enabled')
            && (bool) config('ledger_approval_otp.webhook_url');
    }

    public function cacheKey(User $user): string
    {
        return config('ledger_approval_otp.cache_prefix').$user->id;
    }

    /**
     * Normalize to E.164-style (digits with leading +). India: 10-digit mobile → +91.
     */
    public function normalizePhone(?string $raw): ?string
    {
        if ($raw === null || trim($raw) === '') {
            return null;
        }
        $d = preg_replace('/\D+/', '', $raw);
        if ($d === '') {
            return null;
        }
        if (str_starts_with($raw, '+')) {
            return '+'.$d;
        }
        if (strlen($d) === 10 && $d[0] >= '6' && $d[0] <= '9') {
            return '+91'.$d;
        }
        if (strlen($d) === 12 && str_starts_with($d, '91')) {
            return '+'.$d;
        }

        return '+'.$d;
    }

    /**
     * @throws \Symfony\Component\HttpKernel\Exception\HttpException
     */
    public function send(User $user): void
    {
        if (! $user->isAdmin()) {
            abort(403, 'Only admins use ledger approval OTP.');
        }

        $phone = $this->normalizePhone($user->phone);
        if ($phone === null) {
            abort(422, 'Add your mobile number on the Settings page (WhatsApp OTP) before approving.');
        }

        $cooldown = (int) config('ledger_approval_otp.resend_cooldown_seconds', 60);
        $cdKey = 'ledger-approval-otp-cooldown:'.$user->id;
        if (Cache::has($cdKey)) {
            abort(429, 'Please wait '.$cooldown.' seconds before requesting another OTP.');
        }

        $digits = (int) config('ledger_approval_otp.digits', 6);
        $max = (10 ** $digits) - 1;
        $plain = str_pad((string) random_int(0, $max), $digits, '0', STR_PAD_LEFT);

        $ttl = (int) config('ledger_approval_otp.ttl_seconds', 300);
        Cache::put($this->cacheKey($user), hash('sha256', $plain), $ttl);

        $url = (string) config('ledger_approval_otp.webhook_url');
        $token = config('ledger_approval_otp.webhook_bearer_token');
        $timeout = (int) config('ledger_approval_otp.webhook_timeout', 15);

        try {
            $req = Http::timeout($timeout)->acceptJson()->asJson();
            if (is_string($token) && $token !== '') {
                $req = $req->withToken($token);
            }
            $res = $req->post($url, [
                'phone' => $phone,
                'otp' => $plain,
                'purpose' => 'ledger_approval',
                'user_id' => $user->id,
                'expires_in_seconds' => $ttl,
            ]);

            if (! $res->successful()) {
                Cache::forget($this->cacheKey($user));
                Log::warning('ledger_approval_otp_webhook_failed', [
                    'status' => $res->status(),
                    'body' => $res->body(),
                ]);
                abort(502, 'Could not send OTP via WhatsApp. Check server logs and webhook URL.');
            }
        } catch (\Illuminate\Http\Client\ConnectionException $e) {
            Cache::forget($this->cacheKey($user));
            Log::error('ledger_approval_otp_webhook_exception', ['message' => $e->getMessage()]);
            abort(502, 'WhatsApp OTP service unreachable.');
        }

        Cache::put($cdKey, true, $cooldown);
    }

    public function verifyAndConsume(User $user, string $otp): bool
    {
        $key = $this->cacheKey($user);
        $stored = Cache::get($key);
        if (! is_string($stored) || $stored === '') {
            return false;
        }
        $digits = (int) config('ledger_approval_otp.digits', 6);
        $otp = preg_replace('/\D/', '', $otp) ?? '';
        if (strlen($otp) !== $digits) {
            return false;
        }
        if (! hash_equals($stored, hash('sha256', $otp))) {
            return false;
        }
        Cache::forget($key);

        return true;
    }
}
