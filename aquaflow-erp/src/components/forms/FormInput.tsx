import { InputHTMLAttributes, forwardRef } from "react";
import { FieldError } from "react-hook-form";

interface FormInputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: FieldError;
  helperText?: string;
  icon?: React.ReactNode;
}

export const FormInput = forwardRef<HTMLInputElement, FormInputProps>(
  ({ label, error, helperText, icon, className, ...props }, ref) => {
    return (
      <div className="w-full">
        {label && (
          <label className="block text-sm font-display font-medium text-foreground mb-1.5">
            {label}
            {props.required && <span className="text-destructive"> *</span>}
          </label>
        )}
        <div className="relative">
          {icon && (
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
              {icon}
            </div>
          )}
          <input
            ref={ref}
            className={`w-full h-10 px-3 ${icon ? "pl-10" : ""} rounded-lg border transition-colors text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-offset-0 bg-surface ${
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

FormInput.displayName = "FormInput";
