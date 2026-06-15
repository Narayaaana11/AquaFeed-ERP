import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/ui/page-header";
import { DataTable } from "@/components/ui/data-table";
import { EmptyState } from "@/components/StatusBadge";
import { Search, X, RotateCcw, Eye, FileText } from "lucide-react";
import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { useCreditNotes, type CreditNote } from "@/hooks/useCreditNotes";

const STATUS_COLORS: Record<string, string> = {
  Issued: "bg-warning/10 text-warning",
  Applied: "bg-success/10 text-success",
};

export default function CreditNotes() {
  const [searchQuery, setSearchQuery] = useState("");
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [selected, setSelected] = useState<CreditNote | null>(null);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const { data: creditNotes = [], isLoading } = useCreditNotes();

  const filtered = creditNotes.filter((cn) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      cn.creditNoteNumber.toLowerCase().includes(q) ||
      cn.customerName.toLowerCase().includes(q) ||
      cn.originalInvoiceNumber.toLowerCase().includes(q)
    );
  });

  const totalIssued = creditNotes.filter((cn) => cn.status === "Issued").length;
  const totalAmount = creditNotes.reduce((s, cn) => s + cn.totalAmount, 0);

  return (
    <AppLayout title="Credit Notes" subtitle="View and manage product return credit notes">
      <PageHeader
        title="Credit Notes"
        description={`${creditNotes.length} notes · ₹${totalAmount.toLocaleString("en-IN")} total · ${totalIssued} pending application`}
      />

      {/* Search */}
      <div className="flex items-center gap-2 h-9 px-3 rounded-lg border border-border bg-surface max-w-sm mb-4">
        <Search className="w-3.5 h-3.5 shrink-0 text-muted-foreground" />
        <input
          type="text"
          placeholder="Search credit notes…"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="flex-1 bg-transparent outline-none placeholder:text-muted-foreground text-foreground text-sm"
        />
        {searchQuery && (
          <button onClick={() => setSearchQuery("")}>
            <X className="w-3.5 h-3.5 text-muted-foreground" />
          </button>
        )}
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 rounded-full border-4 border-brand/20 border-t-brand animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={RotateCcw}
          title="No credit notes found"
          description="Credit notes are created when a customer returns products. Go to Sales → View Invoice → Return to create one."
        />
      ) : (
        <DataTable
          data={filtered}
          columns={[
            {
              key: "creditNoteNumber",
              header: "Credit Note #",
              cell: (r) => (
                <div className="flex items-center gap-2">
                  <RotateCcw className="w-4 h-4 text-warning shrink-0" />
                  <span className="font-display font-bold text-foreground font-mono">{r.creditNoteNumber}</span>
                </div>
              ),
            },
            {
              key: "originalInvoiceNumber",
              header: "Original Invoice",
              cell: (r) => (
                <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                  <FileText className="w-3.5 h-3.5" />
                  {r.originalInvoiceNumber}
                </div>
              ),
            },
            {
              key: "customerName",
              header: "Customer",
              cell: (r) => <span className="font-medium text-foreground">{r.customerName}</span>,
            },
            {
              key: "status",
              header: "Status",
              cell: (r) => (
                <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[r.status] || "bg-secondary text-foreground"}`}>
                  {r.status}
                </span>
              ),
            },
            {
              key: "totalAmount",
              header: "Credit Amount",
              cell: (r) => (
                <span className="font-display font-semibold text-warning">
                  ₹{r.totalAmount.toLocaleString("en-IN")}
                </span>
              ),
            },
            {
              key: "reason",
              header: "Reason",
              cell: (r) => (
                <span className="text-xs text-muted-foreground truncate max-w-[160px] block">
                  {r.reason || "Product return"}
                </span>
              ),
            },
            {
              key: "createdAt",
              header: "Date",
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
                <button
                  onClick={() => { setSelected(r); setIsDetailOpen(true); }}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-medium text-brand hover:bg-brand-light transition-colors"
                >
                  <Eye className="w-3.5 h-3.5" /> View
                </button>
              ),
            },
          ]}
        />
      )}

      {/* Detail Modal */}
      {mounted && isDetailOpen && selected && createPortal(
        <div className="fixed inset-0 bg-foreground/30 backdrop-blur-sm flex items-center justify-center z-[70] p-4">
          <div className="bg-surface rounded-2xl border border-border shadow-panel w-full max-w-lg max-h-[90vh] overflow-y-auto p-6">
            <div className="flex items-center justify-between mb-5">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="font-display font-bold text-lg text-foreground">{selected.creditNoteNumber}</h2>
                  <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[selected.status]}`}>
                    {selected.status}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground mt-0.5">
                  Return for invoice {selected.originalInvoiceNumber}
                </p>
              </div>
              <button onClick={() => setIsDetailOpen(false)} className="text-muted-foreground hover:text-foreground">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 p-3 rounded-xl bg-secondary/30 mb-4">
              <div>
                <p className="text-xs text-muted-foreground">Customer</p>
                <p className="font-medium text-sm text-foreground">{selected.customerName}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Date Issued</p>
                <p className="font-medium text-sm text-foreground">
                  {new Date(selected.createdAt).toLocaleDateString("en-IN")}
                </p>
              </div>
              <div className="col-span-2">
                <p className="text-xs text-muted-foreground">Reason</p>
                <p className="font-medium text-sm text-foreground">{selected.reason || "Product return"}</p>
              </div>
            </div>

            {/* Items */}
            <div>
              <p className="text-xs font-display font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                Returned Items
              </p>
              <div className="space-y-2">
                {selected.items.map((item, i) => (
                  <div key={i} className="flex items-center justify-between p-3 rounded-lg border border-border">
                    <div>
                      <p className="text-sm font-medium text-foreground">{item.productName}</p>
                      <p className="text-xs text-muted-foreground">
                        {item.quantity} bags × ₹{item.unitPrice.toLocaleString("en-IN")}
                      </p>
                    </div>
                    <span className="font-display font-semibold text-sm text-foreground">
                      ₹{item.lineTotal.toLocaleString("en-IN")}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Total */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-warning/5 border border-warning/20 mt-4">
              <span className="font-display font-semibold text-foreground">Credit Total</span>
              <span className="font-display font-bold text-warning text-xl">
                ₹{selected.totalAmount.toLocaleString("en-IN")}
              </span>
            </div>

            <div className="mt-4 p-3 rounded-xl bg-secondary/30 text-xs text-muted-foreground">
              💡 This credit has been {selected.status === "Applied" ? "applied to the customer's account" : "issued and is pending application to reduce the customer's outstanding balance"}.
            </div>

            <div className="flex gap-3 mt-5">
              <button
                onClick={() => setIsDetailOpen(false)}
                className="w-full h-10 rounded-lg border border-border bg-surface text-sm font-display font-semibold hover:bg-secondary transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </AppLayout>
  );
}
