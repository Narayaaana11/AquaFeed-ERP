import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import { formatCurrency } from "@/lib/utils";
import { Loader2, PieChart } from "lucide-react";

interface GstData {
  details: {
    name: string;
    balance: number;
  }[];
  summary: {
    cgst: number;
    sgst: number;
    igst: number;
    others: number;
  };
}

export default function GstSummary() {
  const { data: gst, isLoading, isError, error } = useQuery({
    queryKey: ["gst-summary"],
    queryFn: async () => {
      const response = await api.get("/advanced-reports/gst-summary");
      return response.data.data as GstData;
    },
  });

  const totalLiability = gst ? Object.values(gst.summary).reduce((a, b) => a + b, 0) : 0;
  // If balance is positive, it means credit balance = liability to pay GST
  // If balance is negative, it means debit balance = Input Tax Credit (ITC)
  const isPayable = totalLiability > 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold font-display text-foreground">GST Tax Summary</h2>
          <p className="text-sm text-muted-foreground">High-level view of tax liabilities and credits</p>
        </div>
      </div>

      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
          <Loader2 className="w-8 h-8 animate-spin text-brand mb-4" />
          <p>Analyzing GST ledgers from Tally...</p>
        </div>
      ) : isError ? (
        <div className="bg-destructive/10 text-destructive p-4 rounded-xl text-center">
          Failed to load GST summary: {(error as Error).message}
        </div>
      ) : gst ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1 space-y-6">
            <div className={`border rounded-xl p-6 shadow-sm ${isPayable ? 'bg-destructive/5 border-destructive/20' : 'bg-success/5 border-success/20'}`}>
              <h3 className="font-medium text-foreground/80 mb-2">Net Tax {isPayable ? 'Payable' : 'Refundable (ITC)'}</h3>
              <p className={`text-4xl font-bold font-display ${isPayable ? 'text-destructive' : 'text-success'}`}>
                {formatCurrency(Math.abs(totalLiability))}
              </p>
              <p className="text-xs text-muted-foreground mt-2">
                * Based on current balances of duties & taxes ledgers
              </p>
            </div>
            
            <div className="bg-surface border border-border rounded-xl p-6 shadow-sm">
              <h3 className="font-medium text-foreground mb-4">Tax Components</h3>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-muted-foreground">CGST</span>
                    <span className="font-semibold">{formatCurrency(Math.abs(gst.summary.cgst))}</span>
                  </div>
                  <div className="h-1.5 w-full bg-secondary rounded-full overflow-hidden">
                    <div className={`h-full ${gst.summary.cgst > 0 ? 'bg-destructive' : 'bg-success'}`} style={{ width: `${Math.min(100, Math.abs(gst.summary.cgst) / Math.max(1, Math.abs(totalLiability)) * 100)}%` }}></div>
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-muted-foreground">SGST</span>
                    <span className="font-semibold">{formatCurrency(Math.abs(gst.summary.sgst))}</span>
                  </div>
                  <div className="h-1.5 w-full bg-secondary rounded-full overflow-hidden">
                    <div className={`h-full ${gst.summary.sgst > 0 ? 'bg-destructive' : 'bg-success'}`} style={{ width: `${Math.min(100, Math.abs(gst.summary.sgst) / Math.max(1, Math.abs(totalLiability)) * 100)}%` }}></div>
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-muted-foreground">IGST</span>
                    <span className="font-semibold">{formatCurrency(Math.abs(gst.summary.igst))}</span>
                  </div>
                  <div className="h-1.5 w-full bg-secondary rounded-full overflow-hidden">
                    <div className={`h-full ${gst.summary.igst > 0 ? 'bg-destructive' : 'bg-success'}`} style={{ width: `${Math.min(100, Math.abs(gst.summary.igst) / Math.max(1, Math.abs(totalLiability)) * 100)}%` }}></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          <div className="lg:col-span-2 border border-border rounded-xl shadow-sm bg-background">
            <div className="p-4 border-b border-border bg-secondary/30">
              <h3 className="font-bold text-foreground">Ledger Breakdown</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm whitespace-nowrap">
                <thead className="bg-secondary text-muted-foreground font-display">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Ledger Name</th>
                    <th className="px-4 py-3 font-semibold text-right">Debit (ITC)</th>
                    <th className="px-4 py-3 font-semibold text-right">Credit (Liability)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {gst.details.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="px-4 py-8 text-center text-muted-foreground">
                        No duties and taxes ledgers found with balances.
                      </td>
                    </tr>
                  ) : (
                    gst.details.map((l, i) => (
                      <tr key={i} className="hover:bg-secondary/20 transition-colors">
                        <td className="px-4 py-3 font-medium text-foreground">{l.name}</td>
                        <td className="px-4 py-3 text-right text-success/80 font-medium">
                          {l.balance < 0 ? formatCurrency(Math.abs(l.balance)) : ""}
                        </td>
                        <td className="px-4 py-3 text-right text-destructive/80 font-medium">
                          {l.balance > 0 ? formatCurrency(l.balance) : ""}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
