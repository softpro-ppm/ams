<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Category;
use App\Models\Loan;
use App\Models\Project;
use App\Models\Subcategory;
use App\Models\Transaction;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Validator;
use PhpOffice\PhpSpreadsheet\IOFactory;
use PhpOffice\PhpSpreadsheet\Spreadsheet;
use PhpOffice\PhpSpreadsheet\Writer\Xlsx;
use Symfony\Component\HttpFoundation\StreamedResponse;

class BulkImportController extends Controller
{
    /**
     * Import transactions from Excel file
     * All-or-nothing approach: Validate all rows first, only import if all are valid
     */
    public function importTransactions(Request $request)
    {
        $request->validate([
            'file' => 'required|file|mimes:xlsx,xls|max:10240', // 10MB max
        ]);

        $userId = $request->user()->bookOwnerId();
        $file = $request->file('file');

        try {
            $spreadsheet = IOFactory::load($file->getRealPath());
            $worksheet = $spreadsheet->getActiveSheet();
            $rows = $worksheet->toArray();

            // Skip header row
            $headerRow = array_shift($rows);
            
            $results = [
                'successful' => 0,
                'failed' => 0,
                'errors' => [],
                'all_valid' => false,
            ];

            // ========== PHASE 1: VALIDATE ALL ROWS FIRST ==========
            $validatedRows = [];
            $validationErrors = [];
            $duplicateKeysInFile = [];

            foreach ($rows as $index => $row) {
                $rowNumber = $index + 2; // +2 because we removed header and arrays are 0-indexed
                
                try {
                    // Map row data
                    $data = [
                        'date' => $row[0] ?? null,
                        'type' => strtolower(trim($row[1] ?? '')),
                        'project_name' => trim($row[2] ?? ''),
                        'category_name' => trim($row[3] ?? ''),
                        'subcategory_name' => trim($row[4] ?? ''),
                        'amount' => $row[5] ?? null,
                        'paid_amount' => $row[6] ?? null,
                        'balance_amount' => $row[7] ?? null,
                        'phone_number' => trim($row[8] ?? ''),
                        'reference' => trim($row[9] ?? ''),
                        'description' => trim($row[10] ?? ''),
                    ];

                    // Validate row data structure
                    $validator = Validator::make($data, [
                        'date' => 'required|string',
                        'type' => 'required|in:income,expense',
                        'project_name' => 'required|string|max:160',
                        'category_name' => 'required|string|max:160',
                        'subcategory_name' => 'required|string|max:160',
                        'amount' => 'required|numeric|min:0',
                        'paid_amount' => 'nullable|numeric|min:0',
                        'balance_amount' => 'nullable|numeric',
                        'phone_number' => 'nullable|string|size:10|regex:/^[0-9]{10}$/',
                        'reference' => 'nullable|string|max:120',
                        'description' => 'nullable|string|max:255',
                    ]);

                    if ($validator->fails()) {
                        $validationErrors[] = [
                            'row' => $rowNumber,
                            'data' => $data,
                            'row_data' => $row,
                            'errors' => $validator->errors()->all(),
                        ];
                        continue;
                    }

                    // Validate date format
                    $date = $this->parseDate($data['date']);
                    if (!$date) {
                        $validationErrors[] = [
                            'row' => $rowNumber,
                            'data' => $data,
                            'row_data' => $row,
                            'errors' => ['Invalid date format. Expected DD-MM-YYYY'],
                        ];
                        continue;
                    }

                    // Check for duplicates within the file
                    $duplicateKey = implode('|', [
                        $date,
                        $data['type'],
                        $data['amount'],
                        $data['project_name'],
                        $data['category_name'],
                        $data['subcategory_name'],
                        $data['phone_number'] ?? '',
                        $data['reference'] ?? '',
                    ]);

                    if (isset($duplicateKeysInFile[$duplicateKey])) {
                        $validationErrors[] = [
                            'row' => $rowNumber,
                            'data' => $data,
                            'row_data' => $row,
                            'errors' => ['Duplicate transaction found in import file (duplicate of row ' . $duplicateKeysInFile[$duplicateKey] . ')'],
                        ];
                        continue;
                    }

                    $duplicateKeysInFile[$duplicateKey] = $rowNumber;

                    // Store validated row for import phase
                    $validatedRows[] = [
                        'row_number' => $rowNumber,
                        'row_data' => $row,
                        'data' => $data,
                        'date' => $date,
                    ];

                } catch (\Exception $e) {
                    $validationErrors[] = [
                        'row' => $rowNumber,
                        'data' => $row,
                        'row_data' => $row,
                        'errors' => ['Unexpected error: ' . $e->getMessage()],
                    ];
                }
            }

            // If there are validation errors, return them without importing
            if (!empty($validationErrors)) {
                $results['failed'] = count($validationErrors);
                $results['errors'] = $validationErrors;
                $results['all_valid'] = false;
                return response()->json($results);
            }

            // ========== PHASE 2: CHECK FOR DATABASE DUPLICATES ==========
            $duplicateErrors = [];
            
            foreach ($validatedRows as $validatedRow) {
                $data = $validatedRow['data'];
                $date = $validatedRow['date'];
                
                // Get or create project (for duplicate check)
                $project = Project::firstOrCreate(
                    ['user_id' => $userId, 'name' => $data['project_name']],
                    ['color' => $this->generateColor(), 'is_active' => true]
                );

                // Get or create category
                $category = Category::firstOrCreate(
                    ['user_id' => $userId, 'name' => $data['category_name'], 'type' => $data['type']],
                    ['color' => $this->generateColor(), 'is_active' => true]
                );

                // Get or create subcategory
                $subcategory = Subcategory::firstOrCreate(
                    ['user_id' => $userId, 'category_id' => $category->id, 'name' => $data['subcategory_name']],
                    ['color' => $this->generateColor(), 'is_active' => true]
                );

                // Check for duplicate in database
                $duplicateQuery = Transaction::where('user_id', $userId)
                    ->where('transaction_date', $date)
                    ->where('type', $data['type'])
                    ->where('amount', $data['amount'])
                    ->where('project_id', $project->id)
                    ->where('category_id', $category->id)
                    ->where('subcategory_id', $subcategory->id);
                
                if (!empty($data['phone_number'])) {
                    $duplicateQuery->where('phone_number', $data['phone_number']);
                } else {
                    $duplicateQuery->whereNull('phone_number');
                }
                
                if (!empty($data['reference'])) {
                    $duplicateQuery->where('reference', $data['reference']);
                } else {
                    $duplicateQuery->whereNull('reference');
                }
                
                if ($duplicateQuery->exists()) {
                    $duplicateErrors[] = [
                        'row' => $validatedRow['row_number'],
                        'data' => $validatedRow['data'],
                        'row_data' => $validatedRow['row_data'],
                        'errors' => ['Duplicate transaction found in database'],
                    ];
                }
            }

            // If there are database duplicate errors, return them without importing
            if (!empty($duplicateErrors)) {
                $results['failed'] = count($duplicateErrors);
                $results['errors'] = $duplicateErrors;
                $results['all_valid'] = false;
                return response()->json($results);
            }

            // ========== PHASE 3: ALL VALID - IMPORT ALL ROWS IN SINGLE TRANSACTION ==========
            DB::beginTransaction();

            try {
                foreach ($validatedRows as $validatedRow) {
                    $data = $validatedRow['data'];
                    $date = $validatedRow['date'];

                    // Get or create project
                    $project = Project::firstOrCreate(
                        ['user_id' => $userId, 'name' => $data['project_name']],
                        ['color' => $this->generateColor(), 'is_active' => true]
                    );

                    // Get or create category
                    $category = Category::firstOrCreate(
                        ['user_id' => $userId, 'name' => $data['category_name'], 'type' => $data['type']],
                        ['color' => $this->generateColor(), 'is_active' => true]
                    );

                    // Get or create subcategory
                    $subcategory = Subcategory::firstOrCreate(
                        ['user_id' => $userId, 'category_id' => $category->id, 'name' => $data['subcategory_name']],
                        ['color' => $this->generateColor(), 'is_active' => true]
                    );

                    // Use paid_amount from Excel, or default to 0 if not provided
                    $paidAmount = $data['paid_amount'] !== null && $data['paid_amount'] !== '' ? (float) $data['paid_amount'] : 0;

                    // Create transaction
                    Transaction::create([
                        'user_id' => $userId,
                        'project_id' => $project->id,
                        'category_id' => $category->id,
                        'subcategory_id' => $subcategory->id,
                        'type' => $data['type'],
                        'amount' => $data['amount'],
                        'paid_amount' => $paidAmount,
                        'transaction_date' => $date,
                        'description' => $data['description'] ?: null,
                        'reference' => $data['reference'] ?: null,
                        'phone_number' => $data['phone_number'] ?: null,
                    ]);
                }

                DB::commit();
                
                $results['successful'] = count($validatedRows);
                $results['all_valid'] = true;
                
                return response()->json($results);
                
            } catch (\Exception $e) {
                DB::rollBack();
                Log::error('Bulk import transactions error during import: ' . $e->getMessage());
                return response()->json([
                    'successful' => 0,
                    'failed' => count($validatedRows),
                    'errors' => [['row' => 0, 'data' => [], 'row_data' => [], 'errors' => ['Import failed: ' . $e->getMessage()]]],
                    'all_valid' => false,
                ], 500);
            }

        } catch (\Exception $e) {
            Log::error('Bulk import transactions error: ' . $e->getMessage());
            return response()->json([
                'successful' => 0,
                'failed' => 0,
                'errors' => [['row' => 0, 'data' => [], 'row_data' => [], 'errors' => ['File processing error: ' . $e->getMessage()]]],
                'all_valid' => false,
            ], 500);
        }
    }

