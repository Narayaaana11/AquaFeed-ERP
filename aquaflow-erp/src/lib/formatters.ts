/**
 * Utility functions for formatting values for display
 */

import { CRITICAL_STOCK_THRESHOLD, LOW_STOCK_THRESHOLD, STOCK_STATUS } from "./constants";

// Re-export constants for convenience
export { LOW_STOCK_THRESHOLD, CRITICAL_STOCK_THRESHOLD };

/**
 * Format price as Indian Rupees
 */
export const formatPrice = (price: number | string): string => {
  const numPrice = typeof price === "string" ? parseFloat(price) : price;
  return `₹${numPrice.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
};

/**
 * Format price with decimals for precise display
 */
export const formatPriceWithDecimals = (price: number): string => {
  return `₹${price.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

/**
 * Format date as DD MMM YYYY
 */
export const formatDate = (date: Date | string): string => {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

/**
 * Format date as YYYY-MM-DD (for input fields)
 */
export const formatDateForInput = (date: Date | string): string => {
  const d = typeof date === "string" ? new Date(date) : date;
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

/**
 * Format date and time together
 */
export const formatDateTime = (date: Date | string): string => {
  const d = typeof date === "string" ? new Date(date) : date;
  const dateStr = d.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
  const timeStr = d.toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
  });
  return `${dateStr}, ${timeStr}`;
};

/**
 * Format quantity with appropriate unit
 */
export const formatQuantity = (qty: number, unit: string = "units"): string => {
  return `${qty.toLocaleString("en-IN")} ${unit}`;
};

/**
 * Format weight in kg
 */
export const formatWeight = (weight: number | string): string => {
  const w = typeof weight === "string" ? parseFloat(weight) : weight;
  return `${w} kg`;
};

/**
 * Get stock status based on quantity
 */
export const getStockStatus = (
  quantity: number
): { status: string; label: string; color: string } => {
  if (quantity <= 0) {
    return {
      status: STOCK_STATUS.OUT_OF_STOCK,
      label: "Out of Stock",
      color: "bg-muted text-muted-foreground",
    };
  }
  if (quantity < CRITICAL_STOCK_THRESHOLD) {
    return {
      status: STOCK_STATUS.CRITICAL,
      label: "Critical",
      color: "bg-destructive/10 text-destructive",
    };
  }
  if (quantity < LOW_STOCK_THRESHOLD) {
    return {
      status: STOCK_STATUS.LOW_STOCK,
      label: "Low Stock",
      color: "bg-warning/10 text-warning",
    };
  }
  return {
    status: STOCK_STATUS.IN_STOCK,
    label: "In Stock",
    color: "bg-success/10 text-success",
  };
};

/**
 * Format percentage with appropriate decimal places
 */
export const formatPercentage = (value: number, decimals = 1): string => {
  return `${value.toFixed(decimals)}%`;
};

/**
 * Format large numbers with K/M notation
 */
export const formatCompactNumber = (num: number): string => {
  if (num >= 1000000) {
    return `${(num / 1000000).toFixed(1)}M`;
  }
  if (num >= 1000) {
    return `${(num / 1000).toFixed(1)}K`;
  }
  return num.toString();
};

/**
 * Format currency amount with abbreviation
 */
export const formatCurrencyCompact = (amount: number): string => {
  if (amount >= 1000000) {
    return `₹${(amount / 1000000).toFixed(2)}Cr`;
  }
  if (amount >= 100000) {
    return `₹${(amount / 100000).toFixed(2)}L`;
  }
  if (amount >= 1000) {
    return `₹${(amount / 1000).toFixed(2)}K`;
  }
  return formatPrice(amount);
};

/**
 * Calculate credit balance (outstanding)
 */
export const calculateCreditBalance = (
  creditLimit: number,
  outstanding: number
): { balance: number; percentage: number } => {
  const balance = creditLimit - outstanding;
  const percentage = (outstanding / creditLimit) * 100;
  return {
    balance: Math.max(0, balance),
    percentage: Math.min(100, percentage),
  };
};

/**
 * Format phone number (Indian format)
 */
export const formatPhone = (phone: string): string => {
  const cleaned = phone.replace(/\D/g, "");
  if (cleaned.length === 10) {
    return `${cleaned.slice(0, 5)}-${cleaned.slice(5)}`;
  }
  return phone;
};

/**
 * Truncate text with ellipsis
 */
export const truncateText = (text: string, length: number = 50): string => {
  if (text.length <= length) return text;
  return `${text.substring(0, length)}...`;
};

/**
 * Get initials from name
 */
export const getInitials = (name: string): string => {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .substring(0, 2);
};

/**
 * Calculate invoice total from line items
 */
export const calculateInvoiceTotal = (
  items: Array<{ quantity: number; price: number }>
): number => {
  return items.reduce((sum, item) => sum + item.quantity * item.price, 0);
};

/**
 * Calculate percentage change between two values
 */
export const calculatePercentageChange = (current: number, previous: number): string => {
  if (previous === 0) return "N/A";
  const change = ((current - previous) / previous) * 100;
  const sign = change >= 0 ? "+" : "";
  return `${sign}${change.toFixed(1)}%`;
};
