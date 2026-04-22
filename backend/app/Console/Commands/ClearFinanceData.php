<?php

namespace App\Console\Commands;

use App\Models\Category;
use App\Models\Loan;
use App\Models\LoanPayment;
use App\Models\Project;
use App\Models\Subcategory;
use App\Models\Transaction;
use Illuminate\Console\Command;

class ClearFinanceData extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'finance:clear';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Clear all finance data (transactions, loans, projects, categories, subcategories) while preserving users and settings';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $this->info('Clearing all finance data...');

        // Delete in order to respect foreign key constraints
        $this->info('Deleting loan payments...');
        LoanPayment::truncate();
        $this->info('✓ Loan payments cleared');

        $this->info('Deleting transactions...');
        Transaction::truncate();
        $this->info('✓ Transactions cleared');

        $this->info('Deleting loans...');
        Loan::truncate();
        $this->info('✓ Loans cleared');

        $this->info('Deleting subcategories...');
        Subcategory::truncate();
        $this->info('✓ Subcategories cleared');

        $this->info('Deleting categories...');
        Category::truncate();
        $this->info('✓ Categories cleared');

        $this->info('Deleting projects...');
        Project::truncate();
        $this->info('✓ Projects cleared');

        $this->newLine();
        $this->info('✅ All finance data has been cleared successfully!');
        $this->info('Users and settings have been preserved.');
        $this->newLine();
        $this->info('You can now run: php artisan db:seed');
        $this->info('Or provide your new projects, categories, and subcategories list.');

        return Command::SUCCESS;
    }
}
