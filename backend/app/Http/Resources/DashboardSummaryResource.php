<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class DashboardSummaryResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        // Handle both array and object resources
        $data = is_array($this->resource) ? $this->resource : (array) $this->resource;
        $kpis = $data['kpis'] ?? [];
        $charts = $data['charts'] ?? [];

        return [
            'total_income' => (float) ($kpis['total_income'] ?? 0),
            'total_expense' => (float) ($kpis['total_expense'] ?? 0),
            'net_balance' => (float) ($kpis['net_balance'] ?? 0),
            'quarterly_income' => (float) ($kpis['quarterly_income'] ?? 0),
            'quarterly_expense' => (float) ($kpis['quarterly_expense'] ?? 0),
            'quarterly_net_balance' => (float) ($kpis['quarterly_net_balance'] ?? 0),
            'income_percentage_change' => (float) ($kpis['income_change_pct'] ?? 0),
            'expense_percentage_change' => (float) ($kpis['expense_change_pct'] ?? 0),
            'balance_percentage_change' => (float) ($kpis['net_change_pct'] ?? 0),
            'pending_loans_total' => (float) ($kpis['pending_loans_total'] ?? 0),
            'top_income_categories' => $charts['top_income_categories'] ?? [],
            'top_expense_categories' => $charts['top_expense_categories'] ?? [],
            'income_vs_expense' => $charts['income_vs_expense'] ?? [],
            'net_balance_trend' => $charts['net_trend'] ?? [],
            'project_breakdown' => $data['project_breakdown'] ?? [],
        ];
    }
}
