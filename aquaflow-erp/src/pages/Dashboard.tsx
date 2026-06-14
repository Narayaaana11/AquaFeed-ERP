import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AppLayout } from "@/components/layout/AppLayout";
import { StatCard } from "@/components/ui/stat-card";
import { StatusBadge } from "@/components/StatusBadge";
import {
  ShoppingCart, Package, AlertTriangle, Users, TrendingUp,
  DollarSign, Calendar, RefreshCw
} from "lucide-react";
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, PieChart, Pie, Cell,
} from "recharts";
import { useState, useEffect } from "react";
import { useDashboard, useSalesTrend, useTopProducts, useInventoryValue } from "@/hooks/useReports";
import { useLoadDemoData } from "@/hooks/useSettings";
import { useWebSocketContext } from "@/hooks/useWebSocketContext";
import { AppLogo } from "@/components/AppLogo";

const COLORS = ["#14b8a6", "#0d9488", "#0f766e", "#115e59", "#134e4a"];
const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export default function Dashboard() {
  const [dateRange, setDateRange] = useState("month");
  const [realTimeData, setRealTimeData] = useState<any>(null);
  const [lowStockAlerts, setLowStockAlerts] = useState<any[]>([]);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  const { data: dashData, isLoading: dashLoading, refetch } = useDashboard(dateRange);
  const { data: trendData } = useSalesTrend("year");
  const { data: topProductsData } = useTopProducts(5);
  const { data: inventoryData } = useInventoryValue();
  const loadDemoMutation = useLoadDemoData();

  // WebSocket integration
  const { isConnected, subscribe, on, off } = useWebSocketContext();

  // Subscribe to dashboard and inventory updates when WebSocket connects
  useEffect(() => {
    if (isConnected) {
      // Subscribe to multiple channels
      subscribe('dashboard');
      subscribe('sales');
      subscribe('products');
      subscribe('inventory');

      // Listen for real-time dashboard updates
      const handleDashboardUpdate = (data: any) => {
        console.log('📊 Real-time dashboard update:', data);
        if (data && data.kpis) {
          setRealTimeData(data);
          setLastUpdate(new Date());
        } else {
          // Refetch KPI stats on update notifications to get fresh db values
          console.log('🔄 Refetching dashboard due to update event');
          refetch();
          setLastUpdate(new Date());
        }
      };

      // Listen for low stock alerts
      const handleLowStockAlert = (data: any) => {
        console.log('⚠️ Low stock alert:', data);
        setLowStockAlerts(data.products || []);
      };

      // Listen for invoice creation (refresh dashboard)
      const handleInvoiceCreated = (invoice: any) => {
        console.log('📄 New invoice:', invoice);
        setLastUpdate(new Date());
        refetch();
      };

      // Listen for product updates
      const handleProductUpdate = () => {
        console.log('🔄 Product updated');
        refetch();
      };

      on('dashboard_update', handleDashboardUpdate);
      on('low_stock_alert', handleLowStockAlert);
      on('invoice_created', handleInvoiceCreated);
      on('product_update', handleProductUpdate);
      on('product_created', handleProductUpdate);

      return () => {
        off('dashboard_update');
        off('low_stock_alert');
        off('invoice_created');
        off('product_update');
        off('product_created');
      };
    }
  }, [isConnected, subscribe, on, off, refetch]);
  const today = new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" });

  // Merge real-time socket data with fallback API query data
  const dashboardSource = realTimeData || dashData;
  const kpis = dashboardSource?.kpis;
  const recentSales = dashboardSource?.recentSales || [];

  const salesTrend = (trendData || []).map((item: any) => ({
    month: item._id.month ? monthNames[item._id.month - 1] : '',
    sales: item.sales,
    expenses: item.expenses
  }));

  const inventoryValue = inventoryData?.breakdown || [];
  const topProducts = topProductsData || [];

  const isEmptyWorkspace = !dashLoading && (kpis?.products?.value === 0 || !kpis?.products?.value);

  return (
    <AppLayout title="Dashboard" subtitle={today}>
      {/* WebSocket Connection Status */}
      <div className="mb-4 flex items-center justify-between px-4 py-2 rounded-lg bg-surface border border-border text-xs">
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
          <span className="text-muted-foreground">
            {isConnected ? '✅ Live Updates Connected' : '⚠️ Live Updates Disconnected'}
          </span>
          {lastUpdate && (
            <span className="text-muted-foreground text-xs">
              • Last update: {lastUpdate.toLocaleTimeString('en-IN')}
            </span>
          )}
        </div>
      </div>

      {/* Low Stock Alerts */}
      {lowStockAlerts.length > 0 && (
        <div className="mb-4 bg-warning/10 border border-warning/30 rounded-xl p-4">
          <p className="text-sm font-semibold text-warning mb-3">⚠️ Low Stock Alert ({lowStockAlerts.length} items)</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {lowStockAlerts.slice(0, 4).map((product: any) => (
              <div key={product._id} className="text-xs text-warning/80 bg-warning/5 rounded p-2">
                {product.name}: {product.stock} units (threshold: {product.lowStockThreshold})
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Welcome & Demo Seeding Banner */}
      {isEmptyWorkspace && (
        <div className="bg-brand/10 border border-brand/20 rounded-xl p-5 mb-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex gap-3">
            <div className="rounded-lg bg-white px-2 py-1.5 shrink-0 border border-brand/10">
              <AppLogo size="xs" />
            </div>
            <div>
              <h3 className="font-display font-bold text-foreground text-sm">Welcome to AquaFeed ERP!</h3>
              <p className="text-xs text-muted-foreground mt-0.5 max-w-xl">
                Get started by adding products and customers, or populate your workspace with sample demo data (invoices, expenses, stock records) to see how the reports and analytics look in production.
              </p>
            </div>
          </div>
          <button
            onClick={() => loadDemoMutation.mutate()}
            disabled={loadDemoMutation.isPending}
            className="h-9 px-4 rounded-lg bg-brand text-white text-xs font-display font-semibold hover:bg-brand/90 disabled:opacity-50 transition-colors flex items-center justify-center gap-2 shrink-0 shadow-sm"
          >
            {loadDemoMutation.isPending ? (
              <>
                <div className="w-3.5 h-3.5 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                <span>Loading Demo...</span>
              </>
            ) : (
              "Load Demo Data"
            )}
          </button>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="flex items-center gap-2 h-9 px-3 rounded-lg border border-border bg-surface text-sm text-foreground">
          <Calendar className="w-4 h-4 text-muted-foreground shrink-0" />
          
      <Select value={String(dateRange)} onValueChange={(val) => setDateRange(val)}>
        <SelectTrigger className="flex-1 bg-transparent outline-none text-sm">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          
            <SelectItem value={"week".toString()}>This Week</SelectItem>
            <SelectItem value={"month".toString()}>This Month</SelectItem>
            <SelectItem value={"quarter".toString()}>This Quarter</SelectItem>
            <SelectItem value={"year".toString()}>This Year</SelectItem>
          
        </SelectContent>
      </Select>
    
        </div>
        <button
          onClick={() => refetch()}
          className="flex items-center gap-2 h-9 px-3 rounded-lg border border-border bg-surface text-sm text-foreground hover:bg-secondary transition-colors"
        >
          <RefreshCw className="w-4 h-4 text-muted-foreground" />
          Refresh
        </button>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 md:gap-4 mb-6">
        <StatCard
          title="Period Sales"
          value={dashLoading ? "..." : `₹${(kpis?.sales?.value || 0).toLocaleString("en-IN")}`}
          change={`${kpis?.sales?.change >= 0 ? "+" : ""}${kpis?.sales?.change || 0}% vs previous`}
          changeType={kpis?.sales?.change >= 0 ? "positive" : "negative"}
          icon={ShoppingCart}
        />
        <StatCard
          title="Total Products"
          value={dashLoading ? "..." : String(kpis?.products?.value || 0)}
          change="Active products"
          changeType="neutral"
          icon={Package}
        />
        <StatCard
          title="Low Stock Items"
          value={dashLoading ? "..." : String(kpis?.lowStock?.value || 0)}
          change="Requires reorder"
          changeType={kpis?.lowStock?.value > 0 ? "negative" : "positive"}
          icon={AlertTriangle}
          iconColor="bg-warning/10 text-warning"
        />
        <StatCard
          title="Total Customers"
          value={dashLoading ? "..." : String(kpis?.customers?.value || 0)}
          change={`${kpis?.overdue?.value || 0} overdue`}
          changeType={kpis?.overdue?.value > 0 ? "negative" : "positive"}
          icon={Users}
        />
      </div>

      {/* Charts grid */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-3 md:gap-4 mb-4">
        {/* Sales trend */}
        <div className="xl:col-span-2 bg-surface rounded-xl border border-border shadow-card p-4 md:p-5">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4">
            <div>
              <p className="text-xs font-display font-semibold uppercase tracking-wide text-muted-foreground">Sales Trend</p>
              <p className="font-display text-xl font-bold text-foreground mt-0.5">
                ₹{(kpis?.sales?.value || 0).toLocaleString("en-IN")} this {dateRange}
              </p>
            </div>
            {kpis?.sales?.change !== undefined && (
              <div className={`flex items-center gap-1.5 text-sm font-medium mt-2 sm:mt-0 ${kpis.sales.change >= 0 ? "text-success" : "text-destructive"}`}>
                <TrendingUp className="w-4 h-4" />
                {kpis.sales.change >= 0 ? "+" : ""}{kpis.sales.change}%
              </div>
            )}
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={salesTrend.length > 0 ? salesTrend : [{ month: "No data", sales: 0 }]}>
              <defs>
                <linearGradient id="gradSales" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#14b8a6" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#14b8a6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(214 32% 91%)" />
              <XAxis dataKey="month" tick={{ fontSize: 11, fontFamily: "var(--font-body)", fill: "#64748b" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fontFamily: "var(--font-body)", fill: "#64748b" }} axisLine={false} tickLine={false} tickFormatter={(v) => `₹${v / 1000}k`} />
              <Tooltip formatter={(v: number) => [`₹${v.toLocaleString("en-IN")}`, "Sales"]} contentStyle={{ border: "1px solid hsl(214 32% 91%)", borderRadius: 8, fontSize: 12 }} />
              <Area type="monotone" dataKey="sales" stroke="#14b8a6" strokeWidth={2} fill="url(#gradSales)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Inventory breakdown */}
        <div className="bg-surface rounded-xl border border-border shadow-card p-4 md:p-5">
          <p className="text-xs font-display font-semibold uppercase tracking-wide text-muted-foreground">Inventory Value</p>
          <p className="font-display text-xl font-bold text-foreground mt-0.5 mb-4">By Category</p>
          <ResponsiveContainer width="100%" height={150}>
            <PieChart>
              <Pie
                data={inventoryValue.length > 0 ? inventoryValue : [{ name: "No data", value: 1 }]}
                cx="50%" cy="50%" innerRadius={45} outerRadius={68} paddingAngle={3} dataKey="value"
              >
                {inventoryValue.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(value: number) => [`₹${value.toLocaleString("en-IN")}`, "Value"]} contentStyle={{ border: "1px solid hsl(214 32% 91%)", borderRadius: 8, fontSize: 12 }} />
            </PieChart>
          </ResponsiveContainer>
          <ul className="mt-3 space-y-1">
            {inventoryValue.map((item: any, i: number) => (
              <li key={item.name} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ background: COLORS[i % COLORS.length] }} />
                  <span className="text-foreground font-medium">{item.name}</span>
                </div>
                <span className="text-muted-foreground">{item.percentage}%</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-3 md:gap-4">
        {/* Top Products */}
        <div className="bg-surface rounded-xl border border-border shadow-card p-4 md:p-5">
          <p className="text-xs font-display font-semibold uppercase tracking-wide text-muted-foreground mb-4">
            Top Selling Products
          </p>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={topProducts.length > 0 ? topProducts : [{ name: "No data", qty: 0 }]} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="hsl(214 32% 91%)" />
              <XAxis type="number" tick={{ fontSize: 10, fontFamily: "var(--font-body)", fill: "#64748b" }} axisLine={false} tickLine={false} />
              <YAxis dataKey="name" type="category" tick={{ fontSize: 10, fontFamily: "var(--font-body)", fill: "#64748b" }} axisLine={false} tickLine={false} width={120} />
              <Tooltip formatter={(value: number) => [`${value.toLocaleString("en-IN")} units`, "Quantity"]} contentStyle={{ border: "1px solid hsl(214 32% 91%)", borderRadius: 8, fontSize: 12 }} />
              <Bar dataKey="qty" fill="#14b8a6" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Recent Sales */}
        <div className="xl:col-span-2 bg-surface rounded-xl border border-border shadow-card p-4 md:p-5">
          <div className="flex items-center justify-between mb-4">
            <p className="text-xs font-display font-semibold uppercase tracking-wide text-muted-foreground">Recent Sales</p>
          </div>
          <div className="space-y-0">
            {recentSales.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">No sales yet</p>
            ) : (
              recentSales.map((s: any) => (
                <div key={s._id} className="flex items-center gap-3 py-3 border-b border-border last:border-0">
                  <div className="w-8 h-8 rounded-lg bg-brand-light flex items-center justify-center shrink-0">
                    <DollarSign className="w-4 h-4 text-brand" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{s.customerName}</p>
                    <p className="text-xs text-muted-foreground">
                      {s.invoiceNumber} · {new Date(s.createdAt).toLocaleDateString("en-IN")}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-display font-semibold text-foreground">
                      ₹{(s.total || 0).toLocaleString("en-IN")}
                    </p>
                    <StatusBadge status={s.status} variant="payment" className="mt-0.5" />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
