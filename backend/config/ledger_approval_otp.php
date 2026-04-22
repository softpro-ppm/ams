<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Ledger approval WhatsApp / SMS OTP
    |--------------------------------------------------------------------------
    |
    | When enabled, admins must request an OTP (sent via your webhook) and
    | pass it in the approve / approve-bulk API calls.
    |
    | Webhook: POST JSON { "phone": "+91...", "otp": "123456", "purpose": "ledger_approval" }
    | Point LEDGER_APPROVAL_OTP_WEBHOOK_URL at your SMS/WhatsApp app to map into templates.
    |
    */

    'enabled' => filter_var(env('LEDGER_APPROVAL_OTP_ENABLED', false), FILTER_VALIDATE_BOOLEAN),

    'ttl_seconds' => (int) env('LEDGER_APPROVAL_OTP_TTL', 300),

    'digits' => max(4, min(8, (int) env('LEDGER_APPROVAL_OTP_DIGITS', 6))),

    'cache_prefix' => 'ledger_approval_otp:',

    'webhook_url' => env('LEDGER_APPROVAL_OTP_WEBHOOK_URL'),

    'webhook_bearer_token' => env('LEDGER_APPROVAL_OTP_WEBHOOK_BEARER'),

    'webhook_timeout' => (int) env('LEDGER_APPROVAL_OTP_WEBHOOK_TIMEOUT', 15),

    /** Minimum seconds between Send OTP requests per admin */
    'resend_cooldown_seconds' => (int) env('LEDGER_APPROVAL_OTP_RESEND_COOLDOWN', 60),

];
