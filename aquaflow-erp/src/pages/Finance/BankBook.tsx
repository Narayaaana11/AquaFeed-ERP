import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Loader2, Building2 } from "lucide-react";

interface BankEntry {
  _id: string;
  guid: string;
  ledger: string;
  transaction_type: string;
  instrument_date: string;
  instrument_number: string;
  bank_name: string;
  amount: number;
  bankers_date: string;
  voucher?: {
    date: string;
    voucher_type: string;
    voucher_number: string;
  };
}

export default function BankBook() {
  const { data: entries, isLoading, isError, error } = useQuery({
    queryKey: ["bank-book"],
    queryFn: async () => {
      const response = await api.get("/finance/bank-book");
      return response.data.data as BankEntry[];
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold font-display text-foreground">Bank Book & Reconciliation</h2>
        <p className="text-sm text-muted-foreground">Recent banking transactions, cheques, and transfers</p>
      </div>

      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
          <Loader2 className="w-8 h-8 animate-spin text-brand mb-4" />
          <p>Fetching bank records...</p>
        </div>
      ) : isError ? (
        <div className="bg-destructive/10 text-destructive p-4 rounded-xl text-center">
          Failed to load bank book: {(error as Error).message}
        </div>
      ) : entries?.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground bg-secondary/30 rounded-2xl border border-dashed border-border">
          <Building2 className="w-12 h-12 mb-4 opacity-50" />
          <p className="font-medium">No banking transactions found</p>
        </div>
      ) : (
        <div className="border border-border rounded-xl overflow-hidden shadow-sm bg-background">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-secondary text-muted-foreground font-display">
                <tr>
                  <th className="px-4 py-3 font-semibold">Vch Date</th>
                  <th className="px-4 py-3 font-semibold">Ledger</th>
                  <th className="px-4 py-3 font-semibold">Instrument Details</th>
                  <th className="px-4 py-3 font-semibold">Bank Date</th>
                  <th className="px-4 py-3 font-semibold text-right">Debit</th>
                  <th className="px-4 py-3 font-semibold text-right">Credit</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {entries?.map((entry, index) => {
                  const amt = parseFloat(entry.amount as unknown as string) || 0;
                  return (
                    <tr key={`${entry.guid}-${index}`} className="hover:bg-secondary/20 transition-colors">
                      <td className="px-4 py-3">
                        <span className="font-medium">{formatDate(entry.voucher?.date || entry.instrument_date)}</span>
                        {entry.voucher && (
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {entry.voucher.voucher_type} {entry.voucher.voucher_number}
                          </p>
                        )}
                      </td>
                      <td className="px-4 py-3 font-medium text-foreground">{entry.ledger}</td>
                      <td className="px-4 py-3">
                        <div className="flex flex-col gap-0.5">
                          <span className="text-sm font-semibold">{entry.transaction_type}</span>
                          <span className="text-xs text-muted-foreground">
                            No: {entry.instrument_number || 'N/A'} • {formatDate(entry.instrument_date)}
                          </span>
                          {entry.bank_name && (
                            <span className="text-xs text-brand font-medium bg-brand/10 w-fit px-1.5 py-0.5 rounded">
                              {entry.bank_name}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {entry.bankers_date ? formatDate(entry.bankers_date) : '-'}
                      </td>
                      <td className="px-4 py-3 text-right text-destructive/80 font-medium">
                        {amt < 0 ? formatCurrency(Math.abs(amt)) : ""}
                      </td>
                      <td className="px-4 py-3 text-right text-success/80 font-medium">
                        {amt > 0 ? formatCurrency(amt) : ""}
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
