import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/ui/page-header";
import { DataTable } from "@/components/ui/data-table";
import { StatusBadge, EmptyState } from "@/components/StatusBadge";
import { Plus, Eye, Search, X, Printer, Trash2, CheckCircle, FileText } from "lucide-react";
import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { useForm, useFieldArray } from "react-hook-form";
import { useNavigate } from "react-router-dom";
import { useQuotations, useCreateQuotation, useUpdateQuotationStatus, useCancelQuotation, useConvertQuotation, type Quotation } from "@/hooks/useQuotations";
import { useCustomers } from "@/hooks/useCustomers";
import { useProducts } from "@/hooks/useProducts";
import { useQuotations as useQuotationsWebSocket } from "@/hooks/useModuleWebSocket";
import { toast } from "sonner";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { cn } from "@/lib/utils";

interface CreateQuotationFormData {
  customerId: string;
  notes: string;
  items: { productId: string; quantity: number; unitPrice: number }[];
}

export default function Quotations() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState("All");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [selectedQuotation, setSelectedQuotation] = useState<Quotation | null>(null);
  const [isCustomerComboboxOpen, setIsCustomerComboboxOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  
  useEffect(() => setMounted(true), []);

  const { data: quotationsData, isLoading, refetch } = useQuotations({
    search: searchQuery || undefined,
    status: filterStatus !== "All" ? filterStatus : undefined,
  });
  const quotations = quotationsData?.data || [];

  // WebSocket integration
  useQuotationsWebSocket(
    () => { refetch(); },
    () => { refetch(); },
    () => { refetch(); }
  );

  const { data: customers = [] } = useCustomers();
  const { data: products = [] } = useProducts();

  const createQuotation = useCreateQuotation();
  const updateStatus = useUpdateQuotationStatus();
  const cancelQuotation = useCancelQuotation();
  const convertQuotation = useConvertQuotation();

  const { register, control, handleSubmit, reset, watch, setValue } =
    useForm<CreateQuotationFormData>({
      defaultValues: {
        customerId: "",
        notes: "",
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

  const onCreateSubmit = async (data: CreateQuotationFormData) => {
    try {
      const validItems = data.items.filter((i) => i.productId && i.quantity > 0);
      if (validItems.length === 0) {
        toast.error("Please add at least one product.");
        return;
      }
      await createQuotation.mutateAsync({
        customerId: data.customerId,
        notes: data.notes,
        items: validItems.map((i) => ({
          productId: i.productId,
          quantity: i.quantity,
          unitPrice: i.unitPrice,
        })),
      });
      reset();
      setIsCreateOpen(false);
    } catch {
      // handled by hook
    }
  };

  const handleView = (quotation: Quotation) => {
    setSelectedQuotation(quotation);
    setIsViewOpen(true);
  };

  const handleConvertToInvoice = async () => {
    if (!selectedQuotation) return;
    try {
      await convertQuotation.mutateAsync(selectedQuotation._id);
      setIsViewOpen(false);
      navigate('/sales');
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async () => {
    if (!selectedQuotation) return;
    if (confirm('Are you sure you want to delete this quotation?')) {
      await cancelQuotation.mutateAsync(selectedQuotation._id);
      setIsViewOpen(false);
    }
  };

  return (
    <AppLayout title="Quotations" subtitle="Manage price estimates">
      <PageHeader
        title="Quotations"
        description={`${quotations.length} quotations total`}
        actions={
          <button
            onClick={() => setIsCreateOpen(true)}
            className="flex items-center gap-2 h-9 px-4 rounded-lg bg-brand text-white text-sm font-display font-semibold hover:bg-brand/90 transition-colors"
          >
            <Plus className="w-4 h-4" /> Create Quotation
          </button>
        }
      />

      {/* Search & Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="flex items-center gap-2 h-9 px-3 rounded-lg border border-border bg-surface flex-1 max-w-sm">
          <Search className="w-3.5 h-3.5 shrink-0 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search quotations…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1 bg-transparent outline-none placeholder:text-muted-foreground text-foreground text-sm"
          />
        </div>
        <div className="flex items-center gap-1 overflow-x-auto pb-2 sm:pb-0">
          {["All", "Draft", "Sent", "Accepted", "Rejected", "Converted"].map((status) => (
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
      ) : quotations.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="No quotations found"
          description={searchQuery ? "Try adjusting your search or filters." : "Create your first quotation to get started."}
          action={!searchQuery ? {
            label: "Create Quotation",
            onClick: () => setIsCreateOpen(true)
          } : undefined}
        />
      ) : (
        <DataTable
          data={quotations}
          columns={[
            {
              key: "date",
              header: "Date",
              cell: (q) => <span className="text-sm text-foreground">{new Date(q.createdAt).toLocaleDateString("en-IN")}</span>,
            },
            {
              key: "quotationNumber",
              header: "Quotation #",
              cell: (q) => <span className="font-display font-semibold text-brand">{q.quotationNumber}</span>,
            },
            {
              key: "customer",
              header: "Customer",
              cell: (q) => (
                <div>
                  <p className="font-medium text-foreground">{q.customerName}</p>
                  <p className="text-xs text-muted-foreground">{typeof q.customer === "object" ? q.customer.phone : ""}</p>
                </div>
              ),
            },
            {
              key: "amount",
              header: "Amount",
              cell: (q) => <span className="font-display font-semibold text-foreground">₹{q.total.toLocaleString("en-IN")}</span>,
            },
            {
              key: "status",
              header: "Status",
              cell: (q) => <StatusBadge status={q.status} />,
            },
            {
              key: "actions",
              header: "",
              cell: (q) => (
                <div className="flex justify-end">
                  <button
                    onClick={() => handleView(q)}
                    className="p-2 text-muted-foreground hover:text-brand transition-colors rounded-lg hover:bg-brand/10"
                  >
                    <Eye className="w-4 h-4" />
                  </button>
                </div>
              ),
            },
          ]}
          mobileCard={(q) => (
            <div className="bg-surface p-4 rounded-xl border border-border shadow-sm space-y-3">
              <div className="flex justify-between items-start">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-display font-semibold text-brand text-sm">{q.quotationNumber}</span>
                    <StatusBadge status={q.status} />
                  </div>
                  <p className="font-medium text-foreground text-sm">{q.customerName}</p>
                  <p className="text-xs text-muted-foreground">{new Date(q.createdAt).toLocaleDateString("en-IN")}</p>
                </div>
                <div className="text-right">
                  <span className="font-display font-bold text-foreground">₹{q.total.toLocaleString("en-IN")}</span>
                </div>
              </div>
              <div className="flex gap-2 pt-3 border-t border-border/50">
                <button
                  onClick={() => handleView(q)}
                  className="flex-1 flex items-center justify-center gap-2 h-8 rounded-lg bg-brand/10 text-brand text-xs font-semibold hover:bg-brand/20 transition-colors"
                >
                  <Eye className="w-3.5 h-3.5" /> View Details
                </button>
              </div>
            </div>
          )}
        />
      )}

      {/* Create Modal */}
      {mounted && isCreateOpen && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-0">
          <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" onClick={() => setIsCreateOpen(false)} />
          <div className="relative bg-surface w-full max-w-3xl rounded-2xl shadow-modal border border-border overflow-hidden flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between p-4 border-b border-border bg-secondary/50">
              <h2 className="font-display font-semibold text-lg text-foreground">New Quotation</h2>
              <button onClick={() => setIsCreateOpen(false)} className="p-2 text-muted-foreground hover:text-foreground rounded-full hover:bg-background transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleSubmit(onCreateSubmit)} className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-foreground border-b border-border pb-2">Customer Details</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2 flex flex-col">
                    <label className="text-xs font-medium text-foreground">Select Customer *</label>
                    <Popover open={isCustomerComboboxOpen} onOpenChange={setIsCustomerComboboxOpen}>
                      <PopoverTrigger asChild>
                        <button
                          type="button"
                          className={cn(
                            "flex h-9 w-full items-center justify-between rounded-lg border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-brand",
                            !watch("customerId") && "text-muted-foreground"
                          )}
                        >
                          {watch("customerId")
                            ? customers.find((c) => c._id === watch("customerId"))?.name
                            : "Search customer..."}
                        </button>
                      </PopoverTrigger>
                      <PopoverContent className="w-[300px] p-0" align="start">
                        <Command>
                          <CommandInput placeholder="Search customers..." />
                          <CommandList>
                            <CommandEmpty>No customer found.</CommandEmpty>
                            <CommandGroup>
                              {customers.map((c) => (
                                <CommandItem
                                  key={c._id}
                                  value={c.name}
                                  onSelect={() => {
                                    setValue("customerId", c._id);
                                    setIsCustomerComboboxOpen(false);
                                  }}
                                >
                                  {c.name}
                                  {watch("customerId") === c._id && <Check className="ml-auto h-4 w-4" />}
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-border pb-2">
                  <h3 className="text-sm font-semibold text-foreground">Products</h3>
                  <button type="button" onClick={() => append({ productId: "", quantity: 1, unitPrice: 0 })} className="text-xs font-medium text-brand hover:text-brand/80 flex items-center gap-1">
                    <Plus className="w-3.5 h-3.5" /> Add Row
                  </button>
                </div>
                
                <div className="space-y-3">
                  {fields.map((field, index) => (
                    <div key={field.id} className="flex flex-col sm:flex-row gap-3 items-end bg-secondary/30 p-3 rounded-lg border border-border/50">
                      <div className="flex-1 w-full space-y-1.5">
                        <label className="text-[11px] font-medium text-muted-foreground">Product</label>
                        <select
                          {...register(`items.${index}.productId` as const)}
                          onChange={(e) => handleProductChange(index, e.target.value)}
                          className="w-full h-9 px-3 rounded-lg border border-border bg-surface text-sm outline-none focus:border-brand"
                        >
                          <option value="">Select product...</option>
                          {products.map(p => (
                            <option key={p._id} value={p._id}>{p.name} (₹{p.price})</option>
                          ))}
                        </select>
                      </div>
                      <div className="w-full sm:w-24 space-y-1.5">
                        <label className="text-[11px] font-medium text-muted-foreground">Qty</label>
                        <input
                          type="number"
                          min="1"
                          {...register(`items.${index}.quantity` as const, { valueAsNumber: true })}
                          className="w-full h-9 px-3 rounded-lg border border-border bg-surface text-sm outline-none focus:border-brand"
                        />
                      </div>
                      <div className="w-full sm:w-32 space-y-1.5">
                        <label className="text-[11px] font-medium text-muted-foreground">Price</label>
                        <input
                          type="number"
                          min="0"
                          {...register(`items.${index}.unitPrice` as const, { valueAsNumber: true })}
                          className="w-full h-9 px-3 rounded-lg border border-border bg-surface text-sm outline-none focus:border-brand"
                        />
                      </div>
                      {fields.length > 1 && (
                        <button type="button" onClick={() => remove(index)} className="h-9 w-9 flex items-center justify-center shrink-0 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-4 border-t border-border pt-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-foreground">Notes</label>
                  <textarea
                    {...register("notes")}
                    className="w-full h-20 px-3 py-2 rounded-lg border border-border bg-surface text-sm outline-none focus:border-brand resize-none"
                    placeholder="Add any remarks or notes..."
                  />
                </div>
              </div>
            </form>

            <div className="p-4 sm:p-6 bg-secondary/30 border-t border-border flex flex-col sm:flex-row justify-between items-center gap-4">
              <div className="w-full sm:w-auto space-y-1 text-sm">
                <div className="flex justify-between sm:justify-start gap-4 text-muted-foreground">
                  <span>Subtotal:</span>
                  <span className="font-medium text-foreground">₹{subtotal.toLocaleString("en-IN")}</span>
                </div>
                <div className="flex justify-between sm:justify-start gap-4 text-muted-foreground">
                  <span>GST ({gstRate}%):</span>
                  <span className="font-medium text-foreground">₹{gstAmount.toLocaleString("en-IN")}</span>
                </div>
                <div className="flex justify-between sm:justify-start gap-4 pt-1 border-t border-border font-medium">
                  <span className="text-foreground">Total:</span>
                  <span className="text-brand font-display font-bold text-base">₹{total.toLocaleString("en-IN")}</span>
                </div>
              </div>
              <div className="flex gap-2 w-full sm:w-auto">
                <button type="button" onClick={() => setIsCreateOpen(false)} className="flex-1 sm:flex-none px-4 h-10 rounded-lg border border-border bg-surface text-sm font-medium hover:bg-secondary transition-colors">
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSubmit(onCreateSubmit)}
                  disabled={createQuotation.isPending}
                  className="flex-1 sm:flex-none px-6 h-10 rounded-lg bg-brand text-white text-sm font-medium hover:bg-brand/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {createQuotation.isPending ? "Saving..." : "Save Quotation"}
                </button>
              </div>
            </div>
          </div>
        </div>
      , document.body)}

      {/* View Modal */}
      {mounted && isViewOpen && selectedQuotation && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-0">
          <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" onClick={() => setIsViewOpen(false)} />
          <div className="relative bg-surface w-full max-w-2xl rounded-2xl shadow-modal border border-border flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between p-4 border-b border-border bg-secondary/50">
              <div className="flex items-center gap-3">
                <h2 className="font-display font-semibold text-lg text-foreground">Quotation Details</h2>
                <StatusBadge status={selectedQuotation.status} />
              </div>
              <button onClick={() => setIsViewOpen(false)} className="p-2 text-muted-foreground hover:text-foreground rounded-full hover:bg-background transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold mb-1">Customer</p>
                  <p className="font-medium text-foreground">{selectedQuotation.customerName}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold mb-1">Quotation No.</p>
                  <p className="font-display font-semibold text-foreground text-lg">{selectedQuotation.quotationNumber}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{new Date(selectedQuotation.createdAt).toLocaleDateString("en-IN")}</p>
                </div>
              </div>

              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold mb-3">Items</p>
                
                {/* Mobile view items */}
                <div className="sm:hidden space-y-3">
                  {selectedQuotation.items.map((item, i) => (
                    <div key={i} className="p-3.5 rounded-xl bg-secondary/50 border border-border/80">
                      <div className="flex justify-between items-start gap-2">
                        <div>
                          <p className="font-display font-semibold text-sm text-foreground">{item.productName}</p>
                          {item.hsnCode && <p className="text-[10px] text-muted-foreground mt-0.5">HSN: {item.hsnCode}</p>}
                        </div>
                        <p className="font-display font-bold text-sm text-brand">₹{(item.lineTotal || 0).toLocaleString("en-IN")}</p>
                      </div>
                      <div className="flex justify-between text-xs text-muted-foreground mt-2 pt-2 border-t border-border/45">
                        <span>{item.quantity} units</span>
                        <span>₹{(item.unitPrice || 0).toLocaleString("en-IN")} each</span>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Desktop view items */}
                <div className="hidden sm:block border border-border rounded-xl overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-secondary/50">
                      <tr>
                        <th className="px-4 py-3 text-left font-semibold text-muted-foreground">Product</th>
                        <th className="px-4 py-3 text-right font-semibold text-muted-foreground">Qty</th>
                        <th className="px-4 py-3 text-right font-semibold text-muted-foreground">Price</th>
                        <th className="px-4 py-3 text-right font-semibold text-muted-foreground">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedQuotation.items.map((item, i) => (
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
              </div>

              <div className="flex flex-col sm:flex-row justify-between gap-6 pt-4 border-t border-border">
                <div className="flex-1">
                  {selectedQuotation.notes && (
                    <div>
                      <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold mb-1">Notes</p>
                      <p className="text-sm text-foreground bg-secondary/30 p-3 rounded-lg border border-border/50">{selectedQuotation.notes}</p>
                    </div>
                  )}
                </div>
                
                <div className="text-right w-full sm:w-64">
                  <div className="flex justify-between text-sm text-muted-foreground"><span>Subtotal:</span><span>₹{(selectedQuotation.subtotal || 0).toLocaleString("en-IN")}</span></div>
                  <div className="flex justify-between text-sm text-muted-foreground mt-1"><span>GST ({selectedQuotation.gstRate}%):</span><span>₹{(selectedQuotation.gstAmount || 0).toLocaleString("en-IN")}</span></div>
                  
                  {(selectedQuotation.cgstAmount || selectedQuotation.sgstAmount || selectedQuotation.igstAmount) ? (
                    <div className="mt-1 space-y-0.5 border-l-2 border-border/50 pl-2">
                      {selectedQuotation.cgstAmount ? <div className="flex justify-between text-[11px] text-muted-foreground"><span>CGST:</span><span>₹{selectedQuotation.cgstAmount.toLocaleString("en-IN")}</span></div> : null}
                      {selectedQuotation.sgstAmount ? <div className="flex justify-between text-[11px] text-muted-foreground"><span>SGST:</span><span>₹{selectedQuotation.sgstAmount.toLocaleString("en-IN")}</span></div> : null}
                      {selectedQuotation.igstAmount ? <div className="flex justify-between text-[11px] text-muted-foreground"><span>IGST:</span><span>₹{selectedQuotation.igstAmount.toLocaleString("en-IN")}</span></div> : null}
                    </div>
                  ) : null}
                  
                  <div className="flex justify-between border-t border-border mt-2 pt-2">
                    <span className="font-display font-semibold text-foreground">Total:</span>
                    <span className="font-display font-semibold text-foreground">₹{(selectedQuotation.total || 0).toLocaleString("en-IN")}</span>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="p-4 border-t border-border bg-secondary/30 flex justify-between gap-2">
              <div className="flex gap-2">
                <button className="flex items-center gap-2 px-4 h-9 rounded-lg border border-border bg-surface text-sm font-medium hover:bg-secondary transition-colors">
                  <Printer className="w-4 h-4" /> Print
                </button>
                {selectedQuotation.status !== 'Converted' && (
                  <button onClick={handleDelete} className="flex items-center gap-2 px-4 h-9 rounded-lg border border-destructive/20 text-destructive bg-destructive/5 text-sm font-medium hover:bg-destructive/10 transition-colors">
                    <Trash2 className="w-4 h-4" /> Delete
                  </button>
                )}
              </div>
              {selectedQuotation.status !== 'Converted' && selectedQuotation.status !== 'Rejected' && (
                <button
                  onClick={handleConvertToInvoice}
                  disabled={convertQuotation.isPending}
                  className="flex items-center gap-2 px-4 h-9 rounded-lg bg-brand text-white text-sm font-medium hover:bg-brand/90 transition-colors disabled:opacity-50"
                >
                  <CheckCircle className="w-4 h-4" /> {convertQuotation.isPending ? 'Converting...' : 'Convert to Invoice'}
                </button>
              )}
            </div>
          </div>
        </div>
      , document.body)}
    </AppLayout>
  );
}
