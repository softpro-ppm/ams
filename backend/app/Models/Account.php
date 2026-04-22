<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class Account extends Model
{
    use SoftDeletes;

    public const TYPE_CASH = 'cash';

    public const TYPE_BANK = 'bank';

    public const TYPE_WALLET = 'wallet';

    public const TYPE_OTHER = 'other';

    public const SCOPE_COMPANY = 'company';

    public const SCOPE_ADMIN = 'admin';

    protected $fillable = [
        'name',
        'code',
        'type',
        'owner_scope',
        'is_reconcilable',
        'opening_balance',
        'opening_balance_date',
        'is_active',
        'sort_order',
        'created_by',
    ];

    protected function casts(): array
    {
        return [
            'is_reconcilable' => 'boolean',
            'opening_balance' => 'decimal:2',
            'opening_balance_date' => 'date',
            'is_active' => 'boolean',
            'sort_order' => 'integer',
        ];
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function transactions(): HasMany
    {
        return $this->hasMany(Transaction::class);
    }

    public function dailyClosings(): HasMany
    {
        return $this->hasMany(DailyClosing::class);
    }

    public function usersWithPermissions(): BelongsToMany
    {
        return $this->belongsToMany(User::class, 'user_account_permissions')
            ->withPivot(['can_view', 'can_create', 'can_edit_same_day', 'can_reconcile'])
            ->withTimestamps();
    }

    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }
}
