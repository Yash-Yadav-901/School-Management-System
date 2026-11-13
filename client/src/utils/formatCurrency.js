/**
 * Formats an integer amount in paise into an Indian Rupee string for display only.
 * 1 INR = 100 paise.
 *
 * @param {number|string|null|undefined} paise - Integer amount in paise
 * @param {object} [options]
 * @param {boolean} [options.showSymbol=true] - Whether to prepend the ₹ symbol
 * @returns {string} Formatted rupee string, e.g. "₹500.00"
 */
export function formatPaiseToRupees(paise, { showSymbol = true } = {}) {
  const numeric = typeof paise === 'number' ? paise : parseInt(paise, 10);

  if (Number.isNaN(numeric) || numeric === null || numeric === undefined) {
    return showSymbol ? '₹0.00' : '0.00';
  }

  const isNegative = numeric < 0;
  const absPaise = Math.abs(numeric);
  const rupees = (absPaise / 100).toFixed(2);

  // Split integer and fraction for Indian locale formatting
  const [intPart, decPart] = rupees.split('.');
  const formattedInt = new Intl.NumberFormat('en-IN').format(parseInt(intPart, 10));

  const formattedAmount = `${formattedInt}.${decPart}`;
  const prefix = isNegative ? '-' : '';
  const symbol = showSymbol ? '₹' : '';

  return `${prefix}${symbol}${formattedAmount}`;
}

/**
 * Parses user input in rupees (e.g. "500" or "500.50") into integer paise for API submission.
 *
 * @param {string|number} rupeeString - Amount in rupees
 * @returns {number} Integer amount in paise
 */
export function parseRupeesToPaise(rupeeString) {
  if (rupeeString === '' || rupeeString === null || rupeeString === undefined) {
    return 0;
  }
  const clean = typeof rupeeString === 'string' ? rupeeString.replace(/,/g, '').trim() : String(rupeeString);
  const parsed = parseFloat(clean);
  if (Number.isNaN(parsed)) return 0;
  return Math.round(parsed * 100);
}
