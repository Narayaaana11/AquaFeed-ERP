import { InputHTMLAttributes, forwardRef } from "react";
import { FieldError } from "react-hook-form";

interface FormNumberProps extends Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "type"
> {
  label?: string;
  error?: FieldError;
  helperText?: string;
  prefix?: string;
  decimals?: number;
}

export const FormNumber = forwardRef<HTMLInputElement, FormNumberProps>(
  (
    { label, error, helperText, prefix, decimals = 0, className, ...props },
    ref,
  ) => {
    return (
      <div className="w-full">
        {label && (
          <label className="block text-sm font-display font-medium text-foreground mb-1.5">
            {label}
            {props.required && <span className="text-destructive"> *</span>}
          </label>
        )}
        <div className="relative">
          {prefix && (
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm font-medium">
              {prefix}
            </span>
          )}
          <input
            ref={ref}
            type="number"
            step={decimals > 0 ? `0.${"0".repeat(decimals - 1)}1` : "1"}
            className={`w-full h-10 px-3 ${prefix ? "pl-7" : ""} rounded-lg border transition-colors text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-offset-0 bg-surface ${
              error
                ? "border-destructive focus:ring-destructive/50"
                : "border-border focus:ring-brand/50"
            } ${className || ""}`}
            {...props}
          />
        </div>
        {error ? (
          <p className="text-xs text-destructive mt-1.5">{error.message}</p>
        ) : helperText ? (
          <p className="text-xs text-muted-foreground mt-1">{helperText}</p>
        ) : null}
      </div>
    );
  },
);

FormNumber.displayName = "FormNumber";
