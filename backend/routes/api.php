<?php

use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\BulkImportController;
use App\Http\Controllers\Api\CategoryController;
use App\Http\Controllers\Api\DashboardController;
use App\Http\Controllers\Api\IncomeFromImsController;
use App\Http\Controllers\Api\IncomeFromSmsController;
use App\Http\Controllers\Api\LedgerController;
use App\Http\Controllers\Api\LoanController;
use App\Http\Controllers\Api\ProjectController;
use App\Http\Controllers\Api\ReportController;
use App\Http\Controllers\Api\SettingController;
use App\Http\Controllers\Api\SubcategoryController;
use App\Http\Controllers\Api\TransactionController;
use Illuminate\Support\Facades\Route;

Route::post('/login', [AuthController::class, 'login']);

// IMS integration - API key auth (no Sanctum)
Route::post('/income/from-ims', [IncomeFromImsController::class, 'store'])
    ->middleware('ims.api_key');

// SMS integration - API key auth (no Sanctum)
Route::post('/income/from-sms', [IncomeFromSmsController::class, 'store'])
    ->middleware('sms.api_key');

Route::middleware(['auth:sanctum'])->group(function () {
    Route::post('/logout', [AuthController::class, 'logout']);
    Route::get('/me', [AuthController::class, 'me']);

    Route::get('/dashboard/summary', [DashboardController::class, 'summary']);

    Route::apiResource('projects', ProjectController::class);
    Route::apiResource('categories', CategoryController::class);
    Route::apiResource('subcategories', SubcategoryController::class);
    Route::apiResource('transactions', TransactionController::class);
    Route::post('/loans/{loan}/payments', [LoanController::class, 'storePayment']);
    Route::put('/loans/{loan}/payments/{payment}', [LoanController::class, 'updatePayment']);
    Route::delete('/loans/{loan}/payments/{payment}', [LoanController::class, 'destroyPayment']);

    Route::post('/loans/{loan}/disbursements', [LoanController::class, 'storeDisbursement']);
    Route::put('/loans/{loan}/disbursements/{disbursement}', [LoanController::class, 'updateDisbursement']);
    Route::delete('/loans/{loan}/disbursements/{disbursement}', [LoanController::class, 'destroyDisbursement']);

    Route::apiResource('loans', LoanController::class);

    Route::get('/reports/summary', [ReportController::class, 'summary']);
    Route::get('/reports/export/csv', [ReportController::class, 'exportCsv']);
    Route::get('/reports/export/pdf', [ReportController::class, 'exportPdf']);

    Route::get('/settings', [SettingController::class, 'index']);
    Route::put('/settings', [SettingController::class, 'update']);
    Route::post('/settings/clear-all-data', [SettingController::class, 'clearAllData']);

    // Bulk Import
    Route::post('/bulk-import/transactions', [BulkImportController::class, 'importTransactions']);
    Route::post('/bulk-import/loans', [BulkImportController::class, 'importLoans']);
    Route::get('/bulk-import/transactions/template', [BulkImportController::class, 'exportTransactionTemplate']);
    Route::get('/bulk-import/loans/template', [BulkImportController::class, 'exportLoanTemplate']);

    // Ledgers (cash / bank book — routes must stay registered or deploy overwrites break the live API)
    Route::get('/ledgers/summary', [LedgerController::class, 'summary']);
    Route::get('/ledgers', [LedgerController::class, 'index']);
    Route::post('/ledgers', [LedgerController::class, 'store']);
    Route::post('/ledgers/import-csv', [LedgerController::class, 'importCsv']);
    Route::post('/ledgers/send-approval-otp', [LedgerController::class, 'sendApprovalOtp']);
    Route::post('/ledgers/approve-bulk', [LedgerController::class, 'approveBulk']);
    Route::post('/ledgers/{ledgerEntry}/approve', [LedgerController::class, 'approve']);
    Route::put('/ledgers/{ledgerEntry}', [LedgerController::class, 'update']);
    Route::delete('/ledgers/{ledgerEntry}', [LedgerController::class, 'destroy']);
    Route::get('/ledgers/statement', [LedgerController::class, 'statement']);
    Route::get('/ledgers/statement/export-csv', [LedgerController::class, 'statementExportCsv']);
    Route::get('/ledgers/statement/export-pdf', [LedgerController::class, 'statementExportPdf']);
    Route::get('/ledgers/closure-status', [LedgerController::class, 'closureStatus']);
    Route::get('/ledgers/closures', [LedgerController::class, 'closures']);
    Route::post('/ledgers/closures', [LedgerController::class, 'closeStore']);
    Route::delete('/ledgers/closures/{ledgerClosure}', [LedgerController::class, 'closeDestroy']);
});

