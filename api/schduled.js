const { createNotionPage, episodeDocExists, episodeDocHasTopic, episodeDocQuestionsCount } = require('../notion');

const PRINT_REMAINING_DAYS = false;
const PODCAST_DAY_OF_WEEK = 3;
const PODCAST_FREQUENCY = 2;
const STARTING_PODCAST_DATE = "2023-10-04T21:00:00";
const STARTING_PODCAST_NUMBER = 35;
const EPISODE_NAME_PREFIX = "Capítulo";
const EPISODE_NAME_SUFIX = "<A DEFINIR>";
const MIN_QUESTIONS = 4;
const NICE_TO_HAVE_QUESTIONS = 8;

function getNextPodcastDate(fromDate) {
  var nextPodcastDate = new Date(fromDate.getTime());
  nextPodcastDate.setDate(nextPodcastDate.getDate() + (PODCAST_DAY_OF_WEEK + 7 - nextPodcastDate.getDay()) % 7);
  const weeksToPocast = (dateDiffInDays(new Date(STARTING_PODCAST_DATE), nextPodcastDate) / 7) % PODCAST_FREQUENCY;
  nextPodcastDate.setUTCDate(nextPodcastDate.getUTCDate() + 7 * weeksToPocast);
  return nextPodcastDate;
}

function dateDiffInDays(a, b) {
  const _MS_PER_DAY = 1000 * 60 * 60 * 24;
  // Discard the time and time-zone information.
  const utc1 = Date.UTC(a.getFullYear(), a.getMonth(), a.getDate());
  const utc2 = Date.UTC(b.getFullYear(), b.getMonth(), b.getDate());

  return Math.floor((utc2 - utc1) / _MS_PER_DAY);
}

function getNextEpisodeNumber() {
  const today = new Date();
  return STARTING_PODCAST_NUMBER + Math.round(dateDiffInDays(new Date(STARTING_PODCAST_DATE), getNextPodcastDate(today)) / 7 / PODCAST_FREQUENCY);
}

async function sendMessage(apiKey, chatId, text) {
  const url = `https://api.telegram.org/bot${apiKey}/sendMessage?chat_id=${chatId}&text=${text}`;
  return fetch(url).then(resp => resp.json());
}

export default async function handler(req, res) {
    const today = new Date();
    const days = dateDiffInDays(today, getNextPodcastDate(today));
    const nextEpisodeNumber = getNextEpisodeNumber();

    if (PRINT_REMAINING_DAYS) {
      if (days === 0) {
        await sendMessage(process.env.TELEGRAM_API_KEY, process.env.CHAT_ID, `Hoy es el el podcast`);
      } else if (days === 1) {
        await sendMessage(process.env.TELEGRAM_API_KEY, process.env.CHAT_ID, `Falta ${days} día para el podcast`);
      } else {
        await sendMessage(process.env.TELEGRAM_API_KEY, process.env.CHAT_ID, `Faltan ${days} días para el podcast`);
      }
    }

    // Next Episode Document Creation (Day after the podcast)
    if (days === 7 * PODCAST_FREQUENCY - 1) {
      // Create doc for next podcast from template
      if (await episodeDocExists(nextEpisodeNumber)) {
      } else {
        // TODO: Unpin old doc!
        await createNotionPage(`${EPISODE_NAME_PREFIX} ${nextEpisodeNumber}: ${EPISODE_NAME_SUFIX}`);
      }
    }

    // Episode Topic Reminder
    if (days <= 9) {
      if (!await episodeDocHasTopic(nextEpisodeNumber)) {
        await sendMessage(process.env.TELEGRAM_API_KEY, process.env.CHAT_ID, `Reminder: Definir tema para el capítulo ${nextEpisodeNumber}`);
      }
    }

    // Episode Questions Reminder
    if (days <= 2) {
      if (await episodeDocHasTopic(nextEpisodeNumber)) {
        const episodeQuestionsCount = await episodeDocQuestionsCount(nextEpisodeNumber);
        if (episodeQuestionsCount === 0) {
          await sendMessage(process.env.TELEGRAM_API_KEY, process.env.CHAT_ID, `Reminder: Todavía no hay preguntas en el doc`);
        } else if (episodeQuestionsCount < MIN_QUESTIONS) {
          await sendMessage(process.env.TELEGRAM_API_KEY, process.env.CHAT_ID, `Reminder: Agregar preguntas al doc, solo hay ${episodeQuestionsCount} por ahora.`);
        } else if (episodeQuestionsCount < NICE_TO_HAVE_QUESTIONS) {
          await sendMessage(process.env.TELEGRAM_API_KEY, process.env.CHAT_ID, `Reminder: Ya tenemos ${episodeQuestionsCount} preguntas en el doc. ¿Alguno quiere sumar más?`);
        }
      }
    }
    return res.status(200).json({ ok: true });
  }
