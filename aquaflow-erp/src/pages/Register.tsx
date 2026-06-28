import { Upload, X } from "lucide-react";
import { Link } from "react-router-dom";
import { useForm } from "react-hook-form";
import { FormInput } from "@/components/forms";
import { validationRules, validationMessages } from "@/lib/validations";
import { useAuth } from "@/hooks/useAuth";
import { useState, useRef } from "react";
import { AppLogo } from "@/components/AppLogo";

interface RegisterFormData {
  companyName: string;
  name: string;
  email: string;
  phone: string;
  state: string;
  password: string;
  confirmPassword: string;
}

export default function Register() {
  const { register: registerUser, isLoading, error } = useAuth();
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<RegisterFormData>({
    mode: "onBlur",
    defaultValues: { companyName: "", name: "", email: "", phone: "", state: "", password: "", confirmPassword: "" },
  });

  const password = watch("password");

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith("image/")) {
        alert("Please select an image file");
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        alert("Logo size should be less than 5MB");
        return;
      }
      setLogoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeLogo = () => {
    setLogoFile(null);
    setLogoPreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const onSubmit = async (data: RegisterFormData) => {
    try {
      await registerUser({
        name: data.name,
        email: data.email,
        password: data.password,
        companyName: data.companyName,
        phone: data.phone,
        state: data.state,
        logo: logoFile,
      });
    } catch {
      // error handled by hook
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="w-full max-w-lg">
        <div className="flex items-center gap-2 mb-8">
          <AppLogo size="sm" />
          <span className="font-display font-bold text-lg text-foreground">AquaFeed ERP</span>
        </div>

        <div className="bg-surface rounded-2xl border border-border shadow-panel p-8">
          <h1 className="font-display text-2xl font-bold text-foreground">Create your workspace</h1>
          <p className="mt-1 text-sm text-muted-foreground">Set up your company account to get started</p>

          {error && (
            <div className="mt-4 p-3 rounded-lg bg-destructive/10 border border-destructive/20">
              <p className="text-sm font-medium text-destructive">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-4">
            {/* Logo Upload */}
            <div>
              <label className="block text-sm font-display font-semibold text-foreground mb-2">
                Company Logo
              </label>
              {logoPreview ? (
                <div className="relative w-24 h-24 mb-3">
                  <img
                    src={logoPreview}
                    alt="Logo preview"
                    className="w-full h-full object-cover rounded-lg border border-border"
                  />
                  <button
                    type="button"
                    onClick={removeLogo}
                    className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-destructive text-white flex items-center justify-center hover:bg-destructive/90 transition-colors"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full h-24 border-2 border-dashed border-border rounded-lg flex flex-col items-center justify-center gap-2 hover:border-brand hover:bg-brand/5 transition-colors"
                >
                  <Upload className="w-5 h-5 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">Click to upload logo</span>
                  <span className="text-[10px] text-muted-foreground">Max 5MB (PNG, JPG, GIF)</span>
                </button>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleLogoChange}
                className="hidden"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormInput
                label="Company Name"
                placeholder="AquaFarm Ltd."
                {...register("companyName", validationRules.companyName)}
                error={errors.companyName}
              />
              <FormInput
                label="Owner Name"
                placeholder="John Doe"
                {...register("name", validationRules.ownerName)}
                error={errors.name}
              />
            </div>

            <FormInput
              label="Email address"
              type="email"
              placeholder="owner@company.com"
              {...register("email", validationRules.email)}
              error={errors.email}
            />

            <FormInput
              label="Phone Number"
              type="tel"
              placeholder="9876543210"
              {...register("phone", validationRules.phone)}
              error={errors.phone}
              helperText="10-digit phone number"
            />

            <FormInput
              label="State"
              placeholder="Andhra Pradesh"
              {...register("state", { required: "State is required" })}
              error={errors.state}
              helperText="Required for accurate GST calculations (intra-state vs inter-state)"
            />

            <FormInput
              label="Password"
              type="password"
              placeholder="••••••••"
              {...register("password", validationRules.password)}
              error={errors.password}
              helperText="At least 6 characters"
            />

            <FormInput
              label="Confirm Password"
              type="password"
              placeholder="••••••••"
              {...register("confirmPassword", {
                required: validationMessages.required,
                validate: (value) => value === password || validationMessages.passwordMatch,
              })}
              error={errors.confirmPassword}
            />

            <button
              type="submit"
              disabled={isLoading}
              className="w-full h-10 rounded-lg bg-brand text-white text-sm font-display font-semibold hover:bg-brand/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2 mt-2"
            >
              {isLoading ? (
                <>
                  <div className="w-3 h-3 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                  <span>Creating workspace...</span>
                </>
              ) : (
                "Create workspace"
              )}
            </button>
          </form>

          <p className="mt-5 text-sm text-muted-foreground text-center">
            Already have an account?{" "}
            <Link to="/login" className="text-brand font-medium hover:underline">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
