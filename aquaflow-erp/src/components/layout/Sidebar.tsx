import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  Package,
  Layers,
  ShoppingCart,
  Users,
  Receipt,
  Warehouse,
  BarChart2,
  Settings,
  LogOut,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

const navItems = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  { to: "/products", label: "Products", icon: Package },
  { to: "/inventory", label: "Inventory", icon: Layers },
  { to: "/sales", label: "Sales", icon: ShoppingCart },
  { to: "/customers", label: "Customers", icon: Users },
  { to: "/expenses", label: "Expenses", icon: Receipt },
  { to: "/warehouses", label: "Warehouses", icon: Warehouse },
  { to: "/reports", label: "Reports", icon: BarChart2 },
  { to: "/settings", label: "Settings", icon: Settings },
];

export function Sidebar() {
  const { user, logout } = useAuth();

  const getInitials = (name?: string) => {
    if (!name) return "US";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .substring(0, 2)
      .toUpperCase();
  };

  return (
    <aside className="hidden sm:flex sm:flex-col fixed left-0 top-0 h-screen w-60 bg-sidebar border-r border-sidebar-border z-30">
      {/* Logo */}
      <div className="flex items-center gap-3 px-5 h-16 border-b border-sidebar-border shrink-0">
        <img
          src="/favicon.png"
          alt="AquaFeed ERP"
          className="w-8 h-8 rounded-lg object-cover"
        />
        <span className="font-display font-800 text-base text-black tracking-tight">
          <b>AquaFeed ERP</b>
        </span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4 px-3">
        <ul className="space-y-0.5">
          {navItems.map(({ to, label, icon: Icon }) => (
            <li key={to}>
              <NavLink
                to={to}
                end={to === "/"}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-display font-medium transition-colors ${isActive
                    ? "bg-brand text-white"
                    : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                  }`
                }
              >
                <Icon className="w-4 h-4 shrink-0" />
                {label}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      {/* User Footer */}
      <div className="px-3 pb-4 border-t border-sidebar-border pt-3 shrink-0">
        <div className="flex items-center gap-3 px-3 py-2.5 rounded-md bg-sidebar-accent/30">
          <div className="w-7 h-7 rounded-full bg-brand flex items-center justify-center text-white text-xs font-display font-bold shrink-0">
            {getInitials(user?.name)}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-display font-semibold text-white truncate">
              {user?.company?.name || "My Company"}
            </p>
            <p className="text-xs text-sidebar-foreground/80 truncate">
              {user?.name || "User"} · <span className="text-[10px] uppercase font-bold text-brand-light">{user?.role || "Staff"}</span>
            </p>
          </div>
        </div>
        <button
          onClick={logout}
          className="w-full flex items-center gap-3 px-3 py-2 mt-1 rounded-md text-sm text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors font-display font-medium"
        >
          <LogOut className="w-4 h-4" />
          Sign out
        </button>
      </div>
    </aside>
  );
}
