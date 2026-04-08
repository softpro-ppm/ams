import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { ArrowDownCircle, ArrowUpCircle, Check, Loader2, Wallet } from "lucide-react";

import { ledgersApi } from "@/services/api";
import { useAuth } from "@/contexts/auth-context";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import type { LedgerEntry } from "@/types";

const TODAY = format(new Date(), "yyyy-MM-dd");

function formatMoney(n: number) {
  return `₹${Number(n || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
}

export function LedgersPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();

  const [entryDate, setEntryDate] = useState(TODAY);
  const [ledger, setLedger] = useState<"cash" | "bank">("cash");
  const [direction, setDirection] = useState<"received" | "paid">("received");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");

  const summary = useQuery({
    queryKey: ["ledgers", "summary", entryDate],
    queryFn: () => ledgersApi.summary(entryDate),
  });

  const pending = useQuery({
    queryKey: ["ledgers", "pending"],
    queryFn: () => ledgersApi.list({ status: "pending" }),
  });

  const approvedToday = useQuery({
    queryKey: ["ledgers", "approved", entryDate],
    queryFn: () => ledgersApi.list({ status: "approved", date_from: entryDate, date_to: entryDate }),
  });

  const createMutation = useMutation({
    mutationFn: ledgersApi.create,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["ledgers"] });
      setAmount("");
      setNote("");
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

  const approveMutation = useMutation({
    mutationFn: ledgersApi.approve,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["ledgers"] });
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

  const canApprove = user?.role === "admin";

  const cashBal = summary.data?.cash_balance ?? 0;
  const bankBal = summary.data?.bank_balance ?? 0;

  const pendingRows = useMemo(() => (Array.isArray(pending.data) ? pending.data : []), [pending.data]);
  const approvedRows = useMemo(() => (Array.isArray(approvedToday.data) ? approvedToday.data : []), [approvedToday.data]);

  const submit = () => {
    const amt = Number(amount);
    if (!amt || amt <= 0) {
      toast({ title: "Enter amount", description: "Amount must be greater than 0.", variant: "destructive" });
      return;
    }
    createMutation.mutate({ entry_date: entryDate, ledger, direction, amount: amt, note: note.trim() || undefined });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-white">Ledgers</h1>
        <p className="text-sm text-slate-400">Reception enters cash/bank received/paid. Admin approves. Closing uses approved balances.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card className="border-white/10 bg-slate-900/60">
          <CardHeader className="flex flex-row items-center gap-2 pb-2">
            <Wallet className="h-5 w-5 text-emerald-400" />
            <CardTitle className="text-base text-white">Cash balance (approved)</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold text-white">{summary.isLoading ? "—" : formatMoney(cashBal)}</p>
          </CardContent>
        </Card>
        <Card className="border-white/10 bg-slate-900/60">
          <CardHeader className="flex flex-row items-center gap-2 pb-2">
            <Wallet className="h-5 w-5 text-sky-400" />
            <CardTitle className="text-base text-white">Bank balance (approved)</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold text-white">{summary.isLoading ? "—" : formatMoney(bankBal)}</p>
          </CardContent>
        </Card>
      </div>

      <Card className="border-white/10 bg-slate-900/60">
        <CardHeader>
          <CardTitle className="text-base text-white">Add ledger entry</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Date</Label>
              <Input className="bg-slate-800 border-slate-600 text-white" type="date" value={entryDate} onChange={(e) => setEntryDate(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Ledger</Label>
              <Select value={ledger} onValueChange={(v: any) => setLedger(v)}>
                <SelectTrigger className="bg-slate-800 border-slate-600 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-slate-900 border-slate-700 text-white">
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="bank">Bank</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Type</Label>
              <Select value={direction} onValueChange={(v: any) => setDirection(v)}>
                <SelectTrigger className="bg-slate-800 border-slate-600 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-slate-900 border-slate-700 text-white">
                  <SelectItem value="received">Received</SelectItem>
                  <SelectItem value="paid">Paid</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Amount</Label>
              <Input className="bg-slate-800 border-slate-600 text-white" type="number" step="0.01" min="0" value={amount} onChange={(e) => setAmount(e.target.value)} />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Note (optional)</Label>
            <Input className="bg-slate-800 border-slate-600 text-white" value={note} onChange={(e) => setNote(e.target.value)} />
          </div>

          <Button onClick={submit} disabled={createMutation.isPending}>
            {createMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Submit for approval"}
          </Button>
        </CardContent>
      </Card>

      <Card className="border-white/10 bg-slate-900/60">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base text-white">Pending approvals</CardTitle>
          <div className="text-xs text-slate-400">Count: {summary.data?.pending_count ?? pendingRows.length}</div>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-slate-200">
          {pending.isLoading ? (
            <p className="text-slate-400">Loading…</p>
          ) : pendingRows.length === 0 ? (
            <p className="text-slate-400">No pending entries.</p>
          ) : (
            pendingRows.map((r: LedgerEntry) => (
              <div key={r.id} className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/5 px-3 py-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    {r.direction === "received" ? (
                      <ArrowUpCircle className="h-4 w-4 text-emerald-400" />
                    ) : (
                      <ArrowDownCircle className="h-4 w-4 text-rose-400" />
                    )}
                    <span className="font-medium">{r.ledger.toUpperCase()}</span>
                    <span className="text-slate-400">·</span>
                    <span className="text-slate-300">{r.entry_date}</span>
                  </div>
                  {r.note ? <div className="truncate text-xs text-slate-400">{r.note}</div> : null}
                </div>
                <div className="flex items-center gap-3">
                  <div className="font-semibold text-white">{formatMoney(Number(r.amount))}</div>
                  {canApprove && (
                    <Button
                      size="sm"
                      variant="secondary"
                      disabled={approveMutation.isPending}
                      onClick={() => approveMutation.mutate(r.id)}
                      title="Approve"
                    >
                      <Check className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            ))
          )}
          {!canApprove && pendingRows.length > 0 ? (
            <p className="text-xs text-slate-400">Only admin can approve. Your entries will appear here until approved.</p>
          ) : null}
        </CardContent>
      </Card>

      <Separator className="border-white/10" />

      <Card className="border-white/10 bg-slate-900/60">
        <CardHeader>
          <CardTitle className="text-base text-white">Approved today ({entryDate})</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-slate-200">
          {approvedToday.isLoading ? (
            <p className="text-slate-400">Loading…</p>
          ) : approvedRows.length === 0 ? (
            <p className="text-slate-400">No approved entries for this date.</p>
          ) : (
            approvedRows.map((r: LedgerEntry) => (
              <div key={r.id} className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 px-3 py-2">
                <div className="flex items-center gap-2">
                  {r.direction === "received" ? (
                    <ArrowUpCircle className="h-4 w-4 text-emerald-400" />
                  ) : (
                    <ArrowDownCircle className="h-4 w-4 text-rose-400" />
                  )}
                  <span className="font-medium">{r.ledger.toUpperCase()}</span>
                  <span className="text-slate-400">·</span>
                  <span className="text-slate-300">{r.direction}</span>
                </div>
                <div className="font-semibold text-white">{formatMoney(Number(r.amount))}</div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}

