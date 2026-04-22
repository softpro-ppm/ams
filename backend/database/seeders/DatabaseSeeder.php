<?php

namespace Database\Seeders;

use App\Models\User;
use App\Models\Category;
use App\Models\Loan;
use App\Models\LoanPayment;
use App\Models\Project;
use App\Models\Setting;
use App\Models\Subcategory;
use App\Models\Transaction;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use Illuminate\Support\Carbon;
use Illuminate\Support\Str;

class DatabaseSeeder extends Seeder
{
    use WithoutModelEvents;

    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        $user = User::updateOrCreate(
            ['email' => 'demo@softpro.test'],
            [
                'name' => 'Demo User',
                'password' => bcrypt('password'),
            ],
        );

        // Projects
        $projectsData = [
            ['name' => 'Softpro HO', 'color' => '#2563eb'],
            ['name' => 'BC Corporation', 'color' => '#10b981'],
            ['name' => 'APSSDC', 'color' => '#f59e0b'],
        ];

        $projects = collect($projectsData)->map(function ($data) use ($user) {
            return Project::updateOrCreate(
                ['name' => $data['name']],
                ['color' => $data['color'], 'is_active' => true, 'user_id' => $user->id]
            );
        });

        // Expense Categories & Subcategories
        $expenseCategories = [
            [
                'name' => 'Office Operations',
                'subcategories' => [
                    'Office Supplies (Stationery, Files, Pens)',
                    'Printing & Photocopying',
                    'Courier & Postage',
                    'Pantry Items (Tea, Coffee, Snacks)',
                    'Housekeeping Supplies',
                    'Battery',
                    'Cable Wires',
                    'APSSDC',
                ],
            ],
            [
                'name' => 'IT & Software',
                'subcategories' => [
                    'Software Licenses (Microsoft, Antivirus, etc.)',
                    'Cloud Services (Google Workspace, AWS, etc.)',
                    'Website Maintenance',
                    'Domain & Hosting Fees',
                    'Hardware Purchases (Laptop, Printer)',
                ],
            ],
            [
                'name' => 'Repairs & Maintenance',
                'subcategories' => [
                    'Electrical Repairs',
                    'Plumbing Services',
                    'AC Maintenance',
                    'Computer/Printer Repair',
                    'Furniture Repair',
                ],
            ],
            [
                'name' => 'Office Rent & Utilities',
                'subcategories' => [
                    'Office Rent',
                    'Electricity',
                    'Water Charges',
                    'Internet Bills',
                    'Landline/Mobile Bills',
                ],
            ],
            [
                'name' => 'Salaries & Staff Welfare',
                'subcategories' => [
                    'Staff Salaries',
                    'Consultant Fees',
                    'Bonus/Incentives',
                    'Travel Allowance',
                    'Medical Reimbursement',
                    'Staff Training',
                ],
            ],
            [
                'name' => 'Travel & Transportation',
                'subcategories' => [
                    'Local Travel (Auto, Cab, Bike Fuel)',
                    'Outstation Travel (Bus, Train, Flight)',
                    'Hotel Stay',
                    'Food & Misc. during Travel',
                    'Vehicle Maintenance',
                ],
            ],
            [
                'name' => 'Marketing & Advertising',
                'subcategories' => [
                    'Social Media Ads (Google, Facebook)',
                    'Flyers & Pamphlets',
                    'Branding Materials (Banners, Standees)',
                    'Event Sponsorship',
                    'Email/SMS Campaign Tools',
                ],
            ],
            [
                'name' => 'Professional Services',
                'subcategories' => [
                    'CA/Legal Consultation Fees',
                    'Audit Charges',
                    'AMC Contracts (IT, Security)',
                    'Software Consultant Fees',
                ],
            ],
            [
                'name' => 'Compliance & Fees',
                'subcategories' => [
                    'GST Filing Fees',
                    'Government Taxes',
                    'Renewal Charges (ISO, Trademark)',
                    'License Fees',
                    'Fines & Penalties',
                ],
            ],
            [
                'name' => 'Miscellaneous',
                'subcategories' => [
                    'Gifts & Festive Expenses',
                    'Staff Entertainment',
                    'Office Decoration',
                    'Petty Cash Usage',
                ],
            ],
        ];

        $expenseCategoriesCollection = collect($expenseCategories)->map(function ($catData) use ($user) {
            $category = Category::updateOrCreate(
                ['name' => $catData['name'], 'type' => 'expense'],
                ['color' => $this->generateColor(), 'user_id' => $user->id]
            );

            collect($catData['subcategories'])->each(function ($subName) use ($category, $user) {
                Subcategory::updateOrCreate(
                    ['category_id' => $category->id, 'name' => $subName],
                    ['color' => $category->color, 'user_id' => $user->id]
                );
            });

            return $category;
        });

        // Income Categories & Subcategories
        $incomeCategories = [
            [
                'name' => 'RTA',
                'subcategories' => [
                    'Tax',
                    'Fitness',
                    'Name Transfer',
                    'Permit',
                    'Tax+Fitness',
                    'Tax+Fitness+Permit',
                    'Driving licence',
                    'E - Challan',
                ],
            ],
            [
                'name' => 'Insurance',
                'subcategories' => [
                    'Insurance',
                ],
            ],
            [
                'name' => 'Student',
                'subcategories' => [
                    'Student Fees',
                    'Student Registration',
                    'Student Certificate',
                ],
            ],
            [
                'name' => 'GST',
                'subcategories' => [
                    'GST Registration',
                    'GST Returns',
                    'Society',
                ],
            ],
            [
                'name' => 'Tenders',
                'subcategories' => [
                    'Tenders',
                ],
            ],
        ];

        $incomeCategoriesCollection = collect($incomeCategories)->map(function ($catData) use ($user) {
            $category = Category::updateOrCreate(
                ['name' => $catData['name'], 'type' => 'income'],
                ['color' => $this->generateColor(), 'user_id' => $user->id]
            );

            collect($catData['subcategories'])->each(function ($subName) use ($category, $user) {
                Subcategory::updateOrCreate(
                    ['category_id' => $category->id, 'name' => $subName],
                    ['color' => $category->color, 'user_id' => $user->id]
                );
            });

            return $category;
        });

        $allCategories = $expenseCategoriesCollection->merge($incomeCategoriesCollection);

        // Demo data removed - only master data (projects, categories, subcategories) is seeded

        // Settings
        Setting::updateOrCreate(
            ['user_id' => $user->id, 'key' => 'currency'],
            ['value' => '₹', 'group' => 'branding']
        );

        Setting::updateOrCreate(
            ['user_id' => $user->id, 'key' => 'theme'],
            ['value' => 'dark', 'group' => 'branding']
        );

        Setting::updateOrCreate(
            ['user_id' => $user->id, 'key' => 'fiscal_year_start'],
            ['value' => '04-01', 'group' => 'branding']
        );
    }

    private function generateColor(): string
    {
        $colors = [
            '#2563eb', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6',
            '#06b6d4', '#f97316', '#84cc16', '#ec4899', '#6366f1',
        ];
        return $colors[array_rand($colors)];
    }
}
