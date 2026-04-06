<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\CategoryResource;
use App\Http\Resources\DashboardSummaryResource;
use App\Http\Resources\ProjectResource;
use App\Models\Category;
use App\Models\Loan;
use App\Models\Project;
use App\Models\Transaction;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class DashboardController extends Controller
{
    public function summary(Request $request): DashboardSummaryResource
    {
        $userId = $request->user()->id;

        // Default to all time if no date filters provided, otherwise use the provided dates
        $hasDateFilter = $request->has('date_from') && $request->filled('date_from') 
            && $request->has('date_to') && $request->filled('date_to');
        
        if ($hasDateFilter) {
            $from = Carbon::parse($request->input('date_from'))->startOfDay();
            $to = Carbon::parse($request->input('date_to'))->endOfDay();
            $rangeDays = $from->diffInDays($to) + 1;
            $previousFrom = (clone $from)->subDays($rangeDays);
            $previousTo = (clone $from)->subDay()->endOfDay();
        } else {
            // No date filter - show all transactions
            $from = null;
            $to = null;
            // For comparison, use last 30 days vs previous 30 days
            $previousTo = now()->subDays(30)->endOfDay();
            $previousFrom = now()->subDays(60)->startOfDay();
        }

        // Build base query with optional date filtering
        $base = Transaction::where('user_id', $userId);
        if ($from && $to) {
            $base->whereBetween('transaction_date', [$from, $to]);
        }

        $income = (float) $base->clone()->where('type', 'income')->sum('amount');
        $expense = (float) $base->clone()->where('type', 'expense')->sum('amount');
        $net = $income - $expense;

        // Quarterly KPIs: sum every row whose transaction_date falls in the current calendar
        // quarter (start→end of quarter), including future-dated entries in that range.
        $quarterStartDate = now()->startOfQuarter()->toDateString();
        $quarterEndDate = now()->endOfQuarter()->toDateString();

        $quarterlyIncome = (float) Transaction::where('user_id', $userId)
            ->whereDate('transaction_date', '>=', $quarterStartDate)
            ->whereDate('transaction_date', '<=', $quarterEndDate)
            ->where('type', 'income')
            ->sum('amount');

        $quarterlyExpense = (float) Transaction::where('user_id', $userId)
            ->whereDate('transaction_date', '>=', $quarterStartDate)
            ->whereDate('transaction_date', '<=', $quarterEndDate)
            ->where('type', 'expense')
            ->sum('amount');

        $quarterlyNet = $quarterlyIncome - $quarterlyExpense;

        $prevIncome = (float) Transaction::where('user_id', $userId)
            ->whereBetween('transaction_date', [$previousFrom, $previousTo])
            ->where('type', 'income')
            ->sum('amount');

        $prevExpense = (float) Transaction::where('user_id', $userId)
            ->whereBetween('transaction_date', [$previousFrom, $previousTo])
            ->where('type', 'expense')
            ->sum('amount');

        $kpis = [
            'total_income' => $income,
            'total_expense' => $expense,
            'net_balance' => $net,
            'quarterly_income' => $quarterlyIncome,
            'quarterly_expense' => $quarterlyExpense,
            'quarterly_net_balance' => $quarterlyNet,
            'income_change_pct' => $this->percentChange($prevIncome, $income),
            'expense_change_pct' => $this->percentChange($prevExpense, $expense),
            'net_change_pct' => $this->percentChange($prevIncome - $prevExpense, $net),
        ];

        // For charts, limit to last 12 months for performance (totals still use all time)
        $chartFrom = $from ?? now()->subMonths(12)->startOfMonth()->startOfDay();
        $chartTo = $to ?? now()->endOfDay();
        
        // For breakdowns, use all time if no filter, but limit chart date range
        $breakdownFrom = $from ?? Carbon::create(2000, 1, 1)->startOfDay();
        $breakdownTo = $to ?? Carbon::create(2100, 12, 31)->endOfDay();
        
        $topIncome = $this->topCategories($userId, 'income', $breakdownFrom, $breakdownTo);
        $topExpense = $this->topCategories($userId, 'expense', $breakdownFrom, $breakdownTo);
        $incomeExpenseChart = $this->incomeVsExpense($userId, $chartFrom, $chartTo);
        $trend = $this->netTrend($userId);
        $projectBreakdown = $this->projectBreakdown($userId, $breakdownFrom, $breakdownTo);
        $pendingLoansTotal = $this->pendingLoansTotal($userId);

        $kpis['pending_loans_total'] = $pendingLoansTotal;

        $data = [
            'kpis' => $kpis,
            'charts' => [
                'income_vs_expense' => $incomeExpenseChart,
                'top_income_categories' => $topIncome,
                'top_expense_categories' => $topExpense,
                'net_trend' => $trend,
            ],
            'project_breakdown' => $projectBreakdown,
        ];

        return new DashboardSummaryResource($data);
    }

    private function percentChange(float $previous, float $current): float
    {
        if ($previous == 0.0) {
            return $current > 0 ? 100 : 0;
        }

        return (($current - $previous) / $previous) * 100;
    }

    private function topCategories(int $userId, string $type, Carbon $from, Carbon $to): array
    {
        // Get category IDs with totals
        $categoryTotals = Transaction::select('category_id', DB::raw('sum(amount) as total'))
            ->where('user_id', $userId)
            ->where('type', $type)
            ->whereBetween('transaction_date', [$from, $to])
            ->groupBy('category_id')
            ->orderByDesc('total')
            ->limit(5)
            ->get()
            ->keyBy('category_id');

        // Eager load all categories at once to avoid N+1
        $categoryIds = $categoryTotals->pluck('category_id')->toArray();
        $categories = Category::whereIn('id', $categoryIds)->get()->keyBy('id');

        return $categoryTotals->map(function ($row) use ($categories) {
            $category = $categories->get($row->category_id);
            if (!$category) {
                return null;
            }
            return [
                'category' => (new CategoryResource($category))->toArray(request()),
                'total' => (float) $row->total,
            ];
        })
            ->filter()
            ->values()
            ->toArray();
    }

    private function incomeVsExpense(int $userId, Carbon $from, Carbon $to): array
    {
        // Use SQL aggregation instead of loading all records into memory
        $dailyTotals = Transaction::select(
                DB::raw('DATE(transaction_date) as date'),
                DB::raw('SUM(CASE WHEN type = "income" THEN amount ELSE 0 END) as income'),
                DB::raw('SUM(CASE WHEN type = "expense" THEN amount ELSE 0 END) as expense')
            )
            ->where('user_id', $userId)
            ->whereBetween('transaction_date', [$from, $to])
            ->groupBy(DB::raw('DATE(transaction_date)'))
            ->orderBy('date')
            ->get()
            ->keyBy('date');

        // Fill in missing dates with zeros
        $result = [];
        $current = clone $from;
        
        while ($current <= $to) {
            $dateStr = $current->toDateString();
            $dayData = $dailyTotals->get($dateStr);
            
            $result[] = [
                'date' => $dateStr,
                'income' => $dayData ? (float) $dayData->income : 0.0,
                'expense' => $dayData ? (float) $dayData->expense : 0.0,
            ];
            
            $current->addDay();
        }

        return $result;
    }

    private function netTrend(int $userId): array
    {
        $start = now()->startOfMonth()->subMonths(5);
        
        // Use SQL aggregation instead of loading all records
        // Database-agnostic date formatting
        $driver = DB::getDriverName();
        if ($driver === 'sqlite') {
            $dateFormat = 'strftime("%Y-%m", transaction_date)';
        } else {
            $dateFormat = 'DATE_FORMAT(transaction_date, "%Y-%m")';
        }
        
        $monthlyTotals = Transaction::select(
                DB::raw($dateFormat . ' as month'),
                DB::raw('SUM(CASE WHEN type = "income" THEN amount ELSE 0 END) as income'),
                DB::raw('SUM(CASE WHEN type = "expense" THEN amount ELSE 0 END) as expense')
            )
            ->where('user_id', $userId)
            ->where('transaction_date', '>=', $start)
            ->groupBy(DB::raw($dateFormat))
            ->orderBy('month')
            ->get()
            ->keyBy('month');

        $trend = [];
        for ($i = 0; $i < 6; $i++) {
            $month = $start->copy()->addMonths($i)->format('Y-m');
            $monthData = $monthlyTotals->get($month);
            
            $income = $monthData ? (float) $monthData->income : 0.0;
            $expense = $monthData ? (float) $monthData->expense : 0.0;
            
            $trend[] = [
                'date' => $month,
                'balance' => $income - $expense,
            ];
        }

        return $trend;
    }

    private function projectBreakdown(int $userId, Carbon $from, Carbon $to): array
    {
        $projects = Project::where('user_id', $userId)->get()->keyBy('id');

        $sums = Transaction::select('project_id',
            DB::raw("sum(case when type='income' then amount else 0 end) as income"),
            DB::raw("sum(case when type='expense' then amount else 0 end) as expense")
        )
            ->where('user_id', $userId)
            ->whereBetween('transaction_date', [$from, $to])
            ->groupBy('project_id')
            ->get();

        return $sums->map(function ($row) use ($projects) {
            $project = $projects->get($row->project_id);
            if (!$project) {
                return null;
            }
            return [
                'project' => (new ProjectResource($project))->toArray(request()),
                'income' => (float) $row->income,
                'expense' => (float) $row->expense,
            ];
        })
            ->filter()
            ->values()
            ->toArray();
    }

    private function pendingLoansTotal(int $userId): float
    {
        // Get all active loans with their payments and disbursements
        // The balance attribute is automatically calculated via accessor
        $activeLoans = Loan::where('user_id', $userId)
            ->where('status', 'active')
            ->with(['payments', 'disbursements'])
            ->get();

        // Calculate total pending amount (sum of absolute balances)
        // Balance represents outstanding amount for each loan
        $total = 0.0;
        
        foreach ($activeLoans as $loan) {
            // Use the balance accessor which is already calculated
            // Sum absolute values to get total pending amount
            $total += abs($loan->balance);
        }

        return (float) $total;
    }
}
