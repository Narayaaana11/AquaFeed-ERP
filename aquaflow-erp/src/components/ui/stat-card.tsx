import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface StatCardProps {
  title: string;
  value: string;
  change?: string;
  changeType?: "positive" | "negative" | "neutral";
  icon: LucideIcon;
  iconColor?: string;
}

export function StatCard({ title, value, change, changeType = "neutral", icon: Icon, iconColor }: StatCardProps) {
  return (
    <div className="bg-surface rounded-xl border border-border p-5 shadow-card">
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <p className="text-xs font-display font-medium text-muted-foreground uppercase tracking-wide">{title}</p>
          <p className="mt-1.5 text-2xl font-display font-bold text-foreground">{value}</p>
          {change && (
            <p className={cn(
              "mt-1 text-xs font-medium",
              changeType === "positive" && "text-success",
              changeType === "negative" && "text-destructive",
              changeType === "neutral"  && "text-muted-foreground",
            )}>
              {change}
            </p>
          )}
        </div>
        <div className={cn(
          "flex items-center justify-center w-10 h-10 rounded-xl shrink-0",
          iconColor ?? "bg-brand-light"
        )}>
          <Icon className={cn("w-5 h-5", iconColor ? "text-current" : "text-brand")} />
        </div>
      </div>
    </div>
  );
}
