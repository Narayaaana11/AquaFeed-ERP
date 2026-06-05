/**
 * Form validation schemas and utilities
 * Used with react-hook-form for consistent validation across all forms
 */

// Email validation pattern
export const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Phone validation pattern (Indian)
export const phonePattern = /^[0-9]{10}$/;

// GST validation pattern (Indian GST format)
export const gstPattern = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;

// Validation messages
export const validationMessages = {
  required: "This field is required",
  email: "Please enter a valid email address",
  phone: "Phone must be 10 digits",
  password: "Password must be at least 6 characters",
  passwordMatch: "Passwords do not match",
  companyName: "Company name must be at least 2 characters",
  ownerName: "Owner name must be at least 2 characters",
  gst: "Please enter a valid GST number",
  price: "Price must be greater than 0",
  quantity: "Quantity must be at least 0",
  weight: "Weight must be specified",
};

// Validation functions
export const validateEmail = (email: string): boolean => {
  return emailPattern.test(email);
};

export const validatePhone = (phone: string): boolean => {
  return phonePattern.test(phone);
};

export const validatePassword = (password: string): boolean => {
  return password.length >= 6;
};

export const validateGST = (gst: string): boolean => {
  return gstPattern.test(gst);
};

export const validatePrice = (price: number): boolean => {
  return price > 0;
};

export const validateQuantity = (qty: number): boolean => {
  return qty >= 0;
};

// Validation rule sets (for use with react-hook-form)
export const validationRules = {
  email: {
    required: validationMessages.required,
    pattern: {
      value: emailPattern,
      message: validationMessages.email,
    },
  },
  password: {
    required: validationMessages.required,
    minLength: {
      value: 6,
      message: validationMessages.password,
    },
  },
  phone: {
    required: validationMessages.required,
    pattern: {
      value: phonePattern,
      message: validationMessages.phone,
    },
  },
  companyName: {
    required: validationMessages.required,
    minLength: {
      value: 2,
      message: validationMessages.companyName,
    },
  },
  ownerName: {
    required: validationMessages.required,
    minLength: {
      value: 2,
      message: validationMessages.ownerName,
    },
  },
  productName: {
    required: validationMessages.required,
    minLength: {
      value: 2,
      message: "Product name must be at least 2 characters",
    },
  },
  price: {
    required: validationMessages.required,
    min: {
      value: 0.01,
      message: validationMessages.price,
    },
  },
  quantity: {
    required: validationMessages.required,
    min: {
      value: 0,
      message: validationMessages.quantity,
    },
  },
};
