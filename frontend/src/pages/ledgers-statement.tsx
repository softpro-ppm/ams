import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { differenceInCalendarDays, format, parseISO, subDays } from "date-fns";
import { Link } from "react-router-dom";
import { ArrowLeft, ChevronLeft, ChevronRight, Download, FileText, Loader2, Pencil, Search, Trash2, Wallet } from "lucide-react";

import { ledgersApi } from "@/services/api";
import { useAuth } from "@/contexts/auth-context";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { downloadMergedStatementCsv, mergeCashBankStatements } from "@/lib/ledger-statement-merge";
import { cn } from "@/lib/utils";
import type { LedgerEntry, LedgerStatementRow } from "@/types";

const TODAY = format(new Date(), "yyyy-MM-dd");
const MONTH_START = format(new Date(new Date().getFullYear(), new Date().getMonth(), 1), "yyyy-MM-dd");

const PER_PAGE_OPTIONS = [10, 25, 50, 100] as const;

function formatMoney(n: number) {
  return `₹${Number(n || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
}

function displayDate(iso: string) {
  if (!iso) return "—";
  const day = iso.slice(0, 10);
  const [y, m, d] = day.split("-");
  if (y && m && d) return `${d}/${m}/${y}`;
  return iso;
}

function rowMatchesSearch(r: LedgerStatementRow, q: string): boolean {
  if (!q.trim()) return true;
  const s = q.trim().toLowerCase();
  const hay = [
    displayDate(r.entry_date),
    r.entry_date,
    r.particulars ?? "",
    r.note ?? "",
    r.entered_by_name ?? "",
    String(r.amount ?? ""),
    String(r.received_amount ?? ""),
    String(r.paid_amount ?? ""),
    String(r.balance_after ?? ""),
    r.direction ?? "",
    r.ledger ?? "",
  ]
    .join(" ")
    .toLowerCase();
  return hay.includes(s);
}

export function LedgersStatementPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();
  const isAdmin = user?.role === "admin";

  const [ledger, setLedger] = useState<"all" | "cash" | "bank">("all");
  const [dateFrom, setDateFrom] = useState(MONTH_START);
  const [dateTo, setDateTo] = useState(TODAY);
  const [includePending, setIncludePending] = useState(false);
  const [comparePrior, setComparePrior] = useState(false);
  const [exporting, setExporting] = useState<"csv" | "pdf" | null>(null);

  const [tableSearch, setTableSearch] = useState("");
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState<number>(10);

  const [editOpen, setEditOpen] = useState(false);
  const [editRow, setEditRow] = useState<LedgerStatementRow | null>(null);
  const [editDate, setEditDate] = useState("");
  const [editLedger, setEditLedger] = useState<"cash" | "bank">("cash");
  const [editDirection, setEditDirection] = useState<"received" | "paid">("received");
  const [editAmount, setEditAmount] = useState("");
  const [editParticulars, setEditParticulars] = useState("");
  const [editNote, setEditNote] = useState("");

  const query = useQuery({
    queryKey: ["ledgers", "statement", ledger, dateFrom, dateTo, includePending],
    queryFn: async () => {
      if (ledger === "all") {
        const [cash, bank] = await Promise.all([
          ledgersApi.statement({
            ledger: "cash",
            date_from: dateFrom,
            date_to: dateTo,
            include_pending: includePending,
          }),
          ledgersApi.statement({
            ledger: "bank",
            date_from: dateFrom,
            date_to: dateTo,
            include_pending: includePending,
          }),
        ]);
        return mergeCashBankStatements(cash, bank);
      }
      return ledgersApi.statement({
        ledger,
        date_from: dateFrom,
        date_to: dateTo,
        include_pending: includePending,
      });
    },
    enabled: Boolean(dateFrom && dateTo && dateFrom <= dateTo),
  });

  const prevRange = useMemo(() => {
    if (!comparePrior || !dateFrom || !dateTo) return null;
    const from = parseISO(dateFrom);
    const to = parseISO(dateTo);
    const len = differenceInCalendarDays(to, from) + 1;
    const prevTo = subDays(from, 1);
    const prevFrom = subDays(from, len);
    return {
      date_from: format(prevFrom, "yyyy-MM-dd"),
      date_to: format(prevTo, "yyyy-MM-dd"),
    };
  }, [comparePrior, dateFrom, dateTo]);

  const compareQuery = useQuery({
    queryKey: ["ledgers", "statement", "compare", ledger, prevRange?.date_from, prevRange?.date_to],
    queryFn: async () => {
      if (ledger === "all") {
        const [cash, bank] = await Promise.all([
          ledgersApi.statement({
            ledger: "cash",
            date_from: prevRange!.date_from,
            date_to: prevRange!.date_to,
            include_pending: false,
          }),
          ledgersApi.statement({
            ledger: "bank",
            date_from: prevRange!.date_from,
            date_to: prevRange!.date_to,
            include_pending: false,
          }),
        ]);
        return mergeCashBankStatements(cash, bank);
      }
      return ledgersApi.statement({
        ledger,
        date_from: prevRange!.date_from,
        date_to: prevRange!.date_to,
        include_pending: false,
      });
    },
    enabled: Boolean(comparePrior && prevRange),
  });

  const rows = useMemo(() => (Array.isArray(query.data?.data) ? query.data.data : []), [query.data?.data]);
  const pendingRows = useMemo(
    () => (Array.isArray(query.data?.pending_in_period) ? query.data.pending_in_period : []),
    [query.data?.pending_in_period]
  );

  const filteredRows = useMemo(() => rows.filter((r) => rowMatchesSearch(r, tableSearch)), [rows, tableSearch]);

  useEffect(() => {
    setPage(1);
  }, [ledger, dateFrom, dateTo, tableSearch, perPage]);

  useEffect(() => {
    const max = Math.max(1, Math.ceil(filteredRows.length / perPage));
    setPage((p) => Math.min(p, max));
  }, [filteredRows.length, perPage]);

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / perPage));
  const currentPage = Math.min(page, totalPages);
  const startIdx = (currentPage - 1) * perPage;
  const pagedRows = filteredRows.slice(startIdx, startIdx + perPage);
  const showingFrom = filteredRows.length === 0 ? 0 : startIdx + 1;
  const showingTo = Math.min(startIdx + perPage, filteredRows.length);

  const updateMutation = useMutation({
    mutationFn: (payload: {
      id: number;
      entry_date: string;
      ledger: "cash" | "bank";
      direction: "received" | "paid";
      amount: number;
      particulars: string;
      note: string;
    }) => {
      const { id, ...body } = payload;
      return ledgersApi.update(id, body);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["ledgers"] });
      setEditOpen(false);
      setEditRow(null);
      toast({ title: "Updated", description: "Entry saved. Statement will refresh." });
    },
    onError: (err: any) => {
      toast({
        title: "Error",
        description: err?.response?.data?.message || "Failed to update",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: ledgersApi.deleteEntry,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["ledgers"] });
      toast({ title: "Deleted", description: "Entry removed." });
    },
    onError: (err: any) => {
      toast({
        title: "Error",
        description: err?.response?.data?.message || "Failed to delete",
        variant: "destructive",
      });
    },
  });

  const openEdit = (r: LedgerStatementRow) => {
    setEditRow(r);
    setEditDate(r.entry_date.slice(0, 10));
    setEditLedger(r.ledger);
    setEditDirection(r.direction);
    setEditAmount(String(r.amount));
    setEditParticulars(r.particulars ?? "");
    setEditNote(r.note ?? "");
    setEditOpen(true);
  };

  const saveEdit = () => {
    if (!editRow) return;
    const amt = Number(editAmount);
    if (!amt || amt <= 0) {
      toast({ title: "Invalid amount", variant: "destructive" });
      return;
    }
    const p = editParticulars.trim();
    const n = editNote.trim();
    if (!p || !n) {
      toast({ title: "Particulars and description required", variant: "destructive" });
      return;
    }
    updateMutation.mutate({
      id: editRow.id,
      entry_date: editDate,
      ledger: editLedger,
      direction: editDirection,
      amount: amt,
      particulars: p,
      note: n,
    });
  };

  const confirmDelete = (r: LedgerStatementRow) => {
    if (!confirm("Delete this approved line? Balances and statement will update.")) return;
    deleteMutation.mutate(r.id);
  };

  const runExport = async (kind: "csv" | "pdf") => {
    setExporting(kind);
    try {
      if (kind === "csv") {
        if (ledger === "all") {
          if (!query.data || query.data.ledger !== "all") return;
          downloadMergedStatementCsv(query.data);
        } else {
          await ledgersApi.downloadStatementCsv({
            ledger,
            date_from: dateFrom,
            date_to: dateTo,
            include_pending: includePending,
          });
        }
      } else if (ledger === "cash" || ledger === "bank") {
        await ledgersApi.downloadStatementPdf({
          ledger,
          date_from: dateFrom,
          date_to: dateTo,
          include_pending: includePending,
        });
      }
    } finally {
      setExporting(null);
    }
  };

  const dClosing = query.data?.closing_balance ?? 0;
  const pClosing = compareQuery.data?.closing_balance;
  const dOpening = query.data?.opening_balance ?? 0;
  const pOpening = compareQuery.data?.opening_balance;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Button variant="ghost" size="sm" className="mb-2 -ml-2 gap-1 text-muted-foreground" asChild>
            <Link to="/ledgers">
              <ArrowLeft className="h-4 w-4" />
              Daily ledger
            </Link>
          </Button>
          <h1 className="text-2xl font-semibold text-foreground">Ledger statement</h1>
          <p className="text-sm text-muted-foreground">
            Approved movements with running balance. Export for records; optional pending lines and prior-period comparison.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={exporting !== null || query.isLoading || (ledger === "all" && !query.data)}
            onClick={() => runExport("csv")}
          >
            <Download className="mr-1 h-4 w-4" />
            {exporting === "csv" ? "…" : "CSV"}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={exporting !== null || query.isLoading || ledger === "all"}
            title={ledger === "all" ? "PDF export is available for Cash or Bank only" : undefined}
            onClick={() => runExport("pdf")}
          >
            <FileText className="mr-1 h-4 w-4" />
            {exporting === "pdf" ? "…" : "PDF"}
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-base">Filters</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap items-end gap-4">
          <div className="space-y-2">
            <Label>Ledger</Label>
            <div className="flex flex-wrap gap-2">
              {(["all", "cash", "bank"] as const).map((k) => (
                <Button
                  key={k}
                  type="button"
                  size="sm"
                  variant={ledger === k ? "default" : "outline"}
                  onClick={() => setLedger(k)}
                >
                  {k === "all" ? "All" : k === "cash" ? "Cash" : "Bank"}
                </Button>
              ))}
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="stmt-from">From</Label>
            <Input id="stmt-from" type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="stmt-to">To</Label>
            <Input id="stmt-to" type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
          </div>
          <label className="flex cursor-pointer items-center gap-2 text-sm">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-input accent-primary"
              checked={includePending}
              onChange={(e) => setIncludePending(e.target.checked)}
            />
            Include pending in period
          </label>
          <label className="flex cursor-pointer items-center gap-2 text-sm">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-input accent-primary"
              checked={comparePrior}
              onChange={(e) => setComparePrior(e.target.checked)}
            />
            Compare prior period
          </label>
        </CardContent>
      </Card>

      {comparePrior && prevRange ? (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Period comparison</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            <p className="mb-2">
              Prior window: {displayDate(prevRange.date_from)} – {displayDate(prevRange.date_to)} (same length as current)
            </p>
            {compareQuery.isLoading ? (
              <p>Loading comparison…</p>
            ) : compareQuery.isError ? (
              <p className="text-destructive">Could not load prior period.</p>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <div>
                  <p className="text-xs uppercase tracking-wide">Current opening</p>
                  <p className="font-semibold text-foreground">{formatMoney(dOpening)}</p>
                  {ledger === "all" && query.data?.ledger === "all" ? (
                    <p className="mt-1 text-xs text-muted-foreground">
                      Cash {formatMoney(query.data.opening_balance_cash ?? 0)} · Bank{" "}
                      {formatMoney(query.data.opening_balance_bank ?? 0)}
                    </p>
                  ) : null}
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide">Prior opening</p>
                  <p className="font-semibold text-foreground">{formatMoney(pOpening ?? 0)}</p>
                  {ledger === "all" && compareQuery.data?.ledger === "all" ? (
                    <p className="mt-1 text-xs text-muted-foreground">
                      Cash {formatMoney(compareQuery.data.opening_balance_cash ?? 0)} · Bank{" "}
                      {formatMoney(compareQuery.data.opening_balance_bank ?? 0)}
                    </p>
                  ) : null}
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide">Current closing</p>
                  <p className="font-semibold text-foreground">{formatMoney(dClosing)}</p>
                  {ledger === "all" && query.data?.ledger === "all" ? (
                    <p className="mt-1 text-xs text-muted-foreground">
                      Cash {formatMoney(query.data.closing_balance_cash ?? 0)} · Bank{" "}
                      {formatMoney(query.data.closing_balance_bank ?? 0)}
                    </p>
                  ) : null}
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide">Prior closing</p>
                  <p className="font-semibold text-foreground">{formatMoney(pClosing ?? 0)}</p>
                  {ledger === "all" && compareQuery.data?.ledger === "all" ? (
                    <p className="mt-1 text-xs text-muted-foreground">
                      Cash {formatMoney(compareQuery.data.closing_balance_cash ?? 0)} · Bank{" "}
                      {formatMoney(compareQuery.data.closing_balance_bank ?? 0)}
                    </p>
                  ) : null}
                </div>
                <div className="sm:col-span-2 lg:col-span-4">
                  <p className="text-xs uppercase tracking-wide">Closing vs prior closing (Δ)</p>
                  <p
                    className={cn(
                      "text-lg font-semibold tabular-nums",
                      dClosing - (pClosing ?? 0) >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"
                    )}
                  >
                    {formatMoney(dClosing - (pClosing ?? 0))}
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center gap-2 pb-2">
            <Wallet className="h-5 w-5 text-muted-foreground" />
            <CardTitle className="text-sm font-medium text-muted-foreground">Opening balance</CardTitle>
          </CardHeader>
          <CardContent>
            {query.isLoading ? (
              <p className="text-xl font-semibold tabular-nums">—</p>
            ) : ledger === "all" && query.data?.ledger === "all" ? (
              <div className="space-y-1">
                <p className="text-sm tabular-nums text-foreground">
                  Cash {formatMoney(query.data.opening_balance_cash ?? 0)}
                </p>
                <p className="text-sm tabular-nums text-foreground">
                  Bank {formatMoney(query.data.opening_balance_bank ?? 0)}
                </p>
              </div>
            ) : (
              <p className="text-xl font-semibold tabular-nums">{formatMoney(query.data?.opening_balance ?? 0)}</p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Closing balance</CardTitle>
          </CardHeader>
          <CardContent>
            {query.isLoading ? (
              <p className="text-xl font-semibold tabular-nums">—</p>
            ) : ledger === "all" && query.data?.ledger === "all" ? (
              <div className="space-y-1">
                <p className="text-sm tabular-nums text-foreground">
                  Cash {formatMoney(query.data.closing_balance_cash ?? 0)}
                </p>
                <p className="text-sm tabular-nums text-foreground">
                  Bank {formatMoney(query.data.closing_balance_bank ?? 0)}
                </p>
              </div>
            ) : (
              <p className="text-xl font-semibold tabular-nums">{formatMoney(query.data?.closing_balance ?? 0)}</p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Lines (approved)</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xl font-semibold tabular-nums">{query.isLoading ? "—" : rows.length}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="space-y-4">
          <CardTitle className="text-base">
            {ledger === "all" ? "All (cash & bank)" : ledger === "cash" ? "Cash" : "Bank"} — approved entries
          </CardTitle>
          {rows.length > 0 ? (
            <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between">
              <div className="relative max-w-md flex-1">
                <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  className="pl-9"
                  placeholder="Search particulars, description, date, amount…"
                  value={tableSearch}
                  onChange={(e) => setTableSearch(e.target.value)}
                  aria-label="Search approved entries"
                />
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-2">
                  <Label htmlFor="stmt-per-page" className="whitespace-nowrap text-sm text-muted-foreground">
                    Per page
                  </Label>
                  <Select
                    value={String(perPage)}
                    onValueChange={(v) => setPerPage(Number(v))}
                  >
                    <SelectTrigger id="stmt-per-page" className="h-9 w-[88px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PER_PAGE_OPTIONS.map((n) => (
                        <SelectItem key={n} value={String(n)}>
                          {n}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <p className="text-xs text-muted-foreground">
                  {filteredRows.length === 0
                    ? "No matches"
                    : `Showing ${showingFrom}–${showingTo} of ${filteredRows.length}`}
                  {tableSearch.trim() && filteredRows.length !== rows.length ? ` (filtered from ${rows.length})` : null}
                </p>
              </div>
            </div>
          ) : null}
        </CardHeader>
        <CardContent className="space-y-4 p-0 sm:p-6 sm:pt-0">
          {query.isError ? (
            <p className="px-6 pb-6 text-sm text-destructive">Could not load statement.</p>
          ) : query.isLoading ? (
            <p className="px-6 pb-6 text-sm text-muted-foreground">Loading…</p>
          ) : rows.length === 0 ? (
            <p className="px-6 pb-6 text-sm text-muted-foreground">No approved entries in this range.</p>
          ) : filteredRows.length === 0 ? (
            <p className="px-6 pb-6 text-sm text-muted-foreground">No rows match your search.</p>
          ) : (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">Sl.</TableHead>
                      <TableHead>Date</TableHead>
                      {ledger === "all" ? <TableHead className="w-[72px] capitalize">Ledger</TableHead> : null}
                      <TableHead className="text-right">Received</TableHead>
                      <TableHead className="text-right">Paid</TableHead>
                      <TableHead>Particulars</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead className="text-right">Balance</TableHead>
                      <TableHead>Entered by</TableHead>
                      {isAdmin ? <TableHead className="w-28 text-center">Actions</TableHead> : null}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pagedRows.map((r: LedgerStatementRow, i: number) => (
                      <TableRow key={r.id}>
                        <TableCell className="text-muted-foreground">{startIdx + i + 1}</TableCell>
                        <TableCell className="whitespace-nowrap">{displayDate(r.entry_date)}</TableCell>
                        {ledger === "all" ? (
                          <TableCell className="capitalize text-muted-foreground">{r.ledger}</TableCell>
                        ) : null}
                        <TableCell className="text-right tabular-nums text-emerald-600 dark:text-emerald-400">
                          {(r.received_amount ?? 0) > 0 ? formatMoney(r.received_amount) : "—"}
                        </TableCell>
                        <TableCell className="text-right tabular-nums text-rose-600 dark:text-rose-400">
                          {(r.paid_amount ?? 0) > 0 ? formatMoney(r.paid_amount) : "—"}
                        </TableCell>
                        <TableCell className="max-w-[140px] truncate text-sm" title={r.particulars ?? ""}>
                          {r.particulars ?? "—"}
                        </TableCell>
                        <TableCell className="max-w-[180px] truncate text-sm" title={r.note ?? ""}>
                          {r.note ?? "—"}
                        </TableCell>
                        <TableCell className="text-right font-semibold tabular-nums">{formatMoney(r.balance_after)}</TableCell>
                        <TableCell className="max-w-[120px] truncate text-muted-foreground">{r.entered_by_name ?? "—"}</TableCell>
                        {isAdmin ? (
                          <TableCell>
                            <div className="flex justify-center gap-0.5">
                              <Button
                                type="button"
                                size="icon"
                                variant="ghost"
                                className="h-8 w-8"
                                disabled={updateMutation.isPending || deleteMutation.isPending}
                                onClick={() => openEdit(r)}
                                title="Edit"
                              >
                                <Pencil className="h-3.5 w-3.5" />
                              </Button>
                              <Button
                                type="button"
                                size="icon"
                                variant="ghost"
                                className="h-8 w-8 text-destructive"
                                disabled={updateMutation.isPending || deleteMutation.isPending}
                                onClick={() => confirmDelete(r)}
                                title="Delete"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </TableCell>
                        ) : null}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {totalPages > 1 ? (
                <div className="flex flex-wrap items-center justify-between gap-3 border-t px-4 py-3 sm:px-6">
                  <p className="text-xs text-muted-foreground">
                    Page {currentPage} of {totalPages}
                  </p>
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={currentPage <= 1}
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                    >
                      <ChevronLeft className="h-4 w-4" />
                      Prev
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={currentPage >= totalPages}
                      onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    >
                      Next
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ) : null}
            </>
          )}
        </CardContent>
      </Card>

      {includePending && pendingRows.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Pending in period (not in balance)</CardTitle>
          </CardHeader>
          <CardContent className="p-0 sm:p-6 sm:pt-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">Sl.</TableHead>
                    <TableHead>Date</TableHead>
                    {ledger === "all" ? <TableHead className="w-[72px] capitalize">Ledger</TableHead> : null}
                    <TableHead className="text-right">Received</TableHead>
                    <TableHead className="text-right">Paid</TableHead>
                    <TableHead>Particulars</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Entered by</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pendingRows.map((r: LedgerEntry & { received_amount: number; paid_amount: number }, i: number) => (
                    <TableRow key={r.id}>
                      <TableCell className="text-muted-foreground">{i + 1}</TableCell>
                      <TableCell className="whitespace-nowrap">{displayDate(r.entry_date)}</TableCell>
                      {ledger === "all" ? (
                        <TableCell className="capitalize text-muted-foreground">{r.ledger}</TableCell>
                      ) : null}
                      <TableCell className="text-right tabular-nums text-emerald-600 dark:text-emerald-400">
                        {(r.received_amount ?? 0) > 0 ? formatMoney(r.received_amount) : "—"}
                      </TableCell>
                      <TableCell className="text-right tabular-nums text-rose-600 dark:text-rose-400">
                        {(r.paid_amount ?? 0) > 0 ? formatMoney(r.paid_amount) : "—"}
                      </TableCell>
                      <TableCell className="max-w-[140px] truncate text-sm" title={r.particulars ?? ""}>
                        {r.particulars ?? "—"}
                      </TableCell>
                      <TableCell className="max-w-[180px] truncate text-sm" title={r.note ?? ""}>
                        {r.note ?? "—"}
                      </TableCell>
                      <TableCell className="max-w-[120px] truncate">{r.entered_by_name ?? "—"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      ) : null}

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit entry (admin)</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-2">
              <Label htmlFor="st-ed-date">Date</Label>
              <Input id="st-ed-date" type="date" value={editDate} onChange={(e) => setEditDate(e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Ledger</Label>
                <Select value={editLedger} onValueChange={(v: "cash" | "bank") => setEditLedger(v)}>
                  <SelectTrigger id="st-ed-led">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">Cash</SelectItem>
                    <SelectItem value="bank">Bank</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Type</Label>
                <Select value={editDirection} onValueChange={(v: "received" | "paid") => setEditDirection(v)}>
                  <SelectTrigger id="st-ed-dir">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="received">Received</SelectItem>
                    <SelectItem value="paid">Paid</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="st-ed-amt">Amount</Label>
              <Input id="st-ed-amt" type="number" step="0.01" min="0" value={editAmount} onChange={(e) => setEditAmount(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="st-ed-part">Particulars</Label>
              <Input id="st-ed-part" value={editParticulars} onChange={(e) => setEditParticulars(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="st-ed-note">Description</Label>
              <Input id="st-ed-note" value={editNote} onChange={(e) => setEditNote(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setEditOpen(false)}>
              Cancel
            </Button>
            <Button type="button" onClick={saveEdit} disabled={updateMutation.isPending}>
              {updateMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
