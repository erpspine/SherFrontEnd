export const CASE_TYPES = ["Client Complaint", "Accident", "Breakdown", "Compliance", "Positive Feedback", "Review", "Routine"];
export const CASE_STATUSES = ["Open", "Corrective actions in progress", "Monitoring", "Closed"];
export const emptyValue = (field) => field.default !== undefined
  ? structuredClone(field.default)
  : ["list", "rows", "checklist"].includes(field.type) ? []
    : field.type === "checkbox" ? false : "";

export const stageValues = (fields, saved = {}) => Object.fromEntries(
  fields.map((field) => [field.key, saved[field.key] ?? emptyValue(field)]),
);

export const emptyRow = (columns) => Object.fromEntries(columns.map((field) => [
  field.key, field.type === "select" ? field.options[0] : emptyValue(field),
]));

export const filterCases = (cases, filters) => cases.filter((item) => (
  (!filters.type || item.type === filters.type)
  && (!filters.status || item.status === filters.status)
  && (!filters.from || item.date >= filters.from)
  && (!filters.to || item.date <= filters.to)
  && (!filters.search || [item.reference, item.description, ...Object.values(item.booking || {})]
    .join(" ").toLowerCase().includes(filters.search.toLowerCase()))
));

export function csvValue(value) {
  let text = String(value ?? "");
  if (/^[=+@\-\t\r]/.test(text)) text = "'" + text;
  return '"' + text.replaceAll('"', '""') + '"';
}
