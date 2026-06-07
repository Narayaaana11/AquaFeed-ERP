import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/ui/page-header";
import { DataTable } from "@/components/ui/data-table";
import { FormSelect, FormNumber } from "@/components/forms";
import { Plus, TrendingUp, TrendingDown, Package2, X, AlertTriangle } from "lucide-react";
import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { useForm } from "react-hook-form";
import { validationRules } from "@/lib/validations";
import { useInventory, useAdjustInventory, useStockAdjustments } from "@/hooks/useInventory";
import { useProducts } from "@/hooks/useProducts";
import { useInventory as useInventoryWebSocket } from "@/hooks/useModuleWebSocket";
import { useWarehouses } from "@/hooks/useWarehouses";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface StockAdjustmentData {
  productId: string;
  type: string;
  quantity: number;
  reason?: string;
  fromWarehouseId?: string;
  toWarehouseId?: string;
}

export default function Inventory() {
  const [stockFilter, setStockFilter] = useState("All");
  const [isAdjustOpen, setIsAdjustOpen] = useState(false);
  const [isProductComboboxOpen, setIsProductComboboxOpen] = useState(false);
  const [tab, setTab] = useState<"stock" | "movements">("stock");
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const { data: warehouses = [] } = useWarehouses();

  const { data: inventory = [], isLoading, refetch: refetchInventory } = useInventory({
    stockStatus: stockFilter === "Low Stock" ? "low_stock" : stockFilter === "Out of Stock" ? "out_of_stock" : undefined,
  });
  const { data: movementsData, refetch: refetchMovements } = useStockAdjustments();
  const movements = movementsData?.data || [];

  // WebSocket integration for inventory updates
  useInventoryWebSocket(
    () => {
      console.log("📊 Inventory adjusted via WebSocket");
      refetchInventory();
      refetchMovements();
    },
    (products) => {
      console.log("⚠️ Low stock alert via WebSocket:", products);
      refetchInventory();
      refetchMovements();
    }
  );

  const { data: products = [] } = useProducts();
  const adjustInventory = useAdjustInventory();

  const { register, handleSubmit, reset, watch, setValue, formState: { errors } } = useForm<StockAdjustmentData>({ mode: "onBlur", defaultValues: { type: "add" } });

  const selectedProductId = watch("productId");
  const adjustmentType = watch("type");
  const selectedProductData = products.find((p) => p._id === selectedProductId);

  const lowStockCount = inventory.filter((p: any) => p.stockStatus === "low_stock" || p.stockStatus === "critical").length;

  const onAdjustSubmit = async (data: StockAdjustmentData) => {
    await adjustInventory.mutateAsync(data);
    reset();
    setIsAdjustOpen(false);
  };

  const totalInventoryValue = inventory.reduce((sum: number, p: any) => sum + (p.stock * p.price), 0);

  return (
    <AppLayout title="Inventory" subtitle="Track stock levels and movements">
      <PageHeader
        title="Inventory Management"
        description={`${inventory.length} products · ₹${totalInventoryValue.toLocaleString("en-IN")} total value · ${lowStockCount} need reorder`}
        actions={
          <button onClick={() => setIsAdjustOpen(true)} className="flex items-center gap-2 h-9 px-4 rounded-lg bg-brand text-white text-sm font-display font-semibold hover:bg-brand/90 transition-colors">
            <Plus className="w-4 h-4" /> Adjust Stock
          </button>
        }
      />

      {/* Low stock alert */}
      {lowStockCount > 0 && (
        <div className="flex items-start gap-3 mb-5 p-3.5 rounded-xl bg-warning/10 border border-warning/20">
          <AlertTriangle className="w-4 h-4 text-warning shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-foreground">
              <span className="text-warning font-semibold">{lowStockCount} product{lowStockCount > 1 ? "s" : ""}</span> below reorder threshold:
            </p>
            <div className="mt-1 flex flex-wrap gap-2">
              {inventory
                .filter((p: any) => p.stockStatus === "critical" || p.stockStatus === "low_stock")
                .map((p: any) => (
                  <span key={p._id} className={`px-2 py-0.5 rounded-full text-xs font-medium ${p.stockStatus === "critical" ? "bg-destructive/10 text-destructive" : "bg-warning/10 text-warning"}`}>
                    {p.name}: {p.stock} bags
                  </span>
                ))}
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex items-center gap-1 mb-4">
        {(["stock", "movements"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-lg text-sm font-display font-medium transition-colors capitalize ${tab === t ? "bg-brand text-white" : "text-muted-foreground hover:text-foreground hover:bg-secondary"}`}
          >
            {t === "stock" ? "Current Stock" : "Movement History"}
          </button>
        ))}
        <div className="ml-auto">
          
      <Select value={String(stockFilter)} onValueChange={(val) => setStockFilter(val)}>
        <SelectTrigger className="h-9 px-3 rounded-lg border border-border bg-surface text-sm text-foreground outline-none">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          
            <SelectItem value={"All".toString()}>All</SelectItem>
            <SelectItem value={"Low Stock".toString()}>Low Stock</SelectItem>
            <SelectItem value={"Out of Stock".toString()}>Out of Stock</SelectItem>
          
        </SelectContent>
      </Select>
    
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20"><div className="w-8 h-8 rounded-full border-4 border-brand/20 border-t-brand animate-spin" /></div>
      ) : tab === "stock" ? (
        <DataTable
          data={inventory}
          columns={[
            {
              key: "name",
              header: "Product",
              cell: (r) => (
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-brand-light flex items-center justify-center shrink-0">
                    <Package2 className="w-4 h-4 text-brand" />
                  </div>
                  <div>
                    <p className="font-medium text-foreground">{r.name}</p>
                    <p className="text-xs text-muted-foreground">{r.brand} · {r.category}</p>
                  </div>
                </div>
              ),
            },
            {
              key: "stock",
              header: "Stock",
              cell: (r) => (
                <div className="flex items-center gap-2">
                  <span className="font-display font-semibold text-foreground">{r.stock}</span>
                  <span className="text-xs text-muted-foreground">bags</span>
                </div>
              ),
            },
            {
              key: "stockStatus",
              header: "Status",
              cell: (r) => {
                const map: Record<string, string> = {
                  in_stock: "bg-success/10 text-success",
                  low_stock: "bg-warning/10 text-warning",
                  critical: "bg-destructive/10 text-destructive",
                  out_of_stock: "bg-muted text-muted-foreground",
                };
                const label: Record<string, string> = { in_stock: "In Stock", low_stock: "Low Stock", critical: "Critical", out_of_stock: "Out of Stock" };
                return (
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${map[r.stockStatus] || "bg-secondary text-foreground"}`}>
                    {label[r.stockStatus] || r.stockStatus}
                  </span>
                );
              },
            },
            {
              key: "lowStockThreshold",
              header: "Reorder Point",
              cell: (r) => <span className="text-muted-foreground text-sm">{r.lowStockThreshold} bags</span>,
            },
            {
              key: "value",
              header: "Value",
              cell: (r) => (
                <span className="font-medium text-foreground">₹{(r.stock * r.price).toLocaleString("en-IN")}</span>
              ),
            },
          ]}
        />
      ) : (
        <DataTable
          data={movements}
          columns={[
            {
              key: "createdAt",
              header: "Date",
              cell: (r) => <span className="text-muted-foreground text-xs">{new Date(r.createdAt).toLocaleDateString("en-IN")}</span>,
            },
            {
              key: "product",
              header: "Product",
              cell: (r) => (
                <div>
                  <p className="font-medium text-foreground">{r.product?.name || "—"}</p>
                  <p className="text-xs text-muted-foreground">{r.product?.brand}</p>
                </div>
              ),
            },
            {
              key: "type",
              header: "Type",
              cell: (r) => {
                const isIn = ["add", "transfer_in", "return"].includes(r.type);
                return (
                  <div className={`flex items-center gap-1.5 font-medium ${isIn ? "text-success" : "text-destructive"}`}>
                    {isIn ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
                    {r.type.replace("_", " ").replace(/\b\w/g, (l: string) => l.toUpperCase())}
                  </div>
                );
              },
            },
            {
              key: "quantity",
              header: "Qty Change",
              cell: (r) => {
                const isIn = ["add", "transfer_in", "return"].includes(r.type);
                return (
                  <span className={`font-display font-semibold ${isIn ? "text-success" : "text-destructive"}`}>
                    {isIn ? "+" : "−"}{r.quantity}
                  </span>
                );
              },
            },
            {
              key: "previousStock",
              header: "Before → After",
              cell: (r) => (
                <span className="text-sm text-muted-foreground">{r.previousStock} → {r.newStock}</span>
              ),
            },
            {
              key: "reason",
              header: "Reason",
              cell: (r) => <span className="text-xs text-muted-foreground">{r.reason || r.reference || "—"}</span>,
            },
          ]}
        />
      )}

      {/* Adjust Stock Modal */}
      {mounted && isAdjustOpen && createPortal(
        <div className="fixed inset-0 bg-foreground/30 backdrop-blur-sm flex items-center justify-center z-[70] p-4">
          <div className="bg-surface rounded-2xl border border-border shadow-panel w-full max-w-md max-h-[90vh] overflow-y-auto p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display font-bold text-lg text-foreground">Adjust Stock</h2>
              <button onClick={() => setIsAdjustOpen(false)} className="text-muted-foreground hover:text-foreground"><X className="w-5 h-5" /></button>
            </div>

            <form onSubmit={handleSubmit(onAdjustSubmit)} className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-display font-semibold text-foreground">Product *</label>
                <Popover open={isProductComboboxOpen} onOpenChange={setIsProductComboboxOpen}>
                  <PopoverTrigger asChild>
                    <button
                      type="button"
                      role="combobox"
                      aria-expanded={isProductComboboxOpen}
                      className={cn(
                        "flex w-full items-center justify-between rounded-lg border border-border bg-surface px-3 h-11 text-sm font-medium",
                        !selectedProductId && "text-muted-foreground"
                      )}
                    >
                      <span className="truncate">
                        {selectedProductId
                          ? (() => {
                              const p = products.find((p) => p._id === selectedProductId);
                              return p ? `${p.name} (Stock: ${p.stock})` : "Select product...";
                            })()
                          : "Select product..."}
                      </span>
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[380px] p-0 z-[100]" align="start">
                    <Command>
                      <CommandInput placeholder="Search product by name or brand..." />
                      <CommandList>
                        <CommandEmpty>No product found.</CommandEmpty>
                        <CommandGroup>
                          {products.map((p) => (
                            <CommandItem
                              key={p._id}
                              value={`${p.name} ${p.brand} ${p.category} ${p._id}`}
                              onSelect={() => {
                                setValue("productId", p._id, { shouldValidate: true });
                                setIsProductComboboxOpen(false);
                              }}
                            >
                              <Check
                                className={cn(
                                  "mr-2 h-4 w-4",
                                  selectedProductId === p._id ? "opacity-100" : "opacity-0"
                                )}
                              />
                              <div className="flex flex-col">
                                <span className="font-medium">{p.name}</span>
                                <span className="text-xs text-muted-foreground">{p.brand} · Stock: {p.stock}</span>
                              </div>
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
                {errors.productId && (
                  <p className="text-xs font-medium text-destructive mt-1.5">{errors.productId.message}</p>
                )}
              </div>

              {selectedProductData && (
                <div className="p-3 rounded-lg bg-secondary border border-border flex items-center justify-between">
                  <p className="text-xs text-muted-foreground">Current Stock</p>
                  <p className="text-lg font-display font-bold text-foreground">{selectedProductData.stock} bags</p>
                </div>
              )}

              <div>
                <label className="text-sm font-display font-semibold text-foreground block mb-2">Adjustment Type</label>
                <div className="flex gap-2 flex-wrap sm:flex-nowrap">
                  {[
                    { value: "add", label: "Add" },
                    { value: "remove", label: "Remove" },
                    { value: "transfer", label: "Transfer" },
                    { value: "adjustment", label: "Set Exact" },
                  ].map((opt) => (
                    <label key={opt.value} className="flex items-center gap-2 flex-1 min-w-[100px] p-2.5 rounded-lg border border-border cursor-pointer hover:bg-secondary transition-colors">
                      <input type="radio" value={opt.value} {...register("type")} className="w-4 h-4 accent-brand" />
                      <span className="text-xs font-medium text-foreground">{opt.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              {adjustmentType === "transfer" && (
                <div className="grid grid-cols-2 gap-3 p-3 rounded-lg bg-brand/5 border border-brand/20">
                  <FormSelect
                    label="From Warehouse *"
                    options={warehouses.map((w) => ({ value: w._id, label: w.name }))}
                    {...register("fromWarehouseId", { required: adjustmentType === "transfer" ? "Required" : false })}
                    error={errors.fromWarehouseId}
                  />
                  <FormSelect
                    label="To Warehouse *"
                    options={warehouses.map((w) => ({ value: w._id, label: w.name }))}
                    {...register("toWarehouseId", { required: adjustmentType === "transfer" ? "Required" : false })}
                    error={errors.toWarehouseId}
                  />
                </div>
              )}

              <FormNumber
                label="Quantity"
                placeholder="50"
                {...register("quantity", { ...validationRules.quantity, valueAsNumber: true })}
                error={errors.quantity}
              />

              <div>
                <label className="text-sm font-display font-semibold text-foreground block mb-1.5">Reason (optional)</label>
                <textarea {...register("reason")} placeholder="e.g., Supplier delivery, damage, manual correction…" className="w-full h-20 px-3 py-2 rounded-lg border border-border bg-surface text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-brand/50 resize-none" />
              </div>

              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => setIsAdjustOpen(false)} className="flex-1 h-10 rounded-lg border border-border bg-surface text-sm font-display font-semibold hover:bg-secondary transition-colors">Cancel</button>
                <button type="submit" disabled={adjustInventory.isPending} className="flex-1 h-10 rounded-lg bg-brand text-white text-sm font-display font-semibold hover:bg-brand/90 disabled:opacity-50 transition-colors flex items-center justify-center gap-2">
                  {adjustInventory.isPending ? (
                    <><div className="w-3 h-3 rounded-full border-2 border-white/30 border-t-white animate-spin" /><span>Adjusting...</span></>
                  ) : "Record Adjustment"}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}
    </AppLayout>
  );
}
