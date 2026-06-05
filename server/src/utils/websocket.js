/**
 * WebSocket Event Emitters
 * Broadcast real-time updates to connected clients
 */

// Dashboard Events
function emitDashboardUpdate(io, companyId, data) {
    io.to(`dashboard_${companyId}`).emit('dashboard_update', data);
}

// Product Events
function emitProductUpdate(io, companyId, data) {
    io.to(`products_${companyId}`).emit('product_update', data);
}

function emitProductCreated(io, companyId, product) {
    io.to(`products_${companyId}`).emit('product_created', product);
}

function emitProductDeleted(io, companyId, productId) {
    io.to(`products_${companyId}`).emit('product_deleted', { productId });
}

// Customer Events
function emitCustomerUpdate(io, companyId, data) {
    io.to(`customers_${companyId}`).emit('customer_update', data);
}

function emitCustomerCreated(io, companyId, customer) {
    io.to(`customers_${companyId}`).emit('customer_created', customer);
}

function emitCustomerDeleted(io, companyId, customerId) {
    io.to(`customers_${companyId}`).emit('customer_deleted', { customerId });
}

// Sales/Invoice Events
function emitInvoiceCreated(io, companyId, invoice) {
    io.to(`sales_${companyId}`).emit('invoice_created', invoice);
}

function emitInvoiceUpdated(io, companyId, invoice) {
    io.to(`sales_${companyId}`).emit('invoice_updated', invoice);
}

function emitInvoiceDeleted(io, companyId, invoiceId) {
    io.to(`sales_${companyId}`).emit('invoice_deleted', { invoiceId });
}

function emitInvoicePaid(io, companyId, invoice) {
    io.to(`sales_${companyId}`).emit('invoice_paid', invoice);
}

// Inventory Events
function emitInventoryUpdate(io, companyId, data) {
    io.to(`inventory_${companyId}`).emit('inventory_update', data);
}

function emitStockAdjustment(io, companyId, adjustment) {
    io.to(`inventory_${companyId}`).emit('stock_adjustment', adjustment);
}

function emitLowStockAlert(io, companyId, products) {
    io.to(`inventory_${companyId}`).emit('low_stock_alert', { products, timestamp: new Date() });
}

// Expense Events
function emitExpenseCreated(io, companyId, expense) {
    io.to(`expenses_${companyId}`).emit('expense_created', expense);
}

function emitExpenseUpdated(io, companyId, expense) {
    io.to(`expenses_${companyId}`).emit('expense_updated', expense);
}

function emitExpenseDeleted(io, companyId, expenseId) {
    io.to(`expenses_${companyId}`).emit('expense_deleted', { expenseId });
}

// Warehouse Events
function emitWarehouseUpdate(io, companyId, warehouse) {
    io.to(`warehouses_${companyId}`).emit('warehouse_update', warehouse);
}

function emitWarehouseCreated(io, companyId, warehouse) {
    io.to(`warehouses_${companyId}`).emit('warehouse_created', warehouse);
}

// Settings Events
function emitSettingsUpdate(io, companyId, settings) {
    io.to(`settings_${companyId}`).emit('settings_update', settings);
}

// Broadcast events to all users of a company (admin notifications)
function broadcastToCompany(io, companyId, event, data) {
    io.to(`company_${companyId}`).emit(event, { ...data, timestamp: new Date() });
}

module.exports = {
    emitDashboardUpdate,
    emitProductUpdate,
    emitProductCreated,
    emitProductDeleted,
    emitCustomerUpdate,
    emitCustomerCreated,
    emitCustomerDeleted,
    emitInvoiceCreated,
    emitInvoiceUpdated,
    emitInvoiceDeleted,
    emitInvoicePaid,
    emitInventoryUpdate,
    emitStockAdjustment,
    emitLowStockAlert,
    emitExpenseCreated,
    emitExpenseUpdated,
    emitExpenseDeleted,
    emitWarehouseUpdate,
    emitWarehouseCreated,
    emitSettingsUpdate,
    broadcastToCompany,
};
