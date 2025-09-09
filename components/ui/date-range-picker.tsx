import React, { useState } from "react";

interface DateRange {
  startDate: Date | null;
  endDate: Date | null;
}

interface DateRangePickerProps {
  value: DateRange;
  onChange: (range: DateRange) => void;
  onClose: () => void;
}

const weekdays = ["Lu", "Ma", "Mi", "Jo", "Vi", "Sa", "Du"];

const isSameDay = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() &&
  a.getMonth() === b.getMonth() &&
  a.getDate() === b.getDate();

const DateRangePicker: React.FC<DateRangePickerProps> = ({ value, onChange, onClose }) => {
  const [currentMonth, setCurrentMonth] = useState(() => {
    return value.startDate ? new Date(value.startDate) : new Date();
  });
  const [tempRange, setTempRange] = useState<DateRange>(value);

  const startOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
  const endOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);
  const startDayIndex = (startOfMonth.getDay() + 6) % 7; // Monday first
  const daysInMonth = endOfMonth.getDate();
  const days: Array<number | null> = [
    ...Array(startDayIndex).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  const handleDayClick = (day: number) => {
    const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
    if (!tempRange.startDate || (tempRange.startDate && tempRange.endDate)) {
      setTempRange({ startDate: date, endDate: null });
    } else if (date < tempRange.startDate) {
      setTempRange({ startDate: date, endDate: tempRange.startDate });
      onChange({ startDate: date, endDate: tempRange.startDate });
      onClose();
    } else {
      setTempRange({ startDate: tempRange.startDate, endDate: date });
      onChange({ startDate: tempRange.startDate, endDate: date });
      onClose();
    }
  };

  const inRange = (day: number) => {
    if (!tempRange.startDate || !tempRange.endDate) return false;
    const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
    return date >= tempRange.startDate && date <= tempRange.endDate;
  };

  const isStart = (day: number) =>
    tempRange.startDate && isSameDay(
      new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day),
      tempRange.startDate,
    );

  const isEnd = (day: number) =>
    tempRange.endDate && isSameDay(
      new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day),
      tempRange.endDate,
    );

  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-2">
        <button
          onClick={() =>
            setCurrentMonth(
              new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1),
            )
          }
          className="px-2 py-1 text-sm"
          aria-label="Luna anterioară"
        >
          &lt;
        </button>
        <span className="font-semibold">
          {currentMonth.toLocaleDateString("ro-RO", {
            month: "long",
            year: "numeric",
          })}
        </span>
        <button
          onClick={() =>
            setCurrentMonth(
              new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1),
            )
          }
          className="px-2 py-1 text-sm"
          aria-label="Luna următoare"
        >
          &gt;
        </button>
      </div>
      <div className="grid grid-cols-7 gap-1 text-center select-none">
        {weekdays.map((w) => (
          <div key={w} className="text-xs font-medium">
            {w}
          </div>
        ))}
        {days.map((day, idx) => {
          if (!day) return <div key={idx} />;
          const classes = ["p-2 rounded cursor-pointer text-sm"];
          if (isStart(day) || isEnd(day)) {
            classes.push("bg-jade text-white");
          } else if (inRange(day)) {
            classes.push("bg-jade/20");
          } else {
            classes.push("hover:bg-gray-100");
          }
          return (
            <div
              key={idx}
              className={classes.join(" ")}
              onClick={() => handleDayClick(day)}
            >
              {day}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default DateRangePicker;
