<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class DailyClosing extends Model
{
    public const STATUS_PENDING = 'pending';

    public const STATUS_MATCHED = 'matched';

    public const STATUS_MISMATCH = 'mismatch';

    public const STATUS_APPROVED = 'approved';

    public const STATUS_REJECTED = 'rejected';

    protected $fillable = [
        'closing_date',
        'account_id',
        'system_closing_balance',
        'actual_balance',
        'variance',
        'notes',
        'submitted_by',
        'approved_by',
        'status',
    ];

    protected function casts(): array
    {
        return [
            'closing_date' => 'date',
            'system_closing_balance' => 'decimal:2',
            'actual_balance' => 'decimal:2',
            'variance' => 'decimal:2',
        ];
    }

    public function account(): BelongsTo
    {
        return $this->belongsTo(Account::class);
    }

    public function submittedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'submitted_by');
    }

    public function approvedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'approved_by');
    }
}
