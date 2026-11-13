/**
 * Returns the current calendar date string (YYYY-MM-DD) formatted according
 * to the configured school timezone (defaulting to 'Asia/Kolkata').
 *
 * @param {Date} [date=new Date()] - Reference date
 * @param {string} [timezone=process.env.SCHOOL_TIMEZONE] - IANA Timezone identifier
 * @returns {string} Formatted date in YYYY-MM-DD
 */
export function getSchoolDate(date = new Date(), timezone = process.env.SCHOOL_TIMEZONE || 'Asia/Kolkata') {
  try {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).formatToParts(date);

    const year = parts.find((p) => p.type === 'year')?.value;
    const month = parts.find((p) => p.type === 'month')?.value;
    const day = parts.find((p) => p.type === 'day')?.value;

    return `${year}-${month}-${day}`;
  } catch {
    return (date instanceof Date ? date : new Date(date)).toISOString().slice(0, 10);
  }
}
