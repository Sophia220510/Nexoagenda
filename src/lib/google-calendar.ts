function googleTimestamp(value: Date) {
  return value.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

export function buildGoogleCalendarUrl({
  title,
  start,
  end,
  timezone,
  details,
  location = "",
}: {
  title: string;
  start: Date;
  end: Date;
  timezone: string;
  details: string;
  location?: string;
}) {
  const params = new URLSearchParams({
    action: "TEMPLATE",
    dates: `${googleTimestamp(start)}/${googleTimestamp(end)}`,
    stz: timezone,
    etz: timezone,
    text: title,
    details,
    location,
  });
  return `https://calendar.google.com/calendar/r/eventedit?${params}`;
}

