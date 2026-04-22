<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class LoanDisbursement extends Model
{
    /** @use HasFactory<\Database\Factories\LoanDisbursementFactory> */
    use HasFactory;

    protected $fillable = [
        'loan_id',
        'user_id',
        'amount',
        'disbursed_on',
        'note',
        'meta',
    ];

    protected $casts = [
        'amount' => 'decimal:2',
        'disbursed_on' => 'date',
        'meta' => 'array',
    ];

    public function loan(): BelongsTo
    {
        return $this->belongsTo(Loan::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
