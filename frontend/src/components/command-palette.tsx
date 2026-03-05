import { useEffect, useMemo, useState, useImperativeHandle, forwardRef } from "react";
import { useNavigate } from "react-router-dom";
import { Search, ReceiptIndianRupee, HandCoins } from "lucide-react";
import { format, parseISO } from "date-fns";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { Transaction, Loan } from "@/types";

export type CommandItem = {
  label: string;
  href: string;
  category?: string;
  icon?: React.ReactNode;
  description?: string;
  metadata?: string;
  searchText?: string;
};

type Props = {
  items: CommandItem[];
  transactions?: Transaction[];
  loans?: Loan[];
};

export type CommandPaletteRef = {
  open: () => void;
};

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value);
}

export const CommandPalette = forwardRef<CommandPaletteRef, Props>(({ items, transactions = [], loans = [] }, ref) => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const navigate = useNavigate();

  useImperativeHandle(ref, () => ({
    open: () => setOpen(true),
  }));

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
      if (e.key === "Escape") {
        setOpen(false);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  // Build searchable items from transactions and loans
  const allItems = useMemo(() => {
    const transactionItems: CommandItem[] = transactions.slice(0, 50).map((tx) => {
      const searchText = [
        tx.reference || "",
        tx.description || "",
        formatCurrency(tx.amount),
        tx.type,
        tx.category?.name || "",
        tx.subcategory?.name || "",
      ].join(" ").toLowerCase();
      
      return {
        label: tx.reference || tx.description || `Transaction #${tx.id}`,
        href: `transaction:${tx.id}`,
        category: "Transactions",
        icon: <ReceiptIndianRupee className="h-4 w-4" />,
        description: tx.description || tx.reference || "",
        metadata: `${tx.type === "income" ? "+" : "-"}${formatCurrency(tx.amount)} • ${format(parseISO(tx.date), "MMM dd, yyyy")}`,
        searchText,
      };
    });

    const loanItems: CommandItem[] = loans.slice(0, 50).map((loan) => {
      const searchText = [
        loan.name,
        loan.description || "",
        formatCurrency(loan.principal),
        formatCurrency(loan.balance),
        loan.type,
        loan.status,
        loan.project?.name || "",
      ].join(" ").toLowerCase();
      
      return {
        label: loan.name,
        href: `loan:${loan.id}`,
        category: "Loans",
        icon: <HandCoins className="h-4 w-4" />,
        description: loan.description || "",
        metadata: `${formatCurrency(loan.principal)} • ${loan.status} • Balance: ${formatCurrency(loan.balance)}`,
        searchText,
      };
    });

    return [...items, ...transactionItems, ...loanItems];
  }, [items, transactions, loans]);

  const results = useMemo(() => {
    if (!query) {
      // Show limited items when no query
      return allItems.slice(0, 10);
    }
    
    const lowerQuery = query.toLowerCase();
    return allItems.filter((item) => {
      const matchesLabel = item.label.toLowerCase().includes(lowerQuery);
      const matchesCategory = item.category?.toLowerCase().includes(lowerQuery);
      const matchesDescription = item.description?.toLowerCase().includes(lowerQuery);
      const matchesMetadata = item.metadata?.toLowerCase().includes(lowerQuery);
      const matchesSearchText = (item as any).searchText?.includes(lowerQuery);
      
      return matchesLabel || matchesCategory || matchesDescription || matchesMetadata || matchesSearchText;
    }).slice(0, 20); // Limit to 20 results
  }, [allItems, query]);

  const onSelect = (href: string) => {
    if (href.startsWith("action:")) {
      // Handle quick actions
      const action = href.replace("action:", "");
      if (action === "add-transaction") {
        navigate("/transactions");
        setTimeout(() => {
          const event = new CustomEvent("openAddTransaction");
          window.dispatchEvent(event);
        }, 100);
      } else if (action === "add-loan") {
        navigate("/loans");
        setTimeout(() => {
          const event = new CustomEvent("openAddLoan");
          window.dispatchEvent(event);
        }, 100);
      } else if (action === "add-project") {
        navigate("/projects");
        setTimeout(() => {
          const event = new CustomEvent("openAddProject");
          window.dispatchEvent(event);
        }, 100);
      }
    } else if (href.startsWith("transaction:")) {
      // Navigate to transactions page and highlight the transaction
      const transactionId = href.replace("transaction:", "");
      navigate("/transactions");
      setTimeout(() => {
        const event = new CustomEvent("viewTransaction", { detail: { id: parseInt(transactionId) } });
        window.dispatchEvent(event);
      }, 100);
    } else if (href.startsWith("loan:")) {
      // Navigate to loans page and open the loan details
      const loanId = href.replace("loan:", "");
      navigate("/loans");
      setTimeout(() => {
        const event = new CustomEvent("viewLoan", { detail: { id: parseInt(loanId) } });
        window.dispatchEvent(event);
      }, 100);
    } else {
      navigate(href);
    }
    setOpen(false);
    setQuery("");
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="p-0 sm:max-w-xl">
        <DialogHeader className="border-b px-4 pb-3 pt-4">
          <DialogTitle className="text-base font-semibold">
            Quick actions
          </DialogTitle>
          <div className="mt-3 flex items-center gap-2 rounded-md border bg-muted/60 px-3 py-2">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search transactions, loans, categories..."
              className="border-0 bg-transparent shadow-none focus-visible:ring-0"
              autoFocus
            />
            <span className="ml-auto rounded-md bg-muted px-2 py-0.5 text-[10px] uppercase tracking-wide text-muted-foreground">
              ⌘K
            </span>
          </div>
        </DialogHeader>
        <ScrollArea className="max-h-[500px] px-2 py-3">
          <div className="space-y-1">
            {results.map((item, index) => {
              // Group by category
              const prevItem = index > 0 ? results[index - 1] : null;
              const showCategoryHeader = !prevItem || prevItem.category !== item.category;
              
              return (
                <div key={`${item.href}-${index}`}>
                  {showCategoryHeader && item.category && (
                    <div className="px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      {item.category}
                    </div>
                  )}
                  <button
                    className={cn(
                      "w-full rounded-md px-3 py-2.5 text-left transition hover:bg-accent hover:text-accent-foreground",
                      "flex items-start gap-3 text-sm group"
                    )}
                    onClick={() => onSelect(item.href)}
                  >
                    {item.icon && (
                      <div className="mt-0.5 text-muted-foreground group-hover:text-foreground">
                        {item.icon}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="font-medium">{item.label}</div>
                      {item.description && (
                        <div className="text-xs text-muted-foreground mt-0.5 truncate">
                          {item.description}
                        </div>
                      )}
                      {item.metadata && (
                        <div className="text-xs text-muted-foreground mt-1 flex items-center gap-2">
                          {item.metadata}
                        </div>
                      )}
                    </div>
                  </button>
                </div>
              );
            })}
            {results.length === 0 && (
              <div className="px-3 py-8 text-center">
                <p className="text-sm text-muted-foreground">
                  No results found for "{query}"
                </p>
                <p className="text-xs text-muted-foreground mt-2">
                  Try searching by name, description, amount, or date
                </p>
              </div>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
});

CommandPalette.displayName = "CommandPalette";

