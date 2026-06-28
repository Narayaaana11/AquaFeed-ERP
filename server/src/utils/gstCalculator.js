/**
 * Calculates the GST split (CGST, SGST, IGST) based on the states of the company and customer.
 * 
 * @param {string} companyState - The state of the selling company
 * @param {string} customerState - The state of the purchasing customer
 * @param {number} totalGstAmount - The total GST amount calculated for the invoice
 * @returns {object} - Object containing cgstAmount, sgstAmount, and igstAmount
 */
function calculateGstSplit(companyState, customerState, totalGstAmount) {
  const result = {
    cgstAmount: 0,
    sgstAmount: 0,
    igstAmount: 0
  };

  if (!totalGstAmount || totalGstAmount <= 0) {
    return result;
  }

  // If either state is missing, assume intra-state (local) by default.
  if (!companyState || !customerState) {
    console.warn(`[GST Calculator] Missing state information (Company: '${companyState}', Customer: '${customerState}'). Assuming intra-state transaction.`);
    result.cgstAmount = Number((totalGstAmount / 2).toFixed(2));
    result.sgstAmount = Number((totalGstAmount / 2).toFixed(2));
    return result;
  }

  const cState = companyState.trim().toLowerCase();
  const custState = customerState.trim().toLowerCase();

  // If states match, it's an intra-state sale
  if (cState === custState) {
    result.cgstAmount = Number((totalGstAmount / 2).toFixed(2));
    result.sgstAmount = Number((totalGstAmount / 2).toFixed(2));
  } else {
    // If states differ, it's an inter-state sale
    result.igstAmount = Number(totalGstAmount.toFixed(2));
  }

  return result;
}

module.exports = {
  calculateGstSplit
};
