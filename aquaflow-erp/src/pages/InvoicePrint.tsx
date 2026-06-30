import { useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useInvoice } from "@/hooks/useSales";
import { useAuth } from "@/hooks/useAuth";

export default function InvoicePrint() {
  const { id } = useParams<{ id: string }>();
  const { data: invoice, isLoading } = useInvoice(id || "");
  const { user } = useAuth();
  const navigate = useNavigate();

  const company = user?.company;

  useEffect(() => {
    if (!id) navigate("/sales");
  }, [id, navigate]);

  useEffect(() => {
    if (invoice && !isLoading) {
      // Auto-trigger print after a short delay for CSS to render
      const timer = setTimeout(() => {
        window.print();
      }, 600);
      return () => clearTimeout(timer);
    }
  }, [invoice, isLoading]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-white">
        <div className="text-center">
          <div className="w-10 h-10 rounded-full border-4 border-gray-200 border-t-blue-600 animate-spin mx-auto mb-4" />
          <p className="text-gray-500">Preparing invoice...</p>
        </div>
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p className="text-gray-500">Invoice not found.</p>
      </div>
    );
  }

  const balance = invoice.total - (invoice.paidAmount || 0);
  const isPaid = invoice.status === "Paid" || balance <= 0;
  const invoiceDate = new Date(invoice.date || invoice.createdAt);

  return (
    <>
      {/* Print Styles */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');

        * { box-sizing: border-box; margin: 0; padding: 0; }
        
        body {
          font-family: 'Inter', sans-serif;
          background: #f8f9fa;
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }
        
        @media print {
          body { background: white; }
          .no-print { display: none !important; }
          .invoice-page {
            box-shadow: none !important;
            margin: 0 !important;
            max-width: 100% !important;
            padding: 20mm 15mm !important;
          }
        }

        @page {
          size: A4;
          margin: 0;
        }
      `}</style>

      {/* Print Button (hidden on print) */}
      <div className="no-print fixed top-4 right-4 flex gap-3 z-50">
        <button
          onClick={() => window.print()}
          style={{
            background: "#1a56db",
            color: "white",
            border: "none",
            padding: "8px 20px",
            borderRadius: "8px",
            fontFamily: "Inter, sans-serif",
            fontWeight: 600,
            fontSize: "14px",
            cursor: "pointer",
          }}
        >
          🖨️ Print / Download
        </button>
        <button
          onClick={() => navigate("/sales")}
          style={{
            background: "#f1f5f9",
            color: "#374151",
            border: "1px solid #e5e7eb",
            padding: "8px 20px",
            borderRadius: "8px",
            fontFamily: "Inter, sans-serif",
            fontWeight: 600,
            fontSize: "14px",
            cursor: "pointer",
          }}
        >
          ← Back
        </button>
      </div>

      {/* Invoice Document */}
      <div style={{
        background: "#f8f9fa",
        minHeight: "100vh",
        padding: "40px 20px",
        display: "flex",
        justifyContent: "center",
      }}>
        <div className="invoice-page" style={{
          background: "white",
          maxWidth: "794px",
          width: "100%",
          padding: "48px",
          boxShadow: "0 4px 40px rgba(0,0,0,0.12)",
          borderRadius: "8px",
          fontFamily: "Inter, sans-serif",
        }}>
          {/* Header */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "40px", borderBottom: "3px solid #1a56db", paddingBottom: "28px" }}>
            <div>
              {company?.logoUrl && (
                <img src={company.logoUrl} alt="Logo" style={{ height: "52px", marginBottom: "10px", objectFit: "contain" }} />
              )}
              <h1 style={{ fontSize: "22px", fontWeight: 800, color: "#111827", letterSpacing: "-0.5px" }}>
                {company?.name || "AquaFeed"}
              </h1>
              {company?.address && (
                <p style={{ fontSize: "12px", color: "#6b7280", marginTop: "4px" }}>{company.address}</p>
              )}
              {company?.phone && (
                <p style={{ fontSize: "12px", color: "#6b7280" }}>📞 {company.phone}</p>
              )}
              {company?.gstNumber && (
                <p style={{ fontSize: "12px", color: "#6b7280", marginTop: "2px" }}>
                  <strong>GST:</strong> {company.gstNumber}
                </p>
              )}
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
                background: isPaid ? "#dcfce7" : balance > 0 ? "#fef3c7" : "#dbeafe",
                borderRadius: "8px",
                padding: "8px 16px",
                marginBottom: "12px",
              }}>
                <span style={{
                  fontSize: "11px",
                  fontWeight: 700,
                  textTransform: "uppercase",
                  letterSpacing: "0.5px",
                  color: isPaid ? "#16a34a" : "#d97706",
                }}>
                  {isPaid ? "✓ PAID" : "PENDING"}
                </span>
              </div>
              <h2 style={{ fontSize: "20px", fontWeight: 700, color: "#1a56db" }}>
                TAX INVOICE
              </h2>
              <p style={{ fontSize: "13px", color: "#374151", marginTop: "4px" }}>
                <strong>Invoice #</strong> {invoice.invoiceNumber}
              </p>
              <p style={{ fontSize: "12px", color: "#6b7280" }}>
                Date: {invoiceDate.toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}
              </p>
              {invoice.dueDate && (
                <p style={{ fontSize: "12px", color: "#6b7280" }}>
                  Due: {new Date(invoice.dueDate).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}
                </p>
              )}
            </div>
          </div>

          {/* Bill To */}
          <div style={{ marginBottom: "32px" }}>
            <p style={{ fontSize: "10px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "1px", color: "#9ca3af", marginBottom: "6px" }}>
              BILL TO
            </p>
            <p style={{ fontSize: "16px", fontWeight: 700, color: "#111827" }}>{invoice.customerName}</p>
            {typeof invoice.customer === "object" && invoice.customer?.phone && (
              <p style={{ fontSize: "13px", color: "#6b7280", marginTop: "2px" }}>📞 {invoice.customer.phone}</p>
            )}
          </div>

          {/* Items Table */}
          <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: "32px" }}>
            <thead>
              <tr style={{ background: "#1a56db" }}>
                <th style={{ padding: "10px 14px", textAlign: "left", fontSize: "11px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px", color: "white" }}>#</th>
                <th style={{ padding: "10px 14px", textAlign: "left", fontSize: "11px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px", color: "white" }}>Product</th>
                <th style={{ padding: "10px 14px", textAlign: "center", fontSize: "11px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px", color: "white" }}>Qty</th>
                <th style={{ padding: "10px 14px", textAlign: "right", fontSize: "11px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px", color: "white" }}>Rate</th>
                <th style={{ padding: "10px 14px", textAlign: "right", fontSize: "11px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px", color: "white" }}>Amount</th>
              </tr>
            </thead>
            <tbody>
              {invoice.items.map((item, i) => (
                <tr key={i} style={{ borderBottom: "1px solid #f3f4f6", background: i % 2 === 0 ? "white" : "#fafafa" }}>
                  <td style={{ padding: "11px 14px", fontSize: "13px", color: "#6b7280" }}>{i + 1}</td>
                  <td style={{ padding: "11px 14px", fontSize: "13px", fontWeight: 500, color: "#111827" }}>{item.productName}</td>
                  <td style={{ padding: "11px 14px", fontSize: "13px", color: "#374151", textAlign: "center" }}>{item.quantity} bags</td>
                  <td style={{ padding: "11px 14px", fontSize: "13px", color: "#374151", textAlign: "right" }}>
                    ₹{item.unitPrice.toLocaleString("en-IN")}
                  </td>
                  <td style={{ padding: "11px 14px", fontSize: "13px", fontWeight: 600, color: "#111827", textAlign: "right" }}>
                    ₹{item.lineTotal.toLocaleString("en-IN")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Totals */}
          <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "32px" }}>
            <div style={{ minWidth: "260px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid #f3f4f6" }}>
                <span style={{ fontSize: "13px", color: "#6b7280" }}>Subtotal</span>
                <span style={{ fontSize: "13px", fontWeight: 500, color: "#111827" }}>₹{invoice.subtotal.toLocaleString("en-IN")}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid #f3f4f6" }}>
                <span style={{ fontSize: "13px", color: "#6b7280" }}>GST ({invoice.gstRate}%)</span>
                <span style={{ fontSize: "13px", fontWeight: 500, color: "#111827" }}>₹{invoice.gstAmount.toLocaleString("en-IN")}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", padding: "12px 16px", background: "#1a56db", borderRadius: "8px", marginTop: "8px" }}>
                <span style={{ fontSize: "15px", fontWeight: 700, color: "white" }}>Total</span>
                <span style={{ fontSize: "18px", fontWeight: 800, color: "white" }}>₹{invoice.total.toLocaleString("en-IN")}</span>
              </div>
              {invoice.paidAmount > 0 && (
                <>
                  <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", marginTop: "8px" }}>
                    <span style={{ fontSize: "13px", color: "#16a34a" }}>Paid</span>
                    <span style={{ fontSize: "13px", fontWeight: 600, color: "#16a34a" }}>−₹{invoice.paidAmount.toLocaleString("en-IN")}</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", padding: "10px 16px", background: balance > 0 ? "#fef3c7" : "#dcfce7", borderRadius: "8px" }}>
                    <span style={{ fontSize: "14px", fontWeight: 700, color: balance > 0 ? "#92400e" : "#166534" }}>Balance Due</span>
                    <span style={{ fontSize: "16px", fontWeight: 800, color: balance > 0 ? "#d97706" : "#16a34a" }}>₹{balance.toLocaleString("en-IN")}</span>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Payment History */}
          {invoice.payments && invoice.payments.length > 0 && (
            <div style={{ marginBottom: "28px" }}>
              <p style={{ fontSize: "11px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px", color: "#9ca3af", marginBottom: "8px" }}>
                PAYMENT HISTORY
              </p>
              {invoice.payments.map((p, i) => (
                <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid #f9fafb" }}>
                  <span style={{ fontSize: "12px", color: "#6b7280" }}>
                    {new Date(p.date).toLocaleDateString("en-IN")} · {p.paymentType}
                  </span>
                  <span style={{ fontSize: "12px", fontWeight: 600, color: "#16a34a" }}>₹{p.amount.toLocaleString("en-IN")}</span>
                </div>
              ))}
            </div>
          )}

          {/* Notes */}
          {invoice.notes && (
            <div style={{ background: "#f9fafb", borderRadius: "8px", padding: "12px 16px", marginBottom: "28px" }}>
              <p style={{ fontSize: "11px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px", color: "#9ca3af", marginBottom: "4px" }}>
                NOTES
              </p>
              <p style={{ fontSize: "13px", color: "#374151" }}>{invoice.notes}</p>
            </div>
          )}

          {/* Footer */}
          <div style={{ borderTop: "2px solid #f3f4f6", paddingTop: "20px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <p style={{ fontSize: "12px", color: "#9ca3af" }}>
              Thank you for your business, {invoice.customerName.split(" ")[0]}!
            </p>
            <p style={{ fontSize: "11px", color: "#d1d5db" }}>
              Generated by AquaFeed ERP
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
