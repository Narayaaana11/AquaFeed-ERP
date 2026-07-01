import { Bell, Search, AlertTriangle } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { useLowStockProducts } from "@/hooks/useProducts";
import { useAuth } from "@/hooks/useAuth";
import { Link } from "react-router-dom";
import { AppLogo } from "@/components/AppLogo";
import { useQuery } from "@tanstack/react-query";
import { useCompany } from "@/context/CompanyContext";
import api from "@/lib/api";
interface TopNavbarProps {
  title: string;
  subtitle?: string;
}

export function TopNavbar({ title, subtitle }: TopNavbarProps) {
  const { user } = useAuth();
  const { data: lowStockItems, isLoading } = useLowStockProducts();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { activeCompanyId, setActiveCompanyId, companies, setCompanies } = useCompany();

  // Fetch companies for the filter dropdown
  useQuery({
    queryKey: ["companies"],
    queryFn: async () => {
      const res = await api.get("/settings/companies");
      if (res.data?.success && res.data.data) {
        setCompanies(res.data.data);
        // If no active company is set, default to the first one (order 1)
        if (!activeCompanyId && res.data.data.length > 0) {
          setActiveCompanyId(res.data.data[0]._id);
        }
      }
      return res.data;
    },
    enabled: !!user,
  });

  const getInitials = (name?: string) => {
    if (!name) return "US";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .substring(0, 2)
      .toUpperCase();
  };

  const activeAlerts = lowStockItems || [];
  const alertCount = activeAlerts.length;

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <header className="fixed top-0 left-0 sm:left-60 right-0 h-14 sm:h-16 bg-surface border-b border-border flex items-center px-4 sm:px-6 gap-3 sm:gap-4 z-20">
      {/* Left spacer */}
      <div className="flex-1 min-w-0"></div>

      {/* Center: App logo and company name */}
      <div className="flex items-center gap-2">
        <AppLogo size="sm" />
        <span className="font-display font-bold text-base text-foreground">
          {user?.company?.name || "AquaFeed ERP"}
        </span>
      </div>

      {/* Right spacer */}
      <div className="flex-1 min-w-0"></div>

      {/* Search placeholder */}
      <div className="hidden md:flex items-center gap-2 w-64 h-9 px-3 rounded-lg border border-border bg-background text-sm text-muted-foreground">
        <Search className="w-3.5 h-3.5 shrink-0" />
        <span>Search…</span>
      </div>

      {/* Global Company Filter Dropdown */}
      {companies.length > 0 && (
        <div className="hidden sm:block mr-2">
          <select
            value={activeCompanyId || "all"}
            onChange={(e) => setActiveCompanyId(e.target.value)}
            className="h-9 px-3 py-1 rounded-lg border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-brand"
            title="Filter data by company"
          >
            <option value="all">All Companies</option>
            {companies.map((c) => {
              let periodStr = "";
              if (c.startingFrom && c.booksFrom) {
                const sDate = new Date(c.startingFrom).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: '2-digit' }).replace(/ /g, '-');
                const bDate = new Date(c.booksFrom).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: '2-digit' }).replace(/ /g, '-');
                periodStr = ` (${sDate} to ${bDate})`;
              }
              return (
                <option key={c._id} value={c._id}>
                  {c.name}{periodStr}
                </option>
              );
            })}
          </select>
        </div>
      )}

      {/* Actions (Notifications) */}
      <div className="relative" ref={dropdownRef}>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="relative w-9 h-9 flex items-center justify-center rounded-lg hover:bg-secondary transition-colors"
        >
          <Bell className="w-4 h-4 text-muted-foreground" />
          {alertCount > 0 && (
            <span className="absolute top-1.5 right-1.5 min-w-4 h-4 px-1 flex items-center justify-center bg-brand text-white text-[9px] font-bold rounded-full border border-surface">
              {alertCount}
            </span>
          )}
        </button>

        {isOpen && (
          <div className="absolute right-0 mt-2 w-80 bg-surface rounded-xl border border-border shadow-panel z-50 overflow-hidden">
            <div className="px-4 py-3 border-b border-border flex justify-between items-center bg-background">
              <span className="font-display font-semibold text-sm text-foreground">Notifications</span>
              {alertCount > 0 && (
                <span className="text-[10px] font-bold bg-brand/10 text-brand px-2 py-0.5 rounded-full">
                  {alertCount} Alerts
                </span>
              )}
            </div>
            <div className="max-h-64 overflow-y-auto">
              {isLoading ? (
                <div className="p-4 text-center text-xs text-muted-foreground">
                  Loading alerts...
                </div>
              ) : alertCount === 0 ? (
                <div className="p-6 text-center text-xs text-muted-foreground">
                  No notifications. All items are well stocked!
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {activeAlerts.map((item) => (
                    <Link
                      key={item._id}
                      to="/inventory"
                      onClick={() => setIsOpen(false)}
                      className="p-4 flex gap-3 hover:bg-secondary/40 transition-colors block"
                    >
                      <div className="w-8 h-8 rounded-full bg-warning/10 flex items-center justify-center text-warning shrink-0">
                        <AlertTriangle className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-foreground truncate">
                          Low Stock: {item.name}
                        </p>
                        <p className="text-[10px] text-muted-foreground mt-0.5">
                          Currently {item.stock} bags remaining. Min threshold: {item.lowStockThreshold}.
                        </p>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
            <div className="px-4 py-2 border-t border-border text-center bg-background">
              <Link
                to="/inventory"
                onClick={() => setIsOpen(false)}
                className="text-[11px] font-display font-semibold text-brand hover:text-brand/80"
              >
                Manage Stock levels
              </Link>
            </div>
          </div>
        )}
      </div>

      {/* Avatar */}
      <div className="w-8 h-8 rounded-full bg-brand flex items-center justify-center text-white text-xs font-display font-bold cursor-default shadow-sm select-none">
        {getInitials(user?.name)}
      </div>
    </header>
  );
}
