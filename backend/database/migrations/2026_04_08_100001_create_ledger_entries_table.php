<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('ledger_entries', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete(); // book owner (admin)
            $table->foreignId('entered_by')->nullable()->constrained('users')->nullOnDelete(); // receptionist/admin who entered
            $table->foreignId('approved_by')->nullable()->constrained('users')->nullOnDelete();

            $table->date('entry_date')->index();
            $table->string('ledger', 16)->index(); // cash|bank
            $table->string('direction', 16)->index(); // received|paid
            $table->decimal('amount', 12, 2);
            $table->string('note', 255)->nullable();

            $table->string('status', 16)->default('pending')->index(); // pending|approved|rejected
            $table->timestamp('approved_at')->nullable();

            $table->timestamps();

            $table->index(['user_id', 'ledger', 'entry_date', 'status']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('ledger_entries');
    }
};

