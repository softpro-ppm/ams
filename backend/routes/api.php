<?php

use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\BulkImportController;
use App\Http\Controllers\Api\CategoryController;
use App\Http\Controllers\Api\DashboardController;
use App\Http\Controllers\Api\LoanController;
use App\Http\Controllers\Api\ProjectController;
use App\Http\Controllers\Api\ReportController;
use App\Http\Controllers\Api\SettingController;
use App\Http\Controllers\Api\SubcategoryController;
use App\Http\Controllers\Api\TransactionController;
use Illuminate\Support\Facades\Route;

Route::post('/login', [AuthController::class, 'login']);

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
});

