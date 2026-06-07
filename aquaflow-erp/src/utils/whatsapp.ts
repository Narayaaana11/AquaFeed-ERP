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

export const getInvoiceMessage = (
  customerName: string,
  invoiceNumber: string,
  totalAmount: number,
  balanceAmount: number
): string => {
  return `Dear ${customerName},

Thank you for your business with AP Aquaculture!
Here are the details for your recent purchase:

*Invoice No:* ${invoiceNumber}
*Total Amount:* ₹${totalAmount.toLocaleString('en-IN')}
${balanceAmount > 0 ? `*Pending Balance on this Invoice:* ₹${balanceAmount.toLocaleString('en-IN')}\n` : '*Status:* Fully Paid ✅\n'}
If you have any questions, feel free to reply to this message.

Best regards,
AP Aquaculture Team`;
};

export const getPaymentMessage = (
  customerName: string,
  paymentAmount: number,
  invoiceNumber: string,
  newBalance: number
): string => {
  return `Dear ${customerName},

We have successfully received your payment of *₹${paymentAmount.toLocaleString('en-IN')}* towards Invoice ${invoiceNumber}.

*Remaining Balance on this Invoice:* ₹${newBalance.toLocaleString('en-IN')}

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
