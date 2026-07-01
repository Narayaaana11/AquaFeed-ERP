import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import { formatCurrency } from "@/lib/utils";
import { Loader2, Scale } from "lucide-react";

interface LedgerBalance {
  name: string;
  parent: string;
  primaryGroup: string;
  debit: number;
  credit: number;
}

export default function TrialBalance() {
  const { data: ledgers, isLoading, isError, error } = useQuery({
    queryKey: ["trial-balance"],
    queryFn: async () => {
      const response = await api.get("/advanced-reports/trial-balance");
      return response.data.data as LedgerBalance[];
    },
  });

  const totalDebit = ledgers?.reduce((sum, l) => sum + l.debit, 0) || 0;
  const totalCredit = ledgers?.reduce((sum, l) => sum + l.credit, 0) || 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold font-display text-foreground">Trial Balance</h2>
          <p className="text-sm text-muted-foreground">List of all ledgers and their current balances</p>
        </div>
      </div>

      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
          <Loader2 className="w-8 h-8 animate-spin text-brand mb-4" />
          <p>Fetching Trial Balance from Tally...</p>
        </div>
      ) : isError ? (
        <div className="bg-destructive/10 text-destructive p-4 rounded-xl text-center">
          Failed to load trial balance: {(error as Error).message}
        </div>
      ) : (
        <div className="border border-border rounded-xl overflow-hidden shadow-sm bg-background">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-secondary text-muted-foreground font-display">
                <tr>
                  <th className="px-4 py-3 font-semibold">Particulars (Ledger)</th>
                  <th className="px-4 py-3 font-semibold">Primary Group</th>
                  <th className="px-4 py-3 font-semibold text-right">Debit Balance</th>
                  <th className="px-4 py-3 font-semibold text-right">Credit Balance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {ledgers?.map((ledger, i) => (
                  <tr key={i} className="hover:bg-secondary/20 transition-colors">
                    <td className="px-4 py-3 font-medium text-foreground">{ledger.name}</td>
                    <td className="px-4 py-3 text-muted-foreground">{ledger.primaryGroup || ledger.parent}</td>
                    <td className="px-4 py-3 text-right text-destructive/80 font-medium">
                      {ledger.debit > 0 ? formatCurrency(ledger.debit) : ""}
                    </td>
                    <td className="px-4 py-3 text-right text-success/80 font-medium">
                      {ledger.credit > 0 ? formatCurrency(ledger.credit) : ""}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-secondary/50 font-bold text-foreground">
                <tr>
                  <td colSpan={2} className="px-4 py-3 text-right">Grand Total:</td>
                  <td className="px-4 py-3 text-right text-destructive-dark">{formatCurrency(totalDebit)}</td>
                  <td className="px-4 py-3 text-right text-success-dark">{formatCurrency(totalCredit)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