    /**
     * Import loans from Excel file
     * All-or-nothing approach: Validate all rows first, only import if all are valid
     */
    public function importLoans(Request $request)
    {
        $request->validate([
            'file' => 'required|file|mimes:xlsx,xls|max:10240', // 10MB max
        ]);

        $userId = $request->user()->bookOwnerId();
        $file = $request->file('file');

        try {
            $spreadsheet = IOFactory::load($file->getRealPath());
            $worksheet = $spreadsheet->getActiveSheet();
            $rows = $worksheet->toArray();

            // Skip header row
            array_shift($rows);
            
            $results = [
                'successful' => 0,
                'failed' => 0,
                'errors' => [],
                'all_valid' => false,
            ];

            // ========== PHASE 1: VALIDATE ALL ROWS FIRST ==========
            $validatedRows = [];
            $validationErrors = [];
            $duplicateKeysInFile = [];

            foreach ($rows as $index => $row) {
                $rowNumber = $index + 2;
                
                try {
                    // Map row data: Customer Name, Loan Type, Project Name, Total Amount (Principal), Paid, Balance, Start Date, Customer Phone, Description
                    $data = [
                        'name' => trim($row[0] ?? ''),
                        'type' => strtolower(trim($row[1] ?? '')),
                        'project_name' => trim($row[2] ?? ''),
                        'principal' => $row[3] ?? null,
                        'paid_amount' => $row[4] ?? null,
                        'balance_amount' => $row[5] ?? null,
                        'start_date' => $row[6] ?? null,
                        'phone_number' => trim($row[7] ?? ''),
                        'description' => trim($row[8] ?? ''),
                    ];

                    // Validate row data structure
                    $validator = Validator::make($data, [
                        'name' => 'required|string|max:160',
                        'type' => 'required|in:given,received',
                        'project_name' => 'required|string|max:160',
                        'principal' => 'required|numeric|min:0',
                        'paid_amount' => 'nullable|numeric|min:0',
                        'balance_amount' => 'nullable|numeric',
                        'start_date' => 'required|string',
                        'phone_number' => 'nullable|string|size:10|regex:/^[0-9]{10}$/',
                        'description' => 'nullable|string',
                    ]);

                    if ($validator->fails()) {
                        $validationErrors[] = [
                            'row' => $rowNumber,
                            'data' => $data,
                            'row_data' => $row,
                            'errors' => $validator->errors()->all(),
                        ];
                        continue;
                    }

                    // Validate date format
                    $startDate = $this->parseDate($data['start_date']);
                    if (!$startDate) {
                        $validationErrors[] = [
                            'row' => $rowNumber,
                            'data' => $data,
                            'row_data' => $row,
                            'errors' => ['Invalid date format. Expected DD-MM-YYYY'],
                        ];
                        continue;
                    }

                    // Check for duplicates within the file
                    $duplicateKey = implode('|', [
                        $data['name'],
                        $data['type'],
                        $data['principal'],
                        $startDate,
                        $data['project_name'],
                    ]);

                    if (isset($duplicateKeysInFile[$duplicateKey])) {
                        $validationErrors[] = [
                            'row' => $rowNumber,
                            'data' => $data,
                            'row_data' => $row,
                            'errors' => ['Duplicate loan found in import file (duplicate of row ' . $duplicateKeysInFile[$duplicateKey] . ')'],
                        ];
                        continue;
                    }

                    $duplicateKeysInFile[$duplicateKey] = $rowNumber;

                    // Store validated row for import phase
                    $validatedRows[] = [
                        'row_number' => $rowNumber,
                        'row_data' => $row,
                        'data' => $data,
                        'start_date' => $startDate,
                    ];

                } catch (\Exception $e) {
                    $validationErrors[] = [
                        'row' => $rowNumber,
                        'data' => $row,
                        'row_data' => $row,
                        'errors' => ['Unexpected error: ' . $e->getMessage()],
                    ];
                }
            }

            // If there are validation errors, return them without importing
            if (!empty($validationErrors)) {
                $results['failed'] = count($validationErrors);
                $results['errors'] = $validationErrors;
                $results['all_valid'] = false;
                return response()->json($results);
            }

            // ========== PHASE 2: CHECK FOR DATABASE DUPLICATES ==========
            $duplicateErrors = [];
            
            foreach ($validatedRows as $validatedRow) {
                $data = $validatedRow['data'];
                $startDate = $validatedRow['start_date'];
                
                // Get or create project (for duplicate check)
                $project = Project::firstOrCreate(
                    ['user_id' => $userId, 'name' => $data['project_name']],
                    ['color' => $this->generateColor(), 'is_active' => true]
                );

                // Check for duplicate in database
                $duplicate = Loan::where('user_id', $userId)
                    ->where('name', $data['name'])
                    ->where('type', $data['type'])
                    ->where('principal', $data['principal'])
                    ->where('start_date', $startDate)
                    ->where('project_id', $project->id)
                    ->exists();

                if ($duplicate) {
                    $duplicateErrors[] = [
                        'row' => $validatedRow['row_number'],
                        'data' => $validatedRow['data'],
                        'row_data' => $validatedRow['row_data'],
                        'errors' => ['Duplicate loan found in database'],
                    ];
                }
            }

            // If there are database duplicate errors, return them without importing
            if (!empty($duplicateErrors)) {
                $results['failed'] = count($duplicateErrors);
                $results['errors'] = $duplicateErrors;
                $results['all_valid'] = false;
                return response()->json($results);
            }

            // ========== PHASE 3: ALL VALID - IMPORT ALL ROWS IN SINGLE TRANSACTION ==========
            DB::beginTransaction();

            try {
                foreach ($validatedRows as $validatedRow) {
                    $data = $validatedRow['data'];
                    $startDate = $validatedRow['start_date'];

                    // Get or create project
                    $project = Project::firstOrCreate(
                        ['user_id' => $userId, 'name' => $data['project_name']],
                        ['color' => $this->generateColor(), 'is_active' => true]
                    );

                    // Determine status: if balance is 0 or not provided and principal is 0, status is 'completed', else 'active'
                    $balance = $data['balance_amount'] !== null && $data['balance_amount'] !== '' ? (float) $data['balance_amount'] : null;
                    $status = ($balance === 0 || ($balance === null && $data['principal'] == 0)) ? 'completed' : 'active';

                    // Create loan
                    $loan = Loan::create([
                        'user_id' => $userId,
                        'project_id' => $project->id,
                        'name' => $data['name'],
                        'phone_number' => $data['phone_number'] ?: null,
                        'type' => $data['type'],
                        'principal' => $data['principal'],
                        'start_date' => $startDate,
                        'description' => $data['description'] ?: null,
                        'status' => $status,
                    ]);

                    // If paid_amount is provided, create a payment record to match the balance
                    if ($data['paid_amount'] !== null && $data['paid_amount'] !== '' && (float) $data['paid_amount'] > 0) {
                        \App\Models\LoanPayment::create([
                            'loan_id' => $loan->id,
                            'user_id' => $userId,
                            'amount' => (float) $data['paid_amount'],
                            'paid_on' => $startDate,
                            'flow' => $data['type'] === 'given' ? 'in' : 'out',
                            'note' => 'Initial payment from bulk import',
                        ]);
                    }
                }

                DB::commit();
                
                $results['successful'] = count($validatedRows);
                $results['all_valid'] = true;
                
                return response()->json($results);
                
            } catch (\Exception $e) {
                DB::rollBack();
                Log::error('Bulk import loans error during import: ' . $e->getMessage());
                return response()->json([
                    'successful' => 0,
                    'failed' => count($validatedRows),
                    'errors' => [['row' => 0, 'data' => [], 'row_data' => [], 'errors' => ['Import failed: ' . $e->getMessage()]]],
                    'all_valid' => false,
                ], 500);
            }

        } catch (\Exception $e) {
            Log::error('Bulk import loans error: ' . $e->getMessage());
            return response()->json([
                'successful' => 0,
                'failed' => 0,
                'errors' => [['row' => 0, 'data' => [], 'row_data' => [], 'errors' => ['File processing error: ' . $e->getMessage()]]],
                'all_valid' => false,
            ], 500);
        }
    }

