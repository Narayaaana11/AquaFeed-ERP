import { useState } from "react";
import { BookOpen, Receipt, Building2, Banknote, List } from "lucide-react";
import GeneralLedger from "./Finance/GeneralLedger";
import Journal from "./Finance/Journal";
import BankBook from "./Finance/BankBook";
import OutstandingBills from "./Finance/OutstandingBills";

type Tab = "ledger" | "journal" | "bank" | "outstanding";

export default function Finance() {
  const [activeTab, setActiveTab] = useState<Tab>("ledger");

  const tabs = [
    { id: "ledger", label: "General Ledger", icon: BookOpen },
    { id: "journal", label: "Journal Entries", icon: List },
    { id: "bank", label: "Bank Book", icon: Building2 },
    { id: "outstanding", label: "Outstanding Bills", icon: Receipt },
  ] as const;

  return (
    <div className="flex-1 space-y-6 p-4 sm:p-6 lg:p-8 max-w-[1600px] mx-auto w-full pb-24 sm:pb-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground">Accounting & Finance</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Real-time financial reports synchronized directly from Tally
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex overflow-x-auto pb-2 -mx-4 px-4 sm:mx-0 sm:px-0 hide-scrollbar gap-2">
        {tabs.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium text-sm whitespace-nowrap transition-all ${
              activeTab === id
                ? "bg-brand text-primary-foreground shadow-md"
                : "bg-surface text-muted-foreground hover:bg-secondary border border-border"
            }`}
          >
            <Icon className="w-4 h-4" />
            {label}
          </button>
        ))}
      </div>

      {/* Content Area */}
      <div className="bg-surface border border-border rounded-2xl p-4 sm:p-6 shadow-sm min-h-[500px]">
        {activeTab === "ledger" && <GeneralLedger />}
        {activeTab === "journal" && <Journal />}
        {activeTab === "bank" && <BankBook />}
        {activeTab === "outstanding" && <OutstandingBills />}
      </div>
    </div>
  );
}
