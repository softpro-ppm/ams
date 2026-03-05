import { useState } from "react";
import { Plus, X, ReceiptIndianRupee, HandCoins } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";

interface QuickAddWidgetProps {
  className?: string;
}

export function QuickAddWidget({ className }: QuickAddWidgetProps) {
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();

  const quickActions = [
    {
      label: "Add Transaction",
      icon: ReceiptIndianRupee,
      action: () => {
        navigate("/transactions");
        // Trigger add transaction dialog (you'll need to implement this in transactions page)
        setIsOpen(false);
      },
      shortcut: "⌘N",
    },
    {
      label: "Add Loan",
      icon: HandCoins,
      action: () => {
        navigate("/loans");
        // Trigger add loan dialog (you'll need to implement this in loans page)
        setIsOpen(false);
      },
      shortcut: "⌘L",
    },
  ];

  return (
    <>
      <Button
        onClick={() => setIsOpen(true)}
        className={cn(
          "fixed bottom-6 right-6 z-50 h-14 w-14 rounded-full shadow-lg",
          "bg-primary hover:bg-primary/90 text-primary-foreground",
          className
        )}
        aria-label="Quick add"
      >
        <Plus className="h-6 w-6" />
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Quick Add</DialogTitle>
            <DialogDescription>Choose what you want to add</DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 py-4">
            {quickActions.map((action) => (
              <Button
                key={action.label}
                variant="outline"
                className="h-auto justify-start p-4"
                onClick={action.action}
              >
                <action.icon className="mr-3 h-5 w-5" />
                <div className="flex-1 text-left">
                  <div className="font-medium">{action.label}</div>
                </div>
                <kbd className="pointer-events-none ml-auto inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
                  {action.shortcut}
                </kbd>
              </Button>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

