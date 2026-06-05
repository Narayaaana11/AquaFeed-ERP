import {
  PAYMENT_STATUS,
  ROLE_COLORS,
  EXPENSE_TYPE_COLORS,
  STATUS_COLORS,
  EXPENSE_TYPES,
} from "@/lib/constants";
import { LucideIcon } from "lucide-react";

interface StatusBadgeProps {
  status: string;
  variant?: "payment" | "role" | "expense" | "stock" | "custom";
  className?: string;
}

export function StatusBadge({
  status,
  variant = "payment",
  className = "",
}: StatusBadgeProps) {
  let colorClass = "bg-muted text-muted-foreground";

  if (variant === "payment" && status in STATUS_COLORS) {
    colorClass = STATUS_COLORS[status as keyof typeof STATUS_COLORS];
  } else if (variant === "role" && status in ROLE_COLORS) {
    colorClass = ROLE_COLORS[status as keyof typeof ROLE_COLORS];
  } else if (variant === "expense" && status in EXPENSE_TYPE_COLORS) {
    colorClass =
      EXPENSE_TYPE_COLORS[status as keyof typeof EXPENSE_TYPE_COLORS];
  }

  return (
    <span
      className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-display font-semibold ${colorClass} ${className}`}
    >
      {status}
    </span>
  );
}

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4">
      {Icon && (
        <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-4">
          <Icon className="w-6 h-6 text-muted-foreground" />
        </div>
      )}
      <h3 className="font-display font-semibold text-foreground text-lg">
        {title}
      </h3>
      <p className="mt-1 text-sm text-muted-foreground text-center max-w-sm">
        {description}
      </p>
      {action && (
        <button
          onClick={action.onClick}
          className="mt-4 h-9 px-4 rounded-lg bg-brand text-white text-sm font-display font-semibold hover:bg-brand/90 transition-colors"
        >
          {action.label}
        </button>
      )}
    </div>
  );
}
