/**
 * Format a Date in Asia/Manila as MySQL "YYYY-MM-DD HH:mm:ss".
 * @param {Date} [date] - Defaults to now.
 */
function formatPhilippineDatetime(date) {
  const d = date instanceof Date ? date : new Date();
  
  // Create a formatter for Asia/Manila timezone
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Manila",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });

  const parts = formatter.formatToParts(d);
  const map = new Map(parts.map((p) => [p.type, p.value]));

  return `${map.get("year")}-${map.get("month")}-${map.get("day")} ${map.get("hour")}:${map.get("minute")}:${map.get("second")}`;
}

/**
 * Current time in Asia/Manila as MySQL "YYYY-MM-DD HH:mm:ss".
 */
function nowPhilippineDatetime() {
  return formatPhilippineDatetime(new Date());
}

module.exports = { nowPhilippineDatetime, formatPhilippineDatetime };
