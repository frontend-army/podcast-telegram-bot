import { updateEpisodeDoc, getEpisodeDoc } from "../../services/notion";
import { sendMessage, pinMessage, unpinMessage } from "../../services/telegram";
import { EPISODE_NAME_PREFIX, SET_TOPIC_COMMAND } from "../podcast/config";
import { NextApiRequest, NextApiResponse } from "next";
import { dateDiffInDays, getNextEpisode } from "../podcast/episodes";

interface TelegramRequest extends NextApiRequest {
  body: {
    message: {
      date: number;
      chat: {
        last_name: string;
        id: number;
        type: string;
        first_name: string;
        username: string;
      };
      message_id: number;
      from: {
        last_name: string;
        id: number;
        first_name: string;
        username: string;
      };
      text: string;
    };
  };
}

export default async function handler(
  request: TelegramRequest,
  res: NextApiResponse
) {
  if (request.method === "POST") {
    const payload = request.body;
    console.log(payload);
    if ("message" in payload) {
      const input = String(payload.message.text);
      if (
        input.split(" ")[0].toLowerCase() === SET_TOPIC_COMMAND.toLowerCase()
      ) {
        if (payload.message.chat.id.toString() !== process.env.CHAT_ID) {
          await sendMessage(
            payload.message.chat.id,
            "Solo respondo a comandos en el grupo."
          );
          return res.status(200).json({ ok: true });
        }

        const [topic, description] = input
          .slice(SET_TOPIC_COMMAND.length)
          .trim()
          .split(";");
        if (topic?.length === 0) {
          await sendMessage(
            payload.message.chat.id,
            "Agregá el tema después del comando"
          );
          return res.status(200).json({ ok: true });
        }

        const today = new Date();
        const nextEpisode = getNextEpisode(today);
        const days = dateDiffInDays(today, nextEpisode.date);
        const nextEpisodeDocResponse = await getEpisodeDoc(nextEpisode.number);

        if (days === 0 || nextEpisodeDocResponse.results.length === 0) {
          await sendMessage(
            payload.message.chat.id,
            "Bancá que todavía ni creé el doc."
          );
          return res.status(200).json({ ok: true });
        }

        const notionEpisodeUrl = nextEpisodeDocResponse.results[0]?.url;
        const response = `Capítulo ${
          nextEpisode.number
        }: ${topic} ${notionEpisodeUrl}
          Editor link: https://podcast-telegram-bot-seven.vercel.app/editor?date=${nextEpisode.date.getTime()}&topic=${topic}&description=${description}`;
        const sentMessage = await sendMessage(process.env.CHAT_ID, response);
        const oldMessageProperty =
          nextEpisodeDocResponse.results[0]?.properties?.telegram_message_id;
        // TODO: Separate updating title from message_id and get new url for message.
        await updateEpisodeDoc(
          nextEpisodeDocResponse.results[0]?.id,
          `${EPISODE_NAME_PREFIX} ${nextEpisode.number}: ${topic}`,
          oldMessageProperty.id,
          sentMessage?.result?.message_id
        );

        // unpin old message
        if (oldMessageProperty?.number) {
          await unpinMessage(process.env.CHAT_ID, oldMessageProperty.number);
        }
        // pin new message
        await pinMessage(process.env.CHAT_ID, sentMessage?.result?.message_id);
      }
    }
  }
  return res.status(200).json({ ok: true });
}
