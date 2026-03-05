import { useState, useEffect } from "react";
import { DashboardWidget, WidgetType } from "@/components/draggable-dashboard";

const DEFAULT_WIDGETS: DashboardWidget[] = [
  { id: "1", type: "quarterly-income", enabled: true, order: 1 },
  { id: "2", type: "quarterly-expense", enabled: true, order: 2 },
  { id: "3", type: "quarterly-net-balance", enabled: true, order: 3 },
  { id: "4", type: "pending-loans", enabled: true, order: 4 },
  { id: "5", type: "income-vs-expense-chart", enabled: true, order: 5 },
  { id: "6", type: "top-income-categories", enabled: true, order: 6 },
  { id: "7", type: "top-expense-categories", enabled: true, order: 7 },
  { id: "8", type: "project-breakdown", enabled: true, order: 8 },
];

const STORAGE_KEY = "softpro-dashboard-widgets";

export function useDashboardWidgets() {
  const [widgets, setWidgets] = useState<DashboardWidget[]>(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch {
        return DEFAULT_WIDGETS;
      }
    }
    return DEFAULT_WIDGETS;
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(widgets));
  }, [widgets]);

  const updateWidgets = (newWidgets: DashboardWidget[]) => {
    setWidgets(newWidgets);
  };

  return { widgets, updateWidgets };
}

