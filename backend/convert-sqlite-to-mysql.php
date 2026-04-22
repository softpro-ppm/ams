<?php

/**
 * Convert SQLite dump to MySQL format
 */

$inputFile = 'database-export.sql';
$outputFile = 'database-mysql.sql';

if (!file_exists($inputFile)) {
    die("Error: $inputFile not found!\n");
}

$content = file_get_contents($inputFile);

// Remove SQLite-specific commands
$content = preg_replace('/^PRAGMA.*$/m', '', $content);
$content = preg_replace('/^BEGIN TRANSACTION;$/m', '', $content);
$content = preg_replace('/^COMMIT;$/m', '', $content);

// Convert CREATE TABLE statements
// integer primary key autoincrement -> INT AUTO_INCREMENT PRIMARY KEY
$content = preg_replace(
    '/"id" integer primary key autoincrement not null/',
    '`id` INT AUTO_INCREMENT PRIMARY KEY',
    $content
);

// Convert other integer fields
$content = preg_replace('/integer(?!\s+primary)/', 'INT', $content);

// Convert varchar
$content = preg_replace('/varchar(?!\()/', 'VARCHAR(255)', $content);

// Convert datetime
$content = preg_replace('/datetime(?!\()/', 'DATETIME', $content);

// Convert text
$content = preg_replace('/\btext\b/', 'TEXT', $content);

// Convert numeric to DECIMAL
$content = preg_replace('/numeric(?!\()/', 'DECIMAL(15,2)', $content);

// Convert tinyint(1) to TINYINT(1)
$content = preg_replace('/tinyint\(1\)/', 'TINYINT(1)', $content);

// Remove SQLite CHECK constraints (MySQL handles them differently)
$content = preg_replace('/\s+check\s+\([^)]+\)/i', '', $content);

// Convert foreign key syntax
$content = preg_replace('/foreign key\("([^"]+)"\)\s+references\s+"([^"]+)"\("([^"]+)"\)\s+(on delete\s+[^,)]+)?/i', 
    'FOREIGN KEY (`$1`) REFERENCES `$2`(`$3`) $4', 
    $content);

// Remove quotes from table and column names, replace with backticks
$content = preg_replace('/"([^"]+)"/', '`$1`', $content);

// Convert INSERT statements - handle NULL values
$content = preg_replace_callback(
    '/INSERT INTO `([^`]+)` VALUES\((.*?)\);/s',
    function($matches) {
        $table = $matches[1];
        $values = $matches[2];
        
        // Split values by comma, but respect quoted strings
        $parts = [];
        $current = '';
        $inQuotes = false;
        $quoteChar = '';
        
        for ($i = 0; $i < strlen($values); $i++) {
            $char = $values[$i];
            
            if (($char === '"' || $char === "'") && ($i === 0 || $values[$i-1] !== '\\')) {
                if (!$inQuotes) {
                    $inQuotes = true;
                    $quoteChar = $char;
                } else if ($char === $quoteChar) {
                    $inQuotes = false;
                }
            }
            
            if ($char === ',' && !$inQuotes) {
                $parts[] = trim($current);
                $current = '';
            } else {
                $current .= $char;
            }
        }
        if ($current !== '') {
            $parts[] = trim($current);
        }
        
        // Convert NULL
        $converted = [];
        foreach ($parts as $part) {
            if (strtoupper(trim($part)) === 'NULL') {
                $converted[] = 'NULL';
            } else {
                $converted[] = $part;
            }
        }
        
        return "INSERT INTO `$table` VALUES(" . implode(',', $converted) . ");";
    },
    $content
);

// Add SET statements at the beginning
$mysqlHeader = "-- MySQL dump converted from SQLite\n";
$mysqlHeader .= "SET FOREIGN_KEY_CHECKS=0;\n";
$mysqlHeader .= "SET SQL_MODE='NO_AUTO_VALUE_ON_ZERO';\n";
$mysqlHeader .= "SET AUTOCOMMIT=0;\n";
$mysqlHeader .= "START TRANSACTION;\n";
$mysqlHeader .= "SET time_zone = '+00:00';\n\n";

$mysqlFooter = "\nSET FOREIGN_KEY_CHECKS=1;\n";
$mysqlFooter .= "COMMIT;\n";

$content = $mysqlHeader . $content . $mysqlFooter;

// Clean up multiple blank lines
$content = preg_replace('/\n{3,}/', "\n\n", $content);

file_put_contents($outputFile, $content);

echo "Conversion completed!\n";
echo "Input:  $inputFile\n";
echo "Output: $outputFile\n";
echo "\n";
echo "Next steps:\n";
echo "1. Review the converted file: $outputFile\n";
echo "2. Upload to server: scp -P 65002 $outputFile u820431346@145.14.146.15:~/domains/softpromis.com/public_html/v2account/\n";
echo "3. Import on server: mysql -u u820431346_v2account -p u820431346_v2account < $outputFile\n";

