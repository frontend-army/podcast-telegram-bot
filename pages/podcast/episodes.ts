import {
  MONTHS,
  PODCAST_DAY_OF_WEEK,
  PODCAST_TIME,
  STARTING_PODCAST_EPISODE,
} from "./config";

export type Episode = {
  number: number;
  date: Date;
};

function getEpisodeDay(year: number, month: number) {
  let date = new Date(
    `${year}-${month.toString().padStart(2, "0")}-01T${PODCAST_TIME}`
  );
  let dayOfWeek = date.getDay();
  let diff = (PODCAST_DAY_OF_WEEK - dayOfWeek + 7) % 7;
  date.setDate(date.getDate() + diff);
  return new Date(
    `${year}-${month.toString().padStart(2, "0")}-${date
      .getDate()
      .toString()
      .padStart(2, "0")}T${PODCAST_TIME}`
  );
}

export function getUpcomingEpisodes(fromDate: Date): Episode[] {
  const year = fromDate.getFullYear();

  if (year < STARTING_PODCAST_EPISODE.year) {
    throw new Error(
      `Cannot generate episodes before ${STARTING_PODCAST_EPISODE.year}`
    );
  }

  return Array.from({ length: MONTHS.length * 2 }, (_, i) => ({
    number:
      (year - STARTING_PODCAST_EPISODE.year) * 12 +
      STARTING_PODCAST_EPISODE.number +
      i,
    date: getEpisodeDay(i > 11 ? year + 1 : year, (i % 12) + 1),
  }));
}

export function getNextEpisode(fromDate: Date) {
  const nextEpisode = getUpcomingEpisodes(fromDate).find(
    (episode) => episode.date.getTime() > fromDate.getTime()
  );

  if (!nextEpisode) {
    throw new Error(`Could not get next episode from date: ${fromDate}`);
  }

  return nextEpisode;
}

export function dateDiffInDays(a, b) {
  const _MS_PER_DAY = 1000 * 60 * 60 * 24;
  // Discard the time and time-zone information.
  const utc1 = Date.UTC(a.getFullYear(), a.getMonth(), a.getDate());
  const utc2 = Date.UTC(b.getFullYear(), b.getMonth(), b.getDate());

  return Math.floor((utc2 - utc1) / _MS_PER_DAY);
}
