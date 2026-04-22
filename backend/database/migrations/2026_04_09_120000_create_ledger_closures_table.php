<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('ledger_closures', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->date('closed_through_date')->index();
            $table->decimal('cash_balance_snapshot', 14, 2);
            $table->decimal('bank_balance_snapshot', 14, 2);
            $table->foreignId('closed_by')->nullable()->constrained('users')->nullOnDelete();
            $table->text('notes')->nullable();
            $table->timestamps();

            $table->index(['user_id', 'closed_through_date']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('ledger_closures');
    }
};
