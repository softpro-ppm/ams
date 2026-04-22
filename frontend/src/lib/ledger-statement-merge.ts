import type { LedgerStatementResponse, LedgerStatementRow } from "@/types";

function compareEntryOrder(a: { entry_date: string; id: number }, b: { entry_date: string; id: number }): number {
  const da = String(a.entry_date).slice(0, 10);
  const db = String(b.entry_date).slice(0, 10);
  if (da !== db) return da.localeCompare(db);
  return a.id - b.id;
}

/**
 * Merge cash + bank statement API responses into one chronological view.
 * Recomputes `balance_after` per row (running total for that row's ledger only).
 */
export function mergeCashBankStatements(
  cash: LedgerStatementResponse,
  bank: LedgerStatementResponse
): LedgerStatementResponse {
  const combined = [...cash.data, ...bank.data].sort(compareEntryOrder);

  let runCash = cash.opening_balance;
  let runBank = bank.opening_balance;

  const data: LedgerStatementRow[] = combined.map((row) => {
    const amt = Number(row.amount);
    const delta = row.direction === "received" ? amt : -amt;
    if (row.ledger === "cash") {
      runCash += delta;
    } else {
      runBank += delta;
    }
    const received = row.direction === "received" ? amt : 0;
    const paid = row.direction === "paid" ? amt : 0;
    const balanceAfter = row.ledger === "cash" ? runCash : runBank;

    return {
      ...row,
      received_amount: Math.round(received * 100) / 100,
      paid_amount: Math.round(paid * 100) / 100,
      balance_after: Math.round(balanceAfter * 100) / 100,
    };
  });

  const pending = [...(cash.pending_in_period ?? []), ...(bank.pending_in_period ?? [])].sort(compareEntryOrder);

  return {
    ledger: "all",
    date_from: cash.date_from,
    date_to: cash.date_to,
    include_pending: cash.include_pending,
    opening_balance: Math.round((cash.opening_balance + bank.opening_balance) * 100) / 100,
    closing_balance: Math.round((cash.closing_balance + bank.closing_balance) * 100) / 100,
    opening_balance_cash: cash.opening_balance,
    opening_balance_bank: bank.opening_balance,
    closing_balance_cash: cash.closing_balance,
    closing_balance_bank: bank.closing_balance,
    data,
    pending_in_period: pending,
  };
}

function csvCell(v: string | number): string {
  const s = String(v);
  if (/[,"\r\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function fmtCsvAmt(n: number): string {
  return Number(n || 0).toFixed(2);
}

/** Client-side CSV for merged cash+bank (API export is single-ledger only). */
export function downloadMergedStatementCsv(data: LedgerStatementResponse): void {
  const lines: string[] = [];
  const push = (cells: (string | number)[]) => lines.push(cells.map((c) => csvCell(c)).join(","));

  push(["Ledger statement", "all (cash+bank)", `${data.date_from} → ${data.date_to}`]);
  push(["Opening (cash)", fmtCsvAmt(data.opening_balance_cash ?? 0)]);
  push(["Opening (bank)", fmtCsvAmt(data.opening_balance_bank ?? 0)]);
  push(["Opening (total)", fmtCsvAmt(data.opening_balance)]);
  push(["Closing (cash)", fmtCsvAmt(data.closing_balance_cash ?? 0)]);
  push(["Closing (bank)", fmtCsvAmt(data.closing_balance_bank ?? 0)]);
  push(["Closing (total)", fmtCsvAmt(data.closing_balance)]);
  lines.push("");
  push(["Sl.", "Date", "Ledger", "Status", "Received", "Paid", "Particulars", "Description", "Balance", "Entered by"]);

  let sn = 0;
  for (const row of data.data) {
    sn++;
    push([
      sn,
      String(row.entry_date ?? "").slice(0, 10),
      row.ledger,
      "approved",
      fmtCsvAmt(row.received_amount ?? 0),
      fmtCsvAmt(row.paid_amount ?? 0),
      row.particulars ?? "",
      row.note ?? "",
      fmtCsvAmt(row.balance_after ?? 0),
      row.entered_by_name ?? "",
    ]);
  }

  if (data.pending_in_period?.length) {
    lines.push("");
    push(["Pending in period (not in running balance)"]);
    push(["Sl.", "Date", "Ledger", "Status", "Received", "Paid", "Particulars", "Description", "Entered by"]);
    let pn = 0;
    for (const row of data.pending_in_period) {
      pn++;
      push([
        pn,
        String(row.entry_date ?? "").slice(0, 10),
        row.ledger,
        "pending",
        fmtCsvAmt(row.received_amount ?? 0),
        fmtCsvAmt(row.paid_amount ?? 0),
        row.particulars ?? "",
        row.note ?? "",
        row.entered_by_name ?? "",
      ]);
    }
  }

  const bom = "\uFEFF";
  const blob = new Blob([bom + lines.join("\n")], { type: "text/csv;charset=utf-8" });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "ledger-statement-all.csv";
  a.click();
  window.URL.revokeObjectURL(url);
}
