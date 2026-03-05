import { Route, Routes, Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/auth-context";
import { AppShell } from "@/components/layout/app-shell";
import { LoginPage } from "@/pages/login";
import { DashboardPage } from "@/pages/dashboard";
import { TransactionsPage } from "@/pages/transactions";
import { LoansPage } from "@/pages/loans";
import { ReportsPage } from "@/pages/reports";
import { ProjectsPage } from "@/pages/projects";
import { CategoriesPage } from "@/pages/categories";
import { SettingsPage } from "@/pages/settings";
import { Loader2 } from "lucide-react";
import { useKeyboardShortcuts, type KeyboardShortcut } from "@/hooks/use-keyboard-shortcuts";
import { KeyboardShortcutsModal } from "@/components/keyboard-shortcuts-modal";
import { PWAInstallPrompt } from "@/components/pwa-install-prompt";
import { useState, useMemo } from "react";

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

function AppRoutes() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [showShortcuts, setShowShortcuts] = useState(false);

  const shortcuts: KeyboardShortcut[] = useMemo(() => [
    {
      key: "k",
      metaKey: true,
      action: () => {
        // Command palette will be handled by AppShell
        const event = new KeyboardEvent("keydown", { key: "k", metaKey: true });
        window.dispatchEvent(event);
      },
      description: "Open command palette",
    },
    {
      key: "n",
      metaKey: true,
      action: () => navigate("/transactions"),
      description: "Go to Transactions",
    },
    {
      key: "l",
      metaKey: true,
      action: () => navigate("/loans"),
      description: "Go to Loans",
    },
    {
      key: "p",
      metaKey: true,
      action: () => navigate("/projects"),
      description: "Go to Projects",
    },
    {
      key: "/",
      metaKey: true,
      action: () => setShowShortcuts(true),
      description: "Show keyboard shortcuts",
    },
    {
      key: "1",
      metaKey: true,
      action: () => navigate("/"),
      description: "Go to Dashboard",
    },
    {
      key: "2",
      metaKey: true,
      action: () => navigate("/transactions"),
      description: "Go to Transactions",
    },
    {
      key: "3",
      metaKey: true,
      action: () => navigate("/loans"),
      description: "Go to Loans",
    },
    {
      key: "4",
      metaKey: true,
      action: () => navigate("/reports"),
      description: "Go to Reports",
    },
    {
      key: ",",
      metaKey: true,
      action: () => navigate("/settings"),
      description: "Go to Settings",
    },
  ], [navigate]);

  useKeyboardShortcuts(shortcuts);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return (
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    );
  }

  return (
    <>
      <AppShell>
        <Routes>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/transactions" element={<TransactionsPage />} />
          <Route path="/loans" element={<LoansPage />} />
          <Route path="/reports" element={<ReportsPage />} />
          <Route path="/projects" element={<ProjectsPage />} />
          <Route path="/categories" element={<CategoriesPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/login" element={<Navigate to="/" replace />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AppShell>
      <KeyboardShortcutsModal open={showShortcuts} onOpenChange={setShowShortcuts} />
      <PWAInstallPrompt />
    </>
  );
}

function App() {
  return <AppRoutes />;
}

export default App;
