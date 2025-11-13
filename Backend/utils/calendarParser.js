const unfoldContent = (text = "") => text.replace(/\r?\n[ \t]/g, "");

const decodeText = (value = "") =>
  value
    .replace(/\\n/g, "\n")
    .replace(/\\,/g, ",")
    .replace(/\\;/g, ";")
    .replace(/\\\\/g, "\\");

const parseProperty = (rawLine = "") => {
  const [head, ...rest] = rawLine.split(":");
  const value = rest.join(":").trim();
  const segments = head.split(";");
  const name = segments.shift()?.toUpperCase() ?? "";
  const params = segments.reduce((acc, segment) => {
    const [key, paramValue] = segment.split("=");
    if (key && paramValue) {
      acc[key.toLowerCase()] = paramValue;
    }
    return acc;
  }, {});
  return { name, params, value };
};

const parseICalDate = (rawValue = "", params = {}) => {
  if (!rawValue) return null;
  const tzid = params.tzid || params["tzid"] || null;
  const normalizedValue = rawValue.trim();
  let allDay = false;
  let date;

  if (
    (params.value && params.value.toUpperCase() === "DATE") ||
    /^[0-9]{8}$/.test(normalizedValue)
  ) {
    const year = Number.parseInt(normalizedValue.slice(0, 4), 10);
    const month = Number.parseInt(normalizedValue.slice(4, 6), 10) - 1;
    const day = Number.parseInt(normalizedValue.slice(6, 8), 10);
    date = new Date(Date.UTC(year, month, day));
    allDay = true;
  } else if (/^[0-9]{8}T[0-9]{6}Z?$/.test(normalizedValue)) {
    const isUTC = normalizedValue.endsWith("Z");
    const value = isUTC
      ? normalizedValue.slice(0, -1)
      : normalizedValue;
    const year = Number.parseInt(value.slice(0, 4), 10);
    const month = Number.parseInt(value.slice(4, 6), 10) - 1;
    const day = Number.parseInt(value.slice(6, 8), 10);
    const hour = Number.parseInt(value.slice(9, 11), 10);
    const minute = Number.parseInt(value.slice(11, 13), 10);
    const second = Number.parseInt(value.slice(13, 15), 10);
    date = isUTC
      ? new Date(Date.UTC(year, month, day, hour, minute, second))
      : new Date(year, month, day, hour, minute, second);
  } else {
    const parsed = new Date(normalizedValue);
    if (Number.isNaN(parsed.getTime())) {
      return null;
    }
    date = parsed;
  }

  if (!date || Number.isNaN(date.getTime())) {
    return null;
  }

  return {
    date,
    allDay,
    timezone: tzid || null,
  };
};

export const parseIcsFeed = (icsText = "") => {
  if (!icsText) return [];

  const unfolded = unfoldContent(icsText);
  const rawEvents = unfolded.split(/BEGIN:VEVENT/gi).slice(1);
  const unique = new Map();

  rawEvents.forEach((chunk) => {
    const lines = chunk.split(/\r?\n/);
    const event = {};
    let skipAlarm = false;

    lines.forEach((rawLine) => {
      const line = rawLine.trim();
      if (!line) return;
      if (line.startsWith("BEGIN:VALARM")) {
        skipAlarm = true;
        return;
      }
      if (line.startsWith("END:VALARM")) {
        skipAlarm = false;
        return;
      }
      if (skipAlarm || line === "END:VEVENT") return;

      const { name, params, value } = parseProperty(line);
      if (!name) return;

      switch (name) {
        case "UID":
          event.uid = value;
          break;
        case "SUMMARY":
          event.summary = decodeText(value);
          break;
        case "DESCRIPTION":
          event.description = decodeText(value);
          break;
        case "LOCATION":
          event.location = decodeText(value);
          break;
        case "URL":
          event.url = value.trim();
          break;
        case "CATEGORIES":
          event.categories = decodeText(value).split(/,\s*/g);
          break;
        case "DTSTART":
          event.start = parseICalDate(value, params);
          break;
        case "DTEND":
          event.end = parseICalDate(value, params);
          break;
        default:
          break;
      }
    });

    if (!event.start?.date) return;

    const key = `${event.uid || ""}-${event.start.date.toISOString()}-${event.end?.date?.toISOString() || ""}`;
    if (unique.has(key)) return;

    unique.set(key, {
      uid: event.uid || null,
      title: event.summary || "Calendar Event",
      description: event.description || null,
      location: event.location || null,
      start: event.start.date,
      end: event.end?.date || event.start.date,
      allDay: event.start.allDay || false,
      timezone: event.start.timezone || event.end?.timezone || null,
      url: event.url || null,
      categories: event.categories || [],
    });
  });

  return Array.from(unique.values()).sort(
    (a, b) => a.start.getTime() - b.start.getTime()
  );
};

export default parseIcsFeed;