    /**
     * Export transaction template Excel file
     */
    public function exportTransactionTemplate(): StreamedResponse
    {
        $spreadsheet = new Spreadsheet();
        $sheet = $spreadsheet->getActiveSheet();

        // Set headers: Date, Type, Project Name, Category Name, Subcategory Name, Amount, Paid, Balance, Phone Number, Full Name, Description
        $headers = ['Date', 'Type', 'Project Name', 'Category Name', 'Subcategory Name', 'Amount', 'Paid', 'Balance', 'Phone Number', 'Full Name', 'Description'];
        
        // Set example rows with multiple samples
        $exampleRows = [
            [
                '23-04-2025',
                'income',
                'Softpro HO',
                'GST',
                'GST Returns',
                35000,
                0,
                35000,
                '',
                'Pankaj Nemani',
                'GST Audit',
            ],
            [
                '22-09-2025',
                'expense',
                'Softpro HO',
                'GST',
                'GST Returns',
                8000,
                8000,
                0,
                '9989049323',
                'Balaga venkata ramana garu',
                'Gst',
            ],
            [
                '31-12-2025',
                'income',
                'Softpro HO',
                'Services',
                'Consulting',
                50000,
                20000,
                30000,
                '9876543210',
                'ABC Company',
                'Monthly consulting fee',
            ],
        ];
        
        // Add instructions
        $sheet->setCellValue('A1', 'INSTRUCTIONS:');
        $sheet->getStyle('A1')->getFont()->setBold(true);
        $sheet->setCellValue('A2', '1. Date format must be DD-MM-YYYY (e.g., 23-04-2025)');
        $sheet->setCellValue('A3', '2. Type must be exactly: income or expense (lowercase)');
        $sheet->setCellValue('A4', '3. Amount = Total transaction amount');
        $sheet->setCellValue('A5', '4. Paid = Amount already paid (can be 0 or partial)');
        $sheet->setCellValue('A6', '5. Balance = Remaining balance (Amount - Paid)');
        $sheet->setCellValue('A7', '6. Phone Number is optional but must be exactly 10 digits if provided');
        $sheet->setCellValue('A8', '7. Projects, Categories, and Subcategories will be created automatically if they don\'t exist');
        $sheet->mergeCells('A1:K1');
        $sheet->mergeCells('A2:K2');
        $sheet->mergeCells('A3:K3');
        $sheet->mergeCells('A4:K4');
        $sheet->mergeCells('A5:K5');
        $sheet->mergeCells('A6:K6');
        $sheet->mergeCells('A7:K7');
        $sheet->mergeCells('A8:K8');
        $sheet->getStyle('A1:A8')->getFill()
            ->setFillType(\PhpOffice\PhpSpreadsheet\Style\Fill::FILL_SOLID)
            ->getStartColor()->setARGB('FFFFF2CC');
        
        // Add headers and data
        $sheet->fromArray([$headers], null, 'A10');
        $sheet->fromArray($exampleRows, null, 'A11');
        
        // Style header row
        $sheet->getStyle('A10:K10')->getFont()->setBold(true);
        $sheet->getStyle('A10:K10')->getFill()
            ->setFillType(\PhpOffice\PhpSpreadsheet\Style\Fill::FILL_SOLID)
            ->getStartColor()->setARGB('FF4472C4');
        $sheet->getStyle('A10:K10')->getFont()->getColor()->setARGB('FFFFFFFF');

        // Auto-size columns
        foreach (range('A', 'K') as $col) {
            $sheet->getColumnDimension($col)->setAutoSize(true);
        }

        $writer = new Xlsx($spreadsheet);
        $response = new StreamedResponse(function () use ($writer) {
            $writer->save('php://output');
        });

        $response->headers->set('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        $response->headers->set('Content-Disposition', 'attachment;filename="transaction_template.xlsx"');
        $response->headers->set('Cache-Control', 'max-age=0');

        return $response;
    }

    /**
     * Export loan template Excel file
     */
    public function exportLoanTemplate(): StreamedResponse
    {
        $spreadsheet = new Spreadsheet();
        $sheet = $spreadsheet->getActiveSheet();

        // Set headers: Customer Name, Loan Type, Project Name, Total Amount (Principal), Paid, Balance, Start Date, Customer Phone, Description
        $headers = ['Customer Name', 'Loan Type', 'Project Name', 'Total Amount (Principal)', 'Paid', 'Balance', 'Start Date', 'Customer Phone', 'Description'];
        
        // Set example rows with multiple samples
        $exampleRows = [
            [
                'Palaka Sankara Rao',
                'given',
                'Softpro HO',
                1200,
                0,
                1200,
                '24-03-2025',
                '9701170475',
                'insurance balance',
            ],
            [
                'MPP Komarada',
                'given',
                'Softpro HO',
                2500,
                1000,
                1500,
                '28-03-2025',
                '8074364299',
                'GST(Feb-2025)',
            ],
            [
                'Rajesh Kumar',
                'received',
                'Project Alpha',
                5000,
                5000,
                0,
                '15-01-2025',
                '9123456789',
                'Business loan',
            ],
        ];
        
        // Add instructions
        $sheet->setCellValue('A1', 'INSTRUCTIONS:');
        $sheet->getStyle('A1')->getFont()->setBold(true);
        $sheet->setCellValue('A2', '1. Date format must be DD-MM-YYYY (e.g., 24-03-2025)');
        $sheet->setCellValue('A3', '2. Loan Type must be exactly: given or received (lowercase)');
        $sheet->setCellValue('A4', '3. Total Amount (Principal) = Initial loan amount given/received');
        $sheet->setCellValue('A5', '4. Paid = Amount already paid back (can be 0 or partial)');
        $sheet->setCellValue('A6', '5. Balance = Remaining balance (Principal - Paid)');
        $sheet->setCellValue('A7', '6. Status is automatically calculated: If Balance = 0 → "completed", else → "active"');
        $sheet->setCellValue('A8', '7. Customer Phone is optional but must be exactly 10 digits if provided');
        $sheet->setCellValue('A9', '8. Projects will be created automatically if they don\'t exist');
        $sheet->mergeCells('A1:I1');
        $sheet->mergeCells('A2:I2');
        $sheet->mergeCells('A3:I3');
        $sheet->mergeCells('A4:I4');
        $sheet->mergeCells('A5:I5');
        $sheet->mergeCells('A6:I6');
        $sheet->mergeCells('A7:I7');
        $sheet->mergeCells('A8:I8');
        $sheet->mergeCells('A9:I9');
        $sheet->getStyle('A1:A9')->getFill()
            ->setFillType(\PhpOffice\PhpSpreadsheet\Style\Fill::FILL_SOLID)
            ->getStartColor()->setARGB('FFFFF2CC');
        
        // Add headers and data
        $sheet->fromArray([$headers], null, 'A11');
        $sheet->fromArray($exampleRows, null, 'A12');
        
        // Style header row
        $sheet->getStyle('A11:I11')->getFont()->setBold(true);
        $sheet->getStyle('A11:I11')->getFill()
            ->setFillType(\PhpOffice\PhpSpreadsheet\Style\Fill::FILL_SOLID)
            ->getStartColor()->setARGB('FF4472C4');
        $sheet->getStyle('A11:I11')->getFont()->getColor()->setARGB('FFFFFFFF');

        // Auto-size columns
        foreach (range('A', 'I') as $col) {
            $sheet->getColumnDimension($col)->setAutoSize(true);
        }

        $writer = new Xlsx($spreadsheet);
        $response = new StreamedResponse(function () use ($writer) {
            $writer->save('php://output');
        });

        $response->headers->set('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        $response->headers->set('Content-Disposition', 'attachment;filename="loan_template.xlsx"');
        $response->headers->set('Cache-Control', 'max-age=0');

        return $response;
    }

    /**
     * Parse date from DD-MM-YYYY format to YYYY-MM-DD
     */
    private function parseDate(string $dateString): ?string
    {
        try {
            // Try DD-MM-YYYY format
            $date = Carbon::createFromFormat('d-m-Y', trim($dateString));
            if ($date) {
                return $date->format('Y-m-d');
            }
        } catch (\Exception $e) {
            // Try other common formats
            try {
                $date = Carbon::parse($dateString);
                return $date->format('Y-m-d');
            } catch (\Exception $e2) {
                return null;
            }
        }

        return null;
    }

    /**
     * Generate a random color for projects/categories
     */
    private function generateColor(): string
    {
        $colors = [
            '#3b82f6', // blue
            '#10b981', // emerald
            '#f59e0b', // amber
            '#ef4444', // red
            '#8b5cf6', // purple
            '#ec4899', // pink
            '#06b6d4', // cyan
            '#84cc16', // lime
        ];
        
        return $colors[array_rand($colors)];
    }
}
