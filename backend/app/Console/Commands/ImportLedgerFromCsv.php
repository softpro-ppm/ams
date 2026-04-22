<?php

namespace App\Console\Commands;

use App\Models\LedgerClosure;
use App\Models\LedgerEntry;
use App\Models\User;
use App\Services\LedgerCsvImportParser;
use Carbon\Carbon;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

class ImportLedgerFromCsv extends Command
{
    protected $signature = 'ledger:import-csv
                            {path : Absolute or relative path to the CSV file}
                            {--book= : Book owner user_id (ledger_entries.user_id)}
                            {--entered-by= : Reception user_id (ledger_entries.entered_by)}
                            {--dry-run : Parse and validate only; do not insert}
                            {--force : Insert even on dates on or before the latest ledger close (use with care)}';

    protected $description = 'Import ledger rows from CSV as pending entries (CLI; UI bulk upload also available).';

    public function handle(): int
    {
        $bookUserId = (int) $this->option('book');
        $enteredById = (int) $this->option('entered-by');

        if ($bookUserId < 1 || $enteredById < 1) {
            $this->error('Both --book= and --entered-by= are required (positive integers).');

            return self::FAILURE;
        }

        if (! User::query()->find($bookUserId)) {
            $this->error("No user found with id {$bookUserId} (--book).");

            return self::FAILURE;
        }

        if (! User::query()->find($enteredById)) {
            $this->error("No user found with id {$enteredById} (--entered-by).");

            return self::FAILURE;
        }

        $path = $this->argument('path');
        if (! is_file($path)) {
            $resolved = base_path($path);
            if (is_file($resolved)) {
                $path = $resolved;
            } else {
                $this->error("File not found: {$this->argument('path')}");

                return self::FAILURE;
            }
        }

        $parser = new LedgerCsvImportParser;
        $result = $parser->parse($path);

        if ($result['header_error'] !== null) {
            $this->error($result['header_error']);

            return self::FAILURE;
        }

        foreach ($result['errors'] as $e) {
            $this->error("Line {$e['line']}: {$e['message']}");
        }

        if ($result['errors'] !== []) {
            return self::FAILURE;
        }

        if (count($result['rows']) > 500) {
            $this->error('Too many rows (max 500).');

            return self::FAILURE;
        }

        $latestClose = $this->latestClosureDate($bookUserId);
        if ($latestClose && ! $this->option('force')) {
            $this->warn("Latest ledger close: {$latestClose}. Rows on/before that date are skipped unless you use --force.");
        }

        $rows = [];
        foreach ($result['rows'] as $r) {
            if ($latestClose && ! $this->option('force')) {
                if (Carbon::parse($r['entry_date'])->lte(Carbon::parse($latestClose))) {
                    $this->warn("Line {$r['line']}: skipped (on/before close {$latestClose}).");

                    continue;
                }
            }
            $rows[] = $r;
        }

        if ($rows === []) {
            $this->warn('No data rows to import.');

            return self::SUCCESS;
        }

        $this->info('Parsed '.count($rows).' row(s). Book user_id='.$bookUserId.', entered_by='.$enteredById.', status=pending.');

        if ($this->option('dry-run')) {
            $this->info('Dry run: no database changes.');

            return self::SUCCESS;
        }

        $inserted = 0;
        DB::transaction(function () use ($rows, $bookUserId, $enteredById, &$inserted) {
            foreach ($rows as $r) {
                LedgerEntry::create([
                    'user_id' => $bookUserId,
                    'entered_by' => $enteredById,
                    'approved_by' => null,
                    'entry_date' => $r['entry_date'],
                    'ledger' => $r['ledger'],
                    'direction' => $r['direction'],
                    'amount' => $r['amount'],
                    'particulars' => $r['particulars'],
                    'note' => $r['note'],
                    'status' => LedgerEntry::STATUS_PENDING,
                    'approved_at' => null,
                ]);
                $inserted++;
            }
        });

        $this->info("Inserted {$inserted} pending ledger entr".($inserted === 1 ? 'y' : 'ies').'.');

        return self::SUCCESS;
    }

    private function latestClosureDate(int $bookUserId): ?string
    {
        $row = LedgerClosure::query()
            ->where('user_id', $bookUserId)
            ->orderByDesc('closed_through_date')
            ->orderByDesc('id')
            ->first();

        return $row?->closed_through_date?->toDateString();
    }
}
