export const createLocalDateFromISODate = (dateString) => {
  if (!dateString || typeof dateString !== "string") return null;
  const [year, month, day] = dateString.split("-").map(Number);
  if ([year, month, day].some((value) => Number.isNaN(value))) return null;
  return new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
};

export const formatISODateOnly = (dateString, options) => {
  const date = createLocalDateFromISODate(dateString);
  if (!date) return "";
  return date.toLocaleDateString(undefined, options);
};
