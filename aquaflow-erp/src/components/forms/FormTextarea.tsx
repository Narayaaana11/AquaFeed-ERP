import { TextareaHTMLAttributes, forwardRef } from "react";
import { FieldError } from "react-hook-form";

interface FormTextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: FieldError;
  helperText?: string;
  rows?: number;
}

export const FormTextarea = forwardRef<HTMLTextAreaElement, FormTextareaProps>(
  ({ label, error, helperText, rows = 3, className, ...props }, ref) => {
    return (
      <div className="w-full">
        {label && (
          <label className="block text-sm font-display font-medium text-foreground mb-1.5">
            {label}
            {props.required && <span className="text-destructive"> *</span>}
          </label>
        )}
        <textarea
          ref={ref}
          rows={rows}
          className={`w-full px-3 py-2 rounded-lg border transition-colors text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-offset-0 bg-surface resize-none ${
            error
              ? "border-destructive focus:ring-destructive/50"
              : "border-border focus:ring-brand/50"
          } ${className || ""}`}
          {...props}
        />
        {error ? (
          <p className="text-xs text-destructive mt-1.5">{error.message}</p>
        ) : helperText ? (
          <p className="text-xs text-muted-foreground mt-1">{helperText}</p>
        ) : null}
      </div>
    );
  },
);

FormTextarea.displayName = "FormTextarea";
