import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { Link } from "react-router-dom";
import { ArrowLeft, Loader2, Lock, Trash2 } from "lucide-react";

import { ledgersApi } from "@/services/api";
import { useAuth } from "@/contexts/auth-context";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import type { LedgerClosureRow } from "@/types";

const TODAY = format(new Date(), "yyyy-MM-dd");

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

export function LedgersClosingPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();
  const isAdmin = user?.role === "admin";

  const [closeDate, setCloseDate] = useState(TODAY);
  const [notes, setNotes] = useState("");

  const status = useQuery({
    queryKey: ["ledgers", "closure-status"],
    queryFn: () => ledgersApi.closureStatus(),
  });

  const list = useQuery({
    queryKey: ["ledgers", "closures"],
    queryFn: () => ledgersApi.closuresList(),
  });

  const closeMutation = useMutation({
    mutationFn: () => ledgersApi.closeCreate({ closed_through_date: closeDate, notes: notes.trim() || undefined }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["ledgers"] });
      setNotes("");
      toast({ title: "Books closed", description: `Through ${displayDate(closeDate)}.` });
    },
    onError: (err: any) => {
      toast({
        title: "Error",
        description: err?.response?.data?.message || "Could not record closure.",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => ledgersApi.closeDelete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["ledgers"] });
      toast({ title: "Reopened", description: "Latest closure removed. Earlier dates can receive entries again." });
    },
    onError: (err: any) => {
      toast({
        title: "Error",
        description: err?.response?.data?.message || "Could not remove closure.",
        variant: "destructive",
      });
    },
  });

  const rows = list.data ?? [];
  const latestId = status.data?.closure_id ?? null;

  return (
    <div className="space-y-6">
      <div>
        <Button variant="ghost" size="sm" className="mb-2 -ml-2 gap-1 text-muted-foreground" asChild>
          <Link to="/ledgers">
            <ArrowLeft className="h-4 w-4" />
            Daily ledger
          </Link>
        </Button>
        <h1 className="text-2xl font-semibold text-foreground">Ledger closing</h1>
        <p className="text-sm text-muted-foreground">
          Record an official close through a date. No new ledger lines can be added on or before that date until you remove the
          latest closure. Use this after reconciling cash and bank for the period.
        </p>
      </div>

      <Card className="border-amber-500/30 bg-amber-500/5">
        <CardHeader className="flex flex-row items-center gap-2 pb-2">
          <Lock className="h-5 w-5 text-amber-600" />
          <CardTitle className="text-base">Bank reconciliation</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          <p>
            Export your bank&apos;s CSV from internet banking and compare it to the{" "}
            <Link className="text-primary underline" to="/ledgers/statement">
              ledger statement
            </Link>{" "}
            for the same dates. When totals match, record the close below. Full automatic import can be added later if you need
            it.
          </p>
        </CardContent>
      </Card>

      {status.data?.closed_through_date ? (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Current lock</CardTitle>
          </CardHeader>
          <CardContent className="text-sm">
            <p>
              Books are closed through{" "}
              <span className="font-semibold text-foreground">{displayDate(status.data.closed_through_date)}</span>. New entries
              must be dated after that day.
            </p>
            <p className="mt-1 text-muted-foreground">
              Snapshots at close: cash {formatMoney(status.data.cash_balance_snapshot ?? 0)}, bank{" "}
              {formatMoney(status.data.bank_balance_snapshot ?? 0)}.
            </p>
          </CardContent>
        </Card>
      ) : null}

      {isAdmin ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Record close</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 max-w-md">
            <div className="space-y-2">
              <Label htmlFor="close-d">Close through date</Label>
              <Input id="close-d" type="date" value={closeDate} onChange={(e) => setCloseDate(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="close-n">Notes (optional)</Label>
              <Input
                id="close-n"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g. Matched bank statement #…"
              />
            </div>
            <Button onClick={() => closeMutation.mutate()} disabled={closeMutation.isPending}>
              {closeMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Record closure & lock dates"}
            </Button>
          </CardContent>
        </Card>
      ) : (
        <p className="text-sm text-muted-foreground">Only an admin can record or remove closures.</p>
      )}

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Closure history</CardTitle>
        </CardHeader>
        <CardContent className="p-0 sm:p-6 sm:pt-0">
          {list.isLoading ? (
            <p className="p-6 text-sm text-muted-foreground">Loading…</p>
          ) : rows.length === 0 ? (
            <p className="p-6 text-sm text-muted-foreground">No closures recorded yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Closed through</TableHead>
                    <TableHead className="text-right">Cash snap.</TableHead>
                    <TableHead className="text-right">Bank snap.</TableHead>
                    <TableHead>By</TableHead>
                    <TableHead>Notes</TableHead>
                    {isAdmin ? <TableHead className="w-24"> </TableHead> : null}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((r: LedgerClosureRow) => (
                    <TableRow key={r.id}>
                      <TableCell>{displayDate(r.closed_through_date)}</TableCell>
                      <TableCell className="text-right tabular-nums">{formatMoney(r.cash_balance_snapshot)}</TableCell>
                      <TableCell className="text-right tabular-nums">{formatMoney(r.bank_balance_snapshot)}</TableCell>
                      <TableCell className="text-muted-foreground">{r.closed_by_name ?? "—"}</TableCell>
                      <TableCell className="max-w-[200px] truncate" title={r.notes ?? ""}>
                        {r.notes ?? "—"}
                      </TableCell>
                      {isAdmin ? (
                        <TableCell>
                          {latestId === r.id ? (
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              className="gap-1 text-destructive"
                              disabled={deleteMutation.isPending}
                              onClick={() => {
                                if (confirm("Remove this closure and reopen those dates for new entries?")) {
                                  deleteMutation.mutate(r.id);
                                }
                              }}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                              Reopen
                            </Button>
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </TableCell>
                      ) : null}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
