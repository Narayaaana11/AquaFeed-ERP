import { Fish } from "lucide-react";
import { Link } from "react-router-dom";
import { useForm } from "react-hook-form";
import { FormInput } from "@/components/forms";
import { validationRules } from "@/lib/validations";
import { useAuth } from "@/hooks/useAuth";

interface LoginFormData {
  email: string;
  password: string;
}

export default function Login() {
  const { login, isLoading, error } = useAuth();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    mode: "onBlur",
    defaultValues: { email: "", password: "" },
  });

  const onSubmit = async (data: LoginFormData) => {
    try {
      await login(data.email, data.password);
    } catch {
      // error is handled by useAuth hook
    }
  };

  return (
    <div className="min-h-screen bg-background flex">
      {/* Left brand panel */}
      <div className="hidden lg:flex lg:w-1/2 brand-gradient flex-col justify-between p-12">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center">
            <Fish className="w-5 h-5 text-white" strokeWidth={2.5} />
          </div>
          <span className="font-display font-bold text-xl text-white">AquaFeed ERP</span>
        </div>
        <div>
          <h2 className="font-display text-4xl font-bold text-white leading-tight">
            Manage your entire aquaculture business from one place.
          </h2>
          <p className="mt-4 text-white/70 text-lg">Inventory · Sales · Billing · Reports · Multi-warehouse</p>
        </div>
        <p className="text-white/50 text-sm">© 2026 AquaFeed ERP. All rights reserved.</p>
      </div>

      {/* Right form panel */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          <div className="lg:hidden flex items-center gap-2 mb-8">
            <Fish className="w-6 h-6 text-brand" strokeWidth={2.5} />
            <span className="font-display font-bold text-lg text-foreground">AquaFeed ERP</span>
          </div>

          <h1 className="font-display text-2xl font-bold text-foreground">Welcome back</h1>
          <p className="mt-1 text-sm text-muted-foreground">Sign in to your workspace</p>

          {error && (
            <div className="mt-4 p-3 rounded-lg bg-destructive/10 border border-destructive/20">
              <p className="text-sm font-medium text-destructive">{error}</p>
            </div>
          )}

          <div className="mt-3 p-3 rounded-lg bg-brand/10 border border-brand/20">
            <p className="text-xs text-brand font-medium">Demo credentials:</p>
            <p className="text-xs text-muted-foreground">admin@aquafarm.co / admin123</p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-4">
            <FormInput
              label="Email address"
              placeholder="you@company.com"
              {...register("email", validationRules.email)}
              error={errors.email}
            />

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-sm font-display font-medium text-foreground">
                  Password <span className="text-destructive">*</span>
                </label>
              </div>
              <input
                type="password"
                placeholder="••••••••"
                {...register("password", validationRules.password)}
                className={`w-full h-10 px-3 rounded-lg border transition-colors text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-offset-0 bg-surface ${
                  errors.password
                    ? "border-destructive focus:ring-destructive/50"
                    : "border-border focus:ring-brand/50"
                }`}
              />
              {errors.password && (
                <p className="text-xs text-destructive mt-1.5">{errors.password.message}</p>
              )}
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full h-10 rounded-lg bg-brand text-white text-sm font-display font-semibold hover:bg-brand/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <div className="w-3 h-3 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                  <span>Signing in...</span>
                </>
              ) : (
                "Sign in"
              )}
            </button>
          </form>

          <p className="mt-6 text-sm text-muted-foreground text-center">
            Don't have an account?{" "}
            <Link to="/register" className="text-brand font-medium hover:underline">
              Create workspace
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
