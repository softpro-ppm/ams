<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('daily_closings', function (Blueprint $table) {
            $table->id();
            $table->date('closing_date');
            $table->foreignId('account_id')->constrained()->cascadeOnDelete();
            $table->decimal('system_closing_balance', 14, 2);
            $table->decimal('actual_balance', 14, 2)->nullable();
            $table->decimal('variance', 14, 2)->default(0);
            $table->text('notes')->nullable();
            $table->foreignId('submitted_by')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('approved_by')->nullable()->constrained('users')->nullOnDelete();
            $table->string('status', 24)->default('pending');
            $table->timestamps();

            $table->unique(['account_id', 'closing_date']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('daily_closings');
    }
};
