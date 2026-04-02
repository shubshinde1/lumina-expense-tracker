
export const IST_TIMEZONE = 'Asia/Kolkata';

/**
 * Formats a date string or object into a human-readable IST string.
 */
export function formatDateIST(date: string | Date, options: Intl.DateTimeFormatOptions = {}) {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('en-IN', {
    timeZone: IST_TIMEZONE,
    ...options
  });
}

/**
 * Formats a date string or object into a human-readable IST time string.
 */
export function formatTimeIST(date: string | Date, options: Intl.DateTimeFormatOptions = {}) {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleTimeString('en-IN', {
    timeZone: IST_TIMEZONE,
    ...options
  });
}

/**
 * Returns today's date in YYYY-MM-DD format based on IST.
 */
export function getTodayIST() {
  const now = new Date();
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: IST_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
  return formatter.format(now);
}

/**
 * Returns yesterday's date in YYYY-MM-DD format based on IST.
 */
export function getYesterdayIST() {
  const date = new Date();
  date.setDate(date.getDate() - 1);
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: IST_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
  return formatter.format(date);
}

/**
 * Converts a date to a string compatible with <input type="datetime-local"> in IST.
 */
export function toLocalDateTimeLocal(date: Date | string) {
  const d = typeof date === 'string' ? new Date(date) : date;
  
  // Get components in IST
  const year = d.toLocaleDateString('en-IN', { timeZone: IST_TIMEZONE, year: 'numeric' });
  const month = d.toLocaleDateString('en-IN', { timeZone: IST_TIMEZONE, month: '2-digit' });
  const day = d.toLocaleDateString('en-IN', { timeZone: IST_TIMEZONE, day: '2-digit' });
  const hour = d.toLocaleTimeString('en-IN', { timeZone: IST_TIMEZONE, hour: '2-digit', hour12: false });
  const minute = d.toLocaleTimeString('en-IN', { timeZone: IST_TIMEZONE, minute: '2-digit', hour12: false });

  // Note: some locales return "24" instead of "00" or have whitespace. 
  // Let's use a more robust way for the time parts.
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: IST_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  }).formatToParts(d);

  const getPart = (type: string) => parts.find(p => p.type === type)?.value || '';
  
  return `${getPart('year')}-${getPart('month')}-${getPart('day')}T${getPart('hour')}:${getPart('minute')}`;
}

/**
 * Checks if two dates are the same day in IST.
 */
export function isSameDayIST(d1: Date | string, d2: Date | string) {
  const date1 = typeof d1 === 'string' ? new Date(d1) : d1;
  const date2 = typeof d2 === 'string' ? new Date(d2) : d2;
  
  const s1 = date1.toLocaleDateString('en-CA', { timeZone: IST_TIMEZONE });
  const s2 = date2.toLocaleDateString('en-CA', { timeZone: IST_TIMEZONE });
  
  return s1 === s2;
}

/**
 * Returns a new Date object representing the start of the current month in IST.
 */
export function getStartOfMonthIST(date: Date = new Date()) {
  const year = parseInt(date.toLocaleDateString('en-IN', { timeZone: IST_TIMEZONE, year: 'numeric' }));
  const month = parseInt(date.toLocaleDateString('en-IN', { timeZone: IST_TIMEZONE, month: 'numeric' })) - 1;
  return new Date(year, month, 1);
}
