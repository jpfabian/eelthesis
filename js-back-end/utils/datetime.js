const MANILA_OPTS = {
  timeZone: "Asia/Manila",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hour12: false,
};

/**
 * Format a Date in Asia/Manila as MySQL "YYYY-MM-DD HH:mm:ss".
 * @param {Date} [date] - Defaults to now.
 */
function formatPhilippineDatetime(date) {
  const d = date instanceof Date ? date : new Date();
  const s = d.toLocaleString("en-CA", MANILA_OPTS);
  return s.replace(",", " ").replace(/\s+/g, " ").trim();
}

/**
 * Current time in Asia/Manila as MySQL "YYYY-MM-DD HH:mm:ss".
 * Use this for all created_at, updated_at, start_time, end_time, and any date/time saved to the database.
 */
function nowPhilippineDatetime() {
  return formatPhilippineDatetime(new Date());
}

module.exports = { nowPhilippineDatetime, formatPhilippineDatetime };
