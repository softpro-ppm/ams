<?php

/**
 * Export data from SQLite to MySQL INSERT statements
 */

$dbPath = __DIR__ . '/database/database.sqlite';

if (!file_exists($dbPath)) {
    die("Error: SQLite database not found at $dbPath\n");
}

try {
    $pdo = new PDO("sqlite:$dbPath");
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
} catch (PDOException $e) {
    die("Error connecting to SQLite: " . $e->getMessage() . "\n");
}

// Tables to export (excluding system tables)
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
$output .= "-- Generated: " . date('Y-m-d H:i:s') . "\n\n";
$output .= "SET FOREIGN_KEY_CHECKS=0;\n";
$output .= "SET SQL_MODE='NO_AUTO_VALUE_ON_ZERO';\n\n";

// Get all existing tables first
$allTablesStmt = $pdo->query("SELECT name FROM sqlite_master WHERE type='table'");
$allTables = $allTablesStmt->fetchAll(PDO::FETCH_COLUMN);
$allTablesLower = array_map('strtolower', $allTables);

foreach ($tables as $table) {
    try {
        // Find matching table (case-insensitive)
        $tableIndex = array_search(strtolower($table), $allTablesLower);
        if ($tableIndex === false) {
            echo "Table $table does not exist, skipping...\n";
            continue;
        }
        
        $actualTable = $allTables[$tableIndex];
        
        // Get all rows
        $stmt = $pdo->query("SELECT * FROM \"$actualTable\"");
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        if (empty($rows)) {
            continue;
        }
        
        $output .= "-- Table: $table\n";
        
        foreach ($rows as $row) {
            $columns = array_keys($row);
            $values = [];
            
            foreach ($row as $value) {
                if ($value === null) {
                    $values[] = 'NULL';
                } elseif (is_numeric($value)) {
                    $values[] = $value;
                } else {
                    // Escape and quote strings
                    $escaped = addslashes($value);
                    $values[] = "'$escaped'";
                }
            }
            
            $columnsStr = '`' . implode('`, `', $columns) . '`';
            $valuesStr = implode(', ', $values);
            
            $output .= "INSERT INTO `$table` ($columnsStr) VALUES ($valuesStr);\n";
        }
        
        $output .= "\n";
        
        echo "Exported " . count($rows) . " rows from $table\n";
    } catch (PDOException $e) {
        echo "Error exporting $table: " . $e->getMessage() . "\n";
    }
}

$output .= "SET FOREIGN_KEY_CHECKS=1;\n";

file_put_contents('database-data-only.sql', $output);

echo "\n";
echo "✅ Export completed!\n";
echo "📁 File: database-data-only.sql\n";
echo "\n";
echo "📤 Next steps:\n";
echo "1. Upload: scp -P 65002 database-data-only.sql u820431346@145.14.146.15:~/domains/softpromis.com/public_html/v2account/\n";
echo "2. Import: mysql -u u820431346_v2account -p u820431346_v2account < database-data-only.sql\n";

