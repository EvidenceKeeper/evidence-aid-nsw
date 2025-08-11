import { NavLink, Outlet } from "react-router-dom";
import { Files, MessageCircleQuestion, CalendarClock, FileText, Search, LifeBuoy, Settings, LayoutDashboard } from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  { to: "/evidence", label: "Evidence", icon: Files },
  { to: "/timeline", label: "Timeline", icon: CalendarClock },
  { to: "/forms", label: "Forms", icon: FileText },
  { to: "/assistant", label: "Legal Assistant", icon: MessageCircleQuestion },
  { to: "/search", label: "Search", icon: Search },
  { to: "/find-help", label: "Find Help", icon: LifeBuoy },
  { to: "/settings", label: "Settings", icon: Settings },
];

export default function AppLayout() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="grid grid-cols-1 md:grid-cols-[260px_1fr]">
        <aside className="border-r bg-card/60 backdrop-blur supports-[backdrop-filter]:bg-card/60">
          <div className="h-16 flex items-center px-4 border-b">
            <div className="font-semibold tracking-tight">NSW Evidence</div>
          </div>
          <nav className="p-2 space-y-1">
            {navItems.map(({ to, label, icon: Icon }) => (
              <NavLink
                key={to}
                to={to}
                end={to === "/"}
                className={({ isActive }) =>
                  cn(
                    "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
                    isActive
                      ? "bg-primary/10 text-primary"
                      : "hover:bg-accent hover:text-accent-foreground"
                  )
                }
              >
                <Icon className="size-4" />
                <span>{label}</span>
              </NavLink>
            ))}
          </nav>
        </aside>
        <main className="min-h-screen">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
