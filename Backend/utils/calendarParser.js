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
  } else if (/^[0-9]{8}T[0-9]{6}[+-][0-9]{4}$/.test(normalizedValue)) {
    const base = normalizedValue.slice(0, 15);
    const offset = normalizedValue.slice(15);
    const year = Number.parseInt(base.slice(0, 4), 10);
    const month = Number.parseInt(base.slice(4, 6), 10) - 1;
    const day = Number.parseInt(base.slice(6, 8), 10);
    const hour = Number.parseInt(base.slice(9, 11), 10);
    const minute = Number.parseInt(base.slice(11, 13), 10);
    const second = Number.parseInt(base.slice(13, 15), 10);
    const offsetHours = Number.parseInt(offset.slice(1, 3), 10);
    const offsetMinutes = Number.parseInt(offset.slice(3, 5), 10);
    const totalOffsetMinutes = offsetHours * 60 + offsetMinutes;
    const utcDate = Date.UTC(year, month, day, hour, minute, second);
    const adjustedUtc =
      offset[0] === "-"
        ? utcDate + totalOffsetMinutes * 60000
        : utcDate - totalOffsetMinutes * 60000;
    date = new Date(adjustedUtc);
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

const normalizeEvents = (events = []) =>
  Array.from(events)
    .filter((event) => event?.start)
    .map((event) => {
      const start = event.start instanceof Date ? event.start : new Date(event.start);
      const end = event.end instanceof Date ? event.end : event.end ? new Date(event.end) : start;
      return {
        uid: event.uid || null,
        title: event.title || event.summary || "Calendar Event",
        description: event.description || null,
        location: event.location || null,
        start,
        end: end || start,
        allDay: Boolean(event.allDay || event.datetype === "date"),
        timezone: event.timezone || event.tz || event.start?.timezone || null,
        url: event.url || null,
        categories: event.categories || [],
      };
    })
    .sort((a, b) => a.start.getTime() - b.start.getTime());

export const parseIcsFeed = (icsText = "") => {
  if (!icsText) return [];

  const unfolded = unfoldContent(icsText);
  const rawEvents = unfolded.match(/BEGIN:VEVENT[\s\S]*?END:VEVENT/gi) || [];
  const unique = new Map();

  rawEvents.forEach((chunk) => {
    const lines = chunk.split(/\r?\n|\r/);
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

  const parsedEvents = normalizeEvents(unique.values());
  return parsedEvents;
};

export default parseIcsFeed;
