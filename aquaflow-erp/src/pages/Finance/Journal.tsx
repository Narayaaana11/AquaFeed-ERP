import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import { formatDate } from "@/lib/utils";
import { Loader2, List } from "lucide-react";

interface JournalEntry {
  _id: string;
  guid: string;
  date: string;
  voucher_type: string;
  voucher_number: string;
  narration?: string;
  accounting: Array<{
    ledger: string;
    amount: number;
  }>;
}

export default function Journal() {
  const { data: journals, isLoading, isError, error } = useQuery({
    queryKey: ["journal-entries"],
    queryFn: async () => {
      const response = await api.get("/finance/journal");
      return response.data.data as JournalEntry[];
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold font-display text-foreground">Journal Register</h2>
        <p className="text-sm text-muted-foreground">Recent receipts, payments, and contra entries</p>
      </div>

      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
          <Loader2 className="w-8 h-8 animate-spin text-brand mb-4" />
          <p>Fetching journal entries...</p>
        </div>
      ) : isError ? (
        <div className="bg-destructive/10 text-destructive p-4 rounded-xl text-center">
          Failed to load journal: {(error as Error).message}
        </div>
      ) : journals?.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground bg-secondary/30 rounded-2xl border border-dashed border-border">
          <List className="w-12 h-12 mb-4 opacity-50" />
          <p className="font-medium">No journal entries found</p>
        </div>
      ) : (
        <div className="space-y-4">
          {journals?.map((journal) => (
            <div key={journal.guid} className="bg-background border border-border rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 pb-3 border-b border-border gap-2">
                <div className="flex items-center gap-3">
                  <span className="px-2.5 py-1 rounded-md text-xs font-semibold uppercase tracking-wider bg-brand/10 text-brand">
                    {journal.voucher_type}
                  </span>
                  <span className="font-medium text-foreground">{journal.voucher_number || '-'}</span>
                </div>
                <div className="text-sm font-medium text-muted-foreground bg-secondary px-3 py-1 rounded-lg">
                  {formatDate(journal.date)}
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Accounting Details</h4>
                  {journal.accounting?.map((acc, i) => (
                    <div key={i} className="flex justify-between text-sm items-center bg-secondary/30 p-2 rounded-lg">
                      <span className="font-medium">{acc.ledger}</span>
                      <span className={`font-semibold ${acc.amount > 0 ? "text-success" : "text-destructive"}`}>
                        {Math.abs(acc.amount).toLocaleString('en-IN', { style: 'currency', currency: 'INR' })}
                        <span className="text-[10px] ml-1 opacity-70">{acc.amount > 0 ? "Cr" : "Dr"}</span>
                      </span>
                    </div>
                  ))}
                </div>
                
                {journal.narration && (
                  <div className="bg-secondary/20 p-3 rounded-lg border border-border/50 h-fit">
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">Narration</h4>
                    <p className="text-sm text-foreground/90 italic">"{journal.narration}"</p>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
