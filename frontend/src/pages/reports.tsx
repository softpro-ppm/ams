import { useState, useMemo, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { format, parseISO, subDays, startOfMonth, endOfMonth } from "date-fns";
import {
  FileDown,
  FileText,
  SlidersHorizontal,
} from "lucide-react";
import {
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { reportsApi, projectsApi, categoriesApi } from "@/services/api";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import type { Transaction } from "@/types";

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value);
}

const CHART_COLORS = [
  "#10b981", // emerald-500
  "#ef4444", // red-500
  "#3b82f6", // blue-500
  "#f59e0b", // amber-500
  "#8b5cf6", // purple-500
  "#ec4899", // pink-500
  "#06b6d4", // cyan-500
  "#84cc16", // lime-500
];

export function ReportsPage() {
  // Default to empty (all time) - user can filter if needed
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [type, setType] = useState<"income" | "expense" | "">("");
  const [projectId, setProjectId] = useState<number | "">("");
  const [categoryId, setCategoryId] = useState<number | "">("");
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);
  const [pendingDateFrom, setPendingDateFrom] = useState("");
  const [pendingDateTo, setPendingDateTo] = useState("");
  const [pendingType, setPendingType] = useState<"income" | "expense" | "">("");
  const [pendingProjectId, setPendingProjectId] = useState<number | "">("");
  const [pendingCategoryId, setPendingCategoryId] = useState<number | "">("");
  const { toast } = useToast();

  // Sync pending filters when sheet opens
  useEffect(() => {
    if (isFiltersOpen) {
      setPendingDateFrom(dateFrom);
      setPendingDateTo(dateTo);
      setPendingType(type);
      setPendingProjectId(projectId);
      setPendingCategoryId(categoryId);
    }
  }, [isFiltersOpen, dateFrom, dateTo, type, projectId, categoryId]);

  const filters = useMemo(() => {
    const result: {
      from?: string;
      to?: string;
      type?: "income" | "expense";
      project_id?: number;
      category_id?: number;
    } = {};
    
    if (dateFrom && dateFrom.trim()) {
      result.from = dateFrom;
    }
    if (dateTo && dateTo.trim()) {
      result.to = dateTo;
    }
    if (type) {
      result.type = type;
    }
    if (projectId) {
      result.project_id = projectId;
    }
    if (categoryId) {
      result.category_id = categoryId;
    }
    
    return result;
  }, [dateFrom, dateTo, type, projectId, categoryId]);

  const { data: reportData, isLoading } = useQuery({
    queryKey: ["reports", "summary", filters],
    queryFn: () => reportsApi.summary(filters),
    staleTime: 0, // Always fetch fresh data
    refetchOnMount: true,
  });

  const { data: projects } = useQuery({
    queryKey: ["projects"],
    queryFn: () => projectsApi.list(),
  });

  const { data: categories } = useQuery({
    queryKey: ["categories"],
    queryFn: () => categoriesApi.list(),
  });

  const availableCategories = useMemo(
    () => (Array.isArray(categories) ? categories.filter((c) => !type || c.type === type) : []),
    [categories, type]
  );
  const pendingAvailableCategories = useMemo(
    () => (Array.isArray(categories) ? categories.filter((c) => !pendingType || c.type === pendingType) : []),
    [categories, pendingType]
  );

  const handleExportCsv = async () => {
    try {
      const blob = await reportsApi.exportCsv(filters);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `softpro-report-${format(new Date(), "yyyy-MM-dd")}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast({
        title: "Success",
        description: "CSV export started",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.response?.data?.message || "Failed to export CSV",
        variant: "destructive",
      });
    }
  };

  const handleExportPdf = async () => {
    try {
      const blob = await reportsApi.exportPdf(filters);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `softpro-report-${format(new Date(), "yyyy-MM-dd")}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast({
        title: "Success",
        description: "PDF export started",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.response?.data?.message || "Failed to export PDF",
        variant: "destructive",
      });
    }
  };

  const handleQuickDateRange = (range: "today" | "week" | "month" | "year", forPending = false) => {
    const today = new Date();
    const setFrom = forPending ? setPendingDateFrom : setDateFrom;
    const setTo = forPending ? setPendingDateTo : setDateTo;
    switch (range) {
      case "today":
        setFrom(format(today, "yyyy-MM-dd"));
        setTo(format(today, "yyyy-MM-dd"));
        break;
      case "week":
        setFrom(format(subDays(today, 7), "yyyy-MM-dd"));
        setTo(format(today, "yyyy-MM-dd"));
        break;
      case "month":
        setFrom(format(startOfMonth(today), "yyyy-MM-dd"));
        setTo(format(endOfMonth(today), "yyyy-MM-dd"));
        break;
      case "year":
        setFrom(format(new Date(today.getFullYear(), 0, 1), "yyyy-MM-dd"));
        setTo(format(new Date(today.getFullYear(), 11, 31), "yyyy-MM-dd"));
        break;
    }
  };

  const handleApplyFilters = () => {
    setDateFrom(pendingDateFrom);
    setDateTo(pendingDateTo);
    setType(pendingType);
    setProjectId(pendingProjectId);
    setCategoryId(pendingCategoryId);
    setIsFiltersOpen(false);
  };

  const handleClearFilters = () => {
    const empty = "";
    setType("");
    setProjectId("");
    setCategoryId("");
    setDateFrom(empty);
    setDateTo(empty);
    setPendingDateFrom(empty);
    setPendingDateTo(empty);
    setPendingType("");
    setPendingProjectId("");
    setPendingCategoryId("");
    setIsFiltersOpen(false);
  };

  const hasActiveFilters = useMemo(() => {
    return type !== "" || projectId !== "" || categoryId !== "" || dateFrom !== "" || dateTo !== "";
  }, [type, projectId, categoryId, dateFrom, dateTo]);

  // Prepare chart data
  const incomeVsExpenseData = useMemo(() => {
    if (!reportData?.transactions) return [];

    const grouped = new Map<string, { date: string; income: number; expense: number }>();

    reportData.transactions.forEach((tx) => {
      const dateKey = format(parseISO(tx.date), "yyyy-MM-dd");
      if (!grouped.has(dateKey)) {
        grouped.set(dateKey, { date: dateKey, income: 0, expense: 0 });
      }
      const entry = grouped.get(dateKey)!;
      if (tx.type === "income") {
        entry.income += tx.amount;
      } else {
        entry.expense += tx.amount;
      }
    });

    return Array.from(grouped.values())
      .sort((a, b) => a.date.localeCompare(b.date))
      .map((item) => ({
        ...item,
        date: format(parseISO(item.date), "MMM dd"),
      }));
  }, [reportData]);

  const categoryBreakdownData = useMemo(() => {
    if (!reportData?.transactions) return [];

    const grouped = new Map<string, { name: string; value: number; type: string }>();

    reportData.transactions.forEach((tx) => {
      if (!tx.category) return;
      const key = `${tx.category.name}-${tx.type}`;
      if (!grouped.has(key)) {
        grouped.set(key, { name: tx.category.name, value: 0, type: tx.type });
      }
      grouped.get(key)!.value += tx.amount;
    });

    return Array.from(grouped.values()).sort((a, b) => b.value - a.value).slice(0, 8);
  }, [reportData]);

  const topTransactions = useMemo(() => {
    if (!reportData?.transactions) return [];
    return reportData.transactions
      .slice()
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 10);
  }, [reportData]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Insights</p>
          <h1 className="text-2xl font-semibold text-white">Reports</h1>
        </div>
        <div className="flex items-center gap-2">
          <Sheet open={isFiltersOpen} onOpenChange={setIsFiltersOpen}>
            <SheetTrigger asChild>
              <Button variant="outline" className="border-white/10 bg-white/5 text-white relative">
                <SlidersHorizontal className="mr-2 h-4 w-4" />
                Filters
                {hasActiveFilters && <span className="ml-2 h-2 w-2 rounded-full bg-primary" />}
              </Button>
            </SheetTrigger>
            <SheetContent className="bg-slate-900 border-slate-700 text-white w-80 overflow-y-auto">
              <SheetHeader>
                <SheetTitle>Filters</SheetTitle>
                <SheetDescription className="text-slate-400">
                  Filter report data by various criteria
                </SheetDescription>
              </SheetHeader>
              <div className="mt-6 space-y-4">
                <div className="space-y-2">
                  <Label>Date Range</Label>
                  <div className="flex flex-col gap-2">
                    <Input
                      type="date"
                      value={pendingDateFrom}
                      onChange={(e) => setPendingDateFrom(e.target.value)}
                      className="bg-slate-800 border-slate-600 text-white"
                    />
                    <Input
                      type="date"
                      value={pendingDateTo}
                      onChange={(e) => setPendingDateTo(e.target.value)}
                      min={pendingDateFrom}
                      className="bg-slate-800 border-slate-600 text-white"
                    />
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleQuickDateRange("today", true)}
                      className="border-slate-600 text-white hover:bg-slate-800"
                    >
                      Today
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleQuickDateRange("week", true)}
                      className="border-slate-600 text-white hover:bg-slate-800"
                    >
                      Week
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleQuickDateRange("month", true)}
                      className="border-slate-600 text-white hover:bg-slate-800"
                    >
                      Month
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleQuickDateRange("year", true)}
                      className="border-slate-600 text-white hover:bg-slate-800"
                    >
                      Year
                    </Button>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Type</Label>
                  <Select
                    value={pendingType || "all"}
                    onValueChange={(v) => {
                      setPendingType(v === "all" ? "" : v as "income" | "expense");
                      setPendingCategoryId("");
                    }}
                  >
                    <SelectTrigger className="bg-slate-800 border-slate-600 text-white">
                      <SelectValue placeholder="All types" />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-900 border-slate-700 text-white">
                      <SelectItem value="all">All types</SelectItem>
                      <SelectItem value="income">Income</SelectItem>
                      <SelectItem value="expense">Expense</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Project</Label>
                  <Select
                    value={pendingProjectId ? pendingProjectId.toString() : "all"}
                    onValueChange={(v) => setPendingProjectId(v === "all" ? "" : Number(v))}
                  >
                    <SelectTrigger className="bg-slate-800 border-slate-600 text-white">
                      <SelectValue placeholder="All projects" />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-900 border-slate-700 text-white">
                      <SelectItem value="all">All projects</SelectItem>
                      {Array.isArray(projects) ? projects.map((p) => (
                        <SelectItem key={p.id} value={p.id.toString()}>
                          {p.name}
                        </SelectItem>
                      )) : null}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Category</Label>
                  <Select
                    value={pendingCategoryId ? pendingCategoryId.toString() : "all"}
                    onValueChange={(v) => setPendingCategoryId(v === "all" ? "" : Number(v))}
                  >
                    <SelectTrigger className="bg-slate-800 border-slate-600 text-white">
                      <SelectValue placeholder="All categories" />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-900 border-slate-700 text-white">
                      <SelectItem value="all">All categories</SelectItem>
                      {pendingAvailableCategories.map((c) => (
                        <SelectItem key={c.id} value={c.id.toString()}>
                          {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button
                  onClick={handleApplyFilters}
                  className="w-full bg-primary text-primary-foreground"
                >
                  Apply Filter
                </Button>
                <Button
                  variant="outline"
                  onClick={handleClearFilters}
                  className="w-full border-slate-600 text-white hover:bg-slate-800"
                >
                  Clear All Filters
                </Button>
              </div>
            </SheetContent>
          </Sheet>
          <Button
            variant="outline"
            onClick={handleExportCsv}
            className="border-white/10 bg-white/5 text-white"
            disabled={isLoading}
          >
            <FileDown className="mr-2 h-4 w-4" />
            CSV
          </Button>
          <Button
            onClick={handleExportPdf}
            className="bg-primary text-primary-foreground shadow-lg shadow-primary/40"
            disabled={isLoading}
          >
            <FileText className="mr-2 h-4 w-4" />
            PDF
          </Button>
        </div>
      </div>

      {/* KPIs */}
      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="bg-white/5 text-white">
              <CardContent className="pt-6">
                <div className="h-20 bg-white/5 rounded animate-pulse" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        reportData && (
          <div className="grid gap-4 md:grid-cols-4">
            <Card className="bg-white/5 text-white">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-normal text-slate-400">Income</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-emerald-400">
                  {formatCurrency(reportData.kpis.income)}
                </div>
              </CardContent>
            </Card>
            <Card className="bg-white/5 text-white">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-normal text-slate-400">Expense</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-rose-400">
                  {formatCurrency(reportData.kpis.expense)}
                </div>
              </CardContent>
            </Card>
            <Card className="bg-white/5 text-white">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-normal text-slate-400">Net</CardTitle>
              </CardHeader>
              <CardContent>
                <div
                  className={cn(
                    "text-2xl font-bold",
                    reportData.kpis.net >= 0 ? "text-emerald-400" : "text-rose-400"
                  )}
                >
                  {formatCurrency(reportData.kpis.net)}
                </div>
              </CardContent>
            </Card>
            <Card className="bg-white/5 text-white">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-normal text-slate-400">Transactions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{reportData.kpis.count}</div>
              </CardContent>
            </Card>
          </div>
        )
      )}

      {/* Charts */}
      {reportData && !isLoading && (
        <div className="grid gap-4 md:grid-cols-2">
          <Card className="bg-white/5 text-white">
            <CardHeader>
              <CardTitle>Income vs Expense</CardTitle>
              <CardDescription className="text-slate-400">Daily comparison</CardDescription>
            </CardHeader>
            <CardContent>
              {incomeVsExpenseData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={incomeVsExpenseData}>
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
                      stroke="#10b981"
                      fill="#10b981"
                      fillOpacity={0.3}
                      name="Income"
                    />
                    <Area
                      type="monotone"
                      dataKey="expense"
                      stroke="#ef4444"
                      fill="#ef4444"
                      fillOpacity={0.3}
                      name="Expense"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-[300px] text-slate-400">
                  No data available for the selected period
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="bg-white/5 text-white">
            <CardHeader>
              <CardTitle>Top Categories</CardTitle>
              <CardDescription className="text-slate-400">By amount</CardDescription>
            </CardHeader>
            <CardContent>
              {categoryBreakdownData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={categoryBreakdownData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {categoryBreakdownData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#1e293b",
                        border: "1px solid #334155",
                        borderRadius: "0.5rem",
                      }}
                      formatter={(value: number) => formatCurrency(value)}
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-[300px] text-slate-400">
                  No data available for the selected period
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Top Transactions */}
      {reportData && !isLoading && (
        <Card className="bg-white/5 text-white">
          <CardHeader>
            <CardTitle>Top Transactions</CardTitle>
            <CardDescription className="text-slate-400">Highest amounts</CardDescription>
          </CardHeader>
          <CardContent>
            {topTransactions.length > 0 ? (
              <div className="rounded-md border border-white/10">
                <Table>
                  <TableHeader>
                    <TableRow className="border-white/10">
                      <TableHead className="text-slate-300">Date</TableHead>
                      <TableHead className="text-slate-300">Type</TableHead>
                      <TableHead className="text-slate-300">Category</TableHead>
                      <TableHead className="text-slate-300">Project</TableHead>
                      <TableHead className="text-slate-300">Description</TableHead>
                      <TableHead className="text-slate-300 text-right">Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {topTransactions.map((tx) => (
                      <TableRow key={tx.id} className="border-white/10">
                        <TableCell>{format(parseISO(tx.date), "MMM dd, yyyy")}</TableCell>
                        <TableCell>
                          <Badge variant={tx.type === "income" ? "default" : "secondary"}>
                            {tx.type === "income" ? "Income" : "Expense"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {tx.category && (
                              <>
                                <span
                                  className="h-2 w-2 rounded-full"
                                  style={{ backgroundColor: tx.category.color || "#666" }}
                                />
                                <span>{tx.category.name}</span>
                              </>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          {tx.project ? (
                            <div className="flex items-center gap-2">
                              <span
                                className="h-2 w-2 rounded-full"
                                style={{ backgroundColor: tx.project.color }}
                              />
                              <span>{tx.project.name}</span>
                            </div>
                          ) : (
                            <span className="text-slate-400">—</span>
                          )}
                        </TableCell>
                        <TableCell className="text-slate-300">
                          {tx.description || <span className="text-slate-500">—</span>}
                        </TableCell>
                        <TableCell
                          className={cn(
                            "font-semibold text-right",
                            tx.type === "income" ? "text-emerald-400" : "text-rose-400"
                          )}
                        >
                          {tx.type === "income" ? "+" : "-"} {formatCurrency(tx.amount)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="text-center py-8 text-slate-400">No transactions found</div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
