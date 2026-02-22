// src/utils/time.js

// 1. Get current date string in IST (e.g., "2026-02-14")
// We use 'en-CA' because it formats as YYYY-MM-DD automatically
export const getTodayIST = () => {
  return new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
};

// 2. Get readable timestamp in IST (e.g., "14 Feb, 7:30 PM")
export const formatIST = (dateObj) => {
  if (!dateObj) return "N/A";
  return new Date(dateObj).toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata",
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "numeric",
    hour12: true
  });
};

// 3. Get current Year/Month for Monthly limits (e.g., "2026-02")
export const getMonthIST = () => {
  const today = getTodayIST(); // "2026-02-14"
  return today.substring(0, 7); // "2026-02"
};