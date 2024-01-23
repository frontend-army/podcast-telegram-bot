import { NextRequest, NextResponse } from 'next/server';
import { updateEpisodeDoc, getEpisodeDoc } from '../../services/notion';
import { sendMessage, pinMessage, unpinMessage } from '../../services/telegram';
import { PODCAST_DAY_OF_WEEK, PODCAST_FREQUENCY, STARTING_PODCAST_DATE, STARTING_PODCAST_NUMBER, EPISODE_NAME_PREFIX, SET_TOPIC_COMMAND } from '../../services/config';

function getNextPodcastDate(fromDate: Date) {
  var nextPodcastDate = new Date(fromDate.getTime());
  nextPodcastDate.setDate(nextPodcastDate.getDate() + (PODCAST_DAY_OF_WEEK + 7 - nextPodcastDate.getDay()) % 7);
  const weeksToPocast = (dateDiffInDays(new Date(STARTING_PODCAST_DATE), nextPodcastDate) / 7) % PODCAST_FREQUENCY;
  nextPodcastDate.setUTCDate(nextPodcastDate.getUTCDate() + 7 * weeksToPocast);
  return nextPodcastDate;
}

function dateDiffInDays(a: Date, b: Date) {
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

export default async function handler(request: NextRequest, res: NextResponse) {
  if (request.method === "POST") {
    const payload = request.body;
    console.log(payload);
    if ('message' in payload!) {
      const input = String(payload.message.text);
      if (input.split(" ")[0].toLowerCase() === SET_TOPIC_COMMAND.toLowerCase()) {
        if (payload.message.chat.id.toString() !== process.env.CHAT_ID) {
          await sendMessage(process.env.TELEGRAM_API_KEY, payload.message.chat.id, "Solo respondo a comandos en el grupo.");
          return res.status(200).json({ ok: true });
        }

        const [topic, description] = input.slice(SET_TOPIC_COMMAND.length).trim().split(';');
        if (topic?.length === 0) {
          await sendMessage(process.env.TELEGRAM_API_KEY, payload.message.chat.id, "Agregá el tema después del comando");
          return res.status(200).json({ ok: true });
        }

        const today = new Date();
        const days = dateDiffInDays(today, getNextPodcastDate(today));
        const nextEpisodeNumber = getNextEpisodeNumber();
        const nextEpisodeDocResponse = await getEpisodeDoc(nextEpisodeNumber);

        if (days === 7 * PODCAST_FREQUENCY - 1 || days === 0 || nextEpisodeDocResponse.results.length === 0) {
          await sendMessage(process.env.TELEGRAM_API_KEY, payload.message.chat.id, "Bancá que todavía ni creé el doc.");
          return res.status(200).json({ ok: true });
        }

        const notionEpisodeUrl = nextEpisodeDocResponse.results[0]?.url;
        const response = `Capítulo ${nextEpisodeNumber}: ${topic} ${notionEpisodeUrl}
          Editor link: https://podcast-telegram-bot-seven.vercel.app/editor?date=${getNextPodcastDate(today).getDate()}/${getNextPodcastDate(today).getMonth()}&topic=${topic}&description=${description}`;
        const sentMessage = await sendMessage(process.env.TELEGRAM_API_KEY, process.env.CHAT_ID, response);
        const oldMessageProperty = nextEpisodeDocResponse.results[0]?.properties?.telegram_message_id
        // TODO: Separate updating title from message_id and get new url for message.
        await updateEpisodeDoc(nextEpisodeDocResponse.results[0]?.id, `${EPISODE_NAME_PREFIX} ${nextEpisodeNumber}: ${topic}`, oldMessageProperty.id, sentMessage?.result?.message_id)

        // unpin old message
        if (oldMessageProperty?.number) {
          await unpinMessage(process.env.TELEGRAM_API_KEY, process.env.CHAT_ID, oldMessageProperty.number);
        }
        // pin new message
        await pinMessage(process.env.TELEGRAM_API_KEY, process.env.CHAT_ID, sentMessage?.result?.message_id);
      }
    }
  }
  return res.status(200).json({ ok: true });
}
