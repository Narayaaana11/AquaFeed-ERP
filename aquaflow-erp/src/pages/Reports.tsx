import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/ui/page-header";
import { useState } from "react";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import { Download } from "lucide-react";
import {
  useSalesTrend,
  useTopProducts,
  useExpenseBreakdown,
  useCustomerOutstanding,
  exportCSV,
} from "@/hooks/useReports";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DataTable } from "@/components/ui/data-table";
import { usePaymentHistory } from "@/hooks/useSales";
import { Search } from "lucide-react";

const COLORS = ["#14b8a6", "#0d9488", "#0f766e", "#115e59", "#134e4a"];
const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export default function Reports() {
  const [dateRange, setDateRange] = useState("6months");

  // Fetch real data from hooks
  const { data: trendData, isLoading: isTrendLoading } = useSalesTrend(dateRange);
  const { data: topProductsData, isLoading: isTopProductsLoading } = useTopProducts(5);
  const { data: expenseData, isLoading: isExpenseLoading } = useExpenseBreakdown();
  const { data: creditDataRaw, isLoading: isCreditLoading } = useCustomerOutstanding();

  const [paymentSearch, setPaymentSearch] = useState("");
  const { data: paymentData, isLoading: isPaymentLoading } = usePaymentHistory({ search: paymentSearch || undefined });
  const paymentHistory = paymentData?.data || [];

  // Format sales trend for charts
  const monthlySalesData = (trendData || []).map((item: any) => {
    const monthName = item._id.day 
      ? `${item._id.day} ${monthNames[(item._id.month || 1) - 1]}`
      : monthNames[(item._id.month || 1) - 1];
    return {
      month: monthName,
      sales: item.sales || 0,
      expenses: item.expenses || 0,
      gstAmount: item.gstAmount || 0,
      cgstAmount: item.cgstAmount || 0,
      sgstAmount: item.sgstAmount || 0,
      igstAmount: item.igstAmount || 0,
    };
  });

  const totalGst = monthlySalesData.reduce((sum, m) => sum + m.gstAmount, 0);
  const totalCgst = monthlySalesData.reduce((sum, m) => sum + m.cgstAmount, 0);
  const totalSgst = monthlySalesData.reduce((sum, m) => sum + m.sgstAmount, 0);
  const totalIgst = monthlySalesData.reduce((sum, m) => sum + m.igstAmount, 0);

  // If no trend data, provide empty default list
  const totalSales = monthlySalesData.reduce((sum, m) => sum + m.sales, 0);
  const totalExpenses = monthlySalesData.reduce((sum, m) => sum + m.expenses, 0);
  const netProfit = totalSales - totalExpenses;

  // Format Top Products
  const topProducts = (topProductsData || []).map((p: any) => ({
    name: p.name,
    revenue: p.revenue || 0,
  }));

  // Format Expense Breakdown
  const totalExpenseVal = (expenseData || []).reduce((sum: number, e: any) => sum + (e.value || 0), 0);
  const expenseBreakdownData = (expenseData || []).map((e: any) => ({
    name: e.name || "Other",
    value: totalExpenseVal > 0 ? Math.round((e.value / totalExpenseVal) * 100) : 0,
    amount: e.value || 0,
  }));

  // Format Credit Data
  const creditData = (creditDataRaw || []).map((c: any) => ({
    customer: c.name,
    outstanding: c.outstandingBalance || 0,
  }));
  const totalOutstanding = creditData.reduce((sum, c) => sum + c.outstanding, 0);

  // Generate range label for stats header
  const getRangeLabel = () => {
    switch (dateRange) {
      case "3months": return "Last 3 Months";
      case "6months": return "Last 6 Months";
      case "12months": return "Last 12 Months";
      default: return "This Year";
    }
  };

  const stats = [
    {
      label: `${getRangeLabel()} Revenue`,
      value: isTrendLoading ? "..." : `₹${totalSales.toLocaleString("en-IN")}`,
    },
    {
      label: `${getRangeLabel()} Expenses`,
      value: isTrendLoading ? "..." : `₹${totalExpenses.toLocaleString("en-IN")}`,
    },
    { 
      label: "Net Profit", 
      value: isTrendLoading ? "..." : `₹${netProfit.toLocaleString("en-IN")}`,
      className: netProfit < 0 ? "text-destructive" : "text-success"
    },
    {
      label: "Outstanding Credit",
      value: isCreditLoading ? "..." : `₹${totalOutstanding.toLocaleString("en-IN")}`,
    },
  ];

  const handleExportCSV = async () => {
    try {
      await exportCSV("sales");
    } catch (err) {
      console.error("Export failed", err);
    }
  };

  return (
    <AppLayout title="Reports" subtitle="Business analytics and insights">
      <PageHeader
        title="Reports & Analytics"
        description={`Report scope: ${getRangeLabel()}`}
        actions={
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-2 h-9 px-4 rounded-lg border border-border bg-surface text-sm font-display font-semibold text-foreground hover:bg-secondary transition-colors"
          >
            <Download className="w-4 h-4" /> Export CSV
          </button>
        }
      />

      <Tabs defaultValue="overview" className="w-full">
        <div className="flex items-center mb-6">
          <TabsList>
            <TabsTrigger value="overview">Overview & Analytics</TabsTrigger>
            <TabsTrigger value="payment-history">Payment History</TabsTrigger>
          </TabsList>
        </div>
        
        <TabsContent value="overview" className="mt-0">
          {/* Date Range Filter */}
      <div className="flex gap-2 mb-6">
        {[
          { value: "3months", label: "Last 3 Months" },
          { value: "6months", label: "Last 6 Months" },
          { value: "12months", label: "Last 12 Months" },
        ].map((option) => (
          <button
            key={option.value}
            onClick={() => setDateRange(option.value)}
            className={`px-3 py-1.5 rounded-lg text-xs font-display font-semibold transition-colors ${
              dateRange === option.value
                ? "bg-brand text-white"
                : "bg-secondary text-foreground hover:bg-secondary/80"
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {stats.map((c) => (
          <div
            key={c.label}
            className="bg-surface rounded-xl border border-border shadow-card p-4"
          >
            <p className="text-xs font-display font-semibold uppercase tracking-wide text-muted-foreground">
              {c.label}
            </p>
            <p className={`mt-1 font-display font-bold text-foreground text-xl ${c.className || ""}`}>
              {c.value}
            </p>
          </div>
        ))}
      </div>

      {/* Monthly Sales vs Expenses */}
      <div className="bg-surface rounded-xl border border-border shadow-card p-5 mb-4">
        <p className="font-display font-semibold text-foreground mb-4">
          Monthly Sales vs Expenses
        </p>
        {isTrendLoading ? (
          <div className="h-[280px] flex items-center justify-center">
            <div className="w-8 h-8 rounded-full border-4 border-brand/20 border-t-brand animate-spin" />
          </div>
        ) : monthlySalesData.length === 0 ? (
          <div className="h-[280px] flex items-center justify-center text-sm text-muted-foreground">
            No sales or expenses data found for this period.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={monthlySalesData}>
              <defs>
                <linearGradient id="gSales" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#14b8a6" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#14b8a6" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gExp" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#ef4444" stopOpacity={0.12} />
                  <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(214 32% 91%)" />
              <XAxis
                dataKey="month"
                tick={{
                  fontSize: 11,
                  fontFamily: "var(--font-body)",
                  fill: "#64748b",
                }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{
                  fontSize: 11,
                  fontFamily: "var(--font-body)",
                  fill: "#64748b",
                }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v) => `₹${v / 1000}k`}
              />
              <Tooltip
                formatter={(v: number, name: string) => [
                  `₹${v.toLocaleString("en-IN")}`,
                  name === "Sales" ? "Sales" : "Expenses",
                ]}
                contentStyle={{
                  border: "1px solid hsl(214 32% 91%)",
                  borderRadius: 8,
                  fontSize: 12,
                  background: "#fff",
                }}
              />
              <Legend
                iconType="circle"
                iconSize={8}
                wrapperStyle={{ fontSize: 12, fontFamily: "var(--font-body)" }}
              />
              <Area
                type="monotone"
                dataKey="sales"
                stroke="#14b8a6"
                strokeWidth={2}
                fill="url(#gSales)"
                name="Sales"
              />
              <Area
                type="monotone"
                dataKey="expenses"
                stroke="#ef4444"
                strokeWidth={2}
                fill="url(#gExp)"
                name="Expenses"
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 mb-4">
        {/* Top Products by Revenue */}
        <div className="xl:col-span-2 bg-surface rounded-xl border border-border shadow-card p-5">
          <p className="font-display font-semibold text-foreground mb-4">
            Top Products by Revenue (All Time)
          </p>
          {isTopProductsLoading ? (
            <div className="h-[240px] flex items-center justify-center">
              <div className="w-8 h-8 rounded-full border-4 border-brand/20 border-t-brand animate-spin" />
            </div>
          ) : topProducts.length === 0 ? (
            <div className="h-[240px] flex items-center justify-center text-sm text-muted-foreground">
              No product sales data found.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart
                data={topProducts}
                layout="vertical"
                margin={{ left: 120, right: 20 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  horizontal={false}
                  stroke="hsl(214 32% 91%)"
                />
                <XAxis
                  type="number"
                  tick={{
                    fontSize: 10,
                    fontFamily: "var(--font-body)",
                    fill: "#64748b",
                  }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v) => `₹${v / 1000}k`}
                />
                <YAxis
                  dataKey="name"
                  type="category"
                  tick={{
                    fontSize: 10,
                    fontFamily: "var(--font-body)",
                    fill: "#64748b",
                  }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  formatter={(v: number) => [
                    `₹${v.toLocaleString("en-IN")}`,
                    "Revenue",
                  ]}
                  contentStyle={{
                    border: "1px solid hsl(214 32% 91%)",
                    borderRadius: 8,
                    fontSize: 12,
                    background: "#fff",
                  }}
                />
                <Bar dataKey="revenue" fill="#14b8a6" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Expense Breakdown */}
        <div className="bg-surface rounded-xl border border-border shadow-card p-5">
          <p className="font-display font-semibold text-foreground mb-4">
            Expense Breakdown
          </p>
          {isExpenseLoading ? (
            <div className="h-[180px] flex items-center justify-center">
              <div className="w-8 h-8 rounded-full border-4 border-brand/20 border-t-brand animate-spin" />
            </div>
          ) : expenseBreakdownData.length === 0 ? (
            <div className="h-[180px] flex items-center justify-center text-sm text-muted-foreground">
              No approved expenses found.
            </div>
          ) : (
            <>
              <ResponsiveContainer width="100%" height={180}>
                <PieChart>
                  <Pie
                    data={expenseBreakdownData}
                    cx="50%"
                    cy="50%"
                    innerRadius={35}
                    outerRadius={60}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {expenseBreakdownData.map((_, i) => (
                      <Cell key={`cell-${i}`} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      border: "1px solid hsl(214 32% 91%)",
                      borderRadius: 8,
                      fontSize: 12,
                      background: "#fff",
                    }}
                    formatter={(v) => [`${v}%`]}
                  />
                </PieChart>
              </ResponsiveContainer>
              <ul className="mt-4 space-y-2 max-h-[140px] overflow-y-auto pr-1">
                {expenseBreakdownData.map((item, i) => (
                  <li
                    key={item.name}
                    className="flex items-center justify-between text-xs"
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className="w-2.5 h-2.5 rounded-sm shrink-0"
                        style={{ background: COLORS[i % COLORS.length] }}
                      />
                      <span className="text-foreground font-medium">
                        {item.name}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground font-semibold">
                        {item.value}%
                      </span>
                      <span className="text-muted-foreground/60 text-[10px]">
                        (₹{item.amount.toLocaleString("en-IN")})
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      </div>

      {/* Outstanding Credit Aging */}
      <div className="bg-surface rounded-xl border border-border shadow-card p-5">
        <p className="font-display font-semibold text-foreground mb-4">
          Outstanding Credit by Customer
        </p>
        {isCreditLoading ? (
          <div className="h-20 flex items-center justify-center">
            <div className="w-8 h-8 rounded-full border-4 border-brand/20 border-t-brand animate-spin" />
          </div>
        ) : creditData.length === 0 ? (
          <div className="h-20 flex items-center justify-center text-sm text-muted-foreground">
            No customer outstanding credit balance found.
          </div>
        ) : (
          <div className="space-y-4">
            {creditData.map((c) => (
              <div key={c.customer} className="flex items-center gap-4">
                <div className="w-8 h-8 rounded-full bg-destructive/10 flex items-center justify-center text-destructive font-display font-bold text-xs shrink-0">
                  {c.customer.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <span className="font-medium text-foreground text-sm">
                      {c.customer}
                    </span>
                    <span className="font-display font-semibold text-destructive">
                      ₹{c.outstanding.toLocaleString("en-IN")}
                    </span>
                  </div>
                  <div className="h-2 bg-secondary rounded-full overflow-hidden">
                    <div
                      className="h-2 bg-destructive rounded-full transition-all"
                      style={{ width: `${Math.min(100, (c.outstanding / Math.max(25000, totalOutstanding)) * 100)}%` }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* GST Summary */}
      <div className="bg-surface rounded-xl border border-border shadow-card p-5 mt-4">
        <p className="font-display font-semibold text-foreground mb-4">
          GST Summary
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="p-3 bg-secondary/50 rounded-lg border border-border">
            <p className="text-xs text-muted-foreground font-medium mb-1">Total GST</p>
            <p className="font-display font-bold text-foreground">₹{totalGst.toLocaleString("en-IN")}</p>
          </div>
          <div className="p-3 bg-secondary/50 rounded-lg border border-border">
            <p className="text-xs text-muted-foreground font-medium mb-1">Total CGST</p>
            <p className="font-display font-bold text-foreground">₹{totalCgst.toLocaleString("en-IN")}</p>
          </div>
          <div className="p-3 bg-secondary/50 rounded-lg border border-border">
            <p className="text-xs text-muted-foreground font-medium mb-1">Total SGST</p>
            <p className="font-display font-bold text-foreground">₹{totalSgst.toLocaleString("en-IN")}</p>
          </div>
          <div className="p-3 bg-secondary/50 rounded-lg border border-border">
            <p className="text-xs text-muted-foreground font-medium mb-1">Total IGST</p>
            <p className="font-display font-bold text-foreground">₹{totalIgst.toLocaleString("en-IN")}</p>
          </div>
        </div>
      </div>
        </TabsContent>
        <TabsContent value="payment-history" className="mt-0 space-y-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex items-center gap-2 h-9 px-3 rounded-lg border border-border bg-surface flex-1 max-w-sm">
              <Search className="w-3.5 h-3.5 shrink-0 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search by invoice or customer..."
                value={paymentSearch}
                onChange={(e) => setPaymentSearch(e.target.value)}
                className="flex-1 bg-transparent outline-none placeholder:text-muted-foreground text-foreground text-sm"
              />
            </div>
          </div>
          
          {isPaymentLoading ? (
            <div className="flex items-center justify-center py-20">
              <div className="w-8 h-8 rounded-full border-4 border-brand/20 border-t-brand animate-spin" />
            </div>
          ) : paymentHistory.length === 0 ? (
            <div className="bg-surface rounded-2xl border border-border p-10 flex flex-col items-center text-center">
              <p className="text-muted-foreground text-sm">No payment history found.</p>
            </div>
          ) : (
            <DataTable
              data={paymentHistory}
              columns={[
                {
                  key: "date",
                  header: "Date",
                  cell: (r) => <span className="text-sm text-foreground">{new Date(r.date).toLocaleDateString("en-IN")}</span>,
                },
                {
                  key: "invoiceNumber",
                  header: "Invoice",
                  cell: (r) => <span className="text-sm font-medium">{r.invoiceNumber}</span>,
                },
                {
                  key: "customerName",
                  header: "Customer",
                  cell: (r) => <span className="text-sm text-foreground">{r.customerName}</span>,
                },
                {
                  key: "amount",
                  header: "Amount",
                  cell: (r) => <span className="font-display font-semibold text-brand">₹{r.amount.toLocaleString("en-IN")}</span>,
                },
                {
                  key: "paymentType",
                  header: "Payment Method",
                  cell: (r) => <span className="text-sm text-foreground">{r.paymentType}</span>,
                },
                {
                  key: "referenceNumber",
                  header: "Reference",
                  cell: (r) => <span className="text-xs text-muted-foreground">{r.referenceNumber || "-"}</span>,
                },
              ]}
              mobileCard={(r) => (
                <div className="bg-surface rounded-xl border border-border shadow-sm p-4">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <p className="text-sm font-display font-semibold text-foreground">{r.invoiceNumber}</p>
                      <p className="text-xs text-muted-foreground">{r.customerName}</p>
                    </div>
                    <span className="font-display font-semibold text-brand text-sm">₹{r.amount.toLocaleString("en-IN")}</span>
                  </div>
                  <div className="flex justify-between items-center text-xs text-muted-foreground pt-2 border-t border-border/50">
                    <span>{new Date(r.date).toLocaleDateString("en-IN")} · {r.paymentType}</span>
                    <span>{r.referenceNumber ? `Ref: ${r.referenceNumber}` : ''}</span>
                  </div>
                </div>
              )}
            />
          )}
        </TabsContent>
      </Tabs>
    </AppLayout>
  );
}
