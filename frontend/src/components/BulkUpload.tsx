import { useState, useCallback } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import * as XLSX from "xlsx";
import { Upload, FileSpreadsheet, X, CheckCircle2, AlertCircle, Download, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { bulkImportApi, type BulkImportResult } from "@/services/api";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface BulkUploadProps {
  type: "transactions" | "loans";
}

export function BulkUpload({ type }: BulkUploadProps) {
  const [file, setFile] = useState<File | null>(null);
  const [previewData, setPreviewData] = useState<any[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [importResult, setImportResult] = useState<BulkImportResult | null>(null);
  const [showResult, setShowResult] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const importMutation = useMutation({
    mutationFn: (file: File) => 
      type === "transactions" 
        ? bulkImportApi.importTransactions(file)
        : bulkImportApi.importLoans(file),
    onSuccess: (result) => {
      setImportResult(result);
      setShowResult(true);
      
      // Only invalidate queries if import was successful (all_valid = true)
      if (result.all_valid && result.successful > 0) {
        queryClient.invalidateQueries({ queryKey: [type === "transactions" ? "transactions" : "loans"] });
        queryClient.invalidateQueries({ queryKey: ["dashboard"] });
        queryClient.invalidateQueries({ queryKey: ["projects"] });
        queryClient.invalidateQueries({ queryKey: ["categories"] });
        
        toast({
          title: "Import Successful",
          description: `All ${result.successful} ${type} imported successfully`,
        });
      } else if (!result.all_valid && result.failed > 0) {
        toast({
          title: "Validation Failed",
          description: `${result.failed} ${type} have errors. No data was imported. Please fix errors and try again.`,
          variant: "destructive",
        });
      }
    },
    onError: (error: any) => {
      toast({
        title: "Import Failed",
        description: error.response?.data?.message || "Failed to import file",
        variant: "destructive",
      });
    },
  });

  const handleFileSelect = useCallback((selectedFile: File) => {
    if (!selectedFile.name.match(/\.(xlsx|xls)$/i)) {
      toast({
        title: "Invalid File",
        description: "Please select an Excel file (.xlsx or .xls)",
        variant: "destructive",
      });
      return;
    }

    setFile(selectedFile);
    parseFile(selectedFile);
  }, [toast]);

  const parseFile = (fileToParse: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: "array" });
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
        const jsonData = XLSX.utils.sheet_to_json(firstSheet, { header: 1, defval: "" });
        
        // Skip header row and show first 10 rows as preview
        const preview = jsonData.slice(1, 11).map((row: any, index) => ({
          row: index + 2,
          data: row,
        }));
        
        setPreviewData(preview);
        setShowPreview(true);
      } catch (error) {
        toast({
          title: "File Parse Error",
          description: "Failed to parse Excel file",
          variant: "destructive",
        });
      }
    };
    reader.readAsArrayBuffer(fileToParse);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) {
      handleFileSelect(droppedFile);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      handleFileSelect(selectedFile);
    }
  };

  const handleImport = () => {
    if (file) {
      setShowPreview(false);
      importMutation.mutate(file);
    }
  };

  const handleDownloadTemplate = () => {
    if (type === "transactions") {
      bulkImportApi.downloadTransactionTemplate();
    } else {
      bulkImportApi.downloadLoanTemplate();
    }
  };

  const handleDownloadFailedRows = () => {
    if (!importResult || !file || !importResult.errors || importResult.errors.length === 0) {
      toast({
        title: "No Failed Rows",
        description: "There are no failed rows to download",
        variant: "destructive",
      });
      return;
    }

    try {
      // Use row_data if available (original Excel row), otherwise fall back to data
      const failedRows = importResult.errors.map((error: any) => {
        if (error.row_data && Array.isArray(error.row_data)) {
          return error.row_data;
        }
        // Fallback: convert data object to array format
        if (error.data && typeof error.data === 'object') {
          if (type === "transactions") {
            return [
              error.data.date || '',
              error.data.type || '',
              error.data.project_name || '',
              error.data.category_name || '',
              error.data.subcategory_name || '',
              error.data.amount || '',
              error.data.paid_amount || '',
              error.data.balance_amount || '',
              error.data.phone_number || '',
              error.data.reference || '',
              error.data.description || '',
            ];
          }
        }
        return [];
      }).filter((row: any[]) => row.length > 0);
      
      if (failedRows.length === 0) {
        toast({
          title: "No Valid Failed Rows",
          description: "Could not extract failed row data",
          variant: "destructive",
        });
        return;
      }
      
      // Create a new workbook with failed rows
      const wb = XLSX.utils.book_new();
      
      // Add error column to each row
      const errorData = failedRows.map((row, index) => [
        ...row,
        `Errors: ${importResult.errors[index]?.errors?.join("; ") || "Unknown error"}`,
      ]);
      
      const headers = type === "transactions" 
        ? [["Date", "Type", "Project Name", "Category Name", "Subcategory Name", "Amount", "Paid", "Balance", "Phone Number", "Full Name", "Description", "Errors"]]
        : [["Customer Name", "Loan Type", "Project Name", "Total Amount", "Start Date", "Customer Phone", "Description", "Errors"]];
      
      const errorWs = XLSX.utils.aoa_to_sheet([
        ...headers,
        ...errorData,
      ]);
      XLSX.utils.book_append_sheet(wb, errorWs, "Failed Rows");
      
      XLSX.writeFile(wb, `failed_${type}_import_${new Date().toISOString().split('T')[0]}.xlsx`);
      
      toast({
        title: "Download Started",
        description: `Downloading ${failedRows.length} failed rows`,
      });
    } catch (error: any) {
      console.error("Download failed rows error:", error);
      toast({
        title: "Download Failed",
        description: error.message || "Failed to download failed rows",
        variant: "destructive",
      });
    }
  };

  const reset = () => {
    setFile(null);
    setPreviewData([]);
    setImportResult(null);
    setShowPreview(false);
    setShowResult(false);
  };

  return (
    <Card className="bg-white/5 text-white">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileSpreadsheet className="h-5 w-5" />
          Bulk Import {type === "transactions" ? "Transactions" : "Loans"}
        </CardTitle>
        <CardDescription className="text-slate-300">
          Upload Excel file to import {type === "transactions" ? "transactions" : "loans"} in bulk
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {!file && (
          <>
            <div
              className={cn(
                "border-2 border-dashed rounded-lg p-8 text-center transition-colors",
                isDragOver ? "border-primary bg-primary/10" : "border-slate-600 bg-slate-800/50"
              )}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              <Upload className="h-12 w-12 mx-auto mb-4 text-slate-400" />
              <p className="text-sm text-slate-300 mb-2">
                Drag and drop your Excel file here, or
              </p>
              <label htmlFor={`file-upload-${type}`}>
                <Button
                  type="button"
                  variant="outline"
                  className="cursor-pointer border-white/20 text-white hover:bg-white/10"
                  asChild
                >
                  <span>Browse Files</span>
                </Button>
                <input
                  id={`file-upload-${type}`}
                  type="file"
                  accept=".xlsx,.xls"
                  className="hidden"
                  onChange={handleFileInput}
                />
              </label>
              <p className="text-xs text-slate-400 mt-4">
                Supported formats: .xlsx, .xls
              </p>
            </div>
            <Button
              onClick={handleDownloadTemplate}
              variant="outline"
              className="w-full border-white/20 text-white hover:bg-white/10"
            >
              <Download className="mr-2 h-4 w-4" />
              Download Template
            </Button>
          </>
        )}

        {file && !showPreview && !showResult && (
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-slate-800/50 rounded-lg">
              <div className="flex items-center gap-3">
                <FileSpreadsheet className="h-5 w-5 text-slate-400" />
                <div>
                  <p className="text-sm font-medium">{file.name}</p>
                  <p className="text-xs text-slate-400">
                    {(file.size / 1024).toFixed(2)} KB
                  </p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={reset}
                className="text-slate-400 hover:text-white"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {/* Preview Dialog */}
        <Dialog open={showPreview} onOpenChange={setShowPreview}>
          <DialogContent className="bg-slate-900 border-slate-700 text-white max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Preview Import Data</DialogTitle>
              <DialogDescription className="text-slate-400">
                Review the first 10 rows before importing. Make sure the data is correct.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="overflow-x-auto">
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr className="border-b border-slate-700">
                      <th className="text-left p-2 text-slate-400">Row</th>
                      {previewData[0]?.data.map((_: any, colIndex: number) => (
                        <th key={colIndex} className="text-left p-2 text-slate-400">
                          Column {colIndex + 1}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {previewData.map((row, index) => (
                      <tr key={index} className="border-b border-slate-800">
                        <td className="p-2 text-slate-300">{row.row}</td>
                        {row.data.map((cell: any, cellIndex: number) => (
                          <td key={cellIndex} className="p-2 text-slate-200">
                            {cell || <span className="text-slate-500">—</span>}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            <DialogFooter>
              <Button variant="ghost" onClick={() => setShowPreview(false)}>
                Cancel
              </Button>
              <Button onClick={handleImport} disabled={importMutation.isPending}>
                {importMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Import {file && `(${file.name})`}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Result Dialog */}
        <Dialog open={showResult} onOpenChange={setShowResult}>
          <DialogContent className="bg-slate-900 border-slate-700 text-white max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {importResult?.all_valid ? "Import Results" : "Validation Failed"}
              </DialogTitle>
              <DialogDescription className="text-slate-400">
                {importResult?.all_valid 
                  ? "Summary of the bulk import operation"
                  : "All rows must be valid before import. No data was imported. Please fix errors and try again."}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              {importResult?.all_valid ? (
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <CheckCircle2 className="h-5 w-5 text-emerald-400" />
                      <span className="font-semibold text-emerald-400">Successful</span>
                    </div>
                    <p className="text-2xl font-bold">{importResult?.successful || 0}</p>
                  </div>
                  <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <AlertCircle className="h-5 w-5 text-rose-400" />
                      <span className="font-semibold text-rose-400">Failed</span>
                    </div>
                    <p className="text-2xl font-bold">{importResult?.failed || 0}</p>
                  </div>
                </div>
              ) : (
                <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertCircle className="h-5 w-5 text-rose-400" />
                    <span className="font-semibold text-rose-400">Validation Errors</span>
                  </div>
                  <p className="text-2xl font-bold">{importResult?.failed || 0}</p>
                  <p className="text-sm text-slate-300 mt-2">
                    No data was imported. All rows must pass validation before import.
                  </p>
                </div>
              )}

              {importResult && importResult.errors.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="font-semibold">Failed Rows</h4>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleDownloadFailedRows}
                      className="border-white/20 text-white hover:bg-white/10"
                    >
                      <Download className="mr-2 h-4 w-4" />
                      Download Failed Rows
                    </Button>
                  </div>
                  <div className="max-h-64 overflow-y-auto space-y-2">
                    {importResult.errors.slice(0, 20).map((error, index) => (
                      <div
                        key={index}
                        className="p-3 bg-slate-800/50 rounded-lg border border-slate-700"
                      >
                        <div className="flex items-start justify-between mb-1">
                          <Badge variant="destructive" className="text-xs">
                            Row {error.row}
                          </Badge>
                        </div>
                        <div className="text-xs text-slate-300 mt-2">
                          {error.errors.map((err, errIndex) => (
                            <p key={errIndex} className="text-rose-400">
                              • {err}
                            </p>
                          ))}
                        </div>
                      </div>
                    ))}
                    {importResult.errors.length > 20 && (
                      <p className="text-xs text-slate-400 text-center">
                        ... and {importResult.errors.length - 20} more errors
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button onClick={reset} variant="outline" className="border-white/20 text-white hover:bg-white/10">
                Close
              </Button>
              {importResult && importResult.successful > 0 && (
                <Button onClick={reset} className="bg-primary text-primary-foreground">
                  Import Another File
                </Button>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {importMutation.isPending && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-300">Importing...</span>
              <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
            </div>
            <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
              <div className="h-full bg-primary animate-pulse" style={{ width: "100%" }} />
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

