import { getUpcomingEpisodes, getNextEpisode } from "../constants/podcast/episodes";

jest.useFakeTimers().setSystemTime(new Date("2025-01-02T03:00:00.000Z"));

describe("getUpcomingEpisodes", () => {
  test("return episodes of the year 2025", () => {
    expect(getUpcomingEpisodes(new Date())).toMatchSnapshot();
  });

  test("return episodes of the year 2027", () => {
    expect(
      getUpcomingEpisodes(new Date("2027-12-31T15:00:00.000Z"))
    ).toMatchSnapshot();
  });
});

describe("getNextPodcastDate", () => {
  test("returns next years episode when date is after all episodes", () => {
    expect(getNextEpisode(new Date("2025-12-31T15:00:00.000Z"))).toStrictEqual({
      date: new Date("2026-01-07T15:00:00.000Z"),
      number: 77,
    });
  });

  test("returns next podcast date when date the same day but earlier", () => {
    expect(getNextEpisode(new Date("2025-02-05T14:00:00.000Z"))).toStrictEqual({
      number: 66,
      date: new Date("2025-02-05T15:00:00.000Z"),
    });
  });

  test("returns next podcast date when date the same day but later", () => {
    expect(getNextEpisode(new Date("2025-02-05T15:05:00.000Z"))).toStrictEqual({
      number: 67,
      date: new Date("2025-03-05T15:00:00.000Z"),
    });
  });

  test("returns next podcast date when date is earlier than first episode", () => {
    expect(getNextEpisode(new Date("2025-01-01T10:05:00.000Z"))).toStrictEqual({
      number: 65,
      date: new Date("2025-01-01T15:00:00.000Z"),
    });
  });

  test("returns next podcast date when date is in between episodes", () => {
    expect(getNextEpisode(new Date("2025-05-24T21:00:00.000Z"))).toStrictEqual({
      number: 70,
      date: new Date("2025-06-04T15:00:00.000Z"),
    });
  });

  test("throw if call with a date before 2025", () => {
    function getOldEpisode() {
      getUpcomingEpisodes(new Date("2024-05-24T21:00:00.000Z"));
    }

    expect(getOldEpisode).toThrowErrorMatchingInlineSnapshot(
      `"Cannot generate episodes before 2025"`
    );
  });
});
