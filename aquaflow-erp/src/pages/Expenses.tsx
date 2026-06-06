import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/ui/page-header";
import { DataTable } from "@/components/ui/data-table";
import { StatusBadge, EmptyState } from "@/components/StatusBadge";
import { FormInput, FormSelect, FormNumber } from "@/components/forms";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { Plus, Search, Receipt, Pencil, Trash2, X, CheckCircle } from "lucide-react";
import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { useExpenses, useCreateExpense, useUpdateExpense, useApproveExpense, useDeleteExpense, type Expense } from "@/hooks/useExpenses";
import { useExpenses as useExpensesWebSocket } from "@/hooks/useModuleWebSocket";
import { createPortal } from "react-dom";

const EXPENSE_CATEGORIES = ["Transport", "Staff Salary", "Packaging", "Electricity", "Rent", "Repairs", "Maintenance", "Other"];
const PAYMENT_METHODS = ["Cash", "UPI", "Cheque", "Bank Transfer"];

interface ExpenseFormData {
  category: string;
  amount: number;
  description: string;
  date: string;
  paymentMethod: string;
  reference: string;
}

export default function Expenses() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [selectedStatus, setSelectedStatus] = useState("All");
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);

  const { data: expensesData, isLoading, refetch } = useExpenses({
    search: searchQuery || undefined,
    category: selectedCategory !== "All" ? selectedCategory : undefined,
    status: selectedStatus !== "All" ? selectedStatus : undefined,
  });
  const expenses = expensesData?.data || [];

  // WebSocket integration for expense updates
  useExpensesWebSocket(
    () => {
      console.log("💸 Expense created via WebSocket");
      refetch();
    },
    () => {
      console.log("💸 Expense updated via WebSocket");
      refetch();
    },
    () => {
      console.log("💸 Expense deleted via WebSocket");
      refetch();
    }
  );

  const createExpense = useCreateExpense();
  const updateExpense = useUpdateExpense();
  const approveExpense = useApproveExpense();
  const deleteExpense = useDeleteExpense();

  const { register: regAdd, handleSubmit: handleAddSubmit, reset: resetAdd, formState: { errors: addErrors } } = useForm<ExpenseFormData>({ mode: "onBlur", defaultValues: { date: new Date().toISOString().split("T")[0], category: "Transport", paymentMethod: "Cash" } });
  const { register: regEdit, handleSubmit: handleEditSubmit, reset: resetEdit, formState: { errors: editErrors } } = useForm<ExpenseFormData>({ mode: "onBlur" });

  const totalExpenses = expenses.filter((e) => e.status === "Approved").reduce((sum, e) => sum + e.amount, 0);
  const pendingCount = expenses.filter((e) => e.status === "Pending Approval").length;

  const onAddSubmit = async (data: ExpenseFormData) => {
    await createExpense.mutateAsync(data);
    resetAdd();
    setIsAddOpen(false);
  };

  const onEditSubmit = async (data: ExpenseFormData) => {
    if (!selectedExpense) return;
    await updateExpense.mutateAsync({ id: selectedExpense._id, ...data });
    resetEdit();
    setIsEditOpen(false);
    setSelectedExpense(null);
  };

  const handleEdit = (expense: Expense) => {
    setSelectedExpense(expense);
    resetEdit({
      category: expense.category,
      amount: expense.amount,
      description: expense.description || "",
      date: expense.date ? new Date(expense.date).toISOString().split("T")[0] : "",
      paymentMethod: expense.paymentMethod,
      reference: expense.reference || "",
    });
    setIsEditOpen(true);
  };

  const handleDelete = async () => {
    if (!selectedExpense) return;
    await deleteExpense.mutateAsync(selectedExpense._id);
    setIsDeleteOpen(false);
    setSelectedExpense(null);
  };

  const ExpenseForm = ({ reg, submit, errs, isSubmitting, title, onClose }: any) => {
    const [mounted, setMounted] = useState(false);
    useEffect(() => setMounted(true), []);
    if (!mounted) return null;
    return createPortal(
      <div className="fixed inset-0 bg-foreground/30 backdrop-blur-sm flex items-center justify-center z-[70] p-4">
        <div className="bg-surface rounded-2xl border border-border shadow-panel w-full max-w-md max-h-[90vh] overflow-y-auto p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display font-bold text-lg text-foreground">{title}</h2>
            <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><X className="w-5 h-5" /></button>
          </div>
          <form onSubmit={submit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormSelect label="Category *" options={EXPENSE_CATEGORIES.map((c) => ({ value: c, label: c }))} {...reg("category", { required: "Required" })} error={errs.category} />
              <FormNumber label="Amount (₹) *" prefix="₹" placeholder="5000" {...reg("amount", { required: "Required", valueAsNumber: true, min: { value: 1, message: "Must be > 0" } })} error={errs.amount} />
              <FormInput label="Date *" type="date" {...reg("date", { required: "Required" })} error={errs.date} />
              <FormSelect label="Payment Method" options={PAYMENT_METHODS.map((m) => ({ value: m, label: m }))} {...reg("paymentMethod")} />
              <div className="col-span-2">
                <FormInput label="Description" placeholder="Brief description" {...reg("description")} />
              </div>
              <div className="col-span-2">
                <FormInput label="Reference (optional)" placeholder="Bill no., receipt no…" {...reg("reference")} />
              </div>
            </div>
            <div className="flex gap-3 pt-4">
              <button type="button" onClick={onClose} className="flex-1 h-10 rounded-lg border border-border bg-surface text-sm font-display font-semibold hover:bg-secondary transition-colors">Cancel</button>
              <button type="submit" disabled={isSubmitting} className="flex-1 h-10 rounded-lg bg-brand text-white text-sm font-display font-semibold hover:bg-brand/90 disabled:opacity-50 transition-colors flex items-center justify-center gap-2">
                {isSubmitting ? <><div className="w-3 h-3 rounded-full border-2 border-white/30 border-t-white animate-spin" /><span>Saving...</span></> : "Save Expense"}
              </button>
            </div>
          </form>
        </div>
      </div>,
      document.body
    );
  };

  return (
    <AppLayout title="Expenses" subtitle="Track and manage business expenses">
      <PageHeader
        title="Expenses"
        description={`₹${totalExpenses.toLocaleString("en-IN")} total approved${pendingCount > 0 ? ` · ${pendingCount} pending approval` : ""}`}
        actions={
          <button onClick={() => setIsAddOpen(true)} className="flex items-center gap-2 h-9 px-4 rounded-lg bg-brand text-white text-sm font-display font-semibold hover:bg-brand/90 transition-colors">
            <Plus className="w-4 h-4" /> Add Expense
          </button>
        }
      />

      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="flex items-center gap-2 h-9 px-3 rounded-lg border border-border bg-surface flex-1 max-w-sm">
          <Search className="w-3.5 h-3.5 shrink-0 text-muted-foreground" />
          <input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="flex-1 bg-transparent outline-none placeholder:text-muted-foreground text-foreground text-sm" placeholder="Search expenses…" />
        </div>
        <select value={selectedCategory} onChange={(e) => setSelectedCategory(e.target.value)} className="h-9 px-3 rounded-lg border border-border bg-surface text-sm text-foreground outline-none">
          <option value="All">All Categories</option>
          {EXPENSE_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <select value={selectedStatus} onChange={(e) => setSelectedStatus(e.target.value)} className="h-9 px-3 rounded-lg border border-border bg-surface text-sm text-foreground outline-none">
          <option value="All">All Status</option>
          <option value="Approved">Approved</option>
          <option value="Pending Approval">Pending</option>
        </select>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20"><div className="w-8 h-8 rounded-full border-4 border-brand/20 border-t-brand animate-spin" /></div>
      ) : expenses.length === 0 ? (
        <EmptyState icon={Receipt} title="No expenses found" description="Add your first expense to start tracking costs." action={{ label: "Add Expense", onClick: () => setIsAddOpen(true) }} />
      ) : (
        <DataTable
          data={expenses}
          columns={[
            {
              key: "category",
              header: "Category",
              cell: (r) => (
                <div>
                  <p className="font-medium text-foreground">{r.category}</p>
                  <p className="text-xs text-muted-foreground">{r.description || "—"}</p>
                </div>
              ),
            },
            {
              key: "date",
              header: "Date",
              cell: (r) => <span className="text-muted-foreground text-sm">{new Date(r.date).toLocaleDateString("en-IN")}</span>,
            },
            {
              key: "amount",
              header: "Amount",
              cell: (r) => <span className="font-display font-semibold text-foreground">₹{(r.amount || 0).toLocaleString("en-IN")}</span>,
            },
            {
              key: "paymentMethod",
              header: "Payment",
              cell: (r) => <span className="text-foreground text-sm">{r.paymentMethod}</span>,
            },
            {
              key: "status",
              header: "Status",
              cell: (r) => <StatusBadge status={r.status === "Pending Approval" ? "Pending" : r.status} variant="payment" />,
            },
            {
              key: "actions",
              header: "Actions",
              cell: (r) => (
                <div className="flex items-center gap-2">
                  {r.status === "Pending Approval" && (
                    <button onClick={() => approveExpense.mutate(r._id)} className="flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-medium text-success hover:bg-success/10 transition-colors">
                      <CheckCircle className="w-3.5 h-3.5" /> Approve
                    </button>
                  )}
                  <button onClick={() => handleEdit(r)} className="flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-medium text-brand hover:bg-brand-light transition-colors">
                    <Pencil className="w-3.5 h-3.5" /> Edit
                  </button>
                  <button onClick={() => { setSelectedExpense(r); setIsDeleteOpen(true); }} className="flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-medium text-destructive hover:bg-destructive/10 transition-colors">
                    <Trash2 className="w-3.5 h-3.5" /> Delete
                  </button>
                </div>
              ),
            },
          ]}
        />
      )}

      {isAddOpen && <ExpenseForm reg={regAdd} submit={handleAddSubmit(onAddSubmit)} errs={addErrors} isSubmitting={createExpense.isPending} title="Add Expense" onClose={() => setIsAddOpen(false)} />}
      {isEditOpen && selectedExpense && <ExpenseForm reg={regEdit} submit={handleEditSubmit(onEditSubmit)} errs={editErrors} isSubmitting={updateExpense.isPending} title="Edit Expense" onClose={() => { setIsEditOpen(false); setSelectedExpense(null); }} />}

      <ConfirmDialog
        isOpen={isDeleteOpen}
        title="Delete Expense"
        message={`Delete this expense of ₹${selectedExpense?.amount.toLocaleString("en-IN")}? This cannot be undone.`}
        confirmText="Delete"
        isDestructive
        isLoading={deleteExpense.isPending}
        onConfirm={handleDelete}
        onCancel={() => { setIsDeleteOpen(false); setSelectedExpense(null); }}
      />
    </AppLayout>
  );
}
