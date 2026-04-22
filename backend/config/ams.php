<?php

return [
    /*
    |--------------------------------------------------------------------------
    | Default account names for integrations when account_id is omitted
    |--------------------------------------------------------------------------
    */
    'default_sms_income_account' => env('AMS_DEFAULT_SMS_ACCOUNT', 'Company Bank'),
    'default_ims_income_account' => env('AMS_DEFAULT_IMS_ACCOUNT', 'Company Bank'),

    /*
    | Internal category names (per book owner) for transfer double-entry legs
    |--------------------------------------------------------------------------
    */
    'transfer_expense_category' => 'Inter-account transfer (out)',
    'transfer_income_category' => 'Inter-account transfer (in)',
];
