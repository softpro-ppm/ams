<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class LedgerClosure extends Model
{
    protected $fillable = [
        'user_id',
        'closed_through_date',
        'cash_balance_snapshot',
        'bank_balance_snapshot',
        'closed_by',
        'notes',
    ];

    protected function casts(): array
    {
        return [
            'closed_through_date' => 'date',
            'cash_balance_snapshot' => 'decimal:2',
            'bank_balance_snapshot' => 'decimal:2',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function closedByUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'closed_by');
    }
}
