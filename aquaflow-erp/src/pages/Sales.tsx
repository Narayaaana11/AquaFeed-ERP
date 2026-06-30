import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/ui/page-header";
import { DataTable } from "@/components/ui/data-table";
import { StatusBadge, EmptyState } from "@/components/StatusBadge";
import { FormSelect } from "@/components/forms";
import { Plus, Eye, FileText, Search, X, CheckCircle, Check, ChevronsUpDown, Printer, RotateCcw, Trash2 } from "lucide-react";
import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { useForm, useFieldArray } from "react-hook-form";
import { useNavigate } from "react-router-dom";
import { useSales, useCreateInvoice, useUpdateInvoiceStatus, useAddInvoicePayment, type Invoice } from "@/hooks/useSales";
import { useCreateCreditNote } from "@/hooks/useCreditNotes";
import { useCustomers } from "@/hooks/useCustomers";
import { useProducts } from "@/hooks/useProducts";
import { useWarehouses } from "@/hooks/useWarehouses";
import { useSales as useSalesWebSocket } from "@/hooks/useModuleWebSocket";
import { toast } from "sonner";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { cn } from "@/lib/utils";
interface CreateInvoiceFormData {
  customerId: string;
  paymentType: string;
  notes: string;
  paidAmount?: number;
  warehouseId?: string;
  date?: string;
  items: { productId: string; quantity: number; unitPrice: number }[];
}

