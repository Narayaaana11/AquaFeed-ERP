import { useEffect, useState } from 'react';
import { useWebSocketContext } from './useWebSocketContext';

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
                console.log('📦 Product created:', product);
                setProductUpdates({ type: 'created', product });
                onProductCreated?.(product);
            };

            const handleProductUpdated = (product: any) => {
                console.log('📦 Product updated:', product);
                setProductUpdates({ type: 'updated', product });
                onProductUpdated?.(product);
            };

            const handleProductDeleted = (data: any) => {
                console.log('📦 Product deleted:', data.productId);
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
                console.log('💰 Invoice created:', invoice);
                setSalesUpdates({ type: 'created', invoice });
                onInvoiceCreated?.(invoice);
            };

            const handleInvoiceUpdated = (invoice: any) => {
                console.log('💰 Invoice updated:', invoice);
                setSalesUpdates({ type: 'updated', invoice });
                onInvoiceUpdated?.(invoice);
            };

            const handleInvoicePaid = (invoice: any) => {
                console.log('✅ Invoice paid:', invoice);
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
                console.log('📊 Stock adjustment:', adjustment);
                setInventoryUpdates({ type: 'adjustment', adjustment });
                onStockAdjustment?.(adjustment);
            };

            const handleLowStockAlert = (data: any) => {
                console.log('⚠️ Low stock alert:', data);
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
                console.log('💸 Expense created:', expense);
                setExpenseUpdates({ type: 'created', expense });
                onExpenseCreated?.(expense);
            };

            const handleExpenseUpdated = (expense: any) => {
                console.log('💸 Expense updated:', expense);
                setExpenseUpdates({ type: 'updated', expense });
                onExpenseUpdated?.(expense);
            };

            const handleExpenseDeleted = (data: any) => {
                console.log('💸 Expense deleted:', data.expenseId);
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
                console.log('👥 Customer created:', customer);
                setCustomerUpdates({ type: 'created', customer });
                onCustomerCreated?.(customer);
            };

            const handleCustomerUpdated = (customer: any) => {
                console.log('👥 Customer updated:', customer);
                setCustomerUpdates({ type: 'updated', customer });
                onCustomerUpdated?.(customer);
            };

            const handleCustomerDeleted = (data: any) => {
                console.log('👥 Customer deleted:', data.customerId);
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
