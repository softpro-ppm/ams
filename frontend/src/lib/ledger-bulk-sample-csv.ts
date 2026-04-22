/** Opens as a normal table in Excel (UTF-8 BOM + CRLF). */
const SAMPLE_LINES = [
  "Date,Type,Ledger,Amount,Particulars,Description",
  "01/04/26,Paid,Bank,1502,Yenaparthi Sankara Rao,Insurance Payment",
  "01/04/26,Paid,Bank,970,Yenaparthi Sankara Rao,Tax",
  "08/04/26,Received,Cash,100,Rajesh,Sample receipt",
] as const;

export function downloadLedgerBulkSampleCsv(): void {
  const bom = "\uFEFF";
  const body = SAMPLE_LINES.join("\r\n");
  const blob = new Blob([bom + body], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "ledger-bulk-sample.csv";
  a.rel = "noopener";
  a.click();
  URL.revokeObjectURL(url);
}
