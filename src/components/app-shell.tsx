import { Link, useLocation, useNavigate } from "@tanstack/react-router";
import {
  LayoutDashboard,
  Clock,
  CalendarDays,
  Home,
  User as UserIcon,
  MessageSquare,
  Users,
  CheckSquare,
  LogOut,
  Building2,
  Menu,
} from "lucide-react";
import { useState, type ReactNode } from "react";
import { useStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet";

const employeeNav = [
  { to: "/app/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/app/attendance", label: "Attendance", icon: Clock },
  { to: "/app/leave", label: "Leave", icon: CalendarDays },
  { to: "/app/holidays", label: "Holidays", icon: CalendarDays },
  { to: "/app/wfh", label: "Work from Home", icon: Home },
  { to: "/app/chat", label: "Team Chat", icon: MessageSquare },
  { to: "/app/profile", label: "Profile", icon: UserIcon },
];

const adminNav = [
  { to: "/app/admin", label: "Overview", icon: LayoutDashboard },
  { to: "/app/admin/employees", label: "Employees", icon: Users },
  { to: "/app/admin/attendance", label: "Attendance", icon: Clock },
  { to: "/app/admin/holidays", label: "Holidays", icon: CalendarDays },
  { to: "/app/admin/approvals", label: "Approvals", icon: CheckSquare },
  { to: "/app/chat", label: "Team Chat", icon: MessageSquare },
  { to: "/app/profile", label: "Profile", icon: UserIcon },
];

export function AppShell({ children }: { children: ReactNode }) {
  const { currentUser, logout, state } = useStore();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const nav = currentUser?.role === "admin" ? adminNav : employeeNav;

  const unreadMessagesCount = state.messages.filter(
    (m) => currentUser && !m.readBy?.includes(currentUser.id)
  ).length;

  const initials = currentUser?.name
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <div className="flex min-h-screen w-full bg-background">
      <aside className="hidden md:flex w-64 flex-col border-r border-border bg-sidebar">
        <div className="flex items-center gap-2 px-5 h-16 border-b border-sidebar-border">
          <div className="h-8 w-8 rounded-md bg-gradient-to-br from-blue-500 to-blue-700 shadow-sm shadow-blue-700/20 flex items-center justify-center">
            <Building2 className="h-4 w-4 text-primary-foreground" />
          </div>
          <div className="flex flex-col leading-tight">
            <span className="text-sm font-semibold tracking-tight text-sidebar-foreground">
              Gemshine
            </span>
            <span className="text-[11px] text-muted-foreground">Infotech Portal</span>
          </div>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-0.5">
          {nav.map((item) => {
            const Icon = item.icon;
            const active =
              location.pathname === item.to ||
              (item.to !== "/app/admin" &&
                item.to !== "/app/dashboard" &&
                location.pathname.startsWith(item.to));
            return (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  "flex items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium transition-colors relative",
                  active
                    ? "bg-blue-50 text-blue-700 dark:bg-blue-100 dark:text-blue-800"
                    : "text-sidebar-foreground/80 hover:bg-blue-50/60 hover:text-blue-700 dark:hover:bg-blue-100/40",
                )}
              >
                {active && (
                  <span className="absolute left-0 top-1.5 bottom-1.5 w-0.5 rounded-full bg-blue-600" />
                )}
                <div className="relative flex items-center justify-center">
                  <Icon className="h-4 w-4" />
                  {item.to === "/app/chat" && unreadMessagesCount > 0 && (
                    <span className="absolute -top-1 -right-1 flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                    </span>
                  )}
                </div>
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-sidebar-border p-3">
          <div className="flex items-center gap-2.5 rounded-md px-2 py-2">
            <Avatar className="h-8 w-8">
              {currentUser?.avatarUrl && <AvatarImage src={currentUser.avatarUrl} />}
              <AvatarFallback className="text-xs bg-primary-soft text-accent-foreground">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-medium truncate">{currentUser?.name}</div>
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                {currentUser?.role}
              </div>
            </div>
            <Button
              size="icon"
              variant="ghost"
              className="h-7 w-7"
              onClick={() => {
                logout();
                navigate({ to: "/login" });
              }}
            >
              <LogOut className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="md:hidden h-14 border-b border-border flex items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="-ml-2 shrink-0">
                  <Menu className="h-5 w-5" />
                  <span className="sr-only">Toggle menu</span>
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-64 p-0 flex flex-col">
                <SheetTitle className="sr-only">Navigation Menu</SheetTitle>
                <div className="flex items-center gap-2 px-5 h-14 border-b border-border">
                  <div className="h-7 w-7 rounded-md bg-gradient-to-br from-blue-500 to-blue-700 shadow-sm shadow-blue-700/20 flex items-center justify-center">
                    <Building2 className="h-3.5 w-3.5 text-primary-foreground" />
                  </div>
                  <span className="text-sm font-semibold tracking-tight">Gemshine</span>
                </div>
                
                <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
                  {nav.map((item) => {
                    const Icon = item.icon;
                    const active =
                      location.pathname === item.to ||
                      (item.to !== "/app/admin" &&
                        item.to !== "/app/dashboard" &&
                        location.pathname.startsWith(item.to));
                    return (
                      <Link
                        key={item.to}
                        to={item.to}
                        onClick={() => setMobileMenuOpen(false)}
                        className={cn(
                          "flex items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium transition-colors relative",
                          active
                            ? "bg-blue-50 text-blue-700 dark:bg-blue-100 dark:text-blue-800"
                            : "text-foreground/80 hover:bg-blue-50/60 hover:text-blue-700 dark:hover:bg-blue-100/40",
                        )}
                      >
                        {active && (
                          <span className="absolute left-0 top-1.5 bottom-1.5 w-0.5 rounded-full bg-blue-600" />
                        )}
                        <div className="relative flex items-center justify-center">
                          <Icon className="h-4 w-4" />
                          {item.to === "/app/chat" && unreadMessagesCount > 0 && (
                            <span className="absolute -top-1 -right-1 flex h-2 w-2">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                              <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                            </span>
                          )}
                        </div>
                        {item.label}
                      </Link>
                    );
                  })}
                </nav>

                <div className="border-t border-border p-3">
                  <div className="flex items-center gap-2.5 rounded-md px-2 py-2">
                    <Avatar className="h-8 w-8">
                      {currentUser?.avatarUrl && <AvatarImage src={currentUser.avatarUrl} />}
                      <AvatarFallback className="text-xs bg-primary-soft text-accent-foreground">
                        {initials}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-medium truncate">{currentUser?.name}</div>
                      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                        {currentUser?.role}
                      </div>
                    </div>
                  </div>
                </div>
              </SheetContent>
            </Sheet>

            <div className="h-7 w-7 rounded-md bg-primary flex items-center justify-center ml-2">
              <Building2 className="h-3.5 w-3.5 text-primary-foreground" />
            </div>
            <span className="text-sm font-semibold">Gemshine</span>
          </div>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              logout();
              navigate({ to: "/login" });
            }}
          >
            <LogOut className="h-4 w-4" />
          </Button>
        </header>

        <main className="flex-1 overflow-auto">{children}</main>
      </div>
    </div>
  );
}

export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 mb-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        {description && <p className="text-sm text-muted-foreground mt-1">{description}</p>}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}
