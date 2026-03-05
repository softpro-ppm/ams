<?php

/**
 * Export only INSERT statements from SQLite (skip CREATE TABLE)
 */

require __DIR__.'/vendor/autoload.php';

$app = require_once __DIR__.'/bootstrap/app.php';
$app->make(\Illuminate\Contracts\Console\Kernel::class)->bootstrap();

use Illuminate\Support\Facades\DB;

// Get all tables (excluding migrations table)
$tables = [
    'users',
    'projects',
    'categories',
    'subcategories',
    'transactions',
    'loans',
    'loan_payments',
    'loan_disbursements',
    'settings',
    'cache',
    'cache_locks',
    'sessions',
    'password_reset_tokens',
    'personal_access_tokens',
];

$output = "-- MySQL data export from SQLite\n";
$output .= "SET FOREIGN_KEY_CHECKS=0;\n\n";

foreach ($tables as $table) {
    try {
        $rows = DB::table($table)->get();
        
        if ($rows->isEmpty()) {
            continue;
        }
        
        $output .= "-- Table: $table\n";
        
        foreach ($rows as $row) {
            $values = [];
            foreach ((array)$row as $key => $value) {
                if ($value === null) {
                    $values[] = 'NULL';
                } else {
                    // Escape single quotes and wrap in quotes
                    $escaped = addslashes($value);
                    $values[] = "'$escaped'";
                }
            }
            
            $columns = array_keys((array)$row);
            $columnsStr = '`' . implode('`, `', $columns) . '`';
            $valuesStr = implode(', ', $values);
            
            $output .= "INSERT INTO `$table` ($columnsStr) VALUES ($valuesStr);\n";
        }
        
        $output .= "\n";
    } catch (\Exception $e) {
        echo "Skipping table $table: " . $e->getMessage() . "\n";
    }
}

$output .= "SET FOREIGN_KEY_CHECKS=1;\n";

file_put_contents('database-data-only.sql', $output);

echo "Data export completed!\n";
echo "File: database-data-only.sql\n";
echo "\n";
echo "Next steps:\n";
echo "1. Upload: scp -P 65002 database-data-only.sql u820431346@145.14.146.15:~/domains/softpromis.com/public_html/v2account/\n";
echo "2. Import: mysql -u u820431346_v2account -p u820431346_v2account < database-data-only.sql\n";

