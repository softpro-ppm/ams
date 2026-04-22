import { useState } from "react";
import { Settings2, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { DashboardWidget, WidgetType } from "./draggable-dashboard";

interface DashboardWidgetSettingsProps {
  widgets: DashboardWidget[];
  onWidgetsChange: (widgets: DashboardWidget[]) => void;
}

const WIDGET_LABELS: Record<WidgetType, string> = {
  "quarterly-income": "Quarterly Income",
  "quarterly-expense": "Quarterly Expense",
  "quarterly-net-balance": "Quarterly Net Balance",
  "pending-loans": "Pending Loans",
  "income-vs-expense-chart": "Income vs Expense Chart",
  "top-income-categories": "Top Income Categories",
  "top-expense-categories": "Top Expense Categories",
  "project-breakdown": "Project Breakdown",
};

export function DashboardWidgetSettings({
  widgets,
  onWidgetsChange,
}: DashboardWidgetSettingsProps) {
  const [isOpen, setIsOpen] = useState(false);

  const handleToggleWidget = (widgetId: string) => {
    const newWidgets = widgets.map((widget) =>
      widget.id === widgetId ? { ...widget, enabled: !widget.enabled } : widget
    );
    onWidgetsChange(newWidgets);
  };

  return (
    <>
      <Button
        variant="outline"
        size="icon"
        onClick={() => setIsOpen(true)}
        className="h-9 w-9"
      >
        <Settings2 className="h-4 w-4" />
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Customize Dashboard</DialogTitle>
            <DialogDescription>
              Enable or disable widgets and drag to reorder them
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {widgets.map((widget) => (
              <div
                key={widget.id}
                className="flex items-center justify-between rounded-lg border p-3"
              >
                <Label htmlFor={widget.id} className="flex-1 cursor-pointer">
                  {WIDGET_LABELS[widget.type]}
                </Label>
                <Switch
                  id={widget.id}
                  checked={widget.enabled}
                  onCheckedChange={() => handleToggleWidget(widget.id)}
                />
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

