import { useEffect, useState } from 'react';
import { useWebSocketContext } from './useWebSocketContext';

const devLog = (...args: any[]) => {
    if (import.meta.env.DEV) {
        console.log(...args);
    }
};

/**
 * useProducts - WebSocket hook for product updates
 */
export function useProducts(onProductCreated?: (product: any) => void, onProductUpdated?: (product: any) => void, onProductDeleted?: (productId: string) => void) {
    const { isConnected, subscribe, on, off } = useWebSocketContext();
    const [productUpdates, setProductUpdates] = useState<any>(null);

    useEffect(() => {
        if (isConnected) {
            subscribe('products');

            const handleProductCreated = (product: any) => {
                devLog('📦 Product created:', product);
                setProductUpdates({ type: 'created', product });
                onProductCreated?.(product);
            };

            const handleProductUpdated = (product: any) => {
                devLog('📦 Product updated:', product);
                setProductUpdates({ type: 'updated', product });
                onProductUpdated?.(product);
            };

            const handleProductDeleted = (data: any) => {
                devLog('📦 Product deleted:', data.productId);
                setProductUpdates({ type: 'deleted', productId: data.productId });
                onProductDeleted?.(data.productId);
            };

            on('product_created', handleProductCreated);
            on('product_update', handleProductUpdated);
            on('product_deleted', handleProductDeleted);

            return () => {
                off('product_created');
                off('product_update');
                off('product_deleted');
            };
        }
    }, [isConnected, subscribe, on, off, onProductCreated, onProductUpdated, onProductDeleted]);

    return productUpdates;
}

/**
 * useSales - WebSocket hook for sales/invoice updates
 */
export function useSales(onInvoiceCreated?: (invoice: any) => void, onInvoiceUpdated?: (invoice: any) => void, onInvoicePaid?: (invoice: any) => void) {
    const { isConnected, subscribe, on, off } = useWebSocketContext();
    const [salesUpdates, setSalesUpdates] = useState<any>(null);

    useEffect(() => {
        if (isConnected) {
            subscribe('sales');

            const handleInvoiceCreated = (invoice: any) => {
                devLog('💰 Invoice created:', invoice);
                setSalesUpdates({ type: 'created', invoice });
                onInvoiceCreated?.(invoice);
            };

            const handleInvoiceUpdated = (invoice: any) => {
                devLog('💰 Invoice updated:', invoice);
                setSalesUpdates({ type: 'updated', invoice });
                onInvoiceUpdated?.(invoice);
            };

            const handleInvoicePaid = (invoice: any) => {
                devLog('✅ Invoice paid:', invoice);
                setSalesUpdates({ type: 'paid', invoice });
                onInvoicePaid?.(invoice);
            };

            on('invoice_created', handleInvoiceCreated);
            on('invoice_updated', handleInvoiceUpdated);
            on('invoice_paid', handleInvoicePaid);

            return () => {
                off('invoice_created');
                off('invoice_updated');
                off('invoice_paid');
            };
        }
    }, [isConnected, subscribe, on, off, onInvoiceCreated, onInvoiceUpdated, onInvoicePaid]);

    return salesUpdates;
}

/**
 * useInventory - WebSocket hook for inventory updates
 */
export function useInventory(onStockAdjustment?: (adjustment: any) => void, onLowStockAlert?: (products: any[]) => void) {
    const { isConnected, subscribe, on, off } = useWebSocketContext();
    const [inventoryUpdates, setInventoryUpdates] = useState<any>(null);

    useEffect(() => {
        if (isConnected) {
            subscribe('inventory');

            const handleStockAdjustment = (adjustment: any) => {
                devLog('📊 Stock adjustment:', adjustment);
                setInventoryUpdates({ type: 'adjustment', adjustment });
                onStockAdjustment?.(adjustment);
            };

            const handleLowStockAlert = (data: any) => {
                devLog('⚠️ Low stock alert:', data);
                setInventoryUpdates({ type: 'low_stock', products: data.products });
                onLowStockAlert?.(data.products);
            };

            on('stock_adjustment', handleStockAdjustment);
            on('low_stock_alert', handleLowStockAlert);

            return () => {
                off('stock_adjustment');
                off('low_stock_alert');
            };
        }
    }, [isConnected, subscribe, on, off, onStockAdjustment, onLowStockAlert]);

    return inventoryUpdates;
}

/**
 * useExpenses - WebSocket hook for expense updates
 */
