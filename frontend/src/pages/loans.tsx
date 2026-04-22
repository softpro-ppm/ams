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
  DollarSign,
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
import { loansApi, projectsApi } from "@/services/api";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import type { Loan, LoanPayment, LoanDisbursement, Project } from "@/types";

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value);
}

export function LoansPage() {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(15);
  const [filters, setFilters] = useState({
    type: "" as "" | "given" | "received",
    status: "" as "" | "active" | "completed",
    project_id: "" as number | "",
  });
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingLoan, setEditingLoan] = useState<Loan | null>(null);
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);
  const [selectedLoan, setSelectedLoan] = useState<Loan | null>(null);
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);
  const [editingPayment, setEditingPayment] = useState<LoanPayment | null>(null);
  const [isDisbursementDialogOpen, setIsDisbursementDialogOpen] = useState(false);
  const [editingDisbursement, setEditingDisbursement] = useState<LoanDisbursement | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch loans
  const { data: loansData, isLoading } = useQuery({
    queryKey: ["loans", page, perPage, search, filters.type, filters.status, filters.project_id],
    queryFn: () =>
      loansApi.list({
        page,
        per_page: perPage,
        search: search || undefined,
        type: filters.type || undefined,
        status: filters.status || undefined,
        project_id: filters.project_id || undefined,
      }),
  });

  // Fetch projects for filters
  const { data: projects } = useQuery({
    queryKey: ["projects"],
    queryFn: () => projectsApi.list(),
  });

  // Fetch loan details when selected
  const { data: loanDetails, error: loanDetailsError, isLoading: isLoadingLoanDetails } = useQuery({
    queryKey: ["loans", selectedLoan?.id],
    queryFn: async () => {
      if (!selectedLoan?.id) throw new Error("No loan ID");
      console.log("Fetching loan details for ID:", selectedLoan.id);
      const data = await loansApi.get(selectedLoan.id);
      console.log("Loan details fetched:", data);
      console.log("Loan details - principal:", data?.principal, "paid_total:", data?.paid_total, "balance:", data?.balance);
      return data;
    },
    enabled: !!selectedLoan && !!selectedLoan.id,
    staleTime: 0, // Always refetch to get latest payment data
    retry: 2,
  });

  const createMutation = useMutation({
    mutationFn: loansApi.create,
    onSuccess: (newLoan) => {
      queryClient.invalidateQueries({ queryKey: ["loans"] });
      setIsDialogOpen(false);
      // Invalidate the specific loan details query if this loan is selected
      if (selectedLoan?.id === newLoan.id) {
        queryClient.invalidateQueries({ queryKey: ["loans", newLoan.id] });
      }
      toast({
        title: "Success",
        description: "Loan created successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.response?.data?.message || "Failed to create loan",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<Loan> }) => loansApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["loans"] });
      setIsDialogOpen(false);
      setEditingLoan(null);
      toast({
        title: "Success",
        description: "Loan updated successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.response?.data?.message || "Failed to update loan",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: loansApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["loans"] });
      toast({
        title: "Success",
        description: "Loan deleted successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.response?.data?.message || "Failed to delete loan",
        variant: "destructive",
      });
    },
  });

  const createPaymentMutation = useMutation({
    mutationFn: ({ loanId, payment, loanType }: { loanId: number; payment: Partial<LoanPayment>; loanType: "given" | "received" }) =>
      loansApi.payments.create(loanId, {
        amount: payment.amount!,
        paid_on: payment.paid_on!,
        flow: loanType === "given" ? "in" : "out",
        note: payment.note,
      }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["loans"] });
      queryClient.invalidateQueries({ queryKey: ["loans", variables.loanId] });
      // Refetch loan details immediately to show updated amounts
      queryClient.refetchQueries({ queryKey: ["loans", variables.loanId] });
      setIsPaymentDialogOpen(false);
      setEditingPayment(null);
      toast({
        title: "Success",
        description: "Payment recorded successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.response?.data?.message || "Failed to record payment",
        variant: "destructive",
      });
    },
  });

  const updatePaymentMutation = useMutation({
    mutationFn: ({
      loanId,
      paymentId,
      payment,
    }: {
      loanId: number;
      paymentId: number;
      payment: Partial<LoanPayment>;
    }) => loansApi.payments.update(loanId, paymentId, payment),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["loans"] });
      queryClient.invalidateQueries({ queryKey: ["loans", variables.loanId] });
      // Refetch loan details immediately
      queryClient.refetchQueries({ queryKey: ["loans", variables.loanId] });
      setIsPaymentDialogOpen(false);
      setEditingPayment(null);
      toast({
        title: "Success",
        description: "Payment updated successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.response?.data?.message || "Failed to update payment",
        variant: "destructive",
      });
    },
  });

  const deletePaymentMutation = useMutation({
    mutationFn: ({ loanId, paymentId }: { loanId: number; paymentId: number }) =>
      loansApi.payments.delete(loanId, paymentId),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["loans"] });
      queryClient.invalidateQueries({ queryKey: ["loans", variables.loanId] });
      // Refetch loan details immediately
      queryClient.refetchQueries({ queryKey: ["loans", variables.loanId] });
      toast({
        title: "Success",
        description: "Payment deleted successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.response?.data?.message || "Failed to delete payment",
        variant: "destructive",
      });
    },
  });

  // Disbursement mutations
  const createDisbursementMutation = useMutation({
    mutationFn: ({ loanId, disbursement }: { loanId: number; disbursement: Partial<LoanDisbursement> }) =>
      loansApi.disbursements.create(loanId, {
        amount: disbursement.amount!,
        disbursed_on: disbursement.disbursed_on!,
        note: disbursement.note,
      }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["loans"] });
      queryClient.invalidateQueries({ queryKey: ["loans", variables.loanId] });
      queryClient.refetchQueries({ queryKey: ["loans", variables.loanId] });
      setIsDisbursementDialogOpen(false);
      setEditingDisbursement(null);
      toast({
        title: "Success",
        description: "Disbursement added successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.response?.data?.message || "Failed to add disbursement",
        variant: "destructive",
      });
    },
  });

  const updateDisbursementMutation = useMutation({
    mutationFn: ({
      loanId,
      disbursementId,
      disbursement,
    }: {
      loanId: number;
      disbursementId: number;
      disbursement: Partial<LoanDisbursement>;
    }) => loansApi.disbursements.update(loanId, disbursementId, disbursement),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["loans"] });
      queryClient.invalidateQueries({ queryKey: ["loans", variables.loanId] });
      queryClient.refetchQueries({ queryKey: ["loans", variables.loanId] });
      setIsDisbursementDialogOpen(false);
      setEditingDisbursement(null);
      toast({
        title: "Success",
        description: "Disbursement updated successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.response?.data?.message || "Failed to update disbursement",
        variant: "destructive",
      });
    },
  });

  const deleteDisbursementMutation = useMutation({
    mutationFn: ({ loanId, disbursementId }: { loanId: number; disbursementId: number }) =>
      loansApi.disbursements.delete(loanId, disbursementId),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["loans"] });
      queryClient.invalidateQueries({ queryKey: ["loans", variables.loanId] });
      queryClient.refetchQueries({ queryKey: ["loans", variables.loanId] });
      toast({
        title: "Success",
        description: "Disbursement deleted successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.response?.data?.message || "Failed to delete disbursement",
        variant: "destructive",
      });
    },
  });

  const columns: ColumnDef<Loan>[] = useMemo(
    () => [
      {
        id: "sno",
        header: () => <div className="text-center w-16">S.No</div>,
        cell: ({ row, table }) => {
          const serialNumber = (loansData?.current_page ? (loansData.current_page - 1) : 0) * perPage + row.index + 1;
          return (
            <div className="text-center text-slate-400 font-medium w-16">
              {serialNumber}
            </div>
          );
        },
        enableSorting: false,
      },
      {
        accessorKey: "name",
        header: ({ column }) => (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            className="h-8 text-slate-300 hover:text-white"
          >
            Name
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        ),
        cell: ({ row }) => <span className="font-semibold">{row.original.name}</span>,
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
          <Badge variant={row.original.type === "given" ? "default" : "secondary"}>
            {row.original.type === "given" ? "Given" : "Received"}
          </Badge>
        ),
      },
      {
        accessorKey: "status",
        header: ({ column }) => (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            className="h-8 text-slate-300 hover:text-white"
          >
            Status
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        ),
        cell: ({ row }) => (
          <Badge variant={row.original.status === "active" ? "default" : "outline"}>
            {row.original.status}
          </Badge>
        ),
      },
      {
        accessorKey: "project",
        header: "Project",
        cell: ({ row }) => (
          <div className="flex items-center gap-2">
            {row.original.project && (
              <>
                <span
                  className="h-2 w-2 rounded-full"
                  style={{ backgroundColor: row.original.project.color }}
                />
                <span>{row.original.project.name}</span>
              </>
            )}
            {!row.original.project && <span className="text-slate-400">—</span>}
          </div>
        ),
      },
      {
        accessorKey: "principal",
        header: ({ column }) => (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            className="h-8 text-slate-300 hover:text-white text-right"
          >
            Loan Amount
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        ),
        cell: ({ row }) => (
          <span className="font-semibold text-right block">{formatCurrency(row.original.principal)}</span>
        ),
      },
      {
        accessorKey: "paid_total",
        header: ({ column }) => (
          <div className="text-right">
            <Button
              variant="ghost"
              onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
              className="h-8 text-slate-300 hover:text-white"
            >
              Paid
              <ArrowUpDown className="ml-2 h-4 w-4" />
            </Button>
          </div>
        ),
        cell: ({ row }) => (
          <span className="text-right block text-slate-300">{formatCurrency(row.original.paid_total || 0)}</span>
        ),
      },
      {
        accessorKey: "balance",
        header: ({ column }) => (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            className="h-8 text-slate-300 hover:text-white text-right"
          >
            Balance
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        ),
        cell: ({ row }) => (
          <span className="font-semibold text-right block text-emerald-400">
            {formatCurrency(row.original.balance || 0)}
          </span>
        ),
      },
      {
        accessorKey: "start_date",
        header: "Start Date",
        cell: ({ row }) =>
          row.original.start_date ? (
            format(parseISO(row.original.start_date), "MMM dd, yyyy")
          ) : (
            <span className="text-slate-400">—</span>
          ),
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
                setSelectedLoan(row.original);
              }}
              className="h-8 text-slate-300 hover:text-white"
            >
              <Eye className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setEditingLoan(row.original);
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
                if (confirm("Are you sure you want to delete this loan?")) {
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
    data: loansData?.data || [],
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    onSortingChange: setSorting,
    state: { sorting },
    manualPagination: true,
    pageCount: loansData?.last_page || 0,
  });

  const handleClearFilters = () => {
    setFilters({
      type: "",
      status: "",
      project_id: "",
    });
    setSearch("");
    setPage(1);
  };

  const hasActiveFilters = useMemo(() => {
    return filters.type !== "" || filters.status !== "" || filters.project_id !== "" || search !== "";
  }, [filters, search]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Credit Desk</p>
          <h1 className="text-2xl font-semibold text-white">Loans</h1>
        </div>
        <div className="flex items-center gap-2">
          <Sheet open={isFiltersOpen} onOpenChange={setIsFiltersOpen}>
            <SheetTrigger asChild>
              <Button variant="outline" className="border-white/10 bg-white/5 text-white relative">
                <Filter className="mr-2 h-4 w-4" />
                Filters
                {hasActiveFilters && <span className="ml-2 h-2 w-2 rounded-full bg-primary" />}
              </Button>
            </SheetTrigger>
            <SheetContent className="bg-slate-900 border-slate-700 text-white w-80 overflow-y-auto">
              <SheetHeader>
                <SheetTitle>Filters</SheetTitle>
                <SheetDescription className="text-slate-400">Filter loans by various criteria</SheetDescription>
              </SheetHeader>
              <div className="mt-6 space-y-4">
                <div className="space-y-2">
                  <Label>Type</Label>
                  <Select
                    value={filters.type || "all"}
                    onValueChange={(v) => setFilters({ ...filters, type: v === "all" ? "" : v as "given" | "received" })}
                  >
                    <SelectTrigger className="bg-slate-800 border-slate-600 text-white">
                      <SelectValue placeholder="All types" />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-900 border-slate-700 text-white">
                      <SelectItem value="all">All types</SelectItem>
                      <SelectItem value="given">Given</SelectItem>
                      <SelectItem value="received">Received</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select
                    value={filters.status || "all"}
                    onValueChange={(v) => setFilters({ ...filters, status: v === "all" ? "" : v as "active" | "completed" })}
                  >
                    <SelectTrigger className="bg-slate-800 border-slate-600 text-white">
                      <SelectValue placeholder="All statuses" />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-900 border-slate-700 text-white">
                      <SelectItem value="all">All statuses</SelectItem>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Project</Label>
                  <Select
                    value={filters.project_id ? filters.project_id.toString() : "all"}
                    onValueChange={(v) => setFilters({ ...filters, project_id: v === "all" ? "" : Number(v) })}
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
              setEditingLoan(null);
              setIsDialogOpen(true);
            }}
            className="bg-primary text-primary-foreground shadow-lg shadow-primary/40"
          >
            <Plus className="mr-2 h-4 w-4" />
            Add loan
          </Button>
        </div>
      </div>

      <Card className="bg-white/5 text-white">
        <CardHeader className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Portfolio</CardTitle>
            {loansData && <span className="text-sm text-slate-400">{loansData.total} total loans</span>}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Input
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Search by name..."
              className="w-full max-w-xs border-white/10 bg-white/5 text-white placeholder:text-slate-400"
            />
            {hasActiveFilters && (
              <Button variant="ghost" size="sm" onClick={handleClearFilters} className="text-slate-300 hover:text-white">
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
          ) : loansData && loansData.data.length > 0 ? (
            <>
              <div className="overflow-x-auto -mx-4 lg:-mx-6 px-4 lg:px-6">
                <div className="rounded-md border border-white/10 w-full">
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
                                (header.column.columnDef.accessorKey === "principal" || 
                                 header.column.columnDef.accessorKey === "paid_total" || 
                                 header.column.columnDef.accessorKey === "balance") && "text-right",
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
                          className="border-b border-white/5 transition-all hover:bg-white/5 hover:border-white/10 group"
                        >
                          {row.getVisibleCells().map((cell) => (
                            <TableCell 
                              key={cell.id}
                              className={cn(
                                "py-4 px-4",
                                cell.column.id === "actions" && "border-l border-white/10 pl-4",
                                (cell.column.columnDef.accessorKey === "principal" || 
                                 cell.column.columnDef.accessorKey === "paid_total" || 
                                 cell.column.columnDef.accessorKey === "balance") && "text-right"
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
                    Showing <span className="text-white font-medium">{loansData?.current_page && loansData?.total ? ((loansData.current_page - 1) * perPage) + 1 : 0}</span>–
                    <span className="text-white font-medium">{loansData?.current_page && loansData?.total ? Math.min(loansData.current_page * perPage, loansData.total) : 0}</span> of{" "}
                    <span className="text-white font-medium">{loansData?.total || 0}</span>
                  </div>
                  
                  <div className="flex items-center gap-1">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage(1)}
                      disabled={page === 1 || isLoading || !loansData?.last_page}
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
                      disabled={page === 1 || isLoading || !loansData?.last_page}
                      className="h-9 px-3 border-white/10 bg-white/5 text-white hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                      title="Previous page"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    
                    {/* Page Numbers */}
                    {loansData && loansData.last_page > 0 && (
                      <div className="flex items-center gap-1 px-2">
                        {Array.from({ length: Math.min(5, loansData.last_page) }, (_, i) => {
                          let pageNum: number;
                          if (loansData.last_page <= 5) {
                            pageNum = i + 1;
                          } else if (loansData.current_page <= 3) {
                            pageNum = i + 1;
                          } else if (loansData.current_page >= loansData.last_page - 2) {
                            pageNum = loansData.last_page - 4 + i;
                          } else {
                            pageNum = loansData.current_page - 2 + i;
                          }
                          
                          if (pageNum > loansData.last_page) return null;
                          
                          return (
                            <Button
                              key={pageNum}
                              variant={pageNum === loansData.current_page ? "default" : "outline"}
                              size="sm"
                              onClick={() => setPage(pageNum)}
                              disabled={isLoading}
                              className={cn(
                                "h-9 min-w-[36px] px-3 transition-all",
                                pageNum === loansData.current_page
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
                      onClick={() => setPage((p) => Math.min(loansData?.last_page || 1, p + 1))}
                      disabled={page === (loansData?.last_page || 1) || isLoading}
                      className="h-9 px-3 border-white/10 bg-white/5 text-white hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                      title="Next page"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage(loansData?.last_page || 1)}
                      disabled={page === (loansData?.last_page || 1) || isLoading}
                      className="h-9 px-3 border-white/10 bg-white/5 text-white hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                      title="Last page"
                    >
                      <ChevronRight className="h-4 w-4" />
                      <ChevronRight className="h-4 w-4 -ml-2" />
                    </Button>
                  </div>
                  
                  <div className="text-sm text-slate-400 hidden lg:block ml-2">
                    Page <span className="text-white font-medium">{loansData?.current_page || 0}</span> of{" "}
                    <span className="text-white font-medium">{loansData?.last_page || 0}</span>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="text-center py-12">
              <p className="text-muted-foreground">No loans found</p>
            </div>
          )}
        </CardContent>
      </Card>

      <LoanDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        loan={editingLoan}
        projects={Array.isArray(projects) ? projects : []}
        onSubmit={(data) => {
          if (editingLoan) {
            updateMutation.mutate({ id: editingLoan.id, data });
          } else {
            createMutation.mutate(data);
          }
        }}
        isSubmitting={createMutation.isPending || updateMutation.isPending}
      />

      {selectedLoan && (
        <LoanDetailsDialog
          key={`loan-${selectedLoan.id}-${loanDetails?.updated_at || ''}`} // Force re-render when loan details update
          open={!!selectedLoan}
          onOpenChange={(open) => {
            if (!open) {
              setSelectedLoan(null);
            }
          }}
          loan={loanDetails || selectedLoan}
          isLoading={isLoadingLoanDetails && !loanDetails}
          error={loanDetailsError}
          onAddPayment={() => {
            setEditingPayment(null);
            setIsPaymentDialogOpen(true);
          }}
          onEditPayment={(payment) => {
            setEditingPayment(payment);
            setIsPaymentDialogOpen(true);
          }}
          onDeletePayment={(paymentId) => {
            if (confirm("Are you sure you want to delete this payment?")) {
              const loanId = loanDetails?.id || selectedLoan?.id;
              if (loanId) {
                deletePaymentMutation.mutate({ loanId, paymentId });
              }
            }
          }}
          onAddDisbursement={() => {
            setEditingDisbursement(null);
            setIsDisbursementDialogOpen(true);
          }}
          onEditDisbursement={(disbursement) => {
            setEditingDisbursement(disbursement);
            setIsDisbursementDialogOpen(true);
          }}
          onDeleteDisbursement={(disbursementId) => {
            if (confirm("Are you sure you want to delete this disbursement?")) {
              const loanId = loanDetails?.id || selectedLoan?.id;
              if (loanId) {
                deleteDisbursementMutation.mutate({ loanId, disbursementId });
              }
            }
          }}
          paymentDialog={
            <PaymentDialog
              open={isPaymentDialogOpen}
              onOpenChange={setIsPaymentDialogOpen}
              loan={loanDetails || selectedLoan}
              payment={editingPayment}
              onSubmit={(payment) => {
                const loanId = loanDetails?.id || selectedLoan?.id;
                if (!loanId) return;
                
                if (editingPayment) {
                  updatePaymentMutation.mutate({
                    loanId,
                    paymentId: editingPayment.id,
                    payment,
                  });
                } else {
                  const loanType = loanDetails?.type || selectedLoan?.type;
                  createPaymentMutation.mutate({ loanId, payment, loanType: loanType as "given" | "received" });
                }
              }}
              isSubmitting={createPaymentMutation.isPending || updatePaymentMutation.isPending}
            />
          }
          disbursementDialog={
            <DisbursementDialog
              open={isDisbursementDialogOpen}
              onOpenChange={setIsDisbursementDialogOpen}
              loan={loanDetails || selectedLoan}
              disbursement={editingDisbursement}
              onSubmit={(disbursement) => {
                const loanId = loanDetails?.id || selectedLoan?.id;
                if (!loanId) return;

                if (editingDisbursement) {
                  updateDisbursementMutation.mutate({
                    loanId,
                    disbursementId: editingDisbursement.id,
                    disbursement,
                  });
                } else {
                  createDisbursementMutation.mutate({ loanId, disbursement });
                }
              }}
              isSubmitting={createDisbursementMutation.isPending || updateDisbursementMutation.isPending}
            />
          }
        />
      )}
    </div>
  );
}

interface LoanDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  loan: Loan | null;
  projects: Project[];
  onSubmit: (data: {
    type: "given" | "received";
    name: string;
    phone_number?: string;
    principal: number;
    start_date?: string;
    description?: string;
    project_id?: number;
  }) => void;
  isSubmitting: boolean;
}

function LoanDialog({
  open,
  onOpenChange,
  loan,
  projects,
  onSubmit,
  isSubmitting,
}: LoanDialogProps) {
  const [type, setType] = useState<"given" | "received">("given");
  const [name, setName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [principal, setPrincipal] = useState("");
  const [startDate, setStartDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [projectId, setProjectId] = useState<number | "">("");
  const [description, setDescription] = useState("");

  useEffect(() => {
    if (open) {
      if (loan) {
        setType(loan.type);
        setName(loan.name);
        setPhoneNumber(loan.phone_number || "");
        setPrincipal(loan.principal.toString());
        setStartDate(loan.start_date || format(new Date(), "yyyy-MM-dd"));
        setProjectId(loan.project_id || "");
        setDescription(loan.description || "");
      } else {
        setType("given");
        setName("");
        setPhoneNumber("");
        setPrincipal("");
        setStartDate(format(new Date(), "yyyy-MM-dd"));
        setProjectId("");
        setDescription("");
      }
    }
  }, [open, loan]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !principal) return;

    onSubmit({
      type,
      name,
      phone_number: phoneNumber.trim() || undefined,
      principal: parseFloat(principal),
      start_date: startDate || undefined,
      project_id: projectId ? Number(projectId) : undefined,
      description: description.trim() || undefined,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-slate-900 border-slate-700 text-white max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{loan ? "Edit Loan" : "New Loan"}</DialogTitle>
          <DialogDescription className="text-slate-400">
            {loan ? "Update loan details" : "Create a new loan record"}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="type">Type *</Label>
                <Select value={type} onValueChange={(v: "given" | "received") => setType(v)}>
                  <SelectTrigger className="bg-slate-800 border-slate-600 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-900 border-slate-700 text-white">
                    <SelectItem value="given">Given</SelectItem>
                    <SelectItem value="received">Received</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="name">Name *</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Loan name"
                  required
                  className="bg-slate-800 border-slate-600 text-white"
                />
              </div>
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
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="principal">Loan Amount *</Label>
                <Input
                  id="principal"
                  type="number"
                  step="0.01"
                  min="0"
                  value={principal}
                  onChange={(e) => setPrincipal(e.target.value)}
                  placeholder="0.00"
                  required
                  className="bg-slate-800 border-slate-600 text-white"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="startDate">Start Date</Label>
                <Input
                  id="startDate"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="bg-slate-800 border-slate-600 text-white"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="project">Project</Label>
              <Select value={projectId ? projectId.toString() : "none"} onValueChange={(v) => setProjectId(v === "none" ? "" : Number(v))}>
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
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting || !name || !principal}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {loan ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

interface LoanDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  loan: Loan;
  isLoading?: boolean;
  error?: any;
  onAddPayment: () => void;
  onEditPayment: (payment: LoanPayment) => void;
  onDeletePayment: (paymentId: number) => void;
  onAddDisbursement: () => void;
  onEditDisbursement: (disbursement: LoanDisbursement) => void;
  onDeleteDisbursement: (disbursementId: number) => void;
  paymentDialog: React.ReactNode;
  disbursementDialog: React.ReactNode;
}

function LoanDetailsDialog({
  open,
  onOpenChange,
  loan,
  isLoading = false,
  error,
  onAddPayment,
  onEditPayment,
  onDeletePayment,
  onAddDisbursement,
  onEditDisbursement,
  onDeleteDisbursement,
  paymentDialog,
  disbursementDialog,
}: LoanDetailsDialogProps) {
  // Debug: Log the loan object to see what we're receiving
  console.log("LoanDetailsDialog - loan object:", loan);
  console.log("LoanDetailsDialog - loan keys:", loan ? Object.keys(loan) : "no loan");
  console.log("LoanDetailsDialog - principal:", loan?.principal, "type:", typeof loan?.principal);
  console.log("LoanDetailsDialog - paid_total:", loan?.paid_total, "type:", typeof loan?.paid_total);
  console.log("LoanDetailsDialog - balance:", loan?.balance, "type:", typeof loan?.balance);
  
  // Ensure we have valid numeric values - handle both number and string types
  const principal = loan?.principal != null ? Number(loan.principal) : 0;
  const totalDisbursed = loan?.total_disbursed != null ? Number(loan.total_disbursed) : 0;
  const totalPrincipal = principal + totalDisbursed; // Initial loan + all disbursements
  const paidTotal = loan?.paid_total != null ? Number(loan.paid_total) : 0;
  const balance = loan?.balance != null ? Number(loan.balance) : 0;
  const progressPercentage = totalPrincipal > 0 ? (paidTotal / totalPrincipal) * 100 : 0;
  
  console.log("LoanDetailsDialog - computed values:", { principal, paidTotal, balance, progressPercentage });

  if (error) {
    return (
      <>
        <Dialog open={open} onOpenChange={onOpenChange}>
          <DialogContent className="bg-slate-900 border-slate-700 text-white">
            <DialogHeader>
              <DialogTitle>Error Loading Loan Details</DialogTitle>
              <DialogDescription className="text-slate-400">
                {error?.response?.data?.message || "Failed to load loan details"}
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="ghost" onClick={() => onOpenChange(false)}>
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        {paymentDialog}
        {disbursementDialog}
      </>
    );
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="bg-slate-900 border-slate-700 text-white max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{loan?.name || "Loan Details"}</DialogTitle>
            <DialogDescription className="text-slate-400">Loan details and payment history</DialogDescription>
          </DialogHeader>
          {isLoading ? (
            <div className="space-y-6 py-4">
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <span className="ml-3 text-slate-400">Loading loan details...</span>
              </div>
            </div>
          ) : loan && loan.id ? (
            <div className="space-y-6 py-4">
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <Card className="bg-slate-800 border-slate-700">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm text-slate-400">Initial Loan</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-2xl font-bold">{formatCurrency(principal || 0)}</p>
                  </CardContent>
                </Card>
                <Card className="bg-slate-800 border-slate-700">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm text-slate-400">Total Disbursed</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-2xl font-bold text-blue-400">{formatCurrency(loan?.total_disbursed || 0)}</p>
                  </CardContent>
                </Card>
                <Card className="bg-slate-800 border-slate-700">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm text-slate-400">Paid</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-2xl font-bold text-emerald-400">{formatCurrency(paidTotal)}</p>
                  </CardContent>
                </Card>
                <Card className="bg-slate-800 border-slate-700">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm text-slate-400">Balance</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-2xl font-bold text-rose-400">{formatCurrency(balance)}</p>
                  </CardContent>
                </Card>
                <Card className="bg-slate-800 border-slate-700">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm text-slate-400">Progress</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-2xl font-bold">{progressPercentage.toFixed(1)}%</p>
                  </CardContent>
                </Card>
              </div>

            <div className="space-y-2">
              <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-emerald-500 transition-all"
                  style={{ width: `${Math.min(100, progressPercentage)}%` }}
                />
              </div>
            </div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-slate-400">Type</p>
                  <p className="font-semibold">{loan?.type === "given" ? "Given" : "Received"}</p>
                </div>
                <div>
                  <p className="text-slate-400">Status</p>
                  <Badge variant={loan?.status === "active" ? "default" : "outline"}>{loan?.status || "N/A"}</Badge>
                </div>
                {loan?.start_date && (
                  <div>
                    <p className="text-slate-400">Start Date</p>
                    <p className="font-semibold">{format(parseISO(loan.start_date), "MMM dd, yyyy")}</p>
                  </div>
                )}
                {loan?.project && (
                  <div>
                    <p className="text-slate-400">Project</p>
                    <div className="flex items-center gap-2">
                      <span
                        className="h-2 w-2 rounded-full"
                        style={{ backgroundColor: loan.project.color }}
                      />
                      <p className="font-semibold">{loan.project.name}</p>
                    </div>
                  </div>
                )}
              </div>

              {loan?.description && (
                <div>
                  <p className="text-slate-400 text-sm mb-1">Description</p>
                  <p className="text-slate-200">{loan.description}</p>
                </div>
              )}

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">Disbursements</CardTitle>
                  <Button onClick={onAddDisbursement} size="sm" className="bg-blue-600 text-white hover:bg-blue-700">
                    <Plus className="mr-2 h-4 w-4" />
                    Add Disbursement
                  </Button>
                </div>
                {loan?.disbursements && loan.disbursements.length > 0 ? (
                  <div className="rounded-md border border-white/10">
                    <Table>
                      <TableHeader>
                        <TableRow className="border-b border-white/5">
                          <TableHead className="text-slate-300">Date</TableHead>
                          <TableHead className="text-slate-300">Amount</TableHead>
                          <TableHead className="text-slate-300">Note</TableHead>
                          <TableHead className="text-slate-300 text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {loan.disbursements.map((disbursement) => (
                          <TableRow key={disbursement.id} className="border-b border-white/5">
                            <TableCell>{format(parseISO(disbursement.disbursed_on), "MMM dd, yyyy")}</TableCell>
                            <TableCell className="font-semibold text-blue-400">{formatCurrency(disbursement.amount)}</TableCell>
                            <TableCell className="text-slate-300">{disbursement.note || "—"}</TableCell>
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end gap-2">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => onEditDisbursement(disbursement)}
                                  className="h-8 text-slate-300 hover:text-white"
                                >
                                  <Edit2 className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => onDeleteDisbursement(disbursement.id)}
                                  className="h-8 text-slate-300 hover:text-red-400"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  <p className="text-center py-8 text-slate-400">No disbursements recorded yet</p>
                )}
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">Payment History</CardTitle>
                  <Button onClick={onAddPayment} size="sm" className="bg-primary text-primary-foreground">
                    <Plus className="mr-2 h-4 w-4" />
                    Add Payment
                  </Button>
                </div>
                {loan?.payments && loan.payments.length > 0 ? (
                <div className="rounded-md border border-white/10">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-b border-white/5">
                        <TableHead className="text-slate-300">Date</TableHead>
                        <TableHead className="text-slate-300">Amount</TableHead>
                        <TableHead className="text-slate-300">Note</TableHead>
                        <TableHead className="text-slate-300 text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {loan.payments.map((payment) => (
                        <TableRow key={payment.id} className="border-b border-white/5">
                          <TableCell>{format(parseISO(payment.paid_on), "MMM dd, yyyy")}</TableCell>
                          <TableCell className="font-semibold">{formatCurrency(payment.amount)}</TableCell>
                          <TableCell className="text-slate-300">{payment.note || "—"}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => onEditPayment(payment)}
                                className="h-8 text-slate-300 hover:text-white"
                              >
                                <Edit2 className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => onDeletePayment(payment.id)}
                                className="h-8 text-slate-300 hover:text-red-400"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                ) : (
                  <p className="text-center py-8 text-slate-400">No payments recorded yet</p>
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-6 py-4">
              <div className="flex items-center justify-center py-12">
                <p className="text-slate-400">No loan data available</p>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="ghost" onClick={() => onOpenChange(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
        </Dialog>
      {paymentDialog}
      {disbursementDialog}
    </>
  );
}

interface DisbursementDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  loan: Loan | null | undefined;
  disbursement: LoanDisbursement | null;
  onSubmit: (data: { amount: number; disbursed_on: string; note?: string }) => void;
  isSubmitting: boolean;
}

function DisbursementDialog({
  open,
  onOpenChange,
  loan,
  disbursement,
  onSubmit,
  isSubmitting,
}: DisbursementDialogProps) {
  const [amount, setAmount] = useState("");
  const [disbursedOn, setDisbursedOn] = useState(format(new Date(), "yyyy-MM-dd"));
  const [note, setNote] = useState("");

  useEffect(() => {
    if (open) {
      if (disbursement) {
        setAmount(disbursement.amount.toString());
        setDisbursedOn(disbursement.disbursed_on);
        setNote(disbursement.note || "");
      } else {
        setAmount("");
        setDisbursedOn(format(new Date(), "yyyy-MM-dd"));
        setNote("");
      }
    }
  }, [open, disbursement]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || !disbursedOn) return;

    onSubmit({
      amount: parseFloat(amount),
      disbursed_on: disbursedOn,
      note: note || undefined,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-slate-900 border-slate-700 text-white">
        <DialogHeader>
          <DialogTitle>{disbursement ? "Edit Disbursement" : "Add Disbursement"}</DialogTitle>
          <DialogDescription className="text-slate-400">
            {disbursement ? "Update disbursement details" : `Add additional loan amount for ${loan?.name || "this loan"}`}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="disbursementAmount">Amount *</Label>
                <Input
                  id="disbursementAmount"
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
              <div className="space-y-2">
                <Label htmlFor="disbursedOn">Disbursed On *</Label>
                <Input
                  id="disbursedOn"
                  type="date"
                  value={disbursedOn}
                  onChange={(e) => setDisbursedOn(e.target.value)}
                  required
                  className="bg-slate-800 border-slate-600 text-white"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="disbursementNote">Note</Label>
              <Input
                id="disbursementNote"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Optional note"
                className="bg-slate-800 border-slate-600 text-white"
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting || !amount || !disbursedOn}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {disbursement ? "Update" : "Add"} Disbursement
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

interface PaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  loan: Loan | null | undefined;
  payment: LoanPayment | null;
  onSubmit: (data: { amount: number; paid_on: string; note?: string }) => void;
  isSubmitting: boolean;
}

function PaymentDialog({
  open,
  onOpenChange,
  loan,
  payment,
  onSubmit,
  isSubmitting,
}: PaymentDialogProps) {
  const [amount, setAmount] = useState("");
  const [paidOn, setPaidOn] = useState(format(new Date(), "yyyy-MM-dd"));
  const [note, setNote] = useState("");

  useEffect(() => {
    if (open) {
      if (payment) {
        setAmount(payment.amount.toString());
        setPaidOn(payment.paid_on);
        setNote(payment.note || "");
      } else {
        setAmount("");
        setPaidOn(format(new Date(), "yyyy-MM-dd"));
        setNote("");
      }
    }
  }, [open, payment]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || !paidOn) return;

    onSubmit({
      amount: parseFloat(amount),
      paid_on: paidOn,
      note: note.trim() || undefined,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-slate-900 border-slate-700 text-white">
        <DialogHeader>
          <DialogTitle>{payment ? "Edit Payment" : "Record Payment"}</DialogTitle>
          <DialogDescription className="text-slate-400">
            {payment ? "Update payment details" : `Record a payment for ${loan?.name || "this loan"}`}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="amount">Amount *</Label>
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
            <div className="space-y-2">
              <Label htmlFor="paidOn">Paid On *</Label>
              <Input
                id="paidOn"
                type="date"
                value={paidOn}
                onChange={(e) => setPaidOn(e.target.value)}
                required
                className="bg-slate-800 border-slate-600 text-white"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="note">Note</Label>
              <Input
                id="note"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Optional note"
                className="bg-slate-800 border-slate-600 text-white"
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting || !amount || !paidOn}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {payment ? "Update" : "Record"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
