<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class Loan extends Model
{
    /** @use HasFactory<\Database\Factories\LoanFactory> */
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'user_id',
        'project_id',
        'name',
        'phone_number',
        'type',
        'principal',
        'interest_rate',
        'status',
        'start_date',
        'due_date',
        'description',
        'meta',
    ];

    protected $casts = [
        'principal' => 'decimal:2',
        'interest_rate' => 'decimal:2',
        'start_date' => 'date',
        'due_date' => 'date',
        'meta' => 'array',
    ];

    protected $appends = ['paid_total', 'total_disbursed', 'balance'];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function project(): BelongsTo
    {
        return $this->belongsTo(Project::class);
    }

    public function payments(): HasMany
    {
        return $this->hasMany(LoanPayment::class);
    }

    public function disbursements(): HasMany
    {
        return $this->hasMany(LoanDisbursement::class);
    }

    public function getPaidTotalAttribute(): float
    {
        $sign = $this->type === 'given' ? 1 : -1;

        return (float) $this->payments->sum(function (LoanPayment $payment) use ($sign) {
            $direction = $payment->flow === 'out' ? -1 : 1;

            return $payment->amount * $direction * $sign;
        });
    }

    public function getTotalDisbursedAttribute(): float
    {
        // Sum of all disbursements (additional loan amounts given)
        return (float) $this->disbursements->sum('amount');
    }

    public function getBalanceAttribute(): float
    {
        $sign = $this->type === 'given' ? -1 : 1;
        
        // Total principal = initial principal + all disbursements
        $totalPrincipal = $this->principal + $this->total_disbursed;

        return (float) ($totalPrincipal + ($this->paid_total * $sign));
    }
}
