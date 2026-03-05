import { useState, useEffect } from "react";
import { GripVertical, X } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type WidgetType = 
  | "quarterly-income"
  | "quarterly-expense"
  | "quarterly-net-balance"
  | "pending-loans"
  | "income-vs-expense-chart"
  | "top-income-categories"
  | "top-expense-categories"
  | "project-breakdown";

export interface DashboardWidget {
  id: string;
  type: WidgetType;
  enabled: boolean;
  order: number;
}

interface DraggableDashboardProps {
  widgets: DashboardWidget[];
  onWidgetsChange: (widgets: DashboardWidget[]) => void;
  children: (widget: DashboardWidget) => React.ReactNode;
  className?: string;
}

export function DraggableDashboard({
  widgets,
  onWidgetsChange,
  children,
  className,
}: DraggableDashboardProps) {
  const [draggedWidget, setDraggedWidget] = useState<string | null>(null);
  const [dragOverWidget, setDragOverWidget] = useState<string | null>(null);

  const enabledWidgets = widgets.filter((w) => w.enabled).sort((a, b) => a.order - b.order);

  const handleDragStart = (widgetId: string) => {
    setDraggedWidget(widgetId);
  };

  const handleDragOver = (e: React.DragEvent, widgetId: string) => {
    e.preventDefault();
    if (draggedWidget && draggedWidget !== widgetId) {
      setDragOverWidget(widgetId);
    }
  };

  const handleDrop = (e: React.DragEvent, targetWidgetId: string) => {
    e.preventDefault();
    if (!draggedWidget || draggedWidget === targetWidgetId) {
      setDraggedWidget(null);
      setDragOverWidget(null);
      return;
    }

    const dragged = widgets.find((w) => w.id === draggedWidget);
    const target = widgets.find((w) => w.id === targetWidgetId);

    if (!dragged || !target) return;

    const newWidgets = widgets.map((widget) => {
      if (widget.id === draggedWidget) {
        return { ...widget, order: target.order };
      }
      if (widget.id === targetWidgetId) {
        return { ...widget, order: dragged.order };
      }
      return widget;
    });

    onWidgetsChange(newWidgets);
    setDraggedWidget(null);
    setDragOverWidget(null);
  };

  const handleDragEnd = () => {
    setDraggedWidget(null);
    setDragOverWidget(null);
  };

  return (
    <div className={cn("grid gap-4 md:grid-cols-2 xl:grid-cols-4", className)}>
      {enabledWidgets.map((widget) => (
        <div
          key={widget.id}
          draggable
          onDragStart={() => handleDragStart(widget.id)}
          onDragOver={(e) => handleDragOver(e, widget.id)}
          onDrop={(e) => handleDrop(e, widget.id)}
          onDragEnd={handleDragEnd}
          className={cn(
            "relative transition-all",
            draggedWidget === widget.id && "opacity-50",
            dragOverWidget === widget.id && "ring-2 ring-primary"
          )}
        >
          <div className="absolute top-2 right-2 z-10 flex gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-100 transition-opacity"
              onMouseDown={(e) => e.stopPropagation()}
            >
              <GripVertical className="h-4 w-4 text-muted-foreground" />
            </Button>
          </div>
          {children(widget)}
        </div>
      ))}
    </div>
  );
}

