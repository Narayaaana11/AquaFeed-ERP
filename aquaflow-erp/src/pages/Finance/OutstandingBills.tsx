import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import { formatCurrency } from "@/lib/utils";
import { Loader2, Receipt, AlertCircle } from "lucide-react";
import { useState } from "react";

interface OutstandingBill {
  ledger: string;
  billName: string;
  amount: number;
}

export default function OutstandingBills() {
  const [filter, setFilter] = useState<"all" | "receivable" | "payable">("all");

  const { data: bills, isLoading, isError, error } = useQuery({
    queryKey: ["outstanding-bills"],
    queryFn: async () => {
      const response = await api.get("/finance/outstanding");
      return response.data.data as OutstandingBill[];
    },
  });

  const filteredBills = bills?.filter((bill) => {
    if (filter === "all") return true;
    if (filter === "receivable") return bill.amount < 0; // Debit balance means receivable from debtors
    if (filter === "payable") return bill.amount > 0; // Credit balance means payable to creditors
    return true;
  });

  // Calculate totals
  const totalReceivable = bills?.filter(b => b.amount < 0).reduce((acc, curr) => acc + Math.abs(curr.amount), 0) || 0;
  const totalPayable = bills?.filter(b => b.amount > 0).reduce((acc, curr) => acc + curr.amount, 0) || 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold font-display text-foreground">Outstanding Bills</h2>
          <p className="text-sm text-muted-foreground">Bill-by-bill pending amounts</p>
        </div>
        
        <div className="flex bg-secondary p-1 rounded-xl">
          <button 
            onClick={() => setFilter("all")}
            className={`px-4 py-1.5 text-sm font-medium rounded-lg transition-colors ${filter === "all" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}
          >
            All
          </button>
          <button 
            onClick={() => setFilter("receivable")}
            className={`px-4 py-1.5 text-sm font-medium rounded-lg transition-colors ${filter === "receivable" ? "bg-background shadow-sm text-success" : "text-muted-foreground hover:text-foreground"}`}
          >
            Receivables
          </button>
          <button 
            onClick={() => setFilter("payable")}
            className={`px-4 py-1.5 text-sm font-medium rounded-lg transition-colors ${filter === "payable" ? "bg-background shadow-sm text-destructive" : "text-muted-foreground hover:text-foreground"}`}
          >
            Payables
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-success/10 border border-success/20 p-4 rounded-xl flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-success mb-1 flex items-center gap-1">
              Total Receivables
            </p>
            <h3 className="text-2xl font-bold text-success-dark">{formatCurrency(totalReceivable)}</h3>
          </div>
          <div className="w-12 h-12 bg-success/20 rounded-full flex items-center justify-center">
            <Receipt className="w-6 h-6 text-success" />
          </div>
        </div>
        
        <div className="bg-destructive/10 border border-destructive/20 p-4 rounded-xl flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-destructive mb-1 flex items-center gap-1">
              Total Payables
            </p>
            <h3 className="text-2xl font-bold text-destructive-dark">{formatCurrency(totalPayable)}</h3>
          </div>
          <div className="w-12 h-12 bg-destructive/20 rounded-full flex items-center justify-center">
            <AlertCircle className="w-6 h-6 text-destructive" />
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
          <Loader2 className="w-8 h-8 animate-spin text-brand mb-4" />
          <p>Fetching outstanding bills...</p>
        </div>
      ) : isError ? (
        <div className="bg-destructive/10 text-destructive p-4 rounded-xl text-center">
          Failed to load outstanding bills: {(error as Error).message}
        </div>
      ) : filteredBills?.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground bg-secondary/30 rounded-2xl border border-dashed border-border">
          <Receipt className="w-12 h-12 mb-4 opacity-50" />
          <p className="font-medium">No outstanding bills found</p>
        </div>
      ) : (
        <div className="border border-border rounded-xl overflow-hidden shadow-sm bg-background">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-secondary text-muted-foreground font-display">
                <tr>
                  <th className="px-4 py-3 font-semibold">Ledger / Party</th>
                  <th className="px-4 py-3 font-semibold">Bill Reference</th>
                  <th className="px-4 py-3 font-semibold text-right">Amount Pending</th>
                  <th className="px-4 py-3 font-semibold text-right">Type</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredBills?.map((bill, index) => {
                  const isReceivable = bill.amount < 0;
                  const amt = Math.abs(bill.amount);
                  
                  return (
                    <tr key={`${bill.ledger}-${bill.billName}-${index}`} className="hover:bg-secondary/20 transition-colors">
                      <td className="px-4 py-3 font-medium text-foreground">{bill.ledger}</td>
                      <td className="px-4 py-3">{bill.billName}</td>
                      <td className={`px-4 py-3 text-right font-bold ${isReceivable ? "text-success" : "text-destructive"}`}>
                        {formatCurrency(amt)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className={`inline-flex px-2 py-1 rounded text-xs font-medium ${isReceivable ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"}`}>
                          {isReceivable ? "To Receive (Dr)" : "To Pay (Cr)"}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
