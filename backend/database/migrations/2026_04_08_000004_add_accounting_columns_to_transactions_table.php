<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('transactions', function (Blueprint $table) {
            $table->foreignId('account_id')->nullable()->after('user_id')->constrained()->nullOnDelete();
            $table->foreignId('entered_by')->nullable()->after('account_id')->constrained('users')->nullOnDelete();
            $table->foreignId('verified_by')->nullable()->after('entered_by')->constrained('users')->nullOnDelete();
            $table->string('entry_source', 32)->default('manual')->after('verified_by');
            $table->uuid('transfer_group_id')->nullable()->after('entry_source');
            $table->string('status', 24)->default('posted')->after('transfer_group_id');
            $table->date('closing_date')->nullable()->after('status');
            $table->boolean('is_locked_after_close')->default(false)->after('closing_date');

            $table->index(['account_id', 'transaction_date']);
            $table->index('transfer_group_id');
            $table->index('entry_source');
        });
    }

    public function down(): void
    {
        Schema::table('transactions', function (Blueprint $table) {
            $table->dropForeign(['account_id']);
            $table->dropForeign(['entered_by']);
            $table->dropForeign(['verified_by']);
            $table->dropIndex(['account_id', 'transaction_date']);
            $table->dropIndex(['transfer_group_id']);
            $table->dropIndex(['entry_source']);
            $table->dropColumn([
                'account_id',
                'entered_by',
                'verified_by',
                'entry_source',
                'transfer_group_id',
                'status',
                'closing_date',
                'is_locked_after_close',
            ]);
        });
    }
};