export default function Sales() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState("All");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [isReturnOpen, setIsReturnOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [showAddPayment, setShowAddPayment] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState("Cash");
  const [paymentReference, setPaymentReference] = useState("");
  const [returnItems, setReturnItems] = useState<{ productId: string; productName: string; max: number; quantity: number; unitPrice: number }[]>([]);
  const [returnReason, setReturnReason] = useState("");
  const [isCustomerComboboxOpen, setIsCustomerComboboxOpen] = useState(false);
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
  const { data: warehouses = [] } = useWarehouses();

  const createInvoice = useCreateInvoice();
  const updateStatus = useUpdateInvoiceStatus();
  const addPayment = useAddInvoicePayment();
  const createCreditNote = useCreateCreditNote();

  const { register, control, handleSubmit, reset, watch, setValue, formState: { errors } } =
    useForm<CreateInvoiceFormData>({
      defaultValues: {
        customerId: "",
        paymentType: "Cash",
        notes: "",
        paidAmount: undefined,
        date: new Date().toISOString().split("T")[0],
        items: [{ productId: "", quantity: 1, unitPrice: 0 }],
      },
    });

  useEffect(() => {
    if (warehouses.length > 0) {
      const defaultWh = warehouses.find((w) => w.isDefault) || warehouses[0];
      if (defaultWh) {
        setValue("warehouseId", defaultWh._id);
      }
    }
  }, [warehouses, setValue]);

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
        warehouseId: data.warehouseId,
        date: data.date,
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
      referenceNumber: paymentReference,
    });
    
    setPaymentReference("");
    setShowAddPayment(false);
    setIsViewOpen(false);
  };

  const handleOpenReturn = (invoice: Invoice) => {
    setSelectedInvoice(invoice);
    setReturnItems(invoice.items.map((item) => ({
      productId: item.product,
      productName: item.productName,
      max: item.quantity,
      quantity: 0,
      unitPrice: item.unitPrice,
    })));
    setReturnReason("");
    setIsReturnOpen(true);
    setIsViewOpen(false);
  };

  const handleSubmitReturn = async () => {
    if (!selectedInvoice) return;
    const validItems = returnItems.filter((i) => i.quantity > 0);
    if (validItems.length === 0) {
      toast.error("Enter at least one quantity to return.");
      return;
    }
    await createCreditNote.mutateAsync({
      invoiceId: selectedInvoice._id,
      items: validItems.map((i) => ({ productId: i.productId, quantity: i.quantity })),
      reason: returnReason || "Product return",
    });
    setIsReturnOpen(false);
    setSelectedInvoice(null);
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
          mobileCard={(r) => {
            const balance = r.total - (r.paidAmount || 0);
            return (
              <div className="bg-surface rounded-xl border border-border shadow-sm p-4">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <FileText className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                      <span className="text-xs font-display font-semibold text-muted-foreground">{r.invoiceNumber}</span>
                      {r.tallyGuid && (
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-semibold bg-blue-100 text-blue-800 border border-blue-200 shrink-0">Tally</span>
                      )}
                    </div>
                    <p className="font-display font-semibold text-sm text-foreground truncate">{r.customerName}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{new Date(r.date || r.createdAt).toLocaleDateString("en-IN")} · {r.paymentType}</p>
                  </div>
                  <StatusBadge status={r.status} variant="payment" />
                </div>
                <div className="flex items-center justify-between mt-3 pt-2 border-t border-border/60">
                  <div className="flex gap-4 text-xs">
                    <div>
                      <p className="text-muted-foreground">Total</p>
                      <p className="font-display font-bold text-foreground">₹{(r.total || 0).toLocaleString("en-IN")}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Balance</p>
                      <p className={`font-display font-bold ${balance > 0 ? "text-brand" : "text-success"}`}>₹{balance.toLocaleString("en-IN")}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button onClick={() => handleView(r)} className="flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-medium text-brand hover:bg-brand-light transition-colors">
                      <Eye className="w-3.5 h-3.5" /> View
                    </button>
                    {(r.status === "Pending" || r.status === "Credit") && (
                      <button onClick={() => handleMarkPaid(r)} className="flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-medium text-success hover:bg-success/10 transition-colors">
                        <CheckCircle className="w-3.5 h-3.5" /> Paid
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          }}
          columns={[
            {
              key: "invoiceNumber",
              header: "Invoice",
              cell: (r) => (
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-muted-foreground shrink-0" />
                  <span className="font-medium text-foreground">{r.invoiceNumber}</span>
                  {r.tallyGuid && (
                    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-blue-100 text-blue-800 border border-blue-200">Tally</span>
                  )}
                </div>
              ),
            },
            {
              key: "customerName",
              header: "Customer",
              cell: (r) => <span className="text-foreground">{r.customerName}</span>,
            },
            {
              key: "date",
              header: "Date",
              cell: (r) => <span className="text-muted-foreground text-xs">{new Date(r.date || r.createdAt).toLocaleDateString("en-IN")}</span>,
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
        <div className="fixed inset-0 bg-foreground/30 backdrop-blur-sm flex items-end sm:items-center justify-center z-[70] p-0 sm:p-4">
          <div className="bg-surface rounded-t-2xl sm:rounded-2xl border border-border shadow-panel w-full sm:max-w-2xl max-h-[95vh] sm:max-h-[90vh] overflow-y-auto p-5 sm:p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="font-display font-bold text-lg text-foreground">Create Invoice</h2>
              <button onClick={() => setIsCreateOpen(false)} className="text-muted-foreground hover:text-foreground">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit(onCreateSubmit)} className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-display font-medium text-foreground">Date <span className="text-destructive">*</span></label>
                  <input
                    type="date"
                    {...register("date", { required: true })}
                    className="w-full px-3 py-2 rounded-lg border border-border bg-surface text-sm text-foreground outline-none focus:ring-2 focus:ring-brand/50"
                  />
                  {errors.date && (
                    <p className="text-xs text-destructive">{errors.date.message}</p>
                  )}
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-display font-medium text-foreground">Customer <span className="text-destructive">*</span></label>
                  <Popover open={isCustomerComboboxOpen} onOpenChange={setIsCustomerComboboxOpen}>
                    <PopoverTrigger asChild>
                      <button
                        type="button"
                        role="combobox"
                        aria-expanded={isCustomerComboboxOpen}
                        className={cn(
                          "flex w-full items-center justify-between rounded-md border h-10 px-3 py-2 text-sm",
                          errors.customerId ? "border-destructive focus:ring-destructive/50" : "border-input bg-background focus:ring-brand/50",
                          !watch("customerId") && "text-muted-foreground"
                        )}
                      >
                        <span className="truncate">
                          {watch("customerId")
                            ? (() => {
                                const c = customers.find((c) => c._id === watch("customerId"));
                                return c ? `${c.name}${c.outstandingBalance > 0 ? ` (₹${c.outstandingBalance.toLocaleString("en-IN")} outstanding)` : ""}` : "Select customer...";
                              })()
                            : "Select customer..."}
                        </span>
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[380px] p-0 z-[100]" align="start">
                      <Command>
                        <CommandInput placeholder="Search customers..." />
                        <CommandList>
                          <CommandEmpty>No customer found.</CommandEmpty>
                          <CommandGroup>
                            {customers.map((c) => (
                              <CommandItem
                                key={c._id}
                                value={`${c.name} ${c.phone} ${c._id}`}
                                onSelect={() => {
                                  setValue("customerId", c._id, { shouldValidate: true });
                                  setIsCustomerComboboxOpen(false);
                                }}
                              >
                                <Check
                                  className={cn(
                                    "mr-2 h-4 w-4",
                                    watch("customerId") === c._id ? "opacity-100" : "opacity-0"
                                  )}
                                />
                                <div className="flex flex-col">
                                  <span className="font-medium">{c.name}</span>
                                  {c.phone && <span className="text-xs text-muted-foreground">{c.phone}</span>}
                                </div>
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                  {errors.customerId && (
                    <p className="text-xs text-destructive">{errors.customerId.message}</p>
                  )}
                </div>
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
                <div className="col-span-2">
                  <FormSelect
                    label="Dispatch Warehouse *"
                    options={warehouses.map((w) => ({ value: w._id, label: w.name }))}
                    name="warehouseId" control={control} required
                    error={errors.warehouseId}
                  />
                </div>
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
                    <div key={field.id} className="flex flex-col sm:flex-row gap-2 sm:gap-3 sm:items-end p-2 sm:p-0 rounded-lg sm:rounded-none bg-white sm:bg-transparent border sm:border-0 border-border/50">
                      <div className="flex-1">
                        <label className="text-[10px] font-semibold text-muted-foreground uppercase sm:hidden mb-1 block">Product</label>
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
                      <div className="flex gap-2 items-end">
                        <div className="flex-1">
                          <label className="text-[10px] font-semibold text-muted-foreground uppercase sm:hidden mb-1 block">Qty</label>
                          <input
                            type="number"
                            min="1"
                            {...register(`items.${idx}.quantity` as const, { valueAsNumber: true })}
                            className="w-full sm:w-20 h-9 px-2 rounded-lg border border-border bg-surface text-sm outline-none focus:ring-2 focus:ring-brand/50"
                            placeholder="Qty"
                          />
                        </div>
                        <div className="flex-1">
                          <label className="text-[10px] font-semibold text-muted-foreground uppercase sm:hidden mb-1 block">Unit Price</label>
                          <input
                            type="number"
                            {...register(`items.${idx}.unitPrice` as const, { valueAsNumber: true })}
                            className="w-full sm:w-28 h-9 px-2 rounded-lg border border-border bg-surface text-sm outline-none focus:ring-2 focus:ring-brand/50"
                            placeholder="Price"
                          />
                        </div>
                        <button type="button" onClick={() => remove(idx)} className="h-9 px-2 rounded-lg text-destructive hover:bg-destructive/10 transition-colors shrink-0">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
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
        <div className="fixed inset-0 bg-foreground/30 backdrop-blur-sm flex items-end sm:items-center justify-center z-[70] p-0 sm:p-4">
          <div className="bg-surface rounded-t-2xl sm:rounded-2xl border border-border shadow-panel w-full sm:max-w-2xl max-h-[95vh] sm:max-h-[90vh] overflow-y-auto p-5 sm:p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="font-display font-bold text-lg text-foreground">Invoice Details</h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {selectedInvoice.invoiceNumber} · {new Date(selectedInvoice.date || selectedInvoice.createdAt).toLocaleDateString("en-IN")}
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

            {/* Mobile items view */}
            <div className="sm:hidden space-y-2.5 mb-4">
              {selectedInvoice.items.map((item, i) => (
                <div key={i} className="p-3.5 rounded-xl bg-secondary/50 border border-border/80">
                  <div className="flex justify-between items-start gap-2">
                    <div>
                      <p className="font-display font-semibold text-sm text-foreground">{item.productName}</p>
                      {item.hsnCode && <p className="text-[10px] text-muted-foreground mt-0.5">HSN: {item.hsnCode}</p>}
                    </div>
                    <p className="font-display font-bold text-sm text-brand">₹{(item.lineTotal || 0).toLocaleString("en-IN")}</p>
                  </div>
                  <div className="flex justify-between text-xs text-muted-foreground mt-2 pt-2 border-t border-border/45">
                    <span>Quantity: <strong className="text-foreground">{item.quantity}</strong> bags</span>
                    <span>Price: <strong className="text-foreground">₹{(item.unitPrice || 0).toLocaleString("en-IN")}</strong>/bag</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop table view */}
            <div className="hidden sm:block overflow-x-auto mb-4 bg-surface rounded-xl border border-border/60">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-background">
                    <th className="px-4 py-2.5 text-left text-xs font-display font-semibold text-muted-foreground uppercase tracking-wide">Product</th>
                    <th className="px-4 py-2.5 text-right text-xs font-display font-semibold text-muted-foreground uppercase tracking-wide">Qty</th>
                    <th className="px-4 py-2.5 text-right text-xs font-display font-semibold text-muted-foreground uppercase tracking-wide">Unit Price</th>
                    <th className="px-4 py-2.5 text-right text-xs font-display font-semibold text-muted-foreground uppercase tracking-wide">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedInvoice.items.map((item, i) => (
                    <tr key={i} className="border-b border-border last:border-0 hover:bg-background/40 transition-colors">
                      <td className="px-4 py-3">
                        <div className="font-medium text-foreground">{item.productName}</div>
                        {item.hsnCode && <div className="text-[10px] text-muted-foreground">HSN: {item.hsnCode}</div>}
                      </td>
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
                      <span className="text-muted-foreground">{new Date(p.date).toLocaleDateString("en-IN")} ({p.paymentType}){p.referenceNumber ? ` - Ref: ${p.referenceNumber}` : ''}</span>
                      <span className="font-medium text-foreground">₹{p.amount.toLocaleString("en-IN")}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex justify-end mb-6">
              <div className="text-right w-full sm:w-64">
                <div className="flex justify-between text-sm text-muted-foreground"><span>Subtotal:</span><span>₹{(selectedInvoice.subtotal || 0).toLocaleString("en-IN")}</span></div>
                <div className="flex justify-between text-sm text-muted-foreground mt-1"><span>GST ({selectedInvoice.gstRate}%):</span><span>₹{(selectedInvoice.gstAmount || 0).toLocaleString("en-IN")}</span></div>
                
                {(selectedInvoice.cgstAmount || selectedInvoice.sgstAmount || selectedInvoice.igstAmount) ? (
                  <div className="mt-1 space-y-0.5 border-l-2 border-border/50 pl-2">
                    {selectedInvoice.cgstAmount ? <div className="flex justify-between text-[11px] text-muted-foreground"><span>CGST:</span><span>₹{selectedInvoice.cgstAmount.toLocaleString("en-IN")}</span></div> : null}
                    {selectedInvoice.sgstAmount ? <div className="flex justify-between text-[11px] text-muted-foreground"><span>SGST:</span><span>₹{selectedInvoice.sgstAmount.toLocaleString("en-IN")}</span></div> : null}
                    {selectedInvoice.igstAmount ? <div className="flex justify-between text-[11px] text-muted-foreground"><span>IGST:</span><span>₹{selectedInvoice.igstAmount.toLocaleString("en-IN")}</span></div> : null}
                  </div>
                ) : null}
                
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
                <div className="mt-3">
                  <label className="block text-xs text-muted-foreground mb-1">Reference Number / Transaction ID (Optional)</label>
                  <input
                    type="text"
                    value={paymentReference}
                    onChange={(e) => setPaymentReference(e.target.value)}
                    className="w-full h-9 px-3 rounded-lg border border-border bg-surface text-sm outline-none"
                    placeholder="e.g. UTR / Cheque No."
                  />
                </div>
                <div className="flex gap-2 mt-3">
                  <button onClick={handleAddPayment} disabled={addPayment.isPending} className="px-3 h-8 rounded-md bg-brand text-white text-xs font-medium">Save Payment</button>
                  <button onClick={() => setShowAddPayment(false)} className="px-3 h-8 rounded-md border border-border bg-surface text-xs font-medium">Cancel</button>
                </div>
              </div>
            )}

            <div className="flex flex-wrap gap-2 pt-4 border-t border-border">
              <button onClick={() => { setIsViewOpen(false); setShowAddPayment(false); }} className="flex-1 min-w-[80px] h-10 rounded-lg border border-border bg-surface text-sm font-display font-semibold hover:bg-secondary transition-colors">Close</button>
              {/* Print Invoice */}
              <button
                onClick={() => window.open(`/sales/${selectedInvoice._id}/print`, "_blank")}
                className="h-10 px-3 rounded-lg border border-border bg-surface text-sm font-display font-semibold hover:bg-secondary transition-colors flex items-center gap-1.5 text-muted-foreground"
              >
                <Printer className="w-4 h-4" /> Print
              </button>
              {/* Return / Credit Note */}
              {(selectedInvoice.status === "Paid" || selectedInvoice.status === "Credit" || selectedInvoice.status === "Overdue") && (
                <button
                  onClick={() => handleOpenReturn(selectedInvoice)}
                  className="h-10 px-3 rounded-lg border border-warning/40 text-warning text-sm font-display font-semibold hover:bg-warning/10 transition-colors flex items-center gap-1.5"
                >
                  <RotateCcw className="w-4 h-4" /> Return
                </button>
              )}
              {(selectedInvoice.status === "Pending" || selectedInvoice.status === "Credit") && !showAddPayment && (
                <button
                  onClick={() => {
                    setPaymentAmount(selectedInvoice.total - (selectedInvoice.paidAmount || 0));
                    setShowAddPayment(true);
                  }}
                  className="flex-1 min-w-[120px] h-10 rounded-lg bg-success text-white text-sm font-display font-semibold hover:bg-success/90 transition-colors flex items-center justify-center gap-2"
                >
                  <Plus className="w-4 h-4" /> Add Payment
                </button>
              )}
            </div>
          </div>
        </div>,
        document.body
      )}
      {/* Return / Credit Note Modal */}
      {mounted && isReturnOpen && selectedInvoice && createPortal(
        <div className="fixed inset-0 bg-foreground/30 backdrop-blur-sm flex items-end sm:items-center justify-center z-[80] p-0 sm:p-4">
          <div className="bg-surface rounded-t-2xl sm:rounded-2xl border border-border shadow-panel w-full sm:max-w-lg max-h-[95vh] sm:max-h-[90vh] overflow-y-auto p-5 sm:p-6">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="font-display font-bold text-lg text-foreground">Return / Credit Note</h2>
                <p className="text-sm text-muted-foreground">Invoice: {selectedInvoice.invoiceNumber} · {selectedInvoice.customerName}</p>
              </div>
              <button onClick={() => setIsReturnOpen(false)} className="text-muted-foreground hover:text-foreground">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mb-4 p-3 rounded-lg bg-warning/5 border border-warning/20">
              <p className="text-xs text-warning font-medium">⚠️ Returned stock will be added back to inventory and customer outstanding will be reduced.</p>
            </div>

            <div className="space-y-3 mb-4">
              <p className="text-xs font-display font-semibold text-muted-foreground uppercase tracking-wide">Select Items & Quantities to Return</p>
              {returnItems.map((item, i) => (
                <div key={i} className="flex items-center gap-3 p-3 rounded-lg border border-border">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-foreground">{item.productName}</p>
                    <p className="text-xs text-muted-foreground">Max returnable: {item.max} bags · ₹{item.unitPrice}/bag</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setReturnItems(prev => prev.map((it, idx) => idx === i ? { ...it, quantity: Math.max(0, it.quantity - 1) } : it))}
                      className="w-7 h-7 rounded-full border border-border flex items-center justify-center text-sm hover:bg-secondary transition-colors"
                    >−</button>
                    <span className="w-8 text-center font-display font-bold text-foreground">{item.quantity}</span>
                    <button
                      type="button"
                      onClick={() => setReturnItems(prev => prev.map((it, idx) => idx === i ? { ...it, quantity: Math.min(it.max, it.quantity + 1) } : it))}
                      className="w-7 h-7 rounded-full border border-border flex items-center justify-center text-sm hover:bg-secondary transition-colors"
                    >+</button>
                  </div>
                  <span className="w-24 text-right text-sm font-medium text-foreground">
                    ₹{(item.quantity * item.unitPrice).toLocaleString("en-IN")}
                  </span>
                </div>
              ))}
            </div>

            <div className="mb-4">
              <p className="text-xs font-display font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">Reason for Return</p>
              <textarea
                value={returnReason}
                onChange={(e) => setReturnReason(e.target.value)}
                rows={2}
                placeholder="e.g., Damaged goods, Wrong product delivered..."
                className="w-full px-3 py-2 rounded-lg border border-border bg-surface text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-brand/50 resize-none"
              />
            </div>

            <div className="flex items-center justify-between p-3 rounded-xl bg-warning/10 border border-warning/20 mb-4">
              <span className="text-sm font-display font-semibold text-foreground">Credit Note Total</span>
              <span className="text-lg font-display font-bold text-warning">
                ₹{returnItems.reduce((s, i) => s + i.quantity * i.unitPrice, 0).toLocaleString("en-IN")}
              </span>
            </div>

            <div className="flex gap-3">
              <button onClick={() => setIsReturnOpen(false)} className="flex-1 h-10 rounded-lg border border-border bg-surface text-sm font-display font-semibold hover:bg-secondary transition-colors">
                Cancel
              </button>
              <button
                onClick={handleSubmitReturn}
                disabled={createCreditNote.isPending || returnItems.every(i => i.quantity === 0)}
                className="flex-1 h-10 rounded-lg bg-warning text-white text-sm font-display font-semibold hover:bg-warning/90 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
              >
                {createCreditNote.isPending ? (
                  <><div className="w-3 h-3 rounded-full border-2 border-white/30 border-t-white animate-spin" /><span>Processing...</span></>
                ) : "Issue Credit Note"}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </AppLayout>
  );
}
