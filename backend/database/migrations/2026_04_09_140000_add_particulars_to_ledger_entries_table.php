<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('ledger_entries', function (Blueprint $table) {
            $table->string('particulars', 255)->nullable()->after('amount');
        });

        if (Schema::getConnection()->getDriverName() !== 'sqlite') {
            DB::table('ledger_entries')->whereNull('particulars')->update([
                'particulars' => DB::raw('COALESCE(note, "")'),
            ]);
        } else {
            foreach (DB::table('ledger_entries')->whereNull('particulars')->get(['id', 'note']) as $row) {
                DB::table('ledger_entries')->where('id', $row->id)->update([
                    'particulars' => $row->note ?? '',
                ]);
            }
        }
    }

    public function down(): void
    {
        Schema::table('ledger_entries', function (Blueprint $table) {
            $table->dropColumn('particulars');
        });
    }
};
