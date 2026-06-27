import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/ui/page-header";
import { DataTable } from "@/components/ui/data-table";
import { EmptyState } from "@/components/StatusBadge";
import { FormInput, FormNumber, FormSelect } from "@/components/forms";
import { StatusBadge } from "@/components/StatusBadge";
import {
  Plus, X, ShoppingBag, Package, CheckCircle2, ChevronDown, Trash2, Eye
} from "lucide-react";
import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { useForm, useFieldArray } from "react-hook-form";
import { usePurchaseOrders, useCreatePO, useReceivePO, useCancelPO, type PurchaseOrder } from "@/hooks/usePurchaseOrders";
import { usePurchaseOrders as usePurchaseOrdersWS } from "@/hooks/useModuleWebSocket";
import { useSuppliers } from "@/hooks/useSuppliers";
import { useProducts } from "@/hooks/useProducts";
import { useWarehouses } from "@/hooks/useWarehouses";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface POFormData {
  supplierId: string;
  warehouseId?: string;
  expectedDate?: string;
  notes?: string;
  items: { productId: string; quantity: number; unitCost: number }[];
}

const PO_STATUS_COLORS: Record<string, string> = {
  Draft: "bg-muted text-muted-foreground",
  Ordered: "bg-brand-light text-brand",
  Received: "bg-success/10 text-success",
  Cancelled: "bg-destructive/10 text-destructive",
};

