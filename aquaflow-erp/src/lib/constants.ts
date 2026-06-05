/**
 * Application-wide constants, enums, and lookup tables
 */

// User roles in the system
export const USER_ROLES = {
  OWNER: "Owner",
  MANAGER: "Manager",
  SALES_STAFF: "Sales Staff",
  ACCOUNTANT: "Accountant",
} as const;

export type UserRole = typeof USER_ROLES[keyof typeof USER_ROLES];

// Invoice and payment statuses
export const PAYMENT_STATUS = {
  PAID: "Paid",
  PENDING: "Pending",
  CREDIT: "Credit",
  OVERDUE: "Overdue",
} as const;

export type PaymentStatus = typeof PAYMENT_STATUS[keyof typeof PAYMENT_STATUS];

// Payment type methods
export const PAYMENT_METHODS = {
  CASH: "Cash",
  UPI: "UPI",
  CHEQUE: "Cheque",
  CREDIT: "Credit",
  BANK_TRANSFER: "Bank Transfer",
} as const;

export type PaymentMethod = typeof PAYMENT_METHODS[keyof typeof PAYMENT_METHODS];

// Expense categories
export const EXPENSE_TYPES = {
  TRANSPORT: "Transport",
  STAFF_SALARY: "Staff Salary",
  PACKAGING: "Packaging",
  ELECTRICITY: "Electricity",
  RENT: "Rent",
  REPAIRS: "Repairs",
  MAINTENANCE: "Maintenance",
  OTHER: "Other",
} as const;

export type ExpenseType = typeof EXPENSE_TYPES[keyof typeof EXPENSE_TYPES];

// Stock status levels
export const STOCK_STATUS = {
  IN_STOCK: "in_stock",
  LOW_STOCK: "low_stock",
  OUT_OF_STOCK: "out_of_stock",
  CRITICAL: "critical",
} as const;

export type StockStatus = typeof STOCK_STATUS[keyof typeof STOCK_STATUS];

// Warehouse status
export const WAREHOUSE_STATUS = {
  ACTIVE: "Active",
  INACTIVE: "Inactive",
  MAINTENANCE: "Maintenance",
} as const;

// Employee status
export const EMPLOYEE_STATUS = {
  ACTIVE: "Active",
  INACTIVE: "Inactive",
} as const;

// Low stock threshold (units)
export const LOW_STOCK_THRESHOLD = 10;
export const CRITICAL_STOCK_THRESHOLD = 5;

// Pagination
export const ROWS_PER_PAGE = 10;
export const PAGINATION_SIZES = [5, 10, 25, 50] as const;

// Default values for forms
export const DEFAULT_FORM_VALUES = {
  email: "",
  password: "",
  companyName: "",
  ownerName: "",
  phone: "",
  gstNumber: "",
  address: "",
  productName: "",
  brand: "",
  weight: "",
  price: 0,
  quantity: 0,
  notes: "",
};

// Color mappings for semantic colors
export const STATUS_COLORS = {
  [PAYMENT_STATUS.PAID]: "bg-success/10 text-success",
  [PAYMENT_STATUS.PENDING]: "bg-warning/10 text-warning",
  [PAYMENT_STATUS.CREDIT]: "bg-destructive/10 text-destructive",
  [PAYMENT_STATUS.OVERDUE]: "bg-destructive/10 text-destructive",
} as const;

export const ROLE_COLORS = {
  [USER_ROLES.OWNER]: "bg-brand-light text-brand",
  [USER_ROLES.MANAGER]: "bg-secondary text-foreground",
  [USER_ROLES.SALES_STAFF]: "bg-success/10 text-success",
  [USER_ROLES.ACCOUNTANT]: "bg-warning/10 text-warning",
} as const;

export const EXPENSE_TYPE_COLORS = {
  [EXPENSE_TYPES.TRANSPORT]: "bg-brand-light text-brand",
  [EXPENSE_TYPES.STAFF_SALARY]: "bg-secondary text-foreground",
  [EXPENSE_TYPES.PACKAGING]: "bg-accent text-accent-foreground",
  [EXPENSE_TYPES.ELECTRICITY]: "bg-warning/10 text-warning",
  [EXPENSE_TYPES.RENT]: "bg-destructive/10 text-destructive",
  [EXPENSE_TYPES.REPAIRS]: "bg-muted text-muted-foreground",
  [EXPENSE_TYPES.MAINTENANCE]: "bg-muted text-muted-foreground",
  [EXPENSE_TYPES.OTHER]: "bg-muted text-muted-foreground",
} as const;

export const STOCK_STATUS_COLORS = {
  [STOCK_STATUS.IN_STOCK]: "bg-success/10 text-success border-success/20",
  [STOCK_STATUS.LOW_STOCK]: "bg-warning/10 text-warning border-warning/20",
  [STOCK_STATUS.CRITICAL]: "bg-destructive/10 text-destructive border-destructive/20",
  [STOCK_STATUS.OUT_OF_STOCK]: "bg-muted text-muted-foreground border-border",
} as const;

// Array versions for selects
export const roleArray = Object.values(USER_ROLES);
export const paymentMethodArray = Object.values(PAYMENT_METHODS);
export const expenseTypeArray = Object.values(EXPENSE_TYPES);
