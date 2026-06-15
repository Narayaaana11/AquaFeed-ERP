import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  Users,
  MoreHorizontal,
  Layers,
  Receipt,
  Warehouse,
  BarChart2,
  Settings,
  X,
  Truck,
  ShoppingBag,
} from "lucide-react";
import { useState } from "react";

const primaryNav = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  { to: "/products", label: "Products", icon: Package },
  { to: "/sales", label: "Sales", icon: ShoppingCart },
  { to: "/customers", label: "Customers", icon: Users },
];

const moreNav = [
  { to: "/inventory", label: "Inventory", icon: Layers },
  { to: "/expenses", label: "Expenses", icon: Receipt },
  { to: "/warehouses", label: "Warehouses", icon: Warehouse },
  { to: "/suppliers", label: "Suppliers", icon: Truck },
  { to: "/purchase-orders", label: "Purchase Orders", icon: ShoppingBag },
  { to: "/reports", label: "Reports", icon: BarChart2 },
  { to: "/settings", label: "Settings", icon: Settings },
];

export function MobileBottomNav() {
  const [moreOpen, setMoreOpen] = useState(false);

  return (
    <>
      {/* Bottom nav bar */}
      <nav className="sm:hidden fixed bottom-0 left-0 right-0 z-40 bg-surface border-t border-border safe-area-bottom">
        <div className="flex items-center">
          {primaryNav.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === "/"}
              className={({ isActive }) =>
                `flex-1 flex flex-col items-center justify-center py-2 gap-0.5 text-[10px] font-display font-semibold transition-colors ${
                  isActive ? "text-brand" : "text-muted-foreground"
                }`
              }
              onClick={() => setMoreOpen(false)}
            >
              {({ isActive }) => (
                <>
                  <div className={`w-8 h-6 flex items-center justify-center rounded-lg transition-colors ${isActive ? "bg-brand-light" : ""}`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <span>{label}</span>
                </>
              )}
            </NavLink>
          ))}

          {/* More button */}
          <button
            onClick={() => setMoreOpen((v) => !v)}
            className={`flex-1 flex flex-col items-center justify-center py-2 gap-0.5 text-[10px] font-display font-semibold transition-colors ${
              moreOpen ? "text-brand" : "text-muted-foreground"
            }`}
          >
            <div className={`w-8 h-6 flex items-center justify-center rounded-lg transition-colors ${moreOpen ? "bg-brand-light" : ""}`}>
              {moreOpen ? <X className="w-4 h-4" /> : <MoreHorizontal className="w-4 h-4" />}
            </div>
            <span>More</span>
          </button>
        </div>
      </nav>

      {/* More Drawer */}
      {moreOpen && (
        <>
          <div
            className="sm:hidden fixed inset-0 z-[35] bg-black/30 backdrop-blur-sm"
            onClick={() => setMoreOpen(false)}
          />
          <div className="sm:hidden fixed bottom-[56px] left-0 right-0 z-[36] bg-surface border-t border-border rounded-t-2xl shadow-panel animate-slide-up">
            <div className="flex items-center justify-between px-4 py-3 border-b border-border">
              <span className="font-display font-bold text-sm text-foreground">More Sections</span>
              <button onClick={() => setMoreOpen(false)} className="text-muted-foreground">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="grid grid-cols-3 gap-px p-3">
              {moreNav.map(({ to, label, icon: Icon }) => (
                <NavLink
                  key={to}
                  to={to}
                  onClick={() => setMoreOpen(false)}
                  className={({ isActive }) =>
                    `flex flex-col items-center gap-1.5 p-3 rounded-xl text-[11px] font-display font-semibold transition-colors ${
                      isActive
                        ? "bg-brand-light text-brand"
                        : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                    }`
                  }
                >
                  <Icon className="w-5 h-5" />
                  {label}
                </NavLink>
              ))}
            </div>
          </div>
        </>
      )}
    </>
  );
}
