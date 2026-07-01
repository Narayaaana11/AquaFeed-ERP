import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import { formatCurrency } from "@/lib/utils";
import { Loader2 } from "lucide-react";

interface LedgerBalance {
  name: string;
  balance: number;
}

interface PLData {
  sales: LedgerBalance[];
  purchases: LedgerBalance[];
  directExpenses: LedgerBalance[];
  directIncomes: LedgerBalance[];
  indirectExpenses: LedgerBalance[];
  indirectIncomes: LedgerBalance[];
  grossProfit: number;
  netProfit: number;
}

export default function ProfitLoss() {
  const { data: pl, isLoading, isError, error } = useQuery({
    queryKey: ["profit-loss"],
    queryFn: async () => {
      const response = await api.get("/advanced-reports/profit-loss");
      return response.data.data as PLData;
    },
  });

  const renderSection = (title: string, ledgers: LedgerBalance[], invertSign: boolean = false) => {
    if (!ledgers || ledgers.length === 0) return null;
    const total = ledgers.reduce((sum, l) => sum + (invertSign ? -l.balance : l.balance), 0);
    
    return (
      <div className="mb-4">
        <h4 className="font-semibold text-sm text-foreground/80 mb-2 border-b border-border/50 pb-1">{title}</h4>
        <div className="space-y-1.5 mb-2">
          {ledgers.map(l => (
            <div key={l.name} className="flex justify-between text-sm items-center">
              <span className="text-muted-foreground">{l.name}</span>
              <span className="font-medium">{formatCurrency(invertSign ? -l.balance : l.balance)}</span>
            </div>
          ))}
        </div>
        <div className="flex justify-between text-sm font-semibold pt-2 border-t border-border/50">
          <span>Total {title}</span>
          <span>{formatCurrency(total)}</span>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold font-display text-foreground">Profit & Loss Statement</h2>
          <p className="text-sm text-muted-foreground">For the current accounting period</p>
        </div>
      </div>

      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
          <Loader2 className="w-8 h-8 animate-spin text-brand mb-4" />
          <p>Generating P&L from Tally...</p>
        </div>
      ) : isError ? (
        <div className="bg-destructive/10 text-destructive p-4 rounded-xl text-center">
          Failed to load P&L: {(error as Error).message}
        </div>
      ) : pl ? (
        <div className="border border-border rounded-xl overflow-hidden shadow-sm bg-background p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-12 divide-y md:divide-y-0 md:divide-x divide-border">
            
            {/* Left Side: Expenses & Purchases */}
            <div className="space-y-6 pr-0 md:pr-4 pt-4 md:pt-0">
              <h3 className="font-bold font-display text-lg mb-4 text-destructive/90">Particulars (Dr)</h3>
              
              {/* Trading Account - Dr */}
              {renderSection("Purchase Accounts", pl.purchases, false)}
              {renderSection("Direct Expenses", pl.directExpenses, false)}
              
              <div className="flex justify-between font-bold text-base py-3 border-y border-border">
                <span>Gross Profit c/o</span>
                <span>{pl.grossProfit > 0 ? formatCurrency(pl.grossProfit) : "-"}</span>
              </div>
              
              {/* P&L Account - Dr */}
              <div className="pt-4">
                {renderSection("Indirect Expenses", pl.indirectExpenses, false)}
              </div>
              
              <div className="flex justify-between font-bold text-lg py-3 border-t-2 border-border text-foreground">
                <span>Net Profit</span>
                <span className={pl.netProfit >= 0 ? "text-success" : "text-destructive"}>
                  {pl.netProfit > 0 ? formatCurrency(pl.netProfit) : "-"}
                </span>
              </div>
            </div>

            {/* Right Side: Incomes & Sales */}
            <div className="space-y-6 pl-0 md:pl-4 pt-4 md:pt-0">
              <h3 className="font-bold font-display text-lg mb-4 text-success/90">Particulars (Cr)</h3>
              
              {/* Trading Account - Cr */}
              {renderSection("Sales Accounts", pl.sales, true)}
              {renderSection("Direct Incomes", pl.directIncomes, true)}
              
              <div className="flex justify-between font-bold text-base py-3 border-y border-border">
                <span>Gross Loss c/o</span>
                <span>{pl.grossProfit < 0 ? formatCurrency(Math.abs(pl.grossProfit)) : "-"}</span>
              </div>
              
              {/* P&L Account - Cr */}
              <div className="pt-4">
                <div className="flex justify-between font-bold text-sm mb-4">
                  <span>Gross Profit b/f</span>
                  <span>{pl.grossProfit > 0 ? formatCurrency(pl.grossProfit) : "-"}</span>
                </div>
                {renderSection("Indirect Incomes", pl.indirectIncomes, true)}
              </div>
              
              <div className="flex justify-between font-bold text-lg py-3 border-t-2 border-border text-foreground">
                <span>Net Loss</span>
                <span className="text-destructive">
                  {pl.netProfit < 0 ? formatCurrency(Math.abs(pl.netProfit)) : "-"}
                </span>
              </div>
            </div>

          </div>
        </div>
      ) : null}
    </div>
  );
}
