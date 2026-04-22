<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class LoanPayment extends Model
{
    /** @use HasFactory<\Database\Factories\LoanPaymentFactory> */
    use HasFactory;

    protected $fillable = [
        'loan_id',
        'user_id',
        'flow',
        'amount',
        'paid_on',
        'note',
        'meta',
    ];

    protected $casts = [
        'amount' => 'decimal:2',
        'paid_on' => 'date',
        'meta' => 'array',
    ];

    protected static function booted(): void
    {
        // Update loan status when payment is created, updated, or deleted
        static::created(function (LoanPayment $payment) {
            $payment->updateLoanStatus();
        });

        static::updated(function (LoanPayment $payment) {
            $payment->updateLoanStatus();
        });

        static::deleted(function (LoanPayment $payment) {
            // Reload loan by ID since relationship might not be available after deletion
            $loan = Loan::find($payment->loan_id);
            if ($loan) {
                $loan->refresh();
                $balance = $loan->balance;
                $newStatus = $balance <= 0 ? 'completed' : 'active';
                if ($loan->status !== $newStatus) {
                    $loan->update(['status' => $newStatus]);
                }
            }
        });
    }

    public function loan(): BelongsTo
    {
        return $this->belongsTo(Loan::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Update the parent loan's status based on balance
     */
    protected function updateLoanStatus(): void
    {
        $loan = $this->loan;
        if (!$loan) {
            return;
        }

        // Reload the loan to get fresh balance calculation
        $loan->refresh();
        $balance = $loan->balance;

        // Update status: completed if balance is 0 or less, active otherwise
        $newStatus = $balance <= 0 ? 'completed' : 'active';
        
        if ($loan->status !== $newStatus) {
            $loan->update(['status' => $newStatus]);
        }
    }
}
