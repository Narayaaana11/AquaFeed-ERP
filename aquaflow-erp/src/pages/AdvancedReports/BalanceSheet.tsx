import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import { formatCurrency } from "@/lib/utils";
import { Loader2 } from "lucide-react";

interface LedgerBalance {
  name: string;
  balance: number;
}

interface BSData {
  capitalAccount: LedgerBalance[];
  loansLiability: LedgerBalance[];
  currentLiabilities: LedgerBalance[];
  fixedAssets: LedgerBalance[];
  investments: LedgerBalance[];
  currentAssets: LedgerBalance[];
  suspense: LedgerBalance[];
  totalLiabilities: number;
  totalAssets: number;
  netProfit: number;
}

export default function BalanceSheet() {
  const { data: bs, isLoading, isError, error } = useQuery({
    queryKey: ["balance-sheet"],
    queryFn: async () => {
      const response = await api.get("/advanced-reports/balance-sheet");
      return response.data.data as BSData;
    },
  });

  const renderSection = (title: string, ledgers: LedgerBalance[], invertSign: boolean = false) => {
    if (!ledgers || ledgers.length === 0) return null;
    const total = ledgers.reduce((sum, l) => sum + (invertSign ? -l.balance : l.balance), 0);
    
    return (
      <div className="mb-4">
        <h4 className="font-semibold text-sm text-foreground/80 mb-2 border-b border-border/50 pb-1">{title}</h4>
        <div className="space-y-1.5 mb-2">
          {ledgers.map((l, i) => (
            <div key={`${l.name}-${i}`} className="flex justify-between text-sm items-center">
              <span className={`text-muted-foreground ${l.name === 'Profit & Loss A/c' ? 'font-medium text-foreground' : ''}`}>{l.name}</span>
              <span className={`font-medium ${l.name === 'Profit & Loss A/c' ? 'text-foreground' : ''}`}>{formatCurrency(invertSign ? -l.balance : l.balance)}</span>
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
          <h2 className="text-xl font-bold font-display text-foreground">Balance Sheet</h2>
          <p className="text-sm text-muted-foreground">As at current date</p>
        </div>
      </div>

      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
          <Loader2 className="w-8 h-8 animate-spin text-brand mb-4" />
          <p>Generating Balance Sheet from Tally...</p>
        </div>
      ) : isError ? (
        <div className="bg-destructive/10 text-destructive p-4 rounded-xl text-center">
          Failed to load Balance Sheet: {(error as Error).message}
        </div>
      ) : bs ? (
        <div className="border border-border rounded-xl overflow-hidden shadow-sm bg-background p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-12 divide-y md:divide-y-0 md:divide-x divide-border">
            
            {/* Left Side: Liabilities */}
            <div className="space-y-6 pr-0 md:pr-4 pt-4 md:pt-0 flex flex-col h-full">
              <div>
                <h3 className="font-bold font-display text-lg mb-4 text-foreground">Liabilities</h3>
                
                {renderSection("Capital Account", bs.capitalAccount, false)}
                {renderSection("Loans (Liability)", bs.loansLiability, false)}
                {renderSection("Current Liabilities", bs.currentLiabilities, false)}
                {renderSection("Suspense A/c (Cr)", bs.suspense.filter(s => s.balance > 0), false)}
              </div>
              
              <div className="mt-auto pt-8">
                <div className="flex justify-between font-bold text-lg py-4 border-y-2 border-border text-foreground">
                  <span>Total</span>
                  <span>{formatCurrency(bs.totalLiabilities)}</span>
                </div>
              </div>
            </div>

            {/* Right Side: Assets */}
            <div className="space-y-6 pl-0 md:pl-4 pt-4 md:pt-0 flex flex-col h-full">
              <div>
                <h3 className="font-bold font-display text-lg mb-4 text-foreground">Assets</h3>
                
                {renderSection("Fixed Assets", bs.fixedAssets, true)}
                {renderSection("Investments", bs.investments, true)}
                {renderSection("Current Assets", bs.currentAssets, true)}
                {renderSection("Suspense A/c (Dr)", bs.suspense.filter(s => s.balance < 0), true)}
              </div>
              
              <div className="mt-auto pt-8">
                <div className="flex justify-between font-bold text-lg py-4 border-y-2 border-border text-foreground">
                  <span>Total</span>
                  <span>{formatCurrency(bs.totalAssets)}</span>
                </div>
              </div>
            </div>

          </div>
        </div>
      ) : null}
    </div>
  );
}
