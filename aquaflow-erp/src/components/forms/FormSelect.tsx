import { SelectHTMLAttributes, forwardRef } from "react";
import { FieldError } from "react-hook-form";

interface FormSelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: FieldError;
  helperText?: string;
  options: Array<{ value: string | number; label: string }>;
}

export const FormSelect = forwardRef<HTMLSelectElement, FormSelectProps>(
  ({ label, error, helperText, options, className, ...props }, ref) => {
    return (
      <div className="w-full">
        {label && (
          <label className="block text-sm font-display font-medium text-foreground mb-1.5">
            {label}
            {props.required && <span className="text-destructive"> *</span>}
          </label>
        )}
        <select
          ref={ref}
          className={`w-full h-10 px-3 rounded-lg border transition-colors text-sm text-foreground bg-surface outline-none focus:ring-2 focus:ring-offset-0 appearance-none ${
            error
              ? "border-destructive focus:ring-destructive/50"
              : "border-border focus:ring-brand/50"
          } ${className || ""}`}
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%2364748b' d='M10.293 3.293L6 7.586 1.707 3.293A1 1 0 00.293 4.707l5 5a1 1 0 001.414 0l5-5a1 1 0 10-1.414-1.414z'/%3E%3C/svg%3E")`,
            backgroundRepeat: "no-repeat",
            backgroundPosition: "right 0.5rem center",
            backgroundSize: "1.5em 1.5em",
            paddingRight: "2.5rem",
          }}
          {...props}
        >
          {props.placeholder && <option value="">{props.placeholder}</option>}
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        {error ? (
          <p className="text-xs text-destructive mt-1.5">{error.message}</p>
        ) : helperText ? (
          <p className="text-xs text-muted-foreground mt-1">{helperText}</p>
        ) : null}
      </div>
    );
  },
);

FormSelect.displayName = "FormSelect";