export function useExpenses(onExpenseCreated?: (expense: any) => void, onExpenseUpdated?: (expense: any) => void, onExpenseDeleted?: (expenseId: string) => void) {
    const { isConnected, subscribe, on, off } = useWebSocketContext();
    const [expenseUpdates, setExpenseUpdates] = useState<any>(null);

    useEffect(() => {
        if (isConnected) {
            subscribe('expenses');

            const handleExpenseCreated = (expense: any) => {
                devLog('💸 Expense created:', expense);
                setExpenseUpdates({ type: 'created', expense });
                onExpenseCreated?.(expense);
            };

            const handleExpenseUpdated = (expense: any) => {
                devLog('💸 Expense updated:', expense);
                setExpenseUpdates({ type: 'updated', expense });
                onExpenseUpdated?.(expense);
            };

            const handleExpenseDeleted = (data: any) => {
                devLog('💸 Expense deleted:', data.expenseId);
                setExpenseUpdates({ type: 'deleted', expenseId: data.expenseId });
                onExpenseDeleted?.(data.expenseId);
            };

            on('expense_created', handleExpenseCreated);
            on('expense_updated', handleExpenseUpdated);
            on('expense_deleted', handleExpenseDeleted);

            return () => {
                off('expense_created');
                off('expense_updated');
                off('expense_deleted');
            };
        }
    }, [isConnected, subscribe, on, off, onExpenseCreated, onExpenseUpdated, onExpenseDeleted]);

    return expenseUpdates;
}

/**
 * useCustomers - WebSocket hook for customer updates
 */
export function useCustomers(onCustomerCreated?: (customer: any) => void, onCustomerUpdated?: (customer: any) => void, onCustomerDeleted?: (customerId: string) => void) {
    const { isConnected, subscribe, on, off } = useWebSocketContext();
    const [customerUpdates, setCustomerUpdates] = useState<any>(null);

    useEffect(() => {
        if (isConnected) {
            subscribe('customers');

            const handleCustomerCreated = (customer: any) => {
                devLog('👥 Customer created:', customer);
                setCustomerUpdates({ type: 'created', customer });
                onCustomerCreated?.(customer);
            };

            const handleCustomerUpdated = (customer: any) => {
                devLog('👥 Customer updated:', customer);
                setCustomerUpdates({ type: 'updated', customer });
                onCustomerUpdated?.(customer);
            };

            const handleCustomerDeleted = (data: any) => {
                devLog('👥 Customer deleted:', data.customerId);
                setCustomerUpdates({ type: 'deleted', customerId: data.customerId });
                onCustomerDeleted?.(data.customerId);
            };

            on('customer_created', handleCustomerCreated);
            on('customer_update', handleCustomerUpdated);
            on('customer_deleted', handleCustomerDeleted);

            return () => {
                off('customer_created');
                off('customer_update');
                off('customer_deleted');
            };
        }
    }, [isConnected, subscribe, on, off, onCustomerCreated, onCustomerUpdated, onCustomerDeleted]);

    return customerUpdates;
}

/**
 * usePurchaseOrders - WebSocket hook for purchase order updates
 */
export function usePurchaseOrders(onPOCreated?: (po: any) => void, onPOReceived?: (po: any) => void) {
    const { isConnected, subscribe, on, off } = useWebSocketContext();
    const [poUpdates, setPoUpdates] = useState<any>(null);

    useEffect(() => {
        if (isConnected) {
            subscribe('company');

            const handlePOCreated = (po: any) => {
                devLog('🛒 Purchase order created:', po);
                setPoUpdates({ type: 'created', po });
                onPOCreated?.(po);
            };

            const handlePOReceived = (po: any) => {
                devLog('✅ Purchase order received:', po);
                setPoUpdates({ type: 'received', po });
                onPOReceived?.(po);
            };

            on('po_created', handlePOCreated);
            on('po_received', handlePOReceived);

            return () => {
                off('po_created');
                off('po_received');
            };
        }
    }, [isConnected, subscribe, on, off, onPOCreated, onPOReceived]);

    return poUpdates;
}

/**
 * useQuotations - WebSocket hook for quotation updates
 */
export function useQuotations(
    onQuotationCreated?: (quotation: any) => void,
    onQuotationUpdated?: (quotation: any) => void,
    onQuotationDeleted?: (quotationId: string) => void
) {
    const { isConnected, subscribe, on, off } = useWebSocketContext();
    const [quotationUpdates, setQuotationUpdates] = useState<any>(null);

    useEffect(() => {
        if (isConnected) {
            subscribe('quotations');

            const handleQuotationCreated = (quotation: any) => {
                devLog('📄 Quotation created:', quotation);
                setQuotationUpdates({ type: 'created', quotation });
                onQuotationCreated?.(quotation);
            };

            const handleQuotationUpdated = (quotation: any) => {
                devLog('📄 Quotation updated:', quotation);
                setQuotationUpdates({ type: 'updated', quotation });
                onQuotationUpdated?.(quotation);
            };

            const handleQuotationDeleted = (data: any) => {
                devLog('📄 Quotation deleted:', data.quotationId);
                setQuotationUpdates({ type: 'deleted', quotationId: data.quotationId });
                onQuotationDeleted?.(data.quotationId);
            };

            on('quotation_created', handleQuotationCreated);
            on('quotation_updated', handleQuotationUpdated);
            on('quotation_deleted', handleQuotationDeleted);

            return () => {
                off('quotation_created');
                off('quotation_updated');
                off('quotation_deleted');
            };
        }
    }, [isConnected, subscribe, on, off, onQuotationCreated, onQuotationUpdated, onQuotationDeleted]);

    return quotationUpdates;
}

