<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class LedgerEntry extends Model
{
    public const LEDGER_CASH = 'cash';
    public const LEDGER_BANK = 'bank';

    public const DIR_RECEIVED = 'received';
    public const DIR_PAID = 'paid';

    public const STATUS_PENDING = 'pending';
    public const STATUS_APPROVED = 'approved';
    public const STATUS_REJECTED = 'rejected';

    protected $fillable = [
        'user_id',
        'entered_by',
        'approved_by',
        'entry_date',
        'ledger',
        'direction',
        'amount',
        'particulars',
        'note',
        'status',
        'approved_at',
    ];

    protected function casts(): array
    {
        return [
            // Keep ledger dates timezone-safe in API responses (no day shift).
            'entry_date' => 'date:Y-m-d',
            'approved_at' => 'datetime',
            'amount' => 'decimal:2',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function enteredBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'entered_by');
    }

    public function approvedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'approved_by');
    }
}

