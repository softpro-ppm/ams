<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class UserAccountPermission extends Model
{
    protected $table = 'user_account_permissions';

    protected $fillable = [
        'user_id',
        'account_id',
        'can_view',
        'can_create',
        'can_edit_same_day',
        'can_reconcile',
    ];

    protected function casts(): array
    {
        return [
            'can_view' => 'boolean',
            'can_create' => 'boolean',
            'can_edit_same_day' => 'boolean',
            'can_reconcile' => 'boolean',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function account(): BelongsTo
    {
        return $this->belongsTo(Account::class);
    }
}
