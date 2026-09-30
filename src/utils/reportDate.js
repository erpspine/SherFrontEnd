export const formatReportDate = (value) => {
  if (!value) return "";
  const match = String(value).match(/^(\d{4})-(\d{2})-(\d{2})/);
  return match ? `${match[3]}/${match[2]}/${match[1]}` : String(value);
};

export const formatReportMonth = (value) => {
  if (!value) return "";
  const match = String(value).match(/^(\d{4})-(\d{2})$/);
  return match ? `${match[2]}/${match[1]}` : String(value);
};
