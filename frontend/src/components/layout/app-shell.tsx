import {
  Blocks,
  ChartPie,
  Cog,
  FolderKanban,
  HandCoins,
  LayoutDashboard,
  ListChecks,
  LogOut,
  Menu,
  ReceiptIndianRupee,
  Search,
  User,
} from "lucide-react";
import { Link, NavLink, useLocation } from "react-router-dom";
import { useMemo, useRef } from "react";
import { useQuery } from "@tanstack/react-query";

import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { CommandPalette, type CommandPaletteRef } from "@/components/command-palette";
import { useTheme } from "@/components/theme-provider";
import { useAuth } from "@/contexts/auth-context";
import { transactionsApi, loansApi } from "@/services/api";
import { QuickAddWidget } from "@/components/quick-add-widget";
import { cn } from "@/lib/utils";
import { Moon, Sun } from "lucide-react";
import type { LucideIcon } from "lucide-react";

type NavChild = { label: string; to: string };

type NavItemConfig =
  | { label: string; to: string; icon: LucideIcon; children?: undefined }
  | { label: string; to: string; icon: LucideIcon; children: NavChild[] };

type AppShellProps = {
  children: React.ReactNode;
};

const NAV_ITEMS: NavItemConfig[] = [
  { label: "Dashboard", to: "/", icon: LayoutDashboard },
  { label: "Transactions", to: "/transactions", icon: ReceiptIndianRupee },
  {
    label: "Ledgers",
    to: "/ledgers",
    icon: ListChecks,
    children: [
      { label: "Daily ledger", to: "/ledgers" },
      { label: "Statement", to: "/ledgers/statement" },
      { label: "Closing", to: "/ledgers/closing" },
    ],
  },
  { label: "Loans", to: "/loans", icon: HandCoins },
  { label: "Reports", to: "/reports", icon: ChartPie },
  { label: "Projects", to: "/projects", icon: Blocks },
  { label: "Categories", to: "/categories", icon: FolderKanban },
  { label: "Settings", to: "/settings", icon: Cog },
];

export function AppShell({ children }: AppShellProps) {
  const commandPaletteRef = useRef<CommandPaletteRef>(null);
  
  // Fetch recent transactions and loans for search
  const { data: transactionsData } = useQuery({
    queryKey: ["transactions", "search"],
    queryFn: () => transactionsApi.list({ per_page: 50, page: 1 }),
    staleTime: 30000, // Cache for 30 seconds
  });

  const { data: loansData } = useQuery({
    queryKey: ["loans", "search"],
    queryFn: () => loansApi.list({ per_page: 50, page: 1 }),
    staleTime: 30000, // Cache for 30 seconds
  });
  
  const paletteItems = useMemo(
    () => [
      // Quick Actions
      { label: "Add Transaction", href: "action:add-transaction", category: "Quick Actions" },
      { label: "Add Loan", href: "action:add-loan", category: "Quick Actions" },
      { label: "Add Project", href: "action:add-project", category: "Quick Actions" },
      { label: "Go to Reports", href: "/reports", category: "Quick Actions" },
      { label: "Go to Categories", href: "/categories", category: "Quick Actions" },
      // Navigation
      ...NAV_ITEMS.flatMap((item) =>
        item.children
          ? item.children.map((c) => ({
              label: `${item.label}: ${c.label}`,
              href: c.to,
              category: "Navigation",
            }))
          : [{ label: item.label, href: item.to, category: "Navigation" }]
      ),
    ],
    []
  );

  return (
    <div className="min-h-screen w-full overflow-x-hidden bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 pb-24 text-foreground">
      {/* Full-width on large monitors (was max-w-7xl ~1280px, which left empty side margins). */}
      <div className="flex w-full min-w-0 flex-col gap-6 px-4 pt-6 sm:px-5 lg:flex-row lg:px-6 xl:px-8">
        <aside className="hidden w-52 shrink-0 lg:block">
          <Brand />
          <Separator className="my-4" />
          <NavList />
        </aside>

        <main className="flex-1 min-w-0 rounded-3xl border border-white/10 bg-slate-900/80 backdrop-blur-xl shadow-lg shadow-black/20">
          <div className="border-b border-white/5 px-4 py-3 lg:px-6">
            <TopBar commandPaletteRef={commandPaletteRef} />
          </div>
          <div className="p-4 lg:p-6 overflow-x-hidden">{children}</div>
        </main>
      </div>
      <CommandPalette 
        ref={commandPaletteRef} 
        items={paletteItems}
        transactions={transactionsData?.data || []}
        loans={loansData?.data || []}
      />
      <QuickAddWidget />
      <BottomNav />
    </div>
  );
}

function Brand() {
  return (
    <Link to="/" className="flex items-center gap-2 font-semibold text-white">
      <div className="flex h-10 w-10 items-center justify-center rounded-2xl overflow-hidden bg-white/5 shadow-lg shadow-primary/40">
        <img 
          src="/pwa-192x192.png" 
          alt="SOFTPRO Finance" 
          className="h-full w-full object-contain p-1"
          onError={(e) => {
            // Fallback if image fails to load
            console.error('Logo image failed to load');
          }}
        />
      </div>
      <div className="leading-tight">
        <div className="text-lg">SOFTPRO</div>
        <div className="text-xs text-slate-300">Finance Suite</div>
      </div>
    </Link>
  );
}