export default function PurchaseOrders() {
  const [statusFilter, setStatusFilter] = useState("All");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isCancelConfirmOpen, setIsCancelConfirmOpen] = useState(false);
  const [isReceiveConfirmOpen, setIsReceiveConfirmOpen] = useState(false);
  const [selected, setSelected] = useState<PurchaseOrder | null>(null);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const { data: posResult, isLoading, refetch } = usePurchaseOrders({ status: statusFilter === "All" ? undefined : statusFilter });
  const pos = posResult?.data ?? [];

  // WebSocket real-time updates
  usePurchaseOrdersWS(
    () => { console.log('🛒 PO created via WebSocket'); refetch(); },
    () => { console.log('✅ PO received via WebSocket'); refetch(); }
  );

  const createPO = useCreatePO();
  const receivePO = useReceivePO();
  const cancelPO = useCancelPO();

  const { data: suppliers = [] } = useSuppliers();
  const { data: products = [] } = useProducts();
  const { data: warehouses = [] } = useWarehouses();

  const { register, control, handleSubmit, reset, watch, formState: { errors } } = useForm<POFormData>({
    defaultValues: { items: [{ productId: "", quantity: 1, unitCost: 0 }] },
  });
  const { fields, append, remove } = useFieldArray({ control, name: "items" });
  const watchedItems = watch("items");

  const totalAmount = watchedItems.reduce((sum, item) => sum + (item.quantity || 0) * (item.unitCost || 0), 0);

  const onCreateSubmit = async (data: POFormData) => {
    await createPO.mutateAsync(data);
    reset({ items: [{ productId: "", quantity: 1, unitCost: 0 }] });
    setIsCreateOpen(false);
  };

  const handleReceive = async () => {
    if (!selected) return;
    await receivePO.mutateAsync(selected._id);
    setIsReceiveConfirmOpen(false);
    setIsDetailOpen(false);
    setSelected(null);
  };

  const handleCancel = async () => {
    if (!selected) return;
    await cancelPO.mutateAsync(selected._id);
    setIsCancelConfirmOpen(false);
    setIsDetailOpen(false);
    setSelected(null);
  };

  const pendingCount = pos.filter((p) => p.status === "Ordered").length;

  return (
    <AppLayout title="Purchase Orders" subtitle="Track purchases from suppliers">
      <PageHeader
        title="Purchase Orders"
        description={`${pos.length} orders · ${pendingCount} awaiting delivery`}
        actions={
          <button
            onClick={() => setIsCreateOpen(true)}
            className="flex items-center gap-2 h-9 px-4 rounded-lg bg-brand text-white text-sm font-display font-semibold hover:bg-brand/90 transition-colors"
          >
            <Plus className="w-4 h-4" /> New Purchase Order
          </button>
        }
      />

      {/* Status Filter */}
      <div className="flex items-center gap-2 mb-4">
        {["All", "Ordered", "Received", "Cancelled"].map((s) => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`px-3 py-1.5 rounded-lg text-sm font-display font-medium transition-colors ${statusFilter === s ? "bg-brand text-white" : "text-muted-foreground hover:text-foreground hover:bg-secondary"}`}
          >
            {s}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 rounded-full border-4 border-brand/20 border-t-brand animate-spin" />
        </div>
      ) : pos.length === 0 ? (
        <EmptyState
          icon={ShoppingBag}
          title="No purchase orders"
          description="Create a purchase order when you order stock from a supplier."
          action={{ label: "New Purchase Order", onClick: () => setIsCreateOpen(true) }}
        />
      ) : (
        <DataTable
          data={pos}
          mobileCard={(r) => (
            <div className="bg-surface rounded-xl border border-border shadow-sm p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <p className="font-display font-semibold text-sm text-foreground font-mono">{r.poNumber}</p>
                    {r.tallyGuid && (
                      <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-semibold bg-blue-100 text-blue-800 border border-blue-200 shrink-0">Tally</span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">{r.supplierName}</p>
                  <p className="text-xs text-muted-foreground">{r.warehouse?.name || "—"} · {new Date(r.createdAt).toLocaleDateString("en-IN")}</p>
                </div>
                <span className={`px-2.5 py-1 rounded-full text-xs font-medium shrink-0 ${PO_STATUS_COLORS[r.status] || "bg-secondary text-foreground"}`}>{r.status}</span>
              </div>
              <div className="mt-3 pt-2 border-t border-border/60 flex items-center justify-between">
                <p className="font-display font-bold text-sm text-foreground">₹{r.totalAmount.toLocaleString("en-IN")}</p>
                <div className="flex items-center gap-1">
                  <button onClick={() => { setSelected(r); setIsDetailOpen(true); }} className="flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-medium text-brand hover:bg-brand-light transition-colors">
                    <Eye className="w-3.5 h-3.5" /> View
                  </button>
                  {(r.status === "Ordered" || r.status === "Draft") && (
                    <button onClick={() => { setSelected(r); setIsReceiveConfirmOpen(true); }} className="flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-medium text-success hover:bg-success/10 transition-colors">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Receive
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}
          columns={[
            {
              key: "poNumber",
              header: "PO Number",
              cell: (r) => (
                <div className="flex items-center gap-1.5">
                  <span className="font-display font-bold text-foreground font-mono">{r.poNumber}</span>
                  {r.tallyGuid && (
                    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-blue-100 text-blue-800 border border-blue-200">Tally</span>
                  )}
                </div>
              ),
            },
            {
              key: "supplierName",
              header: "Supplier",
              cell: (r) => (
                <div>
                  <p className="font-medium text-foreground">{r.supplierName}</p>
                  {r.supplier?.phone && (
                    <p className="text-xs text-muted-foreground">{r.supplier.phone}</p>
                  )}
                </div>
              ),
            },
            {
              key: "warehouse",
              header: "Warehouse",
              cell: (r) => <span className="text-sm text-muted-foreground">{r.warehouse?.name || "—"}</span>,
            },
            {
              key: "status",
              header: "Status",
              cell: (r) => (
                <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${PO_STATUS_COLORS[r.status] || "bg-secondary text-foreground"}`}>
                  {r.status}
                </span>
              ),
            },
            {
              key: "totalAmount",
              header: "Total",
              cell: (r) => (
                <span className="font-display font-semibold text-foreground">
                  ₹{r.totalAmount.toLocaleString("en-IN")}
                </span>
              ),
            },
            {
              key: "expectedDate",
              header: "Expected",
              cell: (r) => (
                <span className="text-sm text-muted-foreground">
                  {r.expectedDate ? new Date(r.expectedDate).toLocaleDateString("en-IN") : "—"}
                </span>
              ),
            },
            {
              key: "createdAt",
              header: "Created",
              cell: (r) => (
                <span className="text-xs text-muted-foreground">
                  {new Date(r.createdAt).toLocaleDateString("en-IN")}
                </span>
              ),
            },
            {
              key: "actions",
              header: "",
              cell: (r) => (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => { setSelected(r); setIsDetailOpen(true); }}
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-medium text-brand hover:bg-brand-light transition-colors"
                  >
                    <Eye className="w-3.5 h-3.5" /> View
                  </button>
                  {(r.status === "Ordered" || r.status === "Draft") && (
                    <>
                      <button
                        onClick={() => { setSelected(r); setIsReceiveConfirmOpen(true); }}
                        className="flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-medium text-success hover:bg-success/10 transition-colors"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" /> Receive
                      </button>
                      <button
                        onClick={() => { setSelected(r); setIsCancelConfirmOpen(true); }}
                        className="flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-medium text-destructive hover:bg-destructive/10 transition-colors"
                      >
                        <X className="w-3.5 h-3.5" /> Cancel
                      </button>
                    </>
                  )}
                </div>
              ),
            },
          ]}
        />
      )}

      {/* Create PO Modal */}
      {mounted && isCreateOpen && createPortal(
        <div className="fixed inset-0 bg-foreground/30 backdrop-blur-sm flex items-end sm:items-center justify-center z-[70] p-0 sm:p-4">
          <div className="bg-surface rounded-t-2xl sm:rounded-2xl border border-border shadow-panel w-full sm:max-w-2xl max-h-[95vh] sm:max-h-[90vh] overflow-y-auto p-5 sm:p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="font-display font-bold text-lg text-foreground">New Purchase Order</h2>
                <p className="text-sm text-muted-foreground">Order stock from a supplier</p>
              </div>
              <button onClick={() => setIsCreateOpen(false)} className="text-muted-foreground hover:text-foreground">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit(onCreateSubmit)} className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="col-span-1 sm:col-span-2">
                  <label className="block text-xs font-display font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">
                    Supplier *
                  </label>
                  <select
                    {...register("supplierId", { required: "Supplier is required" })}
                    className="w-full h-11 px-3 rounded-lg border border-border bg-surface text-sm text-foreground outline-none focus:ring-2 focus:ring-brand/50"
                  >
                    <option value="">Select supplier...</option>
                    {suppliers.map((s) => (
                      <option key={s._id} value={s._id}>{s.name}</option>
                    ))}
                  </select>
                  {errors.supplierId && <p className="text-xs text-destructive mt-1">{errors.supplierId.message}</p>}
                </div>

                <div>
                  <label className="block text-xs font-display font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">
                    Warehouse
                  </label>
                  <select
                    {...register("warehouseId")}
                    className="w-full h-11 px-3 rounded-lg border border-border bg-surface text-sm text-foreground outline-none focus:ring-2 focus:ring-brand/50"
                  >
                    {warehouses.map((w) => (
                      <option key={w._id} value={w._id}>{w.name}{w.isDefault ? " (Default)" : ""}</option>
                    ))}
                  </select>
                </div>

                <FormInput
                  label="Expected Delivery Date"
                  type="date"
                  {...register("expectedDate")}
                />
              </div>

              {/* Line Items */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-display font-semibold text-muted-foreground uppercase tracking-wide">
                    Items *
                  </label>
                  <button
                    type="button"
                    onClick={() => append({ productId: "", quantity: 1, unitCost: 0 })}
                    className="flex items-center gap-1 text-xs font-medium text-brand hover:text-brand/80 transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add Item
                  </button>
                </div>
                <div className="space-y-2">
                  {fields.map((field, i) => (
                    <div key={field.id} className="flex flex-col sm:flex-row sm:items-center gap-2 p-3 rounded-xl border border-border bg-secondary/30">
                      <div className="flex-1">
                        <label className="text-[10px] font-semibold text-muted-foreground uppercase sm:hidden mb-1 block">Product</label>
                        <select
                          {...register(`items.${i}.productId`, { required: true })}
                          className="w-full h-9 px-2 rounded-md border border-border bg-surface text-sm text-foreground outline-none focus:ring-1 focus:ring-brand/50"
                        >
                          <option value="">Select product...</option>
                          {products.map((p) => (
                            <option key={p._id} value={p._id}>{p.name} (Stock: {p.stock})</option>
                          ))}
                        </select>
                      </div>
                      <div className="flex gap-2 items-end sm:items-center">
                        <div className="flex-1 sm:w-20 sm:flex-none">
                          <label className="text-[10px] font-semibold text-muted-foreground uppercase sm:hidden mb-1 block">Qty</label>
                          <input
                            type="number"
                            min={1}
                            {...register(`items.${i}.quantity`, { valueAsNumber: true, min: 1 })}
                            placeholder="Qty"
                            className="w-full h-9 px-2 rounded-md border border-border bg-surface text-sm text-foreground outline-none focus:ring-1 focus:ring-brand/50 text-center"
                          />
                        </div>
                        <div className="flex-1 sm:w-28 sm:flex-none">
                          <label className="text-[10px] font-semibold text-muted-foreground uppercase sm:hidden mb-1 block">Unit Cost</label>
                          <div className="relative">
                            <span className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground text-xs">₹</span>
                            <input
                              type="number"
                              min={0}
                              step={0.01}
                              {...register(`items.${i}.unitCost`, { valueAsNumber: true })}
                              placeholder="Cost"
                              className="w-full h-9 pl-5 pr-2 rounded-md border border-border bg-surface text-sm text-foreground outline-none focus:ring-1 focus:ring-brand/50"
                            />
                          </div>
                        </div>
                        {fields.length > 1 && (
                          <button type="button" onClick={() => remove(i)} className="text-muted-foreground hover:text-destructive transition-colors shrink-0 h-9 flex items-center">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Total */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-brand/5 border border-brand/20">
                <span className="text-sm font-display font-semibold text-foreground">Total Amount</span>
                <span className="text-lg font-display font-bold text-brand">₹{totalAmount.toLocaleString("en-IN")}</span>
              </div>

              <div>
                <label className="block text-xs font-display font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">
                  Notes
                </label>
                <textarea
                  {...register("notes")}
                  rows={2}
                  className="w-full px-3 py-2 rounded-lg border border-border bg-surface text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-brand/50 resize-none"
                  placeholder="Any notes for this order..."
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="flex-1 h-10 rounded-lg border border-border bg-surface text-sm font-display font-semibold hover:bg-secondary transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createPO.isPending}
                  className="flex-1 h-10 rounded-lg bg-brand text-white text-sm font-display font-semibold hover:bg-brand/90 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
                >
                  {createPO.isPending ? (
                    <><div className="w-3 h-3 rounded-full border-2 border-white/30 border-t-white animate-spin" /><span>Creating...</span></>
                  ) : "Create Purchase Order"}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* Detail Modal */}
      {mounted && isDetailOpen && selected && createPortal(
        <div className="fixed inset-0 bg-foreground/30 backdrop-blur-sm flex items-end sm:items-center justify-center z-[70] p-0 sm:p-4">
          <div className="bg-surface rounded-t-2xl sm:rounded-2xl border border-border shadow-panel w-full sm:max-w-xl max-h-[95vh] sm:max-h-[90vh] overflow-y-auto p-5 sm:p-6">
            <div className="flex items-center justify-between mb-5">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="font-display font-bold text-lg text-foreground">{selected.poNumber}</h2>
                  <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${PO_STATUS_COLORS[selected.status]}`}>
                    {selected.status}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground">{selected.supplierName}</p>
              </div>
              <button onClick={() => setIsDetailOpen(false)} className="text-muted-foreground hover:text-foreground">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 p-3 rounded-xl bg-secondary/30">
                <div>
                  <p className="text-xs text-muted-foreground">Warehouse</p>
                  <p className="font-medium text-sm text-foreground">{selected.warehouse?.name || "—"}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Expected</p>
                  <p className="font-medium text-sm text-foreground">
                    {selected.expectedDate ? new Date(selected.expectedDate).toLocaleDateString("en-IN") : "Not set"}
                  </p>
                </div>
                {selected.receivedDate && (
                  <div>
                    <p className="text-xs text-muted-foreground">Received On</p>
                    <p className="font-medium text-sm text-success">
                      {new Date(selected.receivedDate).toLocaleDateString("en-IN")}
                    </p>
                  </div>
                )}
              </div>

              {/* Items */}
              <div>
                <p className="text-xs font-display font-semibold text-muted-foreground uppercase tracking-wide mb-2">Items Ordered</p>
                <div className="space-y-2">
                  {selected.items.map((item, i) => (
                    <div key={i} className="flex items-center justify-between p-3 rounded-lg border border-border">
                      <div className="flex items-center gap-2">
                        <Package className="w-4 h-4 text-brand shrink-0" />
                        <div>
                          <p className="text-sm font-medium text-foreground">{item.productName}</p>
                          <p className="text-xs text-muted-foreground">{item.quantity} bags × ₹{item.unitCost.toLocaleString("en-IN")}</p>
                        </div>
                      </div>
                      <span className="font-display font-semibold text-sm text-foreground">
                        ₹{item.lineTotal.toLocaleString("en-IN")}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl bg-brand/5 border border-brand/20">
                <span className="font-display font-semibold text-foreground">Total Amount</span>
                <span className="font-display font-bold text-brand text-xl">₹{selected.totalAmount.toLocaleString("en-IN")}</span>
              </div>

              {selected.notes && (
                <p className="text-sm text-muted-foreground italic">📝 {selected.notes}</p>
              )}

              {(selected.status === "Ordered" || selected.status === "Draft") && (
                <div className="flex gap-3">
                  <button
                    onClick={() => setIsReceiveConfirmOpen(true)}
                    className="flex-1 h-10 rounded-lg bg-success text-white text-sm font-display font-semibold hover:bg-success/90 transition-colors flex items-center justify-center gap-2"
                  >
                    <CheckCircle2 className="w-4 h-4" /> Mark as Received
                  </button>
                  <button
                    onClick={() => setIsCancelConfirmOpen(true)}
                    className="h-10 px-4 rounded-lg border border-destructive text-destructive text-sm font-display font-semibold hover:bg-destructive/10 transition-colors"
                  >
                    Cancel PO
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Receive Confirm */}
      <ConfirmDialog
        isOpen={isReceiveConfirmOpen}
        title="Mark as Received"
        message={`This will add ${selected?.items.reduce((s, i) => s + i.quantity, 0)} bags to your inventory from ${selected?.supplierName}. This action cannot be undone.`}
        confirmText="Yes, Receive Stock"
        isDestructive={false}
        isLoading={receivePO.isPending}
        onConfirm={handleReceive}
        onCancel={() => setIsReceiveConfirmOpen(false)}
      />

      {/* Cancel Confirm */}
      <ConfirmDialog
        isOpen={isCancelConfirmOpen}
        title="Cancel Purchase Order"
        message={`Cancel ${selected?.poNumber}? No stock will be added.`}
        confirmText="Cancel PO"
        isDestructive
        isLoading={cancelPO.isPending}
        onConfirm={handleCancel}
        onCancel={() => setIsCancelConfirmOpen(false)}
      />
    </AppLayout>
  );
}
