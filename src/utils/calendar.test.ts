import { describe, expect, it } from "vitest";
import { MAX_GOOGLE_DESCRIPTION, MAX_GOOGLE_URL, calendarFileUrl, eventEndsAt, eventLocation, eventPageUrl, googleCalendarUrl, truncateText, utcStamp, withDefaultEnd } from "./calendar";

const event = {
  id: "3f0b6c1e-8a5d-4f7e-9c2b-1d4e5f6a7b8c",
  name: "Noite de Jazz & Bossa",
  startsAt: "2026-12-10T23:00:00.000Z",
  endsAt: "2026-12-11T02:30:00Z",
  description: "Show ao vivo; traga seu copo.",
  venueName: "Arena",
  address: "Rua A, 100",
  city: "Rio de Janeiro",
  state: "RJ",
};
const pageUrl = eventPageUrl("https://ticketfy.example/", event.id);
const params = (url: string) => new URL(url).searchParams;

describe("calendar links", () => {
  it("points the .ics file at the API route", () => {
    expect(calendarFileUrl(event.id)).toMatch(new RegExp(`/events/${event.id}/calendar\\.ics$`));
    expect(pageUrl).toBe(`https://ticketfy.example/events/${event.id}`);
  });

  it("formats dates in UTC basic format", () => {
    expect(utcStamp("2026-12-10T20:00:00-03:00")).toBe("20261210T230000Z");
  });

  it("builds the Google Calendar link with encoded text, UTC dates, location and the event link", () => {
    const url = googleCalendarUrl(event, pageUrl);
    expect(url.startsWith("https://calendar.google.com/calendar/render?")).toBe(true);
    const query = params(url);
    expect(query.get("action")).toBe("TEMPLATE");
    expect(query.get("text")).toBe("Noite de Jazz & Bossa");
    expect(query.get("dates")).toBe("20261210T230000Z/20261211T023000Z");
    expect(query.get("location")).toBe("Arena, Rua A, 100, Rio de Janeiro - RJ");
    expect(query.get("details")).toBe(`Show ao vivo; traga seu copo.\n\n${pageUrl}`);
  });

  it("gives an event without an end a 3-hour duration", () => {
    expect(params(googleCalendarUrl({ ...event, endsAt: null }, pageUrl)).get("dates")).toBe("20261210T230000Z/20261211T020000Z");
    expect(eventEndsAt({ startsAt: event.startsAt, endsAt: null })).toBe("2026-12-11T02:00:00.000Z");
    expect(eventEndsAt(event)).toBe(event.endsAt);
  });

  it("adds DTEND 3 hours after DTSTART to an .ics without an end, keeping CRLF", () => {
    const ics = ["BEGIN:VCALENDAR", "BEGIN:VEVENT", "DTSTART:20261210T230000Z", "SUMMARY:Show", "END:VEVENT", "END:VCALENDAR", ""].join("\r\n");
    expect(withDefaultEnd(ics)).toBe(
      ["BEGIN:VCALENDAR", "BEGIN:VEVENT", "DTSTART:20261210T230000Z", "DTEND:20261211T020000Z", "SUMMARY:Show", "END:VEVENT", "END:VCALENDAR", ""].join("\r\n"),
    );
    const withEnd = ics.replace("SUMMARY", "DTEND:20261211T010000Z\r\nSUMMARY");
    expect(withDefaultEnd(withEnd)).toBe(withEnd);
  });

  it("keeps only the event link when there is no description", () => {
    expect(params(googleCalendarUrl({ ...event, description: null }, pageUrl)).get("details")).toBe(pageUrl);
  });

  it("cuts a very long description safely and always ends with the event link", () => {
    const description = `${"Uma noite inesquecível com música, comida e açaí 🎷. ".repeat(400)}FIM`;
    const url = googleCalendarUrl({ ...event, description }, pageUrl);
    const details = params(url).get("details")!;
    const [text, link] = details.split("\n\n");

    expect(url.length).toBeLessThanOrEqual(MAX_GOOGLE_URL);
    expect(link).toBe(pageUrl);
    expect(details.endsWith(pageUrl)).toBe(true);
    expect(Array.from(text).length).toBeLessThanOrEqual(MAX_GOOGLE_DESCRIPTION);
    expect(text.endsWith("…")).toBe(true);
    expect(text).not.toContain("FIM");
    expect(text).not.toMatch(/[\uD800-\uDBFF]…$/);
    expect(() => decodeURIComponent(new URL(url).search)).not.toThrow();
  });

  it("truncates by characters without splitting emoji", () => {
    expect(truncateText("abc", 10)).toBe("abc");
    const cut = truncateText("🎷".repeat(20), 5);
    expect(Array.from(cut)).toHaveLength(5);
    expect(cut).toBe("🎷🎷🎷🎷…");
    expect(truncateText("palavra outra coisa final", 20)).toBe("palavra outra coisa…");
  });

  it("joins only the location parts that exist", () => {
    expect(eventLocation({ ...event, address: null, state: "" })).toBe("Arena, Rio de Janeiro");
  });
});
