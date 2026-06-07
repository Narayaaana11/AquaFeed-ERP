import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/ui/page-header";
import { DataTable } from "@/components/ui/data-table";
import { StatusBadge, EmptyState } from "@/components/StatusBadge";
import { FormSelect } from "@/components/forms";
import { Plus, Eye, Download, FileText, Search, X, Trash2, CheckCircle } from "lucide-react";
import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { useForm, useFieldArray } from "react-hook-form";
import { useSales, useCreateInvoice, useUpdateInvoiceStatus, useAddInvoicePayment, type Invoice } from "@/hooks/useSales";
import { useCustomers } from "@/hooks/useCustomers";
import { useProducts } from "@/hooks/useProducts";
import { useSales as useSalesWebSocket } from "@/hooks/useModuleWebSocket";
import { toast } from "sonner";

interface CreateInvoiceFormData {
  customerId: string;
  paymentType: string;
  notes: string;
  paidAmount?: number;
  items: { productId: string; quantity: number; unitPrice: number }[];
}

export default function Sales() {
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState("All");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [showAddPayment, setShowAddPayment] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState("Cash");
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const { data: salesData, isLoading, refetch } = useSales({
    search: searchQuery || undefined,
    status: filterStatus !== "All" ? filterStatus : undefined,
  });
  const invoices = salesData?.data || [];

  // WebSocket integration for sales updates
  useSalesWebSocket(
    () => {
      console.log("💰 Invoice created via WebSocket");
      refetch();
    },
    () => {
      console.log("💰 Invoice updated via WebSocket");
      refetch();
    },
    () => {
      console.log("💰 Invoice paid via WebSocket");
      refetch();
    }
  );

  const { data: customers = [] } = useCustomers();
  const { data: products = [] } = useProducts();

  const createInvoice = useCreateInvoice();
  const updateStatus = useUpdateInvoiceStatus();
  const addPayment = useAddInvoicePayment();

  const { register, control, handleSubmit, reset, watch, setValue, formState: { errors } } =
    useForm<CreateInvoiceFormData>({
      defaultValues: {
        customerId: "",
        paymentType: "Cash",
        notes: "",
        paidAmount: undefined,
        items: [{ productId: "", quantity: 1, unitPrice: 0 }],
      },
    });

  const { fields, append, remove } = useFieldArray({ control, name: "items" });

  const watchedItems = watch("items");
  const gstRate = 5;
  const subtotal = watchedItems.reduce((sum, item) => sum + (item.quantity || 0) * (item.unitPrice || 0), 0);
  const gstAmount = Math.round(subtotal * (gstRate / 100));
  const total = subtotal + gstAmount;

  const handleProductChange = (index: number, productId: string) => {
    const product = products.find((p) => p._id === productId);
    if (product) {
      setValue(`items.${index}.unitPrice`, product.price);
    }
  };

  const onCreateSubmit = async (data: CreateInvoiceFormData) => {
    try {
      const validItems = data.items.filter((i) => i.productId && i.quantity > 0);
      if (validItems.length === 0) {
        toast.error("Please add at least one product.");
        return;
      }
      await createInvoice.mutateAsync({
        customerId: data.customerId,
        paymentType: data.paymentType,
        notes: data.notes,
        paidAmount: data.paymentType === 'Split' ? data.paidAmount : undefined,
        items: validItems.map((i) => ({
          productId: i.productId,
          quantity: i.quantity,
          unitPrice: i.unitPrice,
        })),
      });
      reset();
      setIsCreateOpen(false);
    } catch {
      // errors handled by hook
    }
  };

  const handleView = (invoice: Invoice) => {
    setSelectedInvoice(invoice);
    setShowAddPayment(false);
    setIsViewOpen(true);
  };

  const handleMarkPaid = async (invoice: Invoice) => {
    const balance = invoice.total - (invoice.paidAmount || 0);
    await addPayment.mutateAsync({ id: invoice._id, amount: balance, paymentType: "Cash" });
  };

  const handleAddPayment = async () => {
    if (!selectedInvoice) return;
    if (paymentAmount <= 0) {
      toast.error("Amount must be greater than 0");
      return;
    }
    const balance = selectedInvoice.total - (selectedInvoice.paidAmount || 0);
    if (paymentAmount > balance) {
      toast.error(`Amount cannot exceed balance of ₹${balance}`);
      return;
    }
    
    await addPayment.mutateAsync({
      id: selectedInvoice._id,
      amount: paymentAmount,
      paymentType: paymentMethod,
    });
    
    setShowAddPayment(false);
    setIsViewOpen(false);
  };

  return (
    <AppLayout title="Sales & Billing" subtitle="Manage invoices and payments">
      <PageHeader
        title="Sales & Invoices"
        description={`${invoices.length} invoices total`}
        actions={
          <button
            onClick={() => setIsCreateOpen(true)}
            className="flex items-center gap-2 h-9 px-4 rounded-lg bg-brand text-white text-sm font-display font-semibold hover:bg-brand/90 transition-colors"
          >
            <Plus className="w-4 h-4" /> Create Invoice
          </button>
        }
      />

      {/* Search & Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="flex items-center gap-2 h-9 px-3 rounded-lg border border-border bg-surface flex-1 max-w-sm">
          <Search className="w-3.5 h-3.5 shrink-0 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search invoices…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1 bg-transparent outline-none placeholder:text-muted-foreground text-foreground text-sm"
          />
        </div>
        <div className="flex items-center gap-1 overflow-x-auto pb-2 sm:pb-0">
          {["All", "Paid", "Pending", "Credit", "Overdue"].map((status) => (
            <button
              key={status}
              onClick={() => setFilterStatus(status)}
              className={`h-9 px-4 rounded-full text-xs font-display font-semibold whitespace-nowrap border transition-colors ${status === filterStatus
                  ? "bg-brand text-white border-brand"
                  : "border-border text-foreground hover:bg-secondary"
                }`}
            >
              {status}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 rounded-full border-4 border-brand/20 border-t-brand animate-spin" />
        </div>
      ) : invoices.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="No invoices found"
          description="Create your first invoice to track sales and payments."
          action={{ label: "Create Invoice", onClick: () => setIsCreateOpen(true) }}
        />
      ) : (
        <DataTable
          data={invoices}
          columns={[
            {
              key: "invoiceNumber",
              header: "Invoice",
              cell: (r) => (
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-muted-foreground shrink-0" />
                  <span className="font-medium text-foreground">{r.invoiceNumber}</span>
                </div>
              ),
            },
            {
              key: "customerName",
              header: "Customer",
              cell: (r) => <span className="text-foreground">{r.customerName}</span>,
            },
            {
              key: "createdAt",
              header: "Date",
              cell: (r) => <span className="text-muted-foreground text-xs">{new Date(r.createdAt).toLocaleDateString("en-IN")}</span>,
            },
            {
              key: "total",
              header: "Total",
              cell: (r) => <span className="font-display font-semibold text-foreground">₹{(r.total || 0).toLocaleString("en-IN")}</span>,
            },
            {
              key: "balance",
              header: "Balance",
              cell: (r) => {
                const balance = r.total - (r.paidAmount || 0);
                return (
                  <span className={`font-display font-semibold ${balance > 0 ? "text-brand" : "text-success"}`}>
                    ₹{balance.toLocaleString("en-IN")}
                  </span>
                );
              },
            },
            {
              key: "paymentType",
              header: "Payment",
              cell: (r) => <span className="text-foreground text-sm">{r.paymentType}</span>,
            },
            {
              key: "status",
              header: "Status",
              cell: (r) => <StatusBadge status={r.status} variant="payment" />,
            },
            {
              key: "actions",
              header: "Actions",
              cell: (r) => (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleView(r)}
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-medium text-brand hover:bg-brand-light transition-colors"
                  >
                    <Eye className="w-3.5 h-3.5" /> View
                  </button>
                  {(r.status === "Pending" || r.status === "Credit") && (
                    <button
                      onClick={() => handleMarkPaid(r)}
                      className="flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-medium text-success hover:bg-success/10 transition-colors"
                    >
                      <CheckCircle className="w-3.5 h-3.5" /> Mark Paid
                    </button>
                  )}
                </div>
              ),
            },
          ]}
        />
      )}

      {/* Create Invoice Modal */}
      {mounted && isCreateOpen && createPortal(
        <div className="fixed inset-0 bg-foreground/30 backdrop-blur-sm flex items-center justify-center z-[70] p-4">
          <div className="bg-surface rounded-2xl border border-border shadow-panel w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="font-display font-bold text-lg text-foreground">Create Invoice</h2>
              <button onClick={() => setIsCreateOpen(false)} className="text-muted-foreground hover:text-foreground">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit(onCreateSubmit)} className="space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <FormSelect
                  label="Customer *"
                  options={customers.map((c) => ({ value: c._id, label: `${c.name}${c.outstandingBalance > 0 ? ` (₹${c.outstandingBalance.toLocaleString("en-IN")} outstanding)` : ""}` }))}
                  {...register("customerId", { required: "Customer is required" })}
                  error={errors.customerId}
                />
                <FormSelect
                  label="Payment Type"
                  options={[
                    { value: "Cash", label: "Cash" },
                    { value: "UPI", label: "UPI" },
                    { value: "Cheque", label: "Cheque" },
                    { value: "Credit", label: "Credit" },
                    { value: "Bank Transfer", label: "Bank Transfer" },
                    { value: "Split", label: "Split (Partial Payment)" },
                  ]}
                  name="paymentType" control={control} 
                />
              </div>

              {watch("paymentType") === "Split" && (
                <div>
                  <label className="block text-sm font-display font-medium text-foreground mb-1.5">Amount Paid Upfront</label>
                  <input
                    type="number"
                    min="0"
                    max={total}
                    {...register("paidAmount", { valueAsNumber: true })}
                    className="w-full px-3 py-2 rounded-lg border border-border bg-surface text-sm text-foreground outline-none focus:ring-2 focus:ring-brand/50"
                    placeholder={`Total is ₹${total.toLocaleString("en-IN")}`}
                  />
                  <p className="text-xs text-muted-foreground mt-1">Remaining balance will be added to customer's credit.</p>
                </div>
              )}

              {/* Line Items */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <label className="text-sm font-display font-semibold text-foreground">Products</label>
                  <button
                    type="button"
                    onClick={() => append({ productId: "", quantity: 1, unitPrice: 0 })}
                    className="text-xs text-brand font-display font-medium hover:underline"
                  >
                    + Add Item
                  </button>
                </div>

                <div className="space-y-3 p-4 bg-secondary rounded-lg">
                  {fields.map((field, idx) => (
                    <div key={field.id} className="flex gap-3 items-end">
                      <div className="flex-1">
                        <select
                          {...register(`items.${idx}.productId` as const)}
                          onChange={(e) => {
                            const val = e.target.value;
                            register(`items.${idx}.productId`).onChange(e);
                            handleProductChange(idx, val);
                          }}
                          className="w-full h-9 px-2 rounded-lg border border-border bg-surface text-sm outline-none focus:ring-2 focus:ring-brand/50"
                        >
                          <option value="">Select product…</option>
                          {products.map((p) => (
                            <option key={p._id} value={p._id}>
                              {p.name} — ₹{p.price.toLocaleString("en-IN")} (Stock: {p.stock})
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="w-20">
                        <input
                          type="number"
                          min="1"
                          {...register(`items.${idx}.quantity` as const, { valueAsNumber: true })}
                          className="w-full h-9 px-2 rounded-lg border border-border bg-surface text-sm outline-none focus:ring-2 focus:ring-brand/50"
                          placeholder="Qty"
                        />
                      </div>
                      <div className="w-28">
                        <input
                          type="number"
                          {...register(`items.${idx}.unitPrice` as const, { valueAsNumber: true })}
                          className="w-full h-9 px-2 rounded-lg border border-border bg-surface text-sm outline-none focus:ring-2 focus:ring-brand/50"
                          placeholder="Price"
                        />
                      </div>
                      <button type="button" onClick={() => remove(idx)} className="h-9 px-2 rounded-lg text-destructive hover:bg-destructive/10 transition-colors">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm font-display font-medium text-foreground mb-1.5">Notes (optional)</label>
                <textarea
                  {...register("notes")}
                  rows={2}
                  className="w-full px-3 py-2 rounded-lg border border-border bg-surface text-sm text-foreground outline-none focus:ring-2 focus:ring-brand/50 resize-none"
                  placeholder="Any special instructions…"
                />
              </div>

              {/* Total Summary */}
              <div className="border-t border-border pt-4">
                <div className="flex justify-between items-center"><p className="text-sm text-muted-foreground">Subtotal:</p><p className="font-medium text-foreground">₹{subtotal.toLocaleString("en-IN")}</p></div>
                <div className="flex justify-between items-center mt-1"><p className="text-sm text-muted-foreground">GST ({gstRate}%):</p><p className="font-medium text-foreground">₹{gstAmount.toLocaleString("en-IN")}</p></div>
                <div className="flex justify-between items-center mt-2 pt-2 border-t border-border">
                  <p className="font-display font-semibold text-foreground">Total:</p>
                  <p className="font-display font-bold text-lg text-brand">₹{total.toLocaleString("en-IN")}</p>
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setIsCreateOpen(false)} className="flex-1 h-10 rounded-lg border border-border bg-surface text-sm font-display font-semibold hover:bg-secondary transition-colors">Cancel</button>
                <button
                  type="submit"
                  disabled={createInvoice.isPending}
                  className="flex-1 h-10 rounded-lg bg-brand text-white text-sm font-display font-semibold hover:bg-brand/90 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
                >
                  {createInvoice.isPending ? (
                    <><div className="w-3 h-3 rounded-full border-2 border-white/30 border-t-white animate-spin" /><span>Creating...</span></>
                  ) : "Save Invoice"}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* View Invoice Modal */}
      {mounted && isViewOpen && selectedInvoice && createPortal(
        <div className="fixed inset-0 bg-foreground/30 backdrop-blur-sm flex items-center justify-center z-[70] p-4">
          <div className="bg-surface rounded-2xl border border-border shadow-panel w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="font-display font-bold text-lg text-foreground">Invoice Details</h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {selectedInvoice.invoiceNumber} · {new Date(selectedInvoice.createdAt).toLocaleDateString("en-IN")}
                </p>
              </div>
              <button onClick={() => setIsViewOpen(false)} className="text-muted-foreground hover:text-foreground">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="border-b border-border pb-4 mb-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs font-display font-semibold uppercase tracking-wide text-muted-foreground">Customer</p>
                  <p className="mt-1 font-medium text-foreground">{selectedInvoice.customerName}</p>
                </div>
                <div>
                  <p className="text-xs font-display font-semibold uppercase tracking-wide text-muted-foreground">Payment Type</p>
                  <p className="mt-1 font-medium text-foreground">{selectedInvoice.paymentType}</p>
                </div>
              </div>
              <div className="mt-3">
                <StatusBadge status={selectedInvoice.status} variant="payment" />
              </div>
            </div>

            <div className="overflow-x-auto mb-4">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="px-4 py-2 text-left text-xs font-display font-semibold text-muted-foreground">Product</th>
                    <th className="px-4 py-2 text-right text-xs font-display font-semibold text-muted-foreground">Qty</th>
                    <th className="px-4 py-2 text-right text-xs font-display font-semibold text-muted-foreground">Unit Price</th>
                    <th className="px-4 py-2 text-right text-xs font-display font-semibold text-muted-foreground">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedInvoice.items.map((item, i) => (
                    <tr key={i} className="border-b border-border last:border-0">
                      <td className="px-4 py-3 font-medium text-foreground">{item.productName}</td>
                      <td className="px-4 py-3 text-right text-foreground">{item.quantity}</td>
                      <td className="px-4 py-3 text-right text-foreground">₹{(item.unitPrice || 0).toLocaleString("en-IN")}</td>
                      <td className="px-4 py-3 text-right font-semibold text-foreground">₹{(item.lineTotal || 0).toLocaleString("en-IN")}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {selectedInvoice.payments && selectedInvoice.payments.length > 0 && (
              <div className="mb-4">
                <p className="text-sm font-display font-semibold text-foreground mb-2">Payment History</p>
                <div className="bg-secondary rounded-lg p-3 space-y-2">
                  {selectedInvoice.payments.map((p, i) => (
                    <div key={i} className="flex justify-between text-sm">
                      <span className="text-muted-foreground">{new Date(p.date).toLocaleDateString("en-IN")} ({p.paymentType})</span>
                      <span className="font-medium text-foreground">₹{p.amount.toLocaleString("en-IN")}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex justify-end mb-6">
              <div className="text-right w-64">
                <div className="flex justify-between text-sm text-muted-foreground"><span>Subtotal:</span><span>₹{(selectedInvoice.subtotal || 0).toLocaleString("en-IN")}</span></div>
                <div className="flex justify-between text-sm text-muted-foreground mt-1"><span>GST ({selectedInvoice.gstRate}%):</span><span>₹{(selectedInvoice.gstAmount || 0).toLocaleString("en-IN")}</span></div>
                <div className="flex justify-between border-t border-border mt-2 pt-2">
                  <span className="font-display font-semibold text-foreground">Total:</span>
                  <span className="font-display font-semibold text-foreground">₹{(selectedInvoice.total || 0).toLocaleString("en-IN")}</span>
                </div>
                <div className="flex justify-between text-sm text-success mt-1">
                  <span>Paid:</span><span>-₹{(selectedInvoice.paidAmount || 0).toLocaleString("en-IN")}</span>
                </div>
                <div className="flex justify-between border-t border-border mt-2 pt-2">
                  <span className="font-display font-bold text-foreground">Balance Due:</span>
                  <span className="font-display font-bold text-lg text-brand">₹{(selectedInvoice.total - (selectedInvoice.paidAmount || 0)).toLocaleString("en-IN")}</span>
                </div>
              </div>
            </div>

            {selectedInvoice.notes && (
              <div className="mb-4 p-3 rounded-lg bg-secondary">
                <p className="text-xs font-display font-semibold text-muted-foreground mb-1">Notes</p>
                <p className="text-sm text-foreground">{selectedInvoice.notes}</p>
              </div>
            )}

            {showAddPayment && (selectedInvoice.status === "Pending" || selectedInvoice.status === "Credit") && (
              <div className="mb-4 p-4 rounded-lg border border-border bg-secondary/50">
                <h3 className="text-sm font-display font-semibold text-foreground mb-3">Record Payment</h3>
                <div className="flex gap-3">
                  <div className="flex-1">
                    <label className="block text-xs text-muted-foreground mb-1">Amount</label>
                    <input
                      type="number"
                      value={paymentAmount}
                      onChange={(e) => setPaymentAmount(Number(e.target.value))}
                      className="w-full h-9 px-3 rounded-lg border border-border bg-surface text-sm outline-none"
                    />
                  </div>
                  <div className="flex-1">
                    <label className="block text-xs text-muted-foreground mb-1">Method</label>
                    
      <Select value={String(paymentMethod)} onValueChange={(val) => setPaymentMethod(val)}>
        <SelectTrigger className="w-full h-9 px-3 rounded-lg border border-border bg-surface text-sm outline-none">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          
                      <SelectItem value={"Cash".toString()}>Cash</SelectItem>
                      <SelectItem value={"UPI".toString()}>UPI</SelectItem>
                      <SelectItem value={"Cheque".toString()}>Cheque</SelectItem>
                      <SelectItem value={"Bank Transfer".toString()}>Bank Transfer</SelectItem>
                    
        </SelectContent>
      </Select>
    
                  </div>
                </div>
                <div className="flex gap-2 mt-3">
                  <button onClick={handleAddPayment} disabled={addPayment.isPending} className="px-3 h-8 rounded-md bg-brand text-white text-xs font-medium">Save Payment</button>
                  <button onClick={() => setShowAddPayment(false)} className="px-3 h-8 rounded-md border border-border bg-surface text-xs font-medium">Cancel</button>
                </div>
              </div>
            )}

            <div className="flex gap-3 pt-4 border-t border-border">
              <button onClick={() => { setIsViewOpen(false); setShowAddPayment(false); }} className="flex-1 h-10 rounded-lg border border-border bg-surface text-sm font-display font-semibold hover:bg-secondary transition-colors">Close</button>
              {(selectedInvoice.status === "Pending" || selectedInvoice.status === "Credit") && !showAddPayment && (
                <button
                  onClick={() => {
                    setPaymentAmount(selectedInvoice.total - (selectedInvoice.paidAmount || 0));
                    setShowAddPayment(true);
                  }}
                  className="flex-1 h-10 rounded-lg bg-success text-white text-sm font-display font-semibold hover:bg-success/90 transition-colors flex items-center justify-center gap-2"
                >
                  <Plus className="w-4 h-4" /> Add Payment
                </button>
              )}
            </div>
          </div>
        </div>,
        document.body
      )}
    </AppLayout>
  );
}
