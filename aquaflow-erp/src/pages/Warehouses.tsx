import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/ui/page-header";
import { DataTable } from "@/components/ui/data-table";
import { EmptyState } from "@/components/StatusBadge";
import { FormInput, FormNumber } from "@/components/forms";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { Plus, Warehouse as WarehouseIcon, Pencil, Trash2, X, CheckCircle2, Package, Boxes } from "lucide-react";
import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { useForm } from "react-hook-form";
import { useWarehouses, useCreateWarehouse, useUpdateWarehouse, useDeleteWarehouse, type Warehouse } from "@/hooks/useWarehouses";
import { useWarehouseInventory } from "@/hooks/useInventory";

interface WarehouseFormData {
  name: string;
  code: string;
  address: string;
  city: string;
  state: string;
  manager: string;
  phone: string;
  capacity: number;
  isDefault: boolean;
}

export default function Warehouses() {
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [selectedWarehouse, setSelectedWarehouse] = useState<Warehouse | null>(null);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isStocksOpen, setIsStocksOpen] = useState(false);

  const { data: warehouses = [], isLoading } = useWarehouses();
  const createWarehouse = useCreateWarehouse();
  const updateWarehouse = useUpdateWarehouse();
  const deleteWarehouse = useDeleteWarehouse();

  const { register: regAdd, handleSubmit: handleAddSubmit, reset: resetAdd, formState: { errors: addErrors } } =
    useForm<WarehouseFormData>({ mode: "onBlur", defaultValues: { isDefault: false } });

  const { register: regEdit, handleSubmit: handleEditSubmit, reset: resetEdit, formState: { errors: editErrors } } =
    useForm<WarehouseFormData>({ mode: "onBlur" });

  const onAddSubmit = async (data: WarehouseFormData) => {
    await createWarehouse.mutateAsync(data);
    resetAdd();
    setIsAddOpen(false);
  };

  const onEditSubmit = async (data: WarehouseFormData) => {
    if (!selectedWarehouse) return;
    await updateWarehouse.mutateAsync({ id: selectedWarehouse._id, ...data });
    resetEdit();
    setIsEditOpen(false);
    setSelectedWarehouse(null);
  };

  const handleEdit = (wh: Warehouse) => {
    setSelectedWarehouse(wh);
    resetEdit({
      name: wh.name,
      code: wh.code || "",
      address: wh.address || "",
      city: wh.city || "",
      state: wh.state || "",
      manager: wh.manager || "",
      phone: wh.phone || "",
      capacity: wh.capacity || 0,
      isDefault: wh.isDefault,
    });
    setIsEditOpen(true);
  };

  const handleDelete = async () => {
    if (!selectedWarehouse) return;
    await deleteWarehouse.mutateAsync(selectedWarehouse._id);
    setIsDeleteOpen(false);
    setSelectedWarehouse(null);
  };

  const WarehouseForm = ({ reg, submit, errs, isSubmitting, title, onClose }: any) => {
    const [mounted, setMounted] = useState(false);
    useEffect(() => setMounted(true), []);
    if (!mounted) return null;
    return createPortal(
      <div className="fixed inset-0 bg-foreground/30 backdrop-blur-sm flex items-center justify-center z-[70] p-4">
        <div className="bg-surface rounded-2xl border border-border shadow-panel w-full max-w-lg max-h-[90vh] overflow-y-auto p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display font-bold text-lg text-foreground">{title}</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><X className="w-5 h-5" /></button>
        </div>
        <form onSubmit={submit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <FormInput label="Warehouse Name *" placeholder="Main Warehouse" {...reg("name", { required: "Name is required" })} error={errs.name} />
            </div>
            <FormInput label="Code" placeholder="WH-MAIN" {...reg("code")} />
            <FormInput label="Manager" placeholder="Manager name" {...reg("manager")} />
            <FormInput label="Phone" placeholder="9876543210" {...reg("phone")} />
            <FormNumber label="Capacity (bags)" placeholder="500" {...reg("capacity")} />
            <FormInput label="City" placeholder="Vijayawada" {...reg("city")} />
            <FormInput label="State" placeholder="Andhra Pradesh" {...reg("state")} />
            <div className="col-span-2">
              <FormInput label="Address" placeholder="Street, Area" {...reg("address")} />
            </div>
            <div className="col-span-2 flex items-center gap-2">
              <input type="checkbox" id="isDefault" {...reg("isDefault")} className="w-4 h-4 accent-brand rounded" />
              <label htmlFor="isDefault" className="text-sm font-medium text-foreground">Set as default warehouse</label>
            </div>
          </div>
          <div className="flex gap-3 pt-4">
            <button type="button" onClick={onClose} className="flex-1 h-10 rounded-lg border border-border bg-surface text-sm font-display font-semibold hover:bg-secondary transition-colors">Cancel</button>
            <button type="submit" disabled={isSubmitting} className="flex-1 h-10 rounded-lg bg-brand text-white text-sm font-display font-semibold hover:bg-brand/90 disabled:opacity-50 transition-colors flex items-center justify-center gap-2">
              {isSubmitting ? <><div className="w-3 h-3 rounded-full border-2 border-white/30 border-t-white animate-spin" /><span>Saving...</span></> : "Save Warehouse"}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
};

  return (
    <AppLayout title="Warehouses" subtitle="Manage storage locations">
      <PageHeader
        title="Warehouses"
        description={`${warehouses.length} locations`}
        actions={
          <button onClick={() => setIsAddOpen(true)} className="flex items-center gap-2 h-9 px-4 rounded-lg bg-brand text-white text-sm font-display font-semibold hover:bg-brand/90 transition-colors">
            <Plus className="w-4 h-4" /> Add Warehouse
          </button>
        }
      />

      {isLoading ? (
        <div className="flex items-center justify-center py-20"><div className="w-8 h-8 rounded-full border-4 border-brand/20 border-t-brand animate-spin" /></div>
      ) : warehouses.length === 0 ? (
        <EmptyState icon={WarehouseIcon} title="No warehouses added" description="Add your first warehouse location to manage multi-location inventory." action={{ label: "Add Warehouse", onClick: () => setIsAddOpen(true) }} />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {warehouses.map((wh) => (
            <div key={wh._id} className="bg-surface rounded-xl border border-border shadow-card p-5">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-brand-light flex items-center justify-center shrink-0">
                    <WarehouseIcon className="w-5 h-5 text-brand" />
                  </div>
                  <div>
                    <p className="font-display font-bold text-foreground">{wh.name}</p>
                    {wh.code && <p className="text-xs text-muted-foreground">{wh.code}</p>}
                  </div>
                </div>
                {wh.isDefault && (
                  <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-brand/10 text-brand text-xs font-medium">
                    <CheckCircle2 className="w-3 h-3" /> Default
                  </div>
                )}
              </div>

              <div className="space-y-2 text-sm">
                {wh.city && <div className="flex justify-between text-muted-foreground"><span>Location:</span><span className="text-foreground font-medium">{wh.city}{wh.state ? `, ${wh.state}` : ""}</span></div>}
                {wh.manager && <div className="flex justify-between text-muted-foreground"><span>Manager:</span><span className="text-foreground font-medium">{wh.manager}</span></div>}
                {wh.capacity && <div className="flex justify-between text-muted-foreground"><span>Capacity:</span><span className="text-foreground font-medium">{wh.capacity} bags</span></div>}
                <div className="flex justify-between text-muted-foreground">
                  <span>Status:</span>
                  <span className={`font-medium ${wh.status === "Active" ? "text-success" : "text-muted-foreground"}`}>{wh.status}</span>
                </div>
              </div>

              <div className="space-y-2 mt-4 pt-4 border-t border-border">
                <button
                  onClick={() => { setSelectedWarehouse(wh); setIsStocksOpen(true); }}
                  className="w-full flex items-center justify-center gap-1.5 h-9 rounded-lg bg-brand-light text-brand text-xs font-display font-semibold hover:bg-brand-light/85 transition-colors"
                >
                  <Boxes className="w-4 h-4" /> View Stocks
                </button>
                <div className="flex gap-2">
                  <button onClick={() => handleEdit(wh)} className="flex-1 flex items-center justify-center gap-1.5 h-8 rounded-lg border border-border text-xs font-medium text-foreground hover:bg-secondary transition-colors">
                    <Pencil className="w-3.5 h-3.5" /> Edit
                  </button>
                  <button onClick={() => { setSelectedWarehouse(wh); setIsDeleteOpen(true); }} className="flex items-center justify-center gap-1.5 h-8 px-3 rounded-lg border border-destructive/20 text-xs font-medium text-destructive hover:bg-destructive/10 transition-colors">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {isAddOpen && <WarehouseForm reg={regAdd} submit={handleAddSubmit(onAddSubmit)} errs={addErrors} isSubmitting={createWarehouse.isPending} title="Add Warehouse" onClose={() => setIsAddOpen(false)} />}
      {isEditOpen && selectedWarehouse && <WarehouseForm reg={regEdit} submit={handleEditSubmit(onEditSubmit)} errs={editErrors} isSubmitting={updateWarehouse.isPending} title="Edit Warehouse" onClose={() => { setIsEditOpen(false); setSelectedWarehouse(null); }} />}
      {isStocksOpen && selectedWarehouse && <WarehouseStocksModal warehouse={selectedWarehouse} onClose={() => { setIsStocksOpen(false); setSelectedWarehouse(null); }} />}

      <ConfirmDialog
        isOpen={isDeleteOpen}
        title="Delete Warehouse"
        message={`Delete "${selectedWarehouse?.name}"? This cannot be undone.`}
        confirmText="Delete"
        isDestructive
        isLoading={deleteWarehouse.isPending}
        onConfirm={handleDelete}
        onCancel={() => { setIsDeleteOpen(false); setSelectedWarehouse(null); }}
      />
    </AppLayout>
  );
}

const WarehouseStocksModal = ({ warehouse, onClose }: { warehouse: Warehouse; onClose: () => void }) => {
  const { data: stocks = [], isLoading } = useWarehouseInventory(warehouse._id);

  const totalStock = stocks.reduce((sum: number, item: any) => sum + (item.quantity || 0), 0);
  const capacity = warehouse.capacity || 0;
  const utilization = capacity > 0 ? Math.min(100, Math.round((totalStock / capacity) * 100)) : 0;

  return createPortal(
    <div className="fixed inset-0 bg-foreground/30 backdrop-blur-sm flex items-center justify-center z-[70] p-4">
      <div className="bg-surface rounded-2xl border border-border shadow-panel w-full max-w-lg max-h-[90vh] overflow-y-auto p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="font-display font-bold text-lg text-foreground">Stocks in {warehouse.name}</h2>
            <p className="text-xs text-muted-foreground mt-0.5">Location: {warehouse.city || "N/A"}</p>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Capacity utilization */}
        {capacity > 0 && (
          <div className="mb-5 p-4 rounded-xl bg-secondary border border-border">
            <div className="flex items-center justify-between text-xs mb-1.5 font-medium">
              <span className="text-muted-foreground">Capacity Utilization</span>
              <span className="text-foreground">{totalStock} / {capacity} bags ({utilization}%)</span>
            </div>
            <div className="h-2 w-full bg-border rounded-full overflow-hidden">
              <div 
                className={`h-full rounded-full transition-all duration-500 ${
                  utilization > 90 ? 'bg-destructive' : utilization > 75 ? 'bg-warning' : 'bg-brand'
                }`}
                style={{ width: `${utilization}%` }}
              />
            </div>
          </div>
        )}

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-6 h-6 rounded-full border-2 border-brand/20 border-t-brand animate-spin" />
          </div>
        ) : stocks.length === 0 ? (
          <div className="text-center py-12 bg-secondary/20 rounded-xl border border-dashed border-border p-4">
            <Package className="w-8 h-8 text-muted-foreground/60 mx-auto mb-2" />
            <p className="text-sm font-medium text-foreground">No stock inside this warehouse</p>
            <p className="text-xs text-muted-foreground mt-0.5">Add inventory or record a transfer to store feed here.</p>
          </div>
        ) : (
          <div className="border border-border rounded-xl overflow-hidden shadow-card">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-secondary/50 text-xs font-display font-semibold text-muted-foreground uppercase">
                  <th className="px-4 py-2 text-left">Product</th>
                  <th className="px-4 py-2 text-right">Quantity</th>
                </tr>
              </thead>
              <tbody>
                {stocks.map((item: any) => (
                  <tr key={item._id} className="border-b border-border last:border-0 hover:bg-secondary/20 transition-colors">
                    <td className="px-4 py-3">
                      <p className="font-medium text-foreground">{item.product?.name}</p>
                      <p className="text-[10px] text-muted-foreground">{item.product?.brand}</p>
                    </td>
                    <td className="px-4 py-3 text-right font-display font-semibold text-foreground">
                      {item.quantity} <span className="text-xs font-normal text-muted-foreground">bags</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="flex gap-3 pt-6">
          <button 
            type="button" 
            onClick={onClose} 
            className="w-full h-10 rounded-lg border border-border bg-surface text-sm font-display font-semibold hover:bg-secondary transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};
