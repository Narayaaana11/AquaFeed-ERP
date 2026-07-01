import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/ui/page-header";
import { DataTable } from "@/components/ui/data-table";
import { EmptyState } from "@/components/StatusBadge";
import { FormInput, FormSelect } from "@/components/forms";
import { Plus, Pencil, Trash2, X, Truck, Phone, Mail, MapPin, Search } from "lucide-react";
import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { useForm } from "react-hook-form";
import { validationRules } from "@/lib/validations";
import { useSuppliers, useCreateSupplier, useUpdateSupplier, useDeleteSupplier, type Supplier } from "@/hooks/useSuppliers";
import { ConfirmDialog } from "@/components/ConfirmDialog";

interface SupplierFormData {
  name: string;
  contactPerson?: string;
  phone?: string;
  email?: string;
  address?: string;
  city?: string;
  state?: string;
  gstNumber?: string;
  paymentTerms: string;
  notes?: string;
}

const PAYMENT_TERMS = [
  { value: "Cash", label: "Cash on Delivery" },
  { value: "Net15", label: "Net 15 Days" },
  { value: "Net30", label: "Net 30 Days" },
  { value: "Net45", label: "Net 45 Days" },
  { value: "Net60", label: "Net 60 Days" },
];

export default function Suppliers() {
  const [searchQuery, setSearchQuery] = useState("");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [selected, setSelected] = useState<Supplier | null>(null);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const { data: suppliers = [], isLoading } = useSuppliers({ search: searchQuery || undefined });
  const createSupplier = useCreateSupplier();
  const updateSupplier = useUpdateSupplier();
  const deleteSupplier = useDeleteSupplier();

  const createForm = useForm<SupplierFormData>({ defaultValues: { paymentTerms: "Net30" } });
  const editForm = useForm<SupplierFormData>();

  const onCreateSubmit = async (data: SupplierFormData) => {
    await createSupplier.mutateAsync(data);
    createForm.reset({ paymentTerms: "Net30" });
    setIsCreateOpen(false);
  };

  const handleEdit = (supplier: Supplier) => {
    setSelected(supplier);
    editForm.reset({
      name: supplier.name,
      contactPerson: supplier.contactPerson,
      phone: supplier.phone,
      email: supplier.email,
      address: supplier.address,
      city: supplier.city,
      state: supplier.state,
      gstNumber: supplier.gstNumber,
      paymentTerms: supplier.paymentTerms,
      notes: supplier.notes,
    });
    setIsEditOpen(true);
  };

  const onEditSubmit = async (data: SupplierFormData) => {
    if (!selected) return;
    await updateSupplier.mutateAsync({ id: selected._id, ...data });
    setIsEditOpen(false);
    setSelected(null);
  };

  const handleDelete = async () => {
    if (!selected) return;
    await deleteSupplier.mutateAsync(selected._id);
    setIsDeleteOpen(false);
    setSelected(null);
  };

  const SupplierForm = ({ form, onSubmit, isPending, submitLabel }: any) => (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="col-span-1 sm:col-span-2">
          <FormInput
            label="Supplier / Company Name *"
            placeholder="e.g. Growel Feeds Ltd."
            {...form.register("name", validationRules.name)}
            error={form.formState.errors.name}
          />
        </div>
        <FormInput
          label="Contact Person"
          placeholder="e.g. Ramesh Kumar"
          {...form.register("contactPerson")}
        />
        <FormInput
          label="Phone"
          placeholder="9876543210"
          {...form.register("phone")}
        />
        <FormInput
          label="Email"
          type="email"
          placeholder="supplier@example.com"
          {...form.register("email")}
        />
        <FormInput
          label="GST Number"
          placeholder="27AABCU9603R1ZX"
          {...form.register("gstNumber")}
        />
        <FormInput
          label="City"
          placeholder="Vijayawada"
          {...form.register("city")}
        />
        <FormInput
          label="State"
          placeholder="Andhra Pradesh"
          {...form.register("state")}
        />
        <div className="col-span-1 sm:col-span-2">
          <FormSelect
            label="Payment Terms"
            options={PAYMENT_TERMS}
            name="paymentTerms"
            control={form.control}
          />
        </div>
        <div className="col-span-1 sm:col-span-2">
          <label className="block text-xs font-display font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">
            Address
          </label>
          <textarea
            {...form.register("address")}
            rows={2}
            className="w-full px-3 py-2 rounded-lg border border-border bg-surface text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-brand/50 resize-none"
            placeholder="Street address..."
          />
        </div>
        <div className="col-span-1 sm:col-span-2">
          <label className="block text-xs font-display font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">
            Notes
          </label>
          <textarea
            {...form.register("notes")}
            rows={2}
            className="w-full px-3 py-2 rounded-lg border border-border bg-surface text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-brand/50 resize-none"
            placeholder="Additional notes..."
          />
        </div>
      </div>
      <div className="flex gap-3 pt-2">
        <button
          type="button"
          onClick={() => { setIsCreateOpen(false); setIsEditOpen(false); }}
          className="flex-1 h-10 rounded-lg border border-border bg-surface text-sm font-display font-semibold hover:bg-secondary transition-colors"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isPending}
          className="flex-1 h-10 rounded-lg bg-brand text-white text-sm font-display font-semibold hover:bg-brand/90 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
        >
          {isPending ? (
            <><div className="w-3 h-3 rounded-full border-2 border-white/30 border-t-white animate-spin" /><span>Saving...</span></>
          ) : submitLabel}
        </button>
      </div>
    </form>
  );

  const termsColor: Record<string, string> = {
    Cash: "bg-success/10 text-success",
    Net15: "bg-brand-light text-brand",
    Net30: "bg-brand-light text-brand",
    Net45: "bg-warning/10 text-warning",
    Net60: "bg-destructive/10 text-destructive",
  };

  return (
    <AppLayout title="Suppliers" subtitle="Manage feed suppliers and vendors">
      <PageHeader
        title="Suppliers"
        description={`${suppliers.length} active suppliers`}
        actions={
          <button
            onClick={() => setIsCreateOpen(true)}
            className="flex items-center gap-2 h-9 px-4 rounded-lg bg-brand text-white text-sm font-display font-semibold hover:bg-brand/90 transition-colors"
          >
            <Plus className="w-4 h-4" /> Add Supplier
          </button>
        }
      />

      {/* Search */}
      <div className="flex items-center gap-2 h-9 px-3 rounded-lg border border-border bg-surface max-w-sm mb-4">
        <Search className="w-3.5 h-3.5 shrink-0 text-muted-foreground" />
        <input
          type="text"
          placeholder="Search suppliers..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="flex-1 bg-transparent outline-none placeholder:text-muted-foreground text-foreground text-sm"
        />
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 rounded-full border-4 border-brand/20 border-t-brand animate-spin" />
        </div>
      ) : suppliers.length === 0 ? (
        <EmptyState
          icon={Truck}
          title="No suppliers yet"
          description="Add your fish feed suppliers to track purchases and stock."
          action={{ label: "Add Supplier", onClick: () => setIsCreateOpen(true) }}
        />
      ) : (
        <DataTable
          data={suppliers}
          mobileCard={(r) => (
            <div className="bg-surface rounded-xl border border-border shadow-sm p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-xl bg-brand-light flex items-center justify-center shrink-0">
                    <Truck className="w-4 h-4 text-brand" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <p className="font-display font-semibold text-sm text-foreground truncate">{r.name}</p>
                      {r.tallyGuid && (
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-semibold bg-blue-100 text-blue-800 border border-blue-200 shrink-0">Tally</span>
                      )}
                    </div>
                    {r.contactPerson && <p className="text-xs text-muted-foreground">{r.contactPerson}</p>}
                  </div>
                </div>
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium shrink-0 ${termsColor[r.paymentTerms] || "bg-secondary text-foreground"}`}>{r.paymentTerms}</span>
              </div>
              <div className="flex items-center justify-between mt-3">
                <div>
                  <p className="text-muted-foreground text-xs">Outstanding</p>
                  <p className={`font-display font-bold text-sm ${r.outstandingBalance > 0 ? "text-warning" : "text-success"}`}>
                    ₹{Math.abs(r.outstandingBalance || 0).toLocaleString("en-IN")} {(r.outstandingBalance || 0) >= 0 ? "Cr" : "Dr"}
                  </p>
                </div>
              </div>
              <div className="mt-3 pt-2 border-t border-border/60 flex items-center justify-between">
                <div className="space-y-0.5">
                  {r.phone && <div className="flex items-center gap-1 text-xs text-foreground"><Phone className="w-3 h-3 text-muted-foreground" /> {r.phone}</div>}
                  {r.city && <div className="flex items-center gap-1 text-xs text-muted-foreground"><MapPin className="w-3 h-3" /> {r.city}{r.state ? `, ${r.state}` : ""}</div>}
                </div>
                <div className="flex items-center gap-1">
                  <button onClick={() => handleEdit(r)} className="w-8 h-8 flex items-center justify-center rounded-lg text-brand hover:bg-brand-light transition-colors">
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => { setSelected(r); setIsDeleteOpen(true); }} className="w-8 h-8 flex items-center justify-center rounded-lg text-destructive hover:bg-destructive/10 transition-colors">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          )}
          columns={[
            {
              key: "name",
              header: "Supplier",
              cell: (r) => (
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-brand-light flex items-center justify-center shrink-0">
                    <Truck className="w-4 h-4 text-brand" />
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <p className="font-medium text-foreground">{r.name}</p>
                      {r.tallyGuid && (
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-blue-100 text-blue-800 border border-blue-200">Tally</span>
                      )}
                    </div>
                    {r.contactPerson && <p className="text-xs text-muted-foreground">{r.contactPerson}</p>}
                  </div>
                </div>
              ),
            },
            {
              key: "phone",
              header: "Contact",
              cell: (r) => (
                <div className="space-y-0.5">
                  {r.phone && (
                    <div className="flex items-center gap-1 text-xs text-foreground">
                      <Phone className="w-3 h-3 text-muted-foreground" /> {r.phone}
                    </div>
                  )}
                  {r.email && (
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Mail className="w-3 h-3" /> {r.email}
                    </div>
                  )}
                </div>
              ),
            },
            {
              key: "city",
              header: "Location",
              cell: (r) => r.city ? (
                <div className="flex items-center gap-1 text-sm text-muted-foreground">
                  <MapPin className="w-3 h-3" /> {r.city}{r.state ? `, ${r.state}` : ""}
                </div>
              ) : <span className="text-muted-foreground">—</span>,
            },
            {
              key: "paymentTerms",
              header: "Payment Terms",
              cell: (r) => (
                <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${termsColor[r.paymentTerms] || "bg-secondary text-foreground"}`}>
                  {r.paymentTerms}
                </span>
              ),
            },
            {
              key: "outstandingBalance",
              header: "Outstanding",
              cell: (r) => (
                <span className={`font-medium ${r.outstandingBalance > 0 ? "text-warning" : "text-success"}`}>
                  ₹{Math.abs(r.outstandingBalance || 0).toLocaleString("en-IN")} {(r.outstandingBalance || 0) >= 0 ? "Cr" : "Dr"}
                </span>
              ),
            },
            {
              key: "gstNumber",
              header: "GST No.",
              cell: (r) => <span className="text-xs text-muted-foreground font-mono">{r.gstNumber || "—"}</span>,
            },
            {
              key: "actions",
              header: "Actions",
              cell: (r) => (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleEdit(r)}
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-medium text-brand hover:bg-brand-light transition-colors"
                  >
                    <Pencil className="w-3.5 h-3.5" /> Edit
                  </button>
                  <button
                    onClick={() => { setSelected(r); setIsDeleteOpen(true); }}
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-medium text-destructive hover:bg-destructive/10 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Remove
                  </button>
                </div>
              ),
            },
          ]}
        />
      )}

      {/* Create Modal */}
      {mounted && isCreateOpen && createPortal(
        <div className="fixed inset-0 bg-foreground/30 backdrop-blur-sm flex items-end sm:items-center justify-center z-[70] p-0 sm:p-4">
          <div className="bg-surface rounded-t-2xl sm:rounded-2xl border border-border shadow-panel w-full sm:max-w-2xl max-h-[95vh] sm:max-h-[90vh] overflow-y-auto p-5 sm:p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="font-display font-bold text-lg text-foreground">Add Supplier</h2>
              <button onClick={() => setIsCreateOpen(false)} className="text-muted-foreground hover:text-foreground">
                <X className="w-5 h-5" />
              </button>
            </div>
            <SupplierForm
              form={createForm}
              onSubmit={onCreateSubmit}
              isPending={createSupplier.isPending}
              submitLabel="Add Supplier"
            />
          </div>
        </div>,
        document.body
      )}

      {/* Edit Modal */}
      {mounted && isEditOpen && selected && createPortal(
        <div className="fixed inset-0 bg-foreground/30 backdrop-blur-sm flex items-end sm:items-center justify-center z-[70] p-0 sm:p-4">
          <div className="bg-surface rounded-t-2xl sm:rounded-2xl border border-border shadow-panel w-full sm:max-w-2xl max-h-[95vh] sm:max-h-[90vh] overflow-y-auto p-5 sm:p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="font-display font-bold text-lg text-foreground">Edit Supplier</h2>
              <button onClick={() => setIsEditOpen(false)} className="text-muted-foreground hover:text-foreground">
                <X className="w-5 h-5" />
              </button>
            </div>
            <SupplierForm
              form={editForm}
              onSubmit={onEditSubmit}
              isPending={updateSupplier.isPending}
              submitLabel="Save Changes"
            />
          </div>
        </div>,
        document.body
      )}

      {/* Delete Confirm */}
      <ConfirmDialog
        isOpen={isDeleteOpen}
        title="Remove Supplier"
        message={`Remove ${selected?.name}? This will not affect existing purchase orders.`}
        confirmText="Remove"
        isDestructive
        isLoading={deleteSupplier.isPending}
        onConfirm={handleDelete}
        onCancel={() => { setIsDeleteOpen(false); setSelected(null); }}
      />
    </AppLayout>
  );
}