function NavList() {
  const { pathname } = useLocation();

  return (
    <nav className="flex flex-col gap-2">
      {NAV_ITEMS.map((item) => {
        if (item.children) {
          const childActive = item.children.some((c) => pathname === c.to);
          return (
            <div key={item.label} className="flex flex-col gap-1">
              <div
                className={cn(
                  "flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground",
                  childActive && "text-foreground"
                )}
              >
                <item.icon className="h-4 w-4 shrink-0" />
                {item.label}
              </div>
              <div className="ml-2 flex flex-col gap-0.5 border-l border-border pl-3">
                {item.children.map((sub) => (
                  <NavLink
                    key={sub.to}
                    to={sub.to}
                    className={({ isActive }) =>
                      cn(
                        "rounded-lg px-3 py-1.5 text-sm font-medium transition",
                        "hover:bg-accent hover:text-accent-foreground",
                        isActive ? "bg-accent text-accent-foreground" : "text-muted-foreground"
                      )
                    }
                  >
                    {sub.label}
                  </NavLink>
                ))}
              </div>
            </div>
          );
        }

        return (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              cn(
                "flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium transition",
                "hover:bg-accent hover:text-accent-foreground",
                isActive ? "bg-accent text-accent-foreground" : "text-muted-foreground"
              )
            }
          >
            <item.icon className="h-4 w-4" />
            {item.label}
          </NavLink>
        );
      })}
    </nav>
  );
}

function TopBar({ commandPaletteRef }: { commandPaletteRef: React.RefObject<CommandPaletteRef> }) {
  const { theme, toggleTheme } = useTheme();
  const { user, logout } = useAuth();
  const roleLabel = user?.role === "receptionist" ? "Reception" : "Admin";

  const userInitials = user?.name
    ? user.name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "U";

  return (
    <div className="flex items-center gap-3">
      <div className="lg:hidden">
        <MobileNav />
      </div>
      <div className="hidden lg:block">
        <Brand />
      </div>
      <div className="ml-auto flex items-center gap-2">
        <Button
          variant="ghost"
          className="hidden items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 text-sm text-slate-200 hover:bg-white/10 sm:flex"
          onClick={() => {
            commandPaletteRef.current?.open();
          }}
        >
          <Search className="h-4 w-4" />
          Quick search
          <span className="ml-2 rounded-md bg-white/10 px-2 py-0.5 text-[10px] uppercase">
            ⌘K
          </span>
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="rounded-full border border-white/10 bg-white/5 text-white hover:bg-white/10"
          onClick={toggleTheme}
          aria-label="Toggle theme"
          title={`Switch to ${theme === "light" ? "dark" : "light"} mode`}
        >
          {theme === "light" ? (
            <Moon className="h-4 w-4" />
          ) : (
            <Sun className="h-4 w-4" />
          )}
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              className="relative h-10 w-10 rounded-full border border-white/10 bg-white/5 hover:bg-white/10"
            >
              <Avatar className="h-10 w-10 border-white/10 bg-white/10 text-white">
                <AvatarFallback>{userInitials}</AvatarFallback>
              </Avatar>
              <span className="absolute -bottom-2 left-1/2 -translate-x-1/2 rounded-full border border-white/10 bg-slate-950/90 px-2 py-0.5 text-[10px] font-semibold text-slate-200 shadow">
                {roleLabel}
              </span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56" align="end" forceMount>
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium leading-none">{user?.name}</p>
                <p className="text-xs leading-none text-muted-foreground">{user?.email}</p>
                <p className="text-xs leading-none text-slate-400">{roleLabel}</p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link to="/settings" className="cursor-pointer">
                <User className="mr-2 h-4 w-4" />
                <span>Settings</span>
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="cursor-pointer text-red-600 focus:text-red-600" onClick={logout}>
              <LogOut className="mr-2 h-4 w-4" />
              <span>Log out</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}

function MobileNav() {
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button
          size="icon"
          variant="ghost"
          className="rounded-full border border-white/10 bg-white/5 text-white hover:bg-white/10"
        >
          <Menu className="h-5 w-5" />
        </Button>
      </SheetTrigger>
      <SheetContent className="w-72 border-white/10 bg-slate-950/95 text-white">
        <div className="mb-4">
          <Brand />
        </div>
        <NavList />
      </SheetContent>
    </Sheet>
  );
}

function BottomNav() {
  return (
    <div className="fixed inset-x-0 bottom-0 z-50 border-t border-white/10 bg-slate-950/90 backdrop-blur supports-[backdrop-filter]:bg-slate-950/70 lg:hidden">
      <nav className="mx-auto flex max-w-3xl items-center justify-around px-3 py-3 text-xs text-slate-200">
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.label}
            to={item.to}
            end={!item.children}
            className={({ isActive }) =>
              cn(
                "flex flex-col items-center gap-1 rounded-xl px-2 py-1 transition",
                isActive ? "text-foreground" : "text-muted-foreground hover:text-foreground"
              )
            }
          >
            <item.icon className="h-5 w-5" />
            <span className="text-[11px]">{item.label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  );
}

