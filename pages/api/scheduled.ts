import {
  createNotionPage,
  episodeDocExists,
  episodeDocHasTopic,
  episodeDocQuestionsCount,
} from "../../services/notion";
import { sendMessage } from "../../services/telegram";
import {
  PRINT_REMAINING_DAYS,
  EPISODE_NAME_PREFIX,
  EPISODE_NAME_SUFIX,
  MIN_QUESTIONS,
  NICE_TO_HAVE_QUESTIONS,
} from "../../constants/podcast/config";
import { NextApiRequest, NextApiResponse } from "next";
import { dateDiffInDays, getNextEpisode } from "../../constants/podcast/episodes";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const today = new Date();
  const nextEpisode = getNextEpisode(today);
  const days = dateDiffInDays(today, nextEpisode.date);

  if (PRINT_REMAINING_DAYS) {
    if (days === 0) {
      await sendMessage(process.env.CHAT_ID, `Hoy es el el podcast`);
    } else if (days === 1) {
      await sendMessage(
        process.env.CHAT_ID,
        `Falta ${days} día para el podcast`
      );
    } else {
      await sendMessage(
        process.env.CHAT_ID,
        `Faltan ${days} días para el podcast`
      );
    }
  }

  // Next Episode Document Creation (Three weeks before the podcast)
  if (days === 7 * 3) {
    // Create doc for next podcast from template
    if (!(await episodeDocExists(nextEpisode.number))) {
      // TODO: Unpin old doc!
      await createNotionPage(
        `${EPISODE_NAME_PREFIX} ${nextEpisode.number}: ${EPISODE_NAME_SUFIX}`
      );
    }
  }

  // Episode Topic Reminder (Two weeks before the podcast)
  if (days <= 7 * 2) {
    if (!(await episodeDocHasTopic(nextEpisode.number))) {
      await sendMessage(
        process.env.CHAT_ID,
        `Reminder: Definir tema para el capítulo ${nextEpisode.number}`
      );
    }
  }

  // Episode Questions Reminder (One weeks before the podcast)
  if (days <= 7) {
    if (await episodeDocHasTopic(nextEpisode.number)) {
      const episodeQuestionsCount = await episodeDocQuestionsCount(
        nextEpisode.number
      );
      if (episodeQuestionsCount === 0) {
        await sendMessage(
          process.env.CHAT_ID,
          `Reminder: Sumar preguntas para el podcast al notion`
        );
      } else if (episodeQuestionsCount < MIN_QUESTIONS) {
        await sendMessage(
          process.env.CHAT_ID,
          `Reminder: Sumar preguntas para el podcast al notion, por ahora hay ${episodeQuestionsCount}.`
        );
      } else if (episodeQuestionsCount < NICE_TO_HAVE_QUESTIONS) {
        await sendMessage(
          process.env.CHAT_ID,
          `Reminder: Ya tenemos ${episodeQuestionsCount} preguntas en el notion. ¿Alguno quiere sumar más?`
        );
      }
    }
  }

  return res.status(200).json({ ok: true });
}
