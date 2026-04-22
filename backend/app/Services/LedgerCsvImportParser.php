<?php

namespace App\Services;

use App\Models\LedgerEntry;
use Carbon\Carbon;

/**
 * Parses ledger bulk-import CSV files (header row + data rows).
 *
 * @phpstan-type ParsedRow array{line: int, entry_date: string, ledger: string, direction: string, amount: float, particulars: string, note: string}
 * @phpstan-type ParsedRowBody array{entry_date: string, ledger: string, direction: string, amount: float, particulars: string, note: string}
 * @phpstan-type LineError array{line: int, message: string}
 */
final class LedgerCsvImportParser
{
    /**
     * @return array{rows: list<ParsedRow>, errors: list<LineError>, header_error: ?string}
     */
    public function parse(string $absolutePath): array
    {
        $handle = fopen($absolutePath, 'rb');
        if ($handle === false) {
            return [
                'rows' => [],
                'errors' => [],
                'header_error' => 'Could not read the uploaded file.',
            ];
        }

        $headerRow = fgetcsv($handle);
        if ($headerRow === false || $headerRow === [null] || $headerRow === ['']) {
            fclose($handle);

            return [
                'rows' => [],
                'errors' => [],
                'header_error' => 'CSV is empty.',
            ];
        }

        $headerRow = array_map(fn ($h) => strtolower(trim((string) $h, " \t\n\r\0\x0B\xEF\xBB\xBF")), $headerRow);
        $headerRow[0] = preg_replace('/^\xEF\xBB\xBF/', '', $headerRow[0] ?? '') ?? '';

        $indexes = $this->mapHeaderIndexes($headerRow);
        $missing = array_keys(array_filter($indexes, fn ($v) => $v === null));
        if ($missing !== []) {
            fclose($handle);

            return [
                'rows' => [],
                'errors' => [],
                'header_error' => 'Missing columns: '.implode(', ', $missing).'. Use: Date, Type, Ledger, Amount, Particulars, Description (any column order).',
            ];
        }

        $rows = [];
        $errors = [];
        $lineNo = 1;
        while (($data = fgetcsv($handle)) !== false) {
            $lineNo++;
            if ($this->rowIsEmpty($data)) {
                continue;
            }
            $parsed = $this->parseDataRow($data, $indexes);
            if (is_string($parsed)) {
                $errors[] = ['line' => $lineNo, 'message' => $parsed];
                continue;
            }
            $rows[] = array_merge($parsed, ['line' => $lineNo]);
        }
        fclose($handle);

        return [
            'rows' => $rows,
            'errors' => $errors,
            'header_error' => null,
        ];
    }

    /**
     * @return array<string, int|null>
     */
    private function mapHeaderIndexes(array $headerRow): array
    {
        $indexes = [
            'date' => null,
            'type' => null,
            'ledger' => null,
            'amount' => null,
            'particulars' => null,
            'description' => null,
        ];

        foreach ($headerRow as $i => $name) {
            $name = preg_replace('/^\xEF\xBB\xBF/', '', (string) $name);
            $name = strtolower(trim((string) $name));
            match ($name) {
                'date', 'entry_date' => $indexes['date'] = $i,
                'type', 'direction' => $indexes['type'] = $i,
                'ledger' => $indexes['ledger'] = $i,
                'amount' => $indexes['amount'] = $i,
                'particulars' => $indexes['particulars'] = $i,
                'description', 'note' => $indexes['description'] = $i,
                default => null,
            };
        }

        return $indexes;
    }

    /**
     * @param  array<int, string|null>  $data
     * @param  array<string, int|null>  $indexes
     * @return ParsedRowBody|string string = user-facing error
     */
    private function parseDataRow(array $data, array $indexes): array|string
    {
        $dateRaw = trim((string) ($data[$indexes['date']] ?? ''));
        $typeRaw = strtolower(trim((string) ($data[$indexes['type']] ?? '')));
        $ledgerRaw = strtolower(trim((string) ($data[$indexes['ledger']] ?? '')));
        $amountRaw = trim((string) ($data[$indexes['amount']] ?? ''));
        $particulars = trim((string) ($data[$indexes['particulars']] ?? ''));
        $note = trim((string) ($data[$indexes['description']] ?? ''));

        $entryDate = $this->parseDate($dateRaw);
        if ($entryDate === null) {
            return "Invalid date \"{$dateRaw}\" (use DD/MM/YY, DD/MM/YYYY, or YYYY-MM-DD).";
        }

        $direction = match ($typeRaw) {
            'paid', 'pay', 'dr', 'debit' => LedgerEntry::DIR_PAID,
            'received', 'recv', 'cr', 'credit' => LedgerEntry::DIR_RECEIVED,
            default => null,
        };
        if ($direction === null) {
            return "Invalid Type \"{$typeRaw}\" — use Paid or Received.";
        }

        $ledger = match ($ledgerRaw) {
            'cash' => LedgerEntry::LEDGER_CASH,
            'bank' => LedgerEntry::LEDGER_BANK,
            default => null,
        };
        if ($ledger === null) {
            return "Invalid Ledger \"{$ledgerRaw}\" — use cash or bank.";
        }

        $amountRaw = str_replace([',', ' '], '', $amountRaw);
        $amount = (float) $amountRaw;
        if ($amount <= 0 || ! is_finite($amount)) {
            return 'Amount must be a number greater than 0.';
        }

        if ($particulars === '' || $note === '') {
            return 'Particulars and Description are required.';
        }

        if (strlen($particulars) > 255 || strlen($note) > 255) {
            return 'Particulars and Description must be 255 characters or less.';
        }

        return [
            'entry_date' => $entryDate,
            'ledger' => $ledger,
            'direction' => $direction,
            'amount' => round($amount, 2),
            'particulars' => $particulars,
            'note' => $note,
        ];
    }

    private function parseDate(string $raw): ?string
    {
        $raw = trim($raw);
        if ($raw === '') {
            return null;
        }

        $formats = ['Y-m-d', 'd/m/Y', 'd/m/y', 'j/n/Y', 'j/n/y', 'd-m-Y', 'd-m-y'];
        foreach ($formats as $fmt) {
            try {
                $d = Carbon::createFromFormat($fmt, $raw);
                if ($d instanceof Carbon && $d->format($fmt) === $raw) {
                    return $d->toDateString();
                }
            } catch (\Throwable) {
                // try next format
            }
        }

        try {
            return Carbon::parse($raw)->toDateString();
        } catch (\Throwable) {
            return null;
        }
    }

    /**
     * @param  array<int, string|null>|false  $data
     */
    private function rowIsEmpty(array|false $data): bool
    {
        if ($data === false) {
            return true;
        }
        foreach ($data as $cell) {
            if (trim((string) $cell) !== '') {
                return false;
            }
        }

        return true;
    }
}
