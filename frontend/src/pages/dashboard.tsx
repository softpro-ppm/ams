import { useQuery } from "@tanstack/react-query";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { ArrowDownRight, ArrowUpRight, HandCoins, Loader2, Wallet } from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { dashboardApi } from "@/services/api";
import { cn } from "@/lib/utils";
import { format, parseISO } from "date-fns";

const CHART_COLORS = [
  "hsl(var(--chart-1))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
];

function formatCurrency(value: number | undefined): string {
  if (value === undefined || value === null || isNaN(value)) {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(0);
  }
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatPercentage(value: number | undefined): string {
  if (value === undefined || value === null || isNaN(value)) {
    return "0.0%";
  }
  const sign = value >= 0 ? "+" : "";
  return `${sign}${value.toFixed(1)}%`;
}

export function DashboardPage() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["dashboard", "summary"],
    queryFn: () => dashboardApi.summary(),
    staleTime: 0, // Always fetch fresh data
    refetchOnMount: true,
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <header className="flex items-center justify-between gap-2">
          <div>
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Overview</p>
            <h1 className="text-2xl font-semibold text-white">Dashboard</h1>
          </div>
        </header>
        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="bg-white/5 text-white">
              <CardHeader className="pb-3">
                <Skeleton className="h-4 w-24 mb-2 bg-white/10" />
                <Skeleton className="h-8 w-32 mb-2 bg-white/10" />
                <Skeleton className="h-4 w-20 bg-white/10" />
              </CardHeader>
            </Card>
          ))}
        </section>
      </div>
    );
  }

  if (error) {
    console.error("Dashboard error:", error);
    return (
      <div className="space-y-6">
        <header>
          <h1 className="text-2xl font-semibold text-white">Dashboard</h1>
        </header>
        <Card className="bg-white/5 text-white">
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">
              Failed to load dashboard data. Error: {error instanceof Error ? error.message : "Unknown error"}
            </p>
            <pre className="mt-4 text-xs text-left overflow-auto bg-slate-900 p-4 rounded">
              {JSON.stringify(error, null, 2)}
            </pre>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="space-y-6">
        <header>
          <h1 className="text-2xl font-semibold text-white">Dashboard</h1>
        </header>
        <Card className="bg-white/5 text-white">
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">No dashboard data available</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between gap-2">
        <div>
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Overview</p>
          <h1 className="text-2xl font-semibold text-white">Dashboard</h1>
        </div>
      </header>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card className="bg-white/5 text-white">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-normal text-slate-400 flex items-center gap-2">
              Quarterly Income
              <ArrowUpRight className="h-4 w-4" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(data.quarterly_income)}</div>
            <p className="text-xs mt-1 text-slate-400">Current quarter</p>
          </CardContent>
        </Card>

        <Card className="bg-white/5 text-white">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-normal text-slate-400 flex items-center gap-2">
              Quarterly Expense
              <ArrowDownRight className="h-4 w-4" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(data.quarterly_expense)}</div>
            <p className="text-xs mt-1 text-slate-400">Current quarter</p>
          </CardContent>
        </Card>

        <Card className="bg-white/5 text-white">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-normal text-slate-400 flex items-center gap-2">
              Quarterly Net Balance
              <Wallet className="h-4 w-4" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className={cn("text-2xl font-bold", (data.quarterly_net_balance ?? 0) >= 0 ? "text-emerald-400" : "text-rose-400")}>
              {formatCurrency(data.quarterly_net_balance)}
            </div>
            <p className="text-xs mt-1 text-slate-400">Current quarter</p>
          </CardContent>
        </Card>

        <Card className="bg-white/5 text-white">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-normal text-slate-400 flex items-center gap-2">
              Pending Loans
              <HandCoins className="h-4 w-4" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(data.pending_loans_total)}</div>
            <p className="text-xs mt-1 text-slate-400">Total outstanding amount</p>
          </CardContent>
        </Card>
      </section>

      {data.income_vs_expense && data.income_vs_expense.length > 0 && (
        <Card className="bg-white/5 text-white">
          <CardHeader>
            <CardTitle>Income vs Expense</CardTitle>
            <CardDescription className="text-slate-400">Daily comparison</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={data.income_vs_expense}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="date" stroke="#9ca3af" />
                <YAxis stroke="#9ca3af" tickFormatter={(value) => `₹${(value / 1000).toFixed(0)}k`} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#1e293b",
                    border: "1px solid #334155",
                    borderRadius: "0.5rem",
                  }}
                  formatter={(value: number) => formatCurrency(value)}
                />
                <Legend />
                <Area
                  type="monotone"
                  dataKey="income"
                  stroke="hsl(var(--chart-1))"
                  fill="hsl(var(--chart-1))"
                  fillOpacity={0.3}
                  name="Income"
                />
                <Area
                  type="monotone"
                  dataKey="expense"
                  stroke="hsl(var(--chart-2))"
                  fill="hsl(var(--chart-2))"
                  fillOpacity={0.3}
                  name="Expense"
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        {data.top_income_categories && data.top_income_categories.length > 0 && (
          <Card className="bg-white/5 text-white">
            <CardHeader>
              <CardTitle>Top Income Categories</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={data.top_income_categories.map((item) => ({
                      name: item.category.name,
                      value: item.total,
                    }))}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {data.top_income_categories.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: number) => formatCurrency(value)} />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {data.top_expense_categories && data.top_expense_categories.length > 0 && (
          <Card className="bg-white/5 text-white">
            <CardHeader>
              <CardTitle>Top Expense Categories</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={data.top_expense_categories.map((item) => ({
                      name: item.category.name,
                      value: item.total,
                    }))}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {data.top_expense_categories.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: number) => formatCurrency(value)} />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}
      </div>

      {data.project_breakdown && data.project_breakdown.length > 0 && (
        <Card className="bg-white/5 text-white">
          <CardHeader>
            <CardTitle>Project Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {data.project_breakdown.map((item, index) => (
                <div key={index} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className="h-3 w-3 rounded-full"
                      style={{ backgroundColor: item.project.color }}
                    />
                    <span className="font-medium">{item.project.name}</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-emerald-400">{formatCurrency(item.income)}</span>
                    <span className="text-rose-400">{formatCurrency(item.expense)}</span>
                    <span className="font-semibold">
                      {formatCurrency(item.income - item.expense)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
