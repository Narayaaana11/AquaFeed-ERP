import { cn } from "@/lib/utils";

export const APP_LOGO_SRC = "/logo.png";

type AppLogoSize = "xs" | "sm" | "md" | "lg" | "xl";

const sizeClasses: Record<AppLogoSize, string> = {
  xs: "h-6 w-auto max-w-[4.5rem]",
  sm: "h-8 w-auto max-w-[6rem]",
  md: "h-10 w-auto max-w-[7.5rem]",
  lg: "h-14 w-auto max-w-[10rem]",
  xl: "h-20 w-auto max-w-[14rem]",
};

interface AppLogoProps {
  size?: AppLogoSize;
  className?: string;
  alt?: string;
}

export function AppLogo({ size = "sm", className, alt = "AquaFeed ERP" }: AppLogoProps) {
  return (
    <img
      src={APP_LOGO_SRC}
      alt={alt}
      className={cn("object-contain shrink-0", sizeClasses[size], className)}
    />
  );
}
