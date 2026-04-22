import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import {
  ArrowDownCircle,
  ArrowUpCircle,
  Check,
  CheckCheck,
  FileSpreadsheet,
  Loader2,
  Pencil,
  Trash2,
  Wallet,
} from "lucide-react";
import { Link } from "react-router-dom";

import { downloadLedgerBulkSampleCsv } from "@/lib/ledger-bulk-sample-csv";
import { ledgersApi } from "@/services/api";
import { useAuth } from "@/contexts/auth-context";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import type { LedgerEntry } from "@/types";

const TODAY = format(new Date(), "yyyy-MM-dd");
const LEDGERS_VIEW_KEY = "ams-ledgers-view-v1";
/** Must match backend `ledger_approval_otp.digits` (default 6). */
const LEDGER_OTP_LEN = 6;

function readListLedgerFilter(): "all" | "cash" | "bank" {
  try {
    const raw = localStorage.getItem(LEDGERS_VIEW_KEY);
    if (!raw) return "all";
    const j = JSON.parse(raw) as { listLedger?: string };
    if (j.listLedger === "cash" || j.listLedger === "bank" || j.listLedger === "all") return j.listLedger;
  } catch {
    /* ignore */
  }
  return "all";
}

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

export function LedgersPage() {
  const { user, refreshUser } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();

  const [entryDate, setEntryDate] = useState(TODAY);
  const [ledger, setLedger] = useState<"cash" | "bank">("cash");
  const [direction, setDirection] = useState<"received" | "paid">("received");
  const [amount, setAmount] = useState("");
  const [particulars, setParticulars] = useState("");
  const [description, setDescription] = useState("");
  const [selectedPending, setSelectedPending] = useState<Set<number>>(() => new Set());
  const [editOpen, setEditOpen] = useState(false);
  const [editRow, setEditRow] = useState<LedgerEntry | null>(null);
  const [editDate, setEditDate] = useState("");
  const [editLedger, setEditLedger] = useState<"cash" | "bank">("cash");
  const [editDirection, setEditDirection] = useState<"received" | "paid">("received");
  const [editAmount, setEditAmount] = useState("");
  const [editParticulars, setEditParticulars] = useState("");
  const [editNote, setEditNote] = useState("");
  const [listLedgerFilter, setListLedgerFilter] = useState<"all" | "cash" | "bank">(readListLedgerFilter);

  const [approvalOtpOpen, setApprovalOtpOpen] = useState(false);
  const [approvalOtpTarget, setApprovalOtpTarget] = useState<
    { kind: "single"; id: number } | { kind: "bulk"; ids: number[] } | null
  >(null);
  const [approvalOtpSent, setApprovalOtpSent] = useState(false);
  const [approvalOtpValue, setApprovalOtpValue] = useState("");

  const listParams = useMemo(
    () => (listLedgerFilter === "all" ? {} : { ledger: listLedgerFilter as "cash" | "bank" }),
    [listLedgerFilter]
  );

  useEffect(() => {
    localStorage.setItem(LEDGERS_VIEW_KEY, JSON.stringify({ listLedger: listLedgerFilter }));
  }, [listLedgerFilter]);

  const summary = useQuery({
    queryKey: ["ledgers", "summary", entryDate],
    queryFn: () => ledgersApi.summary(entryDate),
    refetchInterval: 45_000,
  });

  const closureStatus = useQuery({
    queryKey: ["ledgers", "closure-status"],
    queryFn: () => ledgersApi.closureStatus(),
  });

  const prevPendingRef = useRef<number | null>(null);
  const bulkCsvInputRef = useRef<HTMLInputElement>(null);
  const [bulkCsvName, setBulkCsvName] = useState("");
  useEffect(() => {
    const n = summary.data?.pending_count;
    if (n === undefined) return;
    if (prevPendingRef.current !== null && n > prevPendingRef.current) {
      toast({
        title: "New ledger entries pending",
        description: `${n - prevPendingRef.current} new line(s) awaiting approval.`,
      });
    }
    prevPendingRef.current = n;
  }, [summary.data?.pending_count, toast]);

  const pending = useQuery({
    queryKey: ["ledgers", "pending", listLedgerFilter],
    queryFn: () => ledgersApi.list({ status: "pending", ...listParams }),
  });

  const approvedToday = useQuery({
    queryKey: ["ledgers", "approved", entryDate, listLedgerFilter],
    queryFn: () => ledgersApi.list({ status: "approved", date_from: entryDate, date_to: entryDate, sort: "asc", ...listParams }),
  });

  const createMutation = useMutation({
    mutationFn: ledgersApi.create,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["ledgers"] });
      setAmount("");
      setParticulars("");
      setDescription("");
      toast({ title: "Saved", description: "Entry submitted for admin approval." });
    },
    onError: (err: any) => {
      toast({
        title: "Error",
        description: err?.response?.data?.message || "Failed to create entry",
        variant: "destructive",
      });
    },
  });

  const importCsvMutation = useMutation({
    mutationFn: (file: File) => ledgersApi.importCsv(file),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ["ledgers"] });
      setBulkCsvName("");
      if (bulkCsvInputRef.current) bulkCsvInputRef.current.value = "";
      toast({
        title: "Imported",
        description: res.message ?? `${res.imported} pending entr${res.imported === 1 ? "y" : "ies"}.`,
      });
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message || "Import failed";
      const errors = err?.response?.data?.errors;
      if (Array.isArray(errors) && errors.length > 0) {
        const preview = errors
          .slice(0, 5)
          .map((e: { line: number; message: string }) => `Line ${e.line}: ${e.message}`)
          .join(" · ");
        toast({
          title: msg,
          description:
            preview + (errors.length > 5 ? ` · …+${errors.length - 5} more` : ""),
          variant: "destructive",
        });
      } else {
        toast({ title: msg, variant: "destructive" });
      }
    },
  });

  const resetApprovalOtpDialog = () => {
    setApprovalOtpOpen(false);
    setApprovalOtpTarget(null);
    setApprovalOtpSent(false);
    setApprovalOtpValue("");
  };

  const sendApprovalOtpMutation = useMutation({
    mutationFn: ledgersApi.sendApprovalOtp,
    onSuccess: (res) => {
      setApprovalOtpSent(true);
      toast({
        title: "OTP sent",
        description: res.message ?? "Check WhatsApp for your code.",
      });
    },
    onError: (err: any) => {
      toast({
        title: "Could not send OTP",
        description: err?.response?.data?.message || "Check your mobile number in Settings.",
        variant: "destructive",
      });
    },
  });

  const approveMutation = useMutation({
    mutationFn: ({ id, otp }: { id: number; otp?: string }) => ledgersApi.approve(id, otp),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["ledgers"] });
      setSelectedPending(new Set());
      resetApprovalOtpDialog();
      void refreshUser();
      toast({ title: "Approved", description: "Entry approved and balances updated." });
    },
    onError: (err: any) => {
      toast({
        title: "Error",
        description: err?.response?.data?.message || "Failed to approve entry",
        variant: "destructive",
      });
    },
  });

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
      toast({ title: "Updated", description: "Ledger entry saved." });
    },
    onError: (err: any) => {
      toast({
        title: "Error",
        description: err?.response?.data?.message || "Failed to update entry",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: ledgersApi.deleteEntry,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["ledgers"] });
      toast({ title: "Deleted", description: "Ledger entry removed." });
    },
    onError: (err: any) => {
      toast({
        title: "Error",
        description: err?.response?.data?.message || "Failed to delete entry",
        variant: "destructive",
      });
    },
  });

  const approveBulkMutation = useMutation({
    mutationFn: ({ ids, otp }: { ids: number[]; otp?: string }) => ledgersApi.approveBulk(ids, otp),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ["ledgers"] });
      setSelectedPending(new Set());
      resetApprovalOtpDialog();
      void refreshUser();
      toast({
        title: "Approved",
        description: `${res.approved} entr${res.approved === 1 ? "y" : "ies"} approved.`,
      });
    },
    onError: (err: any) => {
      toast({
        title: "Error",
        description: err?.response?.data?.message || "Failed to approve entries",
        variant: "destructive",
      });
    },
  });

  const canApprove = user?.role === "admin";

  const cashApproved = summary.data?.cash_balance ?? 0;
  const bankApproved = summary.data?.bank_balance ?? 0;
  const cashRt = summary.data?.cash_balance_realtime ?? cashApproved;
  const bankRt = summary.data?.bank_balance_realtime ?? bankApproved;
  const totalApproved = summary.data?.total_balance_approved ?? cashApproved + bankApproved;
  const totalRt = summary.data?.total_balance_realtime ?? cashRt + bankRt;

  const canModifyEntry = (r: LedgerEntry, table: "pending" | "approved") => {
    if (!user) return false;
    if (canApprove) return true;
    if (table !== "pending") return false;
    // Reception can only modify pending entries they created.
    // On some production setups `user.id` can be shaped/typed unexpectedly, so we also
    // fall back to name-match for display (backend still enforces the real permission).
    const byId =
      r.entered_by != null && user.id != null && String(r.entered_by) === String(user.id);
    const byName =
      Boolean(r.entered_by_name) && Boolean(user.name) && String(r.entered_by_name) === String(user.name);
    return byId || byName;
  };

  const openEdit = (r: LedgerEntry) => {
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

  const confirmDelete = (r: LedgerEntry) => {
    if (!confirm("Delete this ledger line? This cannot be undone.")) return;
    deleteMutation.mutate(r.id);
  };

  const pendingRows = useMemo(() => (Array.isArray(pending.data) ? pending.data : []), [pending.data]);
  const approvedRows = useMemo(() => (Array.isArray(approvedToday.data) ? approvedToday.data : []), [approvedToday.data]);

  const pendingIds = useMemo(() => pendingRows.map((r: LedgerEntry) => r.id), [pendingRows]);
  const allPendingSelected =
    canApprove && pendingIds.length > 0 && pendingIds.every((id: number) => selectedPending.has(id));

  const toggleSelectAllPending = () => {
    if (allPendingSelected) {
      setSelectedPending(new Set());
    } else {
      setSelectedPending(new Set(pendingIds));
    }
  };

  const togglePendingRow = (id: number) => {
    setSelectedPending((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const submit = () => {
    const amt = Number(amount);
    if (!amt || amt <= 0) {
      toast({ title: "Enter amount", description: "Amount must be greater than 0.", variant: "destructive" });
      return;
    }
    const part = particulars.trim();
    const desc = description.trim();
    if (!part) {
      toast({ title: "Particulars required", description: "Please enter particulars.", variant: "destructive" });
      return;
    }
    if (!desc) {
      toast({ title: "Description required", description: "Please enter a description for this entry.", variant: "destructive" });
      return;
    }
    createMutation.mutate({ entry_date: entryDate, ledger, direction, amount: amt, particulars: part, note: desc });
  };

  const approveSelected = () => {
    const ids = [...selectedPending];
    if (ids.length === 0) {
      toast({ title: "Nothing selected", description: "Select one or more pending entries.", variant: "destructive" });
      return;
    }
    if (user?.ledger_approval_otp_enabled) {
      setApprovalOtpTarget({ kind: "bulk", ids });
      setApprovalOtpSent(false);
      setApprovalOtpValue("");
      setApprovalOtpOpen(true);
      return;
    }
    approveBulkMutation.mutate({ ids });
  };

  const startSingleApprove = (id: number) => {
    if (user?.ledger_approval_otp_enabled) {
      setApprovalOtpTarget({ kind: "single", id });
      setApprovalOtpSent(false);
      setApprovalOtpValue("");
      setApprovalOtpOpen(true);
      return;
    }
    approveMutation.mutate({ id });
  };

  const confirmApprovalWithOtp = () => {
    const otp = approvalOtpValue.replace(/\D/g, "").slice(0, LEDGER_OTP_LEN);
    if (otp.length !== LEDGER_OTP_LEN) {
      toast({
        title: "Invalid code",
        description: `Enter the ${LEDGER_OTP_LEN}-digit code from WhatsApp.`,
        variant: "destructive",
      });
      return;
    }
    if (approvalOtpTarget?.kind === "single") {
      approveMutation.mutate({ id: approvalOtpTarget.id, otp });
    } else if (approvalOtpTarget?.kind === "bulk") {
      approveBulkMutation.mutate({ ids: approvalOtpTarget.ids, otp });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Ledgers</h1>
          <p className="text-sm text-muted-foreground">
            Reception enters cash/bank received/paid. Admin approves. Closing uses approved balances.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link to="/ledgers/statement">Statement</Link>
          </Button>
          <Button variant="outline" size="sm" asChild>
            <Link to="/ledgers/closing">Closing</Link>
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3 text-sm">
        <span className="text-muted-foreground">Table filter</span>
        <Select value={listLedgerFilter} onValueChange={(v: "all" | "cash" | "bank") => setListLedgerFilter(v)}>
          <SelectTrigger className="h-9 w-[150px]">
            <SelectValue placeholder="Ledger" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All ledgers</SelectItem>
            <SelectItem value="cash">Cash only</SelectItem>
            <SelectItem value="bank">Bank only</SelectItem>
          </SelectContent>
        </Select>
        <span className="text-xs text-muted-foreground">Saved in this browser</span>
      </div>

      {closureStatus.data?.closed_through_date ? (
        <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-foreground">
          <span className="font-medium">Books closed</span> through {displayDate(closureStatus.data.closed_through_date)}. New
          entries must be dated after that day.{" "}
          <Link className="font-medium text-primary underline" to="/ledgers/closing">
            Manage closing
          </Link>
        </div>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center gap-2 pb-2">
            <Wallet className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
            <div>
              <CardTitle className="text-base">Cash</CardTitle>
              <p className="text-xs text-muted-foreground">Incl. pending through {displayDate(entryDate)}</p>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold tabular-nums text-foreground">
              {summary.isLoading ? "—" : formatMoney(cashRt)}
            </p>
            <p className="mt-2 text-xs text-muted-foreground">
              Approved: <span className="font-medium text-foreground">{summary.isLoading ? "—" : formatMoney(cashApproved)}</span>
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center gap-2 pb-2">
            <Wallet className="h-5 w-5 text-sky-600 dark:text-sky-400" />
            <div>
              <CardTitle className="text-base">Bank</CardTitle>
              <p className="text-xs text-muted-foreground">Incl. pending through {displayDate(entryDate)}</p>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold tabular-nums text-foreground">
              {summary.isLoading ? "—" : formatMoney(bankRt)}
            </p>
            <p className="mt-2 text-xs text-muted-foreground">
              Approved: <span className="font-medium text-foreground">{summary.isLoading ? "—" : formatMoney(bankApproved)}</span>
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center gap-2 pb-2">
            <Wallet className="h-5 w-5 text-violet-600 dark:text-violet-400" />
            <div>
              <CardTitle className="text-base">Total</CardTitle>
              <p className="text-xs text-muted-foreground">Cash + bank (same rules as above)</p>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold tabular-nums text-foreground">
              {summary.isLoading ? "—" : formatMoney(totalRt)}
            </p>
            <p className="mt-2 text-xs text-muted-foreground">
              Approved total:{" "}
              <span className="font-medium text-foreground">{summary.isLoading ? "—" : formatMoney(totalApproved)}</span>
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Add ledger entry</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="led-date">Date</Label>
              <Input id="led-date" type="date" value={entryDate} onChange={(e) => setEntryDate(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Ledger</Label>
              <Select value={ledger} onValueChange={(v: "cash" | "bank") => setLedger(v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="bank">Bank</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Type</Label>
              <Select value={direction} onValueChange={(v: "received" | "paid") => setDirection(v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="received">Received</SelectItem>
                  <SelectItem value="paid">Paid</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="led-amt">Amount</Label>
              <Input
                id="led-amt"
                type="number"
                step="0.01"
                min="0"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="led-part">Particulars</Label>
            <Input
              id="led-part"
              value={particulars}
              onChange={(e) => setParticulars(e.target.value)}
              placeholder="Required"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="led-desc">Description</Label>
            <Input
              id="led-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Required"
              required
            />
          </div>

          <Button onClick={submit} disabled={createMutation.isPending}>
            {createMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Submit for approval"}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center gap-2 pb-2">
          <FileSpreadsheet className="h-5 w-5 text-muted-foreground" />
          <CardTitle className="text-base">Bulk import (CSV)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Upload a spreadsheet saved as CSV. Every row is created as pending for admin approval (same rules as the form
            above).
          </p>
          <ul className="list-inside list-disc text-xs text-muted-foreground space-y-1">
            <li>
              Header row required. Columns (any order): Date, Type (Paid or Received), Ledger (cash or bank), Amount,
              Particulars, Description
            </li>
            <li>Dates: DD/MM/YY, DD/MM/YYYY, or YYYY-MM-DD</li>
            <li>Up to 500 rows per file; file size max 5&nbsp;MB</li>
          </ul>
          <div className="flex flex-wrap items-center gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => downloadLedgerBulkSampleCsv()}>
              Download sample CSV (Excel)
            </Button>
            <input
              ref={bulkCsvInputRef}
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                setBulkCsvName(f ? f.name : "");
              }}
            />
            <Button type="button" variant="outline" size="sm" onClick={() => bulkCsvInputRef.current?.click()}>
              Choose file
            </Button>
            <span className="max-w-[220px] truncate text-xs text-muted-foreground">{bulkCsvName || "No file chosen"}</span>
          </div>
          <Button
            type="button"
            disabled={!bulkCsvName || importCsvMutation.isPending}
            onClick={() => {
              const f = bulkCsvInputRef.current?.files?.[0];
              if (!f) return;
              importCsvMutation.mutate(f);
            }}
          >
            {importCsvMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Import as pending"}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="text-base">Pending approvals</CardTitle>
            <p className="text-xs text-muted-foreground">Count: {summary.data?.pending_count ?? pendingRows.length}</p>
          </div>
          {canApprove && pendingRows.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                size="sm"
                variant="secondary"
                disabled={approveBulkMutation.isPending || selectedPending.size === 0}
                onClick={approveSelected}
              >
                {approveBulkMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <CheckCheck className="mr-1 h-4 w-4" />
                    Approve selected ({selectedPending.size})
                  </>
                )}
              </Button>
            </div>
          ) : null}
        </CardHeader>
        <CardContent className="p-0 sm:p-6 sm:pt-0">
          {pending.isLoading ? (
            <p className="p-6 text-sm text-muted-foreground">Loading…</p>
          ) : pendingRows.length === 0 ? (
            <p className="p-6 text-sm text-muted-foreground">No pending entries.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    {canApprove ? (
                      <TableHead className="w-10">
                        <input
                          type="checkbox"
                          className="h-4 w-4 rounded border-input accent-primary"
                          checked={allPendingSelected}
                          onChange={toggleSelectAllPending}
                          aria-label="Select all pending"
                        />
                      </TableHead>
                    ) : null}
                    <TableHead className="w-12">Sl.</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Ledger</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead>Particulars</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead className="w-24 text-center">Actions</TableHead>
                    <TableHead>Entered by</TableHead>
                    {canApprove ? <TableHead className="w-14 text-center">Approve</TableHead> : null}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pendingRows.map((r: LedgerEntry, i: number) => (
                    <TableRow key={r.id}>
                      {canApprove ? (
                        <TableCell>
                          <input
                            type="checkbox"
                            className="h-4 w-4 rounded border-input accent-primary"
                            checked={selectedPending.has(r.id)}
                            onChange={() => togglePendingRow(r.id)}
                            aria-label={`Select entry ${r.id}`}
                          />
                        </TableCell>
                      ) : null}
                      <TableCell className="text-muted-foreground">{i + 1}</TableCell>
                      <TableCell className="whitespace-nowrap">{displayDate(r.entry_date)}</TableCell>
                      <TableCell className="font-medium capitalize">{r.ledger}</TableCell>
                      <TableCell>
                        <span className="inline-flex items-center gap-1 capitalize">
                          {r.direction === "received" ? (
                            <ArrowUpCircle className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                          ) : (
                            <ArrowDownCircle className="h-4 w-4 text-rose-600 dark:text-rose-400" />
                          )}
                          {r.direction}
                        </span>
                      </TableCell>
                      <TableCell className="text-right font-medium tabular-nums">{formatMoney(Number(r.amount))}</TableCell>
                      <TableCell className="max-w-[120px] truncate text-sm" title={r.particulars ?? ""}>
                        {r.particulars ?? "—"}
                      </TableCell>
                      <TableCell className="max-w-[140px] truncate text-sm" title={r.note ?? ""}>
                        {r.note ?? "—"}
                      </TableCell>
                      <TableCell>
                        {canModifyEntry(r, "pending") ? (
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
                        ) : (
                          <span className="text-center text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="max-w-[100px] truncate text-muted-foreground text-xs">
                        {r.entered_by_name ?? "—"}
                      </TableCell>
                      {canApprove ? (
                        <TableCell className="text-center">
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8"
                            disabled={approveMutation.isPending}
                            onClick={() => startSingleApprove(r.id)}
                            title="Approve"
                          >
                            <Check className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      ) : null}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
          {!canApprove && pendingRows.length > 0 ? (
            <p className="border-t px-6 py-3 text-xs text-muted-foreground">
              Only admin can approve. Your entries will appear here until approved.
            </p>
          ) : null}
        </CardContent>
      </Card>

      <Separator />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Approved today ({displayDate(entryDate)})</CardTitle>
        </CardHeader>
        <CardContent className="p-0 sm:p-6 sm:pt-0">
          {approvedToday.isLoading ? (
            <p className="p-6 text-sm text-muted-foreground">Loading…</p>
          ) : approvedRows.length === 0 ? (
            <p className="p-6 text-sm text-muted-foreground">No approved entries for this date.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">Sl.</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Ledger</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead>Particulars</TableHead>
                    <TableHead>Description</TableHead>
                    {canApprove ? <TableHead className="w-24 text-center">Actions</TableHead> : null}
                    <TableHead>Entered by</TableHead>
                    <TableHead>Approved by</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {approvedRows.map((r: LedgerEntry, i: number) => (
                    <TableRow key={r.id}>
                      <TableCell className="text-muted-foreground">{i + 1}</TableCell>
                      <TableCell className="whitespace-nowrap">{displayDate(r.entry_date)}</TableCell>
                      <TableCell className="font-medium capitalize">{r.ledger}</TableCell>
                      <TableCell>
                        <span className={cn("inline-flex items-center gap-1 capitalize")}>
                          {r.direction === "received" ? (
                            <ArrowUpCircle className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                          ) : (
                            <ArrowDownCircle className="h-4 w-4 text-rose-600 dark:text-rose-400" />
                          )}
                          {r.direction}
                        </span>
                      </TableCell>
                      <TableCell className="text-right font-medium tabular-nums">{formatMoney(Number(r.amount))}</TableCell>
                      <TableCell className="max-w-[120px] truncate text-sm" title={r.particulars ?? ""}>
                        {r.particulars ?? "—"}
                      </TableCell>
                      <TableCell className="max-w-[160px] truncate text-sm" title={r.note ?? ""}>
                        {r.note ?? "—"}
                      </TableCell>
                      {canApprove ? (
                        <TableCell>
                          {canModifyEntry(r, "approved") ? (
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
                          ) : (
                            <span className="text-center text-muted-foreground">—</span>
                          )}
                        </TableCell>
                      ) : null}
                      <TableCell className="max-w-[100px] truncate text-muted-foreground text-xs">
                        {r.entered_by_name ?? "—"}
                      </TableCell>
                      <TableCell className="max-w-[100px] truncate text-muted-foreground text-xs">
                        {r.approved_by_name ?? "—"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog
        open={approvalOtpOpen}
        onOpenChange={(open) => {
          if (!open) resetApprovalOtpDialog();
          else setApprovalOtpOpen(true);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>WhatsApp OTP</DialogTitle>
            <DialogDescription>
              {approvalOtpTarget?.kind === "bulk"
                ? `You are approving ${approvalOtpTarget.ids.length} pending entr${approvalOtpTarget.ids.length === 1 ? "y" : "ies"}.`
                : "You are approving one ledger entry."}{" "}
              Send a code to your WhatsApp number from Settings, then enter it below.
            </DialogDescription>
          </DialogHeader>
          {!approvalOtpSent ? (
            <div className="space-y-4 py-2">
              <p className="text-sm text-muted-foreground">
                Save your mobile under{" "}
                <Link to="/settings" className="font-medium text-primary underline" onClick={() => resetApprovalOtpDialog()}>
                  Settings → Admin WhatsApp (OTP)
                </Link>{" "}
                if you have not already.
              </p>
              <DialogFooter className="gap-2 sm:gap-0">
                <Button type="button" variant="outline" onClick={resetApprovalOtpDialog}>
                  Cancel
                </Button>
                <Button
                  type="button"
                  onClick={() => sendApprovalOtpMutation.mutate()}
                  disabled={sendApprovalOtpMutation.isPending}
                >
                  {sendApprovalOtpMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    "Send WhatsApp OTP"
                  )}
                </Button>
              </DialogFooter>
            </div>
          ) : (
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label htmlFor="ledger-otp">One-time code</Label>
                <Input
                  id="ledger-otp"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={LEDGER_OTP_LEN}
                  value={approvalOtpValue}
                  onChange={(e) =>
                    setApprovalOtpValue(e.target.value.replace(/\D/g, "").slice(0, LEDGER_OTP_LEN))
                  }
                  placeholder={"•".repeat(LEDGER_OTP_LEN)}
                  className="text-center font-mono text-lg tracking-widest"
                />
              </div>
              <DialogFooter className="gap-2 sm:gap-0">
                <Button type="button" variant="outline" onClick={resetApprovalOtpDialog}>
                  Cancel
                </Button>
                <Button
                  type="button"
                  onClick={confirmApprovalWithOtp}
                  disabled={approveMutation.isPending || approveBulkMutation.isPending}
                >
                  {approveMutation.isPending || approveBulkMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    "Confirm approve"
                  )}
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit ledger entry</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-2">
              <Label htmlFor="ed-date">Date</Label>
              <Input id="ed-date" type="date" value={editDate} onChange={(e) => setEditDate(e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Ledger</Label>
                <Select value={editLedger} onValueChange={(v: "cash" | "bank") => setEditLedger(v)}>
                  <SelectTrigger id="ed-led">
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
                  <SelectTrigger id="ed-dir">
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
              <Label htmlFor="ed-amt">Amount</Label>
              <Input id="ed-amt" type="number" step="0.01" min="0" value={editAmount} onChange={(e) => setEditAmount(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ed-part">Particulars</Label>
              <Input id="ed-part" value={editParticulars} onChange={(e) => setEditParticulars(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ed-note">Description</Label>
              <Input id="ed-note" value={editNote} onChange={(e) => setEditNote(e.target.value)} />
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
