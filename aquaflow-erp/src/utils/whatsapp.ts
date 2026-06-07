export const formatPhoneNumber = (phone: string | undefined): string | null => {
  if (!phone) return null;
  // Remove all non-numeric characters
  let cleanPhone = phone.replace(/\D/g, "");
  
  // If it's a 10 digit Indian number, add 91
  if (cleanPhone.length === 10) {
    cleanPhone = "91" + cleanPhone;
  }
  
  return cleanPhone;
};

export const generateWhatsAppLink = (phone: string, text: string): string => {
  const formattedPhone = formatPhoneNumber(phone);
  if (!formattedPhone) return "";
  const encodedText = encodeURIComponent(text);
  return `https://wa.me/${formattedPhone}?text=${encodedText}`;
};

export const openWhatsApp = (phone: string, text: string) => {
  const link = generateWhatsAppLink(phone, text);
  if (link) {
    window.open(link, "_blank");
  }
};

export const getInvoiceMessage = (invoice: any): string => {
  const customerName = invoice.customerName || "Customer";
  const balanceAmount = invoice.total - (invoice.paidAmount || 0);

  let itemsText = "";
  if (invoice.items && invoice.items.length > 0) {
    itemsText = "\n*Items Purchased:*\n" + invoice.items.map((i: any) => 
      `• ${i.productName} (x${i.quantity}) - ₹${i.lineTotal.toLocaleString('en-IN')}`
    ).join("\n") + "\n";
  }

  let paymentsText = "";
  if (invoice.payments && invoice.payments.length > 0) {
    paymentsText = "\n*Payment History:*\n" + invoice.payments.map((p: any) => 
      `• ₹${p.amount.toLocaleString('en-IN')} (${p.paymentType}) on ${new Date(p.date || Date.now()).toLocaleDateString('en-IN')}`
    ).join("\n") + "\n";
  }

  return `Dear ${customerName},

Thank you for your business with AP Aquaculture!
Here are the details for your recent purchase:

*Invoice No:* ${invoice.invoiceNumber}
*Date:* ${new Date(invoice.createdAt).toLocaleDateString('en-IN')}
${itemsText}
*Total Amount:* ₹${invoice.total.toLocaleString('en-IN')}
*Amount Paid:* ₹${(invoice.paidAmount || 0).toLocaleString('en-IN')}${paymentsText}
${balanceAmount > 0 ? `*Pending Balance:* ₹${balanceAmount.toLocaleString('en-IN')}\n` : '*Status:* Fully Paid ✅\n'}
If you have any questions, feel free to reply to this message.

Best regards,
AP Aquaculture Team`;
};

export const getPaymentMessage = (
  invoice: any,
  paymentAmount: number
): string => {
  const customerName = invoice.customerName || "Customer";
  const newBalance = invoice.total - (invoice.paidAmount || 0);

  let paymentsText = "";
  if (invoice.payments && invoice.payments.length > 0) {
    paymentsText = "\n*All Payments Received:*\n" + invoice.payments.map((p: any) => 
      `• ₹${p.amount.toLocaleString('en-IN')} (${p.paymentType}) on ${new Date(p.date || Date.now()).toLocaleDateString('en-IN')}`
    ).join("\n") + "\n";
  }

  return `Dear ${customerName},

We have successfully received your recent payment of *₹${paymentAmount.toLocaleString('en-IN')}* towards Invoice ${invoice.invoiceNumber}.
${paymentsText}
*Total Invoice Amount:* ₹${invoice.total.toLocaleString('en-IN')}
*Remaining Balance:* ₹${newBalance.toLocaleString('en-IN')}

Thank you for your prompt payment!

Best regards,
AP Aquaculture Team`;
};

export const getReminderMessage = (
  customerName: string,
  totalOutstandingBalance: number
): string => {
  return `Dear ${customerName},

This is a gentle reminder regarding your outstanding balance with AP Aquaculture.

*Total Outstanding Balance:* ₹${totalOutstandingBalance.toLocaleString('en-IN')}

Kindly arrange for the payment at your earliest convenience. If you have already made the payment, please ignore this message.

Thank you,
AP Aquaculture Team`;
};
