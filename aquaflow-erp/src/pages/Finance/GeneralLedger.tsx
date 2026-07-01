import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Search, Loader2, BookOpen } from "lucide-react";

interface LedgerEntry {
  guid: string;
  date: string;
  type: string;
  number: string;
  narration?: string;
  debit: number;
  credit: number;
  balance: number;
}

export default function GeneralLedger() {
  const [accountQuery, setAccountQuery] = useState("");
  const [account, setAccount] = useState(""); // Currently selected account

  const { data: entries, isLoading, isError, error } = useQuery({
    queryKey: ["ledger", account],
    queryFn: async () => {
      if (!account) return [];
      const response = await api.get(`/finance/ledger?account=${encodeURIComponent(account)}`);
      return response.data.data as LedgerEntry[];
    },
    enabled: !!account, // Only fetch when an account is selected
  });

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setAccount(accountQuery);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold font-display text-foreground">General Ledger</h2>
          <p className="text-sm text-muted-foreground">View detailed transactions for any ledger</p>
        </div>
        
        <form onSubmit={handleSearch} className="relative w-full sm:w-80">
          <input
            type="text"
            placeholder="Enter Exact Ledger Name (e.g. Cash)"
            value={accountQuery}
            onChange={(e) => setAccountQuery(e.target.value)}
            className="w-full h-10 pl-4 pr-10 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-brand/20 transition-all"
          />
          <button 
            type="submit" 
            className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 bg-brand text-white rounded-lg hover:bg-brand-dark transition-colors"
          >
            <Search className="w-4 h-4" />
          </button>
        </form>
      </div>

      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
          <Loader2 className="w-8 h-8 animate-spin text-brand mb-4" />
          <p>Fetching ledger records...</p>
        </div>
      ) : isError ? (
        <div className="bg-destructive/10 text-destructive p-4 rounded-xl text-center">
          Failed to load ledger: {(error as Error).message}
        </div>
      ) : !account ? (
        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground bg-secondary/30 rounded-2xl border border-dashed border-border">
          <BookOpen className="w-12 h-12 mb-4 opacity-50" />
          <p className="font-medium">Search for an account to view its ledger</p>
          <p className="text-sm opacity-80 mt-1">Try "Cash", "Sales", or a customer's name.</p>
        </div>
      ) : (
        <div className="border border-border rounded-xl overflow-hidden shadow-sm bg-background">
          <div className="p-4 border-b border-border bg-secondary/30">
            <h3 className="font-bold text-foreground text-lg">{account}</h3>
            <p className="text-sm text-muted-foreground">Statement of Transactions</p>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-secondary text-muted-foreground font-display">
                <tr>
                  <th className="px-4 py-3 font-semibold">Date</th>
                  <th className="px-4 py-3 font-semibold">Voucher Type</th>
                  <th className="px-4 py-3 font-semibold">Vch No.</th>
                  <th className="px-4 py-3 font-semibold text-right">Debit</th>
                  <th className="px-4 py-3 font-semibold text-right">Credit</th>
                  <th className="px-4 py-3 font-semibold text-right">Balance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {entries?.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                      No transactions found for this ledger.
                    </td>
                  </tr>
                ) : (
                  entries?.map((entry, index) => (
                    <tr key={`${entry.guid}-${index}`} className="hover:bg-secondary/20 transition-colors">
                      <td className="px-4 py-3">{formatDate(entry.date)}</td>
                      <td className="px-4 py-3">
                        <span className="font-medium text-foreground">{entry.type}</span>
                        {entry.narration && (
                          <p className="text-xs text-muted-foreground truncate max-w-[200px]" title={entry.narration}>
                            {entry.narration}
                          </p>
                        )}
                      </td>
                      <td className="px-4 py-3">{entry.number || '-'}</td>
                      <td className="px-4 py-3 text-right text-destructive/80 font-medium">
                        {entry.debit > 0 ? formatCurrency(entry.debit) : ""}
                      </td>
                      <td className="px-4 py-3 text-right text-success/80 font-medium">
                        {entry.credit > 0 ? formatCurrency(entry.credit) : ""}
                      </td>
                      <td className="px-4 py-3 text-right font-bold text-foreground">
                        {formatCurrency(Math.abs(entry.balance))} {entry.balance > 0 ? 'Cr' : entry.balance < 0 ? 'Dr' : ''}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
