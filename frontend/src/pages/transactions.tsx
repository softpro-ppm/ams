import { useState, useMemo, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getPaginationRowModel,
  flexRender,
  type ColumnDef,
  type SortingState,
} from "@tanstack/react-table";
import {
  ArrowUpDown,
  Filter,
  Plus,
  Edit2,
  Trash2,
  Loader2,
  ChevronLeft,
  ChevronRight,
  X,
  Eye,
} from "lucide-react";
import { format, parseISO } from "date-fns";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { transactionsApi, projectsApi, categoriesApi, subcategoriesApi } from "@/services/api";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import type { Transaction, Project, Category, Subcategory } from "@/types";

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value);
}

export function TransactionsPage() {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(15);
  const [filters, setFilters] = useState({
    type: "" as "" | "income" | "expense",
    project_id: "" as number | "",
    category_id: "" as number | "",
    subcategory_id: "" as number | "",
    date_from: "",
    date_to: "",
  });
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [viewingTransaction, setViewingTransaction] = useState<Transaction | null>(null);
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);
  const [pendingFilters, setPendingFilters] = useState({
    type: "" as "" | "income" | "expense",
    project_id: "" as number | "",
    category_id: "" as number | "",
    subcategory_id: "" as number | "",
    date_from: "",
    date_to: "",
  });
  const { toast } = useToast();

  // Sync pending filters when sheet opens
  useEffect(() => {
    if (isFiltersOpen) {
      setPendingFilters(filters);
    }
  }, [isFiltersOpen, filters]);
  const queryClient = useQueryClient();

  // Fetch transactions
  const { data: transactionsData, isLoading } = useQuery({
    queryKey: [
      "transactions",
      page,
      perPage,
      search,
      filters.type,
      filters.project_id,
      filters.category_id,
      filters.subcategory_id,
      filters.date_from,
      filters.date_to,
    ],
    queryFn: () =>
      transactionsApi.list({
        page,
        per_page: perPage,
        search: search || undefined,
        type: filters.type || undefined,
        project_id: filters.project_id || undefined,
        category_id: filters.category_id || undefined,
        subcategory_id: filters.subcategory_id || undefined,
        date_from: filters.date_from || undefined,
        date_to: filters.date_to || undefined,
      }),
  });

  // Fetch projects and categories for filters
  const { data: projects } = useQuery({
    queryKey: ["projects"],
    queryFn: () => projectsApi.list(),
  });

  const { data: categories } = useQuery({
    queryKey: ["categories"],
    queryFn: () => categoriesApi.list(),
  });

  const subcategoryCategoryId = isFiltersOpen ? pendingFilters.category_id : filters.category_id;
  const { data: subcategories } = useQuery({
    queryKey: ["subcategories", subcategoryCategoryId],
    queryFn: () => subcategoriesApi.list(subcategoryCategoryId || undefined),
    enabled: !!subcategoryCategoryId,
  });

  const incomeCategories = useMemo(() => (Array.isArray(categories) ? categories.filter((c) => c.type === "income") : []), [categories]);
  const expenseCategories = useMemo(() => (Array.isArray(categories) ? categories.filter((c) => c.type === "expense") : []), [categories]);
  const availableCategories = filters.type === "income" ? incomeCategories : filters.type === "expense" ? expenseCategories : (Array.isArray(categories) ? categories : []);
  const pendingAvailableCategories = pendingFilters.type === "income" ? incomeCategories : pendingFilters.type === "expense" ? expenseCategories : (Array.isArray(categories) ? categories : []);

  const createMutation = useMutation({
    mutationFn: transactionsApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      setIsDialogOpen(false);
      toast({
        title: "Success",
        description: "Transaction created successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.response?.data?.message || "Failed to create transaction",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<Transaction> }) =>
      transactionsApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      setIsDialogOpen(false);
      setEditingTransaction(null);
      toast({
        title: "Success",
        description: "Transaction updated successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.response?.data?.message || "Failed to update transaction",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: transactionsApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      toast({
        title: "Success",
        description: "Transaction deleted successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.response?.data?.message || "Failed to delete transaction",
        variant: "destructive",
      });
    },
  });

  const columns: ColumnDef<Transaction>[] = useMemo(
    () => [
      {
        id: "sno",
        header: () => <div className="text-center w-16">S.No</div>,
        cell: ({ row, table }) => {
          const pageIndex = table.getState().pagination.pageIndex;
          const pageSize = table.getState().pagination.pageSize;
          const serialNumber = (transactionsData?.current_page ? (transactionsData.current_page - 1) : pageIndex) * perPage + row.index + 1;
          return (
            <div className="text-center text-slate-400 font-medium w-16">
              {serialNumber}
            </div>
          );
        },
        enableSorting: false,
      },
      {
        accessorKey: "date",
        header: ({ column }) => (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            className="h-8 text-slate-300 hover:text-white"
          >
            Date
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        ),
        cell: ({ row }) => format(parseISO(row.original.date), "MMM dd, yyyy"),
      },
      {
        accessorKey: "type",
        header: ({ column }) => (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            className="h-8 text-slate-300 hover:text-white"
          >
            Type
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        ),
        cell: ({ row }) => (
          <Badge variant={row.original.type === "income" ? "default" : "secondary"}>
            {row.original.type === "income" ? "Income" : "Expense"}
          </Badge>
        ),
      },
      {
        accessorKey: "reference",
        header: "Name",
        cell: ({ row }) => (
          <span className="text-slate-300">{row.original.reference || <span className="text-slate-500">—</span>}</span>
        ),
      },
      {
        accessorKey: "subcategory",
        header: "Subcategory",
        cell: ({ row }) => (
          <span className="text-slate-300">
            {row.original.subcategory?.name || <span className="text-slate-500">—</span>}
          </span>
        ),
      },
      {
        accessorKey: "amount",
        header: ({ column }) => (
          <div className="text-right">
            <Button
              variant="ghost"
              onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
              className="h-8 text-slate-300 hover:text-white"
            >
              Amount
              <ArrowUpDown className="ml-2 h-4 w-4" />
            </Button>
          </div>
        ),
        cell: ({ row }) => (
          <div className="text-right">
            <span
              className={cn(
                "font-semibold",
                row.original.type === "income" ? "text-emerald-400" : "text-rose-400"
              )}
            >
              {row.original.type === "income" ? "+" : "-"} {formatCurrency(row.original.amount)}
            </span>
          </div>
        ),
      },
      {
        accessorKey: "balance_amount",
        header: ({ column }) => (
          <div className="text-right">
            <Button
              variant="ghost"
              onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
              className="h-8 text-slate-300 hover:text-white"
            >
              Balance
              <ArrowUpDown className="ml-2 h-4 w-4" />
            </Button>
          </div>
        ),
        cell: ({ row }) => {
          const balance = row.original.balance_amount !== undefined && row.original.balance_amount !== null
            ? row.original.balance_amount
            : (row.original.paid_amount !== undefined && row.original.paid_amount !== null
              ? row.original.amount - row.original.paid_amount
              : null);
          
          if (balance === null) {
            return (
              <div className="text-right">
                <span className="text-slate-500">—</span>
              </div>
            );
          }
          
          return (
            <div className="text-right">
              <span className="text-amber-400 font-semibold">
                {formatCurrency(balance)}
              </span>
            </div>
          );
        },
      },
      {
        id: "actions",
        header: () => <div className="border-l border-white/10 pl-4">Actions</div>,
        cell: ({ row }) => (
          <div className="flex items-center gap-2 border-l border-white/10 pl-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setViewingTransaction(row.original);
              }}
              className="h-8 text-slate-300 hover:text-white"
            >
              <Eye className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setEditingTransaction(row.original);
                setIsDialogOpen(true);
              }}
              className="h-8 text-slate-300 hover:text-white"
            >
              <Edit2 className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                if (confirm("Are you sure you want to delete this transaction?")) {
                  deleteMutation.mutate(row.original.id);
                }
              }}
              className="h-8 text-slate-300 hover:text-red-400"
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="h-4 w-4" />
              )}
            </Button>
          </div>
        ),
      },
    ],
    [deleteMutation]
  );

  const table = useReactTable({
    data: transactionsData?.data || [],
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    onSortingChange: setSorting,
    state: { sorting },
    manualPagination: true,
    pageCount: transactionsData?.last_page || 0,
  });

  const handleApplyFilters = () => {
    setFilters(pendingFilters);
    setPage(1);
    setIsFiltersOpen(false);
  };

  const handleClearFilters = () => {
    const empty = {
      type: "" as "" | "income" | "expense",
      project_id: "" as number | "",
      category_id: "" as number | "",
      subcategory_id: "" as number | "",
      date_from: "",
      date_to: "",
    };
    setFilters(empty);
    setPendingFilters(empty);
    setSearch("");
    setPage(1);
    setIsFiltersOpen(false);
  };

  const hasActiveFilters = useMemo(() => {
    return (
      filters.type !== "" ||
      filters.project_id !== "" ||
      filters.category_id !== "" ||
      filters.subcategory_id !== "" ||
      filters.date_from !== "" ||
      filters.date_to !== "" ||
      search !== ""
    );
  }, [filters, search]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Cashflow</p>
          <h1 className="text-2xl font-semibold text-white">Transactions</h1>
        </div>
        <div className="flex items-center gap-2">
          <Sheet open={isFiltersOpen} onOpenChange={setIsFiltersOpen}>
            <SheetTrigger asChild>
              <Button variant="outline" className="border-white/10 bg-white/5 text-white relative">
                <Filter className="mr-2 h-4 w-4" />
                Filters
                {hasActiveFilters && (
                  <span className="ml-2 h-2 w-2 rounded-full bg-primary" />
                )}
              </Button>
            </SheetTrigger>
            <SheetContent className="bg-slate-900 border-slate-700 text-white w-80 overflow-y-auto">
              <SheetHeader>
                <SheetTitle>Filters</SheetTitle>
                <SheetDescription className="text-slate-400">
                  Filter transactions by various criteria
                </SheetDescription>
              </SheetHeader>
              <div className="mt-6 space-y-4">
                <div className="space-y-2">
                  <Label>Type</Label>
                  <Select
                    value={pendingFilters.type || "all"}
                    onValueChange={(v) => {
                      setPendingFilters({ ...pendingFilters, type: v === "all" ? "" : v as "income" | "expense", category_id: "", subcategory_id: "" });
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
                    value={pendingFilters.project_id ? pendingFilters.project_id.toString() : "all"}
                    onValueChange={(v) => setPendingFilters({ ...pendingFilters, project_id: v === "all" ? "" : Number(v) })}
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
                    value={pendingFilters.category_id ? pendingFilters.category_id.toString() : "all"}
                    onValueChange={(v) => {
                      setPendingFilters({ ...pendingFilters, category_id: v === "all" ? "" : Number(v), subcategory_id: "" });
                    }}
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
                {pendingFilters.category_id && (
                  <div className="space-y-2">
                    <Label>Subcategory</Label>
                    <Select
                      value={pendingFilters.subcategory_id ? pendingFilters.subcategory_id.toString() : "all"}
                      onValueChange={(v) => setPendingFilters({ ...pendingFilters, subcategory_id: v === "all" ? "" : Number(v) })}
                    >
                      <SelectTrigger className="bg-slate-800 border-slate-600 text-white">
                        <SelectValue placeholder="All subcategories" />
                      </SelectTrigger>
                      <SelectContent className="bg-slate-900 border-slate-700 text-white">
                        <SelectItem value="all">All subcategories</SelectItem>
                        {Array.isArray(subcategories) ? subcategories.map((s) => (
                          <SelectItem key={s.id} value={s.id.toString()}>
                            {s.name}
                          </SelectItem>
                        )) : null}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                <div className="space-y-2">
                  <Label>Date From</Label>
                  <Input
                    type="date"
                    value={pendingFilters.date_from}
                    onChange={(e) => setPendingFilters({ ...pendingFilters, date_from: e.target.value })}
                    className="bg-slate-800 border-slate-600 text-white"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Date To</Label>
                  <Input
                    type="date"
                    value={pendingFilters.date_to}
                    onChange={(e) => setPendingFilters({ ...pendingFilters, date_to: e.target.value })}
                    className="bg-slate-800 border-slate-600 text-white"
                  />
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
            onClick={() => {
              setEditingTransaction(null);
              setIsDialogOpen(true);
            }}
            className="bg-primary text-primary-foreground shadow-lg shadow-primary/40"
          >
            <Plus className="mr-2 h-4 w-4" />
            Add transaction
          </Button>
        </div>
      </div>

      <Card className="bg-white/5 text-white">
        <CardHeader className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Ledger</CardTitle>
            {transactionsData && (
              <span className="text-sm text-slate-400">
                {transactionsData.total} total transactions
              </span>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Input
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Search by description or reference..."
              className="w-full max-w-xs border-white/10 bg-white/5 text-white placeholder:text-slate-400"
            />
            {hasActiveFilters && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClearFilters}
                className="text-slate-300 hover:text-white"
              >
                <X className="mr-2 h-4 w-4" />
                Clear
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="h-12 bg-white/5 rounded animate-pulse" />
              ))}
            </div>
          ) : transactionsData && transactionsData.data.length > 0 ? (
            <>
              <div className="overflow-x-auto -mx-4 lg:-mx-6 px-4 lg:px-6">
                <div className="rounded-md border border-white/10 min-w-full">
                  <Table>
                    <TableHeader className="sticky top-0 z-10 bg-slate-900/95 backdrop-blur-sm">
                      {table.getHeaderGroups().map((headerGroup) => (
                        <TableRow key={headerGroup.id} className="border-b border-white/10 hover:bg-transparent">
                          {headerGroup.headers.map((header) => (
                            <TableHead 
                              key={header.id} 
                              className={cn(
                                "text-slate-300 font-semibold text-xs uppercase tracking-wider py-4 px-4",
                                header.id === "actions" && "border-l border-white/10 pl-4",
                                header.column.columnDef.accessorKey === "amount" && "text-right",
                                header.id === "sno" && "text-center"
                              )}
                            >
                              {header.isPlaceholder
                                ? null
                                : flexRender(header.column.columnDef.header, header.getContext())}
                            </TableHead>
                          ))}
                        </TableRow>
                      ))}
                    </TableHeader>
                    <TableBody>
                      {table.getRowModel().rows.map((row) => (
                        <TableRow
                          key={row.id}
                          className={cn(
                            "border-b border-white/5 transition-all hover:bg-white/5 hover:border-white/10 group",
                            row.original.type === "income"
                              ? "bg-emerald-950/20"
                              : "bg-rose-950/20"
                          )}
                        >
                          {row.getVisibleCells().map((cell) => (
                            <TableCell 
                              key={cell.id}
                              className={cn(
                                "py-4 px-4",
                                cell.column.id === "actions" && "border-l border-white/10 pl-4",
                                cell.column.columnDef.accessorKey === "amount" && "text-right"
                              )}
                            >
                              {flexRender(cell.column.columnDef.cell, cell.getContext())}
                            </TableCell>
                          ))}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
              {/* Enhanced Pagination */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-6 pt-4 border-t border-white/10">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-slate-400">Rows per page:</span>
                  <Select
                    value={perPage.toString()}
                    onValueChange={(v) => {
                      setPerPage(Number(v));
                      setPage(1);
                    }}
                  >
                    <SelectTrigger className="h-9 w-[80px] bg-slate-800/50 border-slate-600/50 text-white hover:bg-slate-800 transition-colors">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-900 border-slate-700 text-white">
                      <SelectItem value="10">10</SelectItem>
                      <SelectItem value="15">15</SelectItem>
                      <SelectItem value="25">25</SelectItem>
                      <SelectItem value="50">50</SelectItem>
                      <SelectItem value="100">100</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="flex items-center gap-3">
                  <div className="text-sm text-slate-400 hidden sm:block">
                    Showing <span className="text-white font-medium">
                      {transactionsData?.current_page && transactionsData?.total 
                        ? ((transactionsData.current_page - 1) * perPage) + 1 
                        : 0}
                    </span>–
                    <span className="text-white font-medium">
                      {transactionsData?.current_page && transactionsData?.total
                        ? Math.min(transactionsData.current_page * perPage, transactionsData.total)
                        : 0}
                    </span> of{" "}
                    <span className="text-white font-medium">{transactionsData?.total || 0}</span>
                  </div>
                  
                  <div className="flex items-center gap-1">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage(1)}
                      disabled={page === 1 || isLoading || !transactionsData?.last_page}
                      className="h-9 px-3 border-white/10 bg-white/5 text-white hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                      title="First page"
                    >
                      <ChevronLeft className="h-4 w-4" />
                      <ChevronLeft className="h-4 w-4 -ml-2" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={page === 1 || isLoading || !transactionsData?.last_page}
                      className="h-9 px-3 border-white/10 bg-white/5 text-white hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                      title="Previous page"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    
                    {/* Page Numbers */}
                    {transactionsData && transactionsData.last_page > 0 && (
                      <div className="flex items-center gap-1 px-2">
                        {Array.from({ length: Math.min(5, transactionsData.last_page) }, (_, i) => {
                          let pageNum: number;
                          if (transactionsData.last_page <= 5) {
                            pageNum = i + 1;
                          } else if (transactionsData.current_page <= 3) {
                            pageNum = i + 1;
                          } else if (transactionsData.current_page >= transactionsData.last_page - 2) {
                            pageNum = transactionsData.last_page - 4 + i;
                          } else {
                            pageNum = transactionsData.current_page - 2 + i;
                          }
                          
                          if (pageNum > transactionsData.last_page) return null;
                          
                          return (
                            <Button
                              key={pageNum}
                              variant={pageNum === transactionsData.current_page ? "default" : "outline"}
                              size="sm"
                              onClick={() => setPage(pageNum)}
                              disabled={isLoading}
                              className={cn(
                                "h-9 min-w-[36px] px-3 transition-all",
                                pageNum === transactionsData.current_page
                                  ? "bg-primary text-primary-foreground hover:bg-primary/90 border-primary"
                                  : "border-white/10 bg-white/5 text-white hover:bg-white/10"
                              )}
                            >
                              {pageNum}
                            </Button>
                          );
                        })}
                      </div>
                    )}
                    
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage((p) => Math.min(transactionsData?.last_page || 1, p + 1))}
                      disabled={page === (transactionsData?.last_page || 1) || isLoading || !transactionsData?.last_page}
                      className="h-9 px-3 border-white/10 bg-white/5 text-white hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                      title="Next page"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage(transactionsData?.last_page || 1)}
                      disabled={page === (transactionsData?.last_page || 1) || isLoading || !transactionsData?.last_page}
                      className="h-9 px-3 border-white/10 bg-white/5 text-white hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                      title="Last page"
                    >
                      <ChevronRight className="h-4 w-4" />
                      <ChevronRight className="h-4 w-4 -ml-2" />
                    </Button>
                  </div>
                  
                  <div className="text-sm text-slate-400 hidden lg:block ml-2">
                    Page <span className="text-white font-medium">{transactionsData?.current_page || 0}</span> of{" "}
                    <span className="text-white font-medium">{transactionsData?.last_page || 0}</span>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="text-center py-12">
              <p className="text-muted-foreground">No transactions found</p>
            </div>
          )}
        </CardContent>
      </Card>

      <TransactionDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        transaction={editingTransaction}
        projects={Array.isArray(projects) ? projects : []}
        categories={Array.isArray(categories) ? categories : []}
        onSubmit={(data) => {
          if (editingTransaction) {
            updateMutation.mutate({ id: editingTransaction.id, data });
          } else {
            createMutation.mutate(data);
          }
        }}
        isSubmitting={createMutation.isPending || updateMutation.isPending}
      />

      <TransactionViewDialog
        open={!!viewingTransaction}
        onOpenChange={(open) => {
          if (!open) {
            setViewingTransaction(null);
          }
        }}
        transaction={viewingTransaction}
      />
    </div>
  );
}

interface TransactionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  transaction: Transaction | null;
  projects: Project[];
  categories: Category[];
  onSubmit: (data: {
    type: "income" | "expense";
    amount: number;
    date: string;
    category_id: number;
    project_id?: number;
    subcategory_id?: number;
    description?: string;
    reference?: string;
  }) => void;
  isSubmitting: boolean;
}

function TransactionDialog({
  open,
  onOpenChange,
  transaction,
  projects,
  categories,
  onSubmit,
  isSubmitting,
}: TransactionDialogProps) {
  const [type, setType] = useState<"income" | "expense">("expense");
  const [amount, setAmount] = useState("");
  const [paidAmount, setPaidAmount] = useState("");
  const [date, setDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [projectId, setProjectId] = useState<number | "">("");
  const [categoryId, setCategoryId] = useState<number | "">("");
  const [subcategoryId, setSubcategoryId] = useState<number | "">("");
  const [description, setDescription] = useState("");
  const [reference, setReference] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");

  // Calculate balance amount automatically
  const balanceAmount = useMemo(() => {
    const total = parseFloat(amount) || 0;
    const paid = parseFloat(paidAmount) || 0;
    return total - paid;
  }, [amount, paidAmount]);

  const { data: subcategories } = useQuery({
    queryKey: ["subcategories", categoryId],
    queryFn: () => subcategoriesApi.list(Number(categoryId) || undefined),
    enabled: !!categoryId,
  });

  const availableCategories = Array.isArray(categories) ? categories.filter((c) => c.type === type) : [];

  // Reset form when dialog opens or transaction changes
  useEffect(() => {
    if (open) {
      if (transaction) {
        setType(transaction.type);
        setAmount(transaction.amount.toString());
        setPaidAmount(transaction.paid_amount?.toString() || "");
        setDate(transaction.date);
        setProjectId(transaction.project_id || "");
        setCategoryId(transaction.category_id);
        setSubcategoryId(transaction.subcategory_id || "");
        setDescription(transaction.description || "");
        setReference(transaction.reference || "");
        setPhoneNumber(transaction.phone_number || "");
      } else {
        setType("expense");
        setAmount("");
        setPaidAmount("");
        setDate(format(new Date(), "yyyy-MM-dd"));
        setProjectId("");
        setCategoryId("");
        setSubcategoryId("");
        setDescription("");
        setReference("");
        setPhoneNumber("");
      }
    }
  }, [open, transaction]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!categoryId || !amount) return;

    onSubmit({
      type,
      amount: parseFloat(amount),
      paid_amount: paidAmount ? parseFloat(paidAmount) : undefined,
      date,
      category_id: Number(categoryId),
      project_id: projectId ? Number(projectId) : undefined,
      subcategory_id: subcategoryId ? Number(subcategoryId) : undefined,
      description: description.trim() || undefined,
      reference: reference.trim() || undefined,
      phone_number: phoneNumber.trim() || undefined,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-slate-900 border-slate-700 text-white max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{transaction ? "Edit Transaction" : "New Transaction"}</DialogTitle>
          <DialogDescription className="text-slate-400">
            {transaction ? "Update transaction details" : "Record a new income or expense transaction"}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="type">Type *</Label>
                <Select value={type} onValueChange={(v: "income" | "expense") => {
                  setType(v);
                  setCategoryId("");
                  setSubcategoryId("");
                }}>
                  <SelectTrigger className="bg-slate-800 border-slate-600 text-white">
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-900 border-slate-700 text-white z-[100]">
                    <SelectItem value="income">Income</SelectItem>
                    <SelectItem value="expense">Expense</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="amount">Total Amount *</Label>
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  min="0"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  required
                  className="bg-slate-800 border-slate-600 text-white"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="paidAmount">Paid Amount</Label>
                <Input
                  id="paidAmount"
                  type="number"
                  step="0.01"
                  min="0"
                  max={amount ? parseFloat(amount) : undefined}
                  value={paidAmount}
                  onChange={(e) => setPaidAmount(e.target.value)}
                  placeholder="0.00"
                  className="bg-slate-800 border-slate-600 text-white"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="balanceAmount">Balance Amount</Label>
                <Input
                  id="balanceAmount"
                  type="number"
                  step="0.01"
                  value={balanceAmount.toFixed(2)}
                  readOnly
                  className="bg-slate-700 border-slate-600 text-slate-300 cursor-not-allowed"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="date">Date *</Label>
              <Input
                id="date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
                className="bg-slate-800 border-slate-600 text-white"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="category">Category *</Label>
                <Select
                  value={categoryId ? categoryId.toString() : undefined}
                  onValueChange={(v) => {
                    setCategoryId(v ? Number(v) : "");
                    setSubcategoryId("");
                  }}
                >
                  <SelectTrigger className="bg-slate-800 border-slate-600 text-white">
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-900 border-slate-700 text-white z-[100]">
                    {availableCategories.length > 0 ? (
                      availableCategories.map((c) => (
                        <SelectItem key={c.id} value={c.id.toString()}>
                          {c.name}
                        </SelectItem>
                      ))
                    ) : (
                      <div className="px-2 py-1.5 text-sm text-slate-400">No categories available</div>
                    )}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="subcategory">Subcategory</Label>
                <Select
                  value={subcategoryId ? subcategoryId.toString() : "none"}
                  onValueChange={(v) => setSubcategoryId(v === "none" ? "" : Number(v))}
                  disabled={!categoryId}
                >
                  <SelectTrigger className="bg-slate-800 border-slate-600 text-white">
                    <SelectValue placeholder="Select subcategory (optional)" />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-900 border-slate-700 text-white z-[100]">
                    <SelectItem value="none">None</SelectItem>
                    {Array.isArray(subcategories) && subcategories.length > 0 ? (
                      subcategories.map((s) => (
                        <SelectItem key={s.id} value={s.id.toString()}>
                          {s.name}
                        </SelectItem>
                      ))
                    ) : categoryId ? (
                      <div className="px-2 py-1.5 text-sm text-slate-400">No subcategories available</div>
                    ) : null}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="project">Project</Label>
              <Select
                value={projectId ? projectId.toString() : "none"}
                onValueChange={(v) => setProjectId(v === "none" ? "" : Number(v))}
              >
                <SelectTrigger className="bg-slate-800 border-slate-600 text-white">
                  <SelectValue placeholder="Select project (optional)" />
                </SelectTrigger>
                <SelectContent className="bg-slate-900 border-slate-700 text-white z-[100]">
                  <SelectItem value="none">None</SelectItem>
                  {Array.isArray(projects) && projects.length > 0 ? (
                    projects.map((p) => (
                      <SelectItem key={p.id} value={p.id.toString()}>
                        {p.name}
                      </SelectItem>
                    ))
                  ) : (
                    <div className="px-2 py-1.5 text-sm text-slate-400">No projects available</div>
                  )}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="reference">Name / Reference</Label>
                <Input
                  id="reference"
                  value={reference}
                  onChange={(e) => setReference(e.target.value)}
                  placeholder="Party/customer/reference name (optional)"
                  className="bg-slate-800 border-slate-600 text-white"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phoneNumber">Phone Number</Label>
                <Input
                  id="phoneNumber"
                  type="tel"
                  value={phoneNumber}
                  onChange={(e) => {
                    const value = e.target.value.replace(/\D/g, '').slice(0, 10);
                    setPhoneNumber(value);
                  }}
                  placeholder="10 digits"
                  maxLength={10}
                  className="bg-slate-800 border-slate-600 text-white"
                />
                {phoneNumber && phoneNumber.length !== 10 && (
                  <p className="text-xs text-rose-400">Phone number must be exactly 10 digits</p>
                )}
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Input
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Optional description"
                className="bg-slate-800 border-slate-600 text-white"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting || !categoryId || !amount}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {transaction ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

interface TransactionViewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  transaction: Transaction | null;
}

function TransactionViewDialog({
  open,
  onOpenChange,
  transaction,
}: TransactionViewDialogProps) {
  if (!transaction) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-slate-900 border-slate-700 text-white max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Transaction Details</DialogTitle>
          <DialogDescription className="text-slate-400">View complete transaction information</DialogDescription>
        </DialogHeader>
        <div className="space-y-6 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-slate-400">Type</Label>
              <div>
                <Badge variant={transaction.type === "income" ? "default" : "secondary"}>
                  {transaction.type === "income" ? "Income" : "Expense"}
                </Badge>
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-slate-400">Date</Label>
              <p className="text-white font-semibold">{format(parseISO(transaction.date), "MMM dd, yyyy")}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-slate-400">Total Amount</Label>
              <p className="text-white text-xl font-bold">{formatCurrency(transaction.amount)}</p>
            </div>
            {transaction.paid_amount !== undefined && transaction.paid_amount !== null && (
              <>
                <div className="space-y-2">
                  <Label className="text-slate-400">Paid Amount</Label>
                  <p className="text-emerald-400 text-xl font-bold">{formatCurrency(transaction.paid_amount)}</p>
                </div>
                <div className="space-y-2">
                  <Label className="text-slate-400">Balance Amount</Label>
                  <p className="text-rose-400 text-xl font-bold">
                    {formatCurrency(transaction.balance_amount || (transaction.amount - (transaction.paid_amount || 0)))}
                  </p>
                </div>
              </>
            )}
          </div>

          <Separator className="bg-white/10" />

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-slate-400">Name / Reference</Label>
              <p className="text-white">{transaction.reference || "—"}</p>
            </div>
            {transaction.phone_number && (
              <div className="space-y-2">
                <Label className="text-slate-400">Phone Number</Label>
                <p className="text-white">{transaction.phone_number}</p>
              </div>
            )}
          </div>

          {transaction.description && (
            <div className="space-y-2">
              <Label className="text-slate-400">Description</Label>
              <p className="text-white">{transaction.description}</p>
            </div>
          )}

          <Separator className="bg-white/10" />

          <div className="grid grid-cols-2 gap-4">
            {transaction.project && (
              <div className="space-y-2">
                <Label className="text-slate-400">Project</Label>
                <div className="flex items-center gap-2">
                  <span
                    className="h-2 w-2 rounded-full"
                    style={{ backgroundColor: transaction.project.color }}
                  />
                  <p className="text-white">{transaction.project.name}</p>
                </div>
              </div>
            )}
            {transaction.category && (
              <div className="space-y-2">
                <Label className="text-slate-400">Category</Label>
                <div className="flex items-center gap-2">
                  <span
                    className="h-2 w-2 rounded-full"
                    style={{ backgroundColor: transaction.category.color || "#666" }}
                  />
                  <p className="text-white">{transaction.category.name}</p>
                </div>
              </div>
            )}
          </div>

          {transaction.subcategory && (
            <div className="space-y-2">
              <Label className="text-slate-400">Subcategory</Label>
              <p className="text-white">{transaction.subcategory.name}</p>
            </div>
          )}

          <Separator className="bg-white/10" />

          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="space-y-2">
              <Label className="text-slate-400">Created At</Label>
              <p className="text-slate-300">{format(parseISO(transaction.created_at), "MMM dd, yyyy HH:mm")}</p>
            </div>
            <div className="space-y-2">
              <Label className="text-slate-400">Updated At</Label>
              <p className="text-slate-300">{format(parseISO(transaction.updated_at), "MMM dd, yyyy HH:mm")}</p>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
