import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FieldError, Controller, Control } from "react-hook-form";

interface FormSelectProps {
  label?: string;
  error?: FieldError;
  helperText?: string;
  options: Array<{ value: string | number; label: string }>;
  name: string;
  control: Control<any>;
  className?: string;
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
}

export function FormSelect({ label, error, helperText, options, name, control, className, placeholder, disabled, required }: FormSelectProps) {
  return (
    <Controller
      name={name}
      control={control}
      rules={{ required: required ? "Required" : false }}
      render={({ field }) => (
        <div className="w-full">
          {label && (
            <label className="block text-sm font-display font-medium text-foreground mb-1.5">
              {label}
              {required && <span className="text-destructive"> *</span>}
            </label>
          )}
          <Select 
            disabled={disabled}
            onValueChange={field.onChange}
            value={field.value}
          >
            <SelectTrigger className={`h-10 ${error ? "border-destructive focus:ring-destructive/50" : "border-border focus:ring-brand/50"} ${className || ""}`}>
              <SelectValue placeholder={placeholder} />
            </SelectTrigger>
            <SelectContent>
              {options.map((opt) => (
                <SelectItem key={opt.value} value={String(opt.value)}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {error ? (
            <p className="text-xs text-destructive mt-1.5">{error.message}</p>
          ) : helperText ? (
            <p className="text-xs text-muted-foreground mt-1">{helperText}</p>
          ) : null}
        </div>
      )}
    />
  );
}
