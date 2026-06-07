import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/ui/page-header";
import { DataTable } from "@/components/ui/data-table";
import { EmptyState } from "@/components/StatusBadge";
import { FormInput, FormSelect, FormNumber } from "@/components/forms";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { Search, Plus, Pencil, Trash2, Users, X, AlertTriangle } from "lucide-react";
import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { useCustomers, useCreateCustomer, useUpdateCustomer, useDeleteCustomer, type Customer } from "@/hooks/useCustomers";
import { useCustomers as useCustomersWebSocket } from "@/hooks/useModuleWebSocket";
import { createPortal } from "react-dom";

const customerTypes = ["Retail", "Wholesale", "Distributor", "Farm"];

interface CustomerFormData {
  name: string;
  phone: string;
  email: string;
  address: string;
  city: string;
  state: string;
  type: string;
  creditLimit: number;
  gstNumber: string;
  notes: string;
}

export default function Customers() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedType, setSelectedType] = useState("All");
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  const { data: customers = [], isLoading, refetch } = useCustomers({
    search: searchQuery || undefined,
    type: selectedType !== "All" ? selectedType : undefined,
  });

  // WebSocket integration for customer updates
  useCustomersWebSocket(
    () => {
      console.log('👥 Customer list updated via WebSocket (created)');
      setLastUpdate(new Date());
      refetch();
    },
    () => {
      console.log('👥 Customer list updated via WebSocket (updated)');
      setLastUpdate(new Date());
      refetch();
    },
    () => {
      console.log('👥 Customer list updated via WebSocket (deleted)');
      setLastUpdate(new Date());
      refetch();
    }
  );

  const createCustomer = useCreateCustomer();
  const updateCustomer = useUpdateCustomer();
  const deleteCustomer = useDeleteCustomer();

  const { register: registerAdd, handleSubmit: handleAddSubmit, reset: resetAdd, formState: { errors: addErrors } } =
    useForm<CustomerFormData>({ mode: "onBlur" });

  const { register: registerEdit, handleSubmit: handleEditSubmit, reset: resetEdit, formState: { errors: editErrors } } =
    useForm<CustomerFormData>({ mode: "onBlur" });

  const totalOutstanding = customers.reduce((sum, c) => sum + (c.outstandingBalance || 0), 0);
  const overdueCount = customers.filter((c) => c.outstandingBalance > c.creditLimit && c.creditLimit > 0).length;

  const onAddSubmit = async (data: CustomerFormData) => {
    await createCustomer.mutateAsync(data);
    resetAdd();
    setIsAddOpen(false);
  };

  const onEditSubmit = async (data: CustomerFormData) => {
    if (!selectedCustomer) return;
    await updateCustomer.mutateAsync({ id: selectedCustomer._id, ...data });
    resetEdit();
    setIsEditOpen(false);
    setSelectedCustomer(null);
  };

  const handleEdit = (customer: Customer) => {
    setSelectedCustomer(customer);
    resetEdit({
      name: customer.name,
      phone: customer.phone || "",
      email: customer.email || "",
      address: customer.address || "",
      city: customer.city || "",
      state: customer.state || "",
      type: customer.type,
      creditLimit: customer.creditLimit,
      gstNumber: customer.gstNumber || "",
      notes: customer.notes || "",
    });
    setIsEditOpen(true);
  };

  const handleDelete = async () => {
    if (!selectedCustomer) return;
    await deleteCustomer.mutateAsync(selectedCustomer._id);
    setIsDeleteOpen(false);
    setSelectedCustomer(null);
  };

  const CustomerForm = ({ reg, submit, errs, isSubmitting, title, onClose }: any) => {
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
                <FormInput label="Customer Name *" placeholder="Ravi Kumar Fisheries" {...reg("name", { required: "Name is required" })} error={errs.name} />
              </div>
              <FormInput label="Phone" placeholder="9876543210" {...reg("phone")} />
              <FormInput label="Email" type="email" placeholder="customer@email.com" {...reg("email")} />
              <FormInput label="City" placeholder="Vijayawada" {...reg("city")} />
              <FormInput label="State" placeholder="Andhra Pradesh" {...reg("state")} />
              <FormSelect label="Type" options={customerTypes.map((t) => ({ value: t, label: t }))} {...reg("type")} />
              <FormNumber label="Credit Limit (₹)" prefix="₹" placeholder="50000" {...reg("creditLimit")} />
              <div className="col-span-2">
                <FormInput label="GST Number" placeholder="22AAAAA0000A1Z5" {...reg("gstNumber")} />
              </div>
              <div className="col-span-2">
                <FormInput label="Address" placeholder="Full address" {...reg("address")} />
              </div>
            </div>
            <div className="flex gap-3 pt-4">
              <button type="button" onClick={onClose} className="flex-1 h-10 rounded-lg border border-border bg-surface text-sm font-display font-semibold hover:bg-secondary transition-colors">Cancel</button>
              <button type="submit" disabled={isSubmitting} className="flex-1 h-10 rounded-lg bg-brand text-white text-sm font-display font-semibold hover:bg-brand/90 disabled:opacity-50 transition-colors flex items-center justify-center gap-2">
                {isSubmitting ? <><div className="w-3 h-3 rounded-full border-2 border-white/30 border-t-white animate-spin" /><span>Saving...</span></> : "Save"}
              </button>
            </div>
          </form>
        </div>
      </div>,
      document.body
    );
  };

  return (
    <AppLayout title="Customers" subtitle="Manage customer accounts and credit">
      <PageHeader
        title="Customers"
        description={`${customers.length} customers · ₹${totalOutstanding.toLocaleString("en-IN")} outstanding${overdueCount > 0 ? ` · ${overdueCount} over limit` : ""}`}
        actions={
          <button onClick={() => setIsAddOpen(true)} className="flex items-center gap-2 h-9 px-4 rounded-lg bg-brand text-white text-sm font-display font-semibold hover:bg-brand/90 transition-colors">
            <Plus className="w-4 h-4" /> Add Customer
          </button>
        }
      />

      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="flex items-center gap-2 h-9 px-3 rounded-lg border border-border bg-surface flex-1 max-w-sm">
          <Search className="w-3.5 h-3.5 shrink-0 text-muted-foreground" />
          <input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="flex-1 bg-transparent outline-none placeholder:text-muted-foreground text-foreground text-sm" placeholder="Search customers…" />
        </div>
        
      <Select value={String(selectedType)} onValueChange={(val) => setSelectedType(val)}>
        <SelectTrigger className="h-9 px-3 rounded-lg border border-border bg-surface text-sm text-foreground outline-none">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          
          <SelectItem value={"All".toString()}>All Types</SelectItem>
          {customerTypes.map((t) => <SelectItem value={{t}.toString()}>{t}</SelectItem>)}
        
        </SelectContent>
      </Select>
    
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20"><div className="w-8 h-8 rounded-full border-4 border-brand/20 border-t-brand animate-spin" /></div>
      ) : customers.length === 0 ? (
        <EmptyState icon={Users} title="No customers found" description="Add your first customer to start tracking sales." action={{ label: "Add Customer", onClick: () => setIsAddOpen(true) }} />
      ) : (
        <DataTable
          data={customers}
          columns={[
            {
              key: "name",
              header: "Customer",
              cell: (r) => (
                <div>
                  <p className="font-medium text-foreground">{r.name}</p>
                  <p className="text-xs text-muted-foreground">{r.phone} {r.city ? `· ${r.city}` : ""}</p>
                </div>
              ),
            },
            { key: "type", header: "Type", cell: (r) => <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-secondary text-foreground">{r.type}</span> },
            {
              key: "creditLimit",
              header: "Credit Limit",
              cell: (r) => (
                <span className="text-foreground text-sm">
                  {r.creditLimit > 0 ? `₹${r.creditLimit.toLocaleString("en-IN")}` : "—"}
                </span>
              ),
            },
            {
              key: "outstandingBalance",
              header: "Outstanding",
              cell: (r) => {
                const isOverLimit = r.creditLimit > 0 && r.outstandingBalance > r.creditLimit;
                return (
                  <div className="flex items-center gap-2">
                    <span className={`font-medium ${r.outstandingBalance > 0 ? "text-warning" : "text-success"}`}>
                      ₹{r.outstandingBalance.toLocaleString("en-IN")}
                    </span>
                    {isOverLimit && <AlertTriangle className="w-3.5 h-3.5 text-destructive" />}
                  </div>
                );
              },
            },
            {
              key: "actions",
              header: "Actions",
              cell: (r) => (
                <div className="flex items-center gap-2">
                  <button onClick={() => handleEdit(r)} className="flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-medium text-brand hover:bg-brand-light transition-colors">
                    <Pencil className="w-3.5 h-3.5" /> Edit
                  </button>
                  <button onClick={() => { setSelectedCustomer(r); setIsDeleteOpen(true); }} className="flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-medium text-destructive hover:bg-destructive/10 transition-colors">
                    <Trash2 className="w-3.5 h-3.5" /> Delete
                  </button>
                </div>
              ),
            },
          ]}
        />
      )}

      {isAddOpen && (
        <CustomerForm
          reg={registerAdd}
          submit={handleAddSubmit(onAddSubmit)}
          errs={addErrors}
          isSubmitting={createCustomer.isPending}
          title="Add Customer"
          onClose={() => setIsAddOpen(false)}
        />
      )}

      {isEditOpen && selectedCustomer && (
        <CustomerForm
          reg={registerEdit}
          submit={handleEditSubmit(onEditSubmit)}
          errs={editErrors}
          isSubmitting={updateCustomer.isPending}
          title="Edit Customer"
          onClose={() => { setIsEditOpen(false); setSelectedCustomer(null); }}
        />
      )}

      <ConfirmDialog
        isOpen={isDeleteOpen}
        title="Delete Customer"
        message={`Delete "${selectedCustomer?.name}"? This cannot be undone.`}
        confirmText="Delete"
        isDestructive
        isLoading={deleteCustomer.isPending}
        onConfirm={handleDelete}
        onCancel={() => { setIsDeleteOpen(false); setSelectedCustomer(null); }}
      />
    </AppLayout>
  );
}
