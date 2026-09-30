import { useEffect, useRef, useState } from "react";
import { CalendarDays } from "lucide-react";
import { formatReportDate } from "../utils/reportDate";

export default function ReportDateInput({ value, onChange, ...props }) {
  const textInput = useRef(null);
  const [draft, setDraft] = useState(formatReportDate(value));
  useEffect(() => setDraft(formatReportDate(value)), [value]);
  return <span className="relative inline-block">
    <input {...props} ref={textInput} className={`${props.className || ""} pr-10`} type="text" inputMode="numeric" placeholder="dd/mm/yyyy"
    maxLength={10} value={draft} onChange={(event) => {
      const text = event.target.value;
      setDraft(text);
      const match = text.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
      const iso = match ? `${match[3]}-${match[2]}-${match[1]}` : "";
      const date = iso ? new Date(`${iso}T00:00:00Z`) : null;
      const valid = date && !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === iso;
      event.target.setCustomValidity(text && !valid ? "Enter a valid date as dd/mm/yyyy." : "");
      if (!text || valid) onChange({ target: { value: iso } });
    }} />
    <span className="absolute right-2 top-1/2 -translate-y-1/2 h-6 w-6">
      <CalendarDays className="h-5 w-5 text-gray-600 pointer-events-none" aria-hidden="true" />
      <input type="date" aria-label={`${props["aria-label"] || "Date"} calendar`}
        className="absolute inset-0 h-full w-full opacity-0 cursor-pointer"
        value={value || ""} disabled={props.disabled}
        onClick={(event) => {
          if (typeof event.currentTarget.showPicker === "function") {
            try { event.currentTarget.showPicker(); } catch { /* Native control remains available. */ }
          }
        }}
        onChange={(event) => {
          const next = event.target.value;
          setDraft(formatReportDate(next));
          textInput.current?.setCustomValidity("");
          onChange({ target: { value: next } });
        }} />
    </span>
  </span>;
}
