import { updateEpisodeDoc, getEpisodeDoc } from "../../services/notion";
import { sendMessage, pinMessage, unpinMessage } from "../../services/telegram";
import { EPISODE_NAME_PREFIX, SET_TOPIC_COMMAND } from "../../constants/podcast/config";
import { dateDiffInDays, getNextEpisode } from "../../constants/podcast/episodes";
import { Hono } from "hono";

export const router = new Hono();

router.post("/api/create_episode", async (c) => {
  const payload: any = await c.req.json();
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
        return c.json({ ok: true });
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
        return c.json({ ok: true });
      }

      const today = new Date();
      const nextEpisode = getNextEpisode(today);
      const days = dateDiffInDays(today, nextEpisode.date);
      const nextEpisodeDocResponse: any = await getEpisodeDoc(nextEpisode.number);

      if (days === 0 || nextEpisodeDocResponse.results.length === 0) {
        await sendMessage(
          payload.message.chat.id,
          "Bancá que todavía ni creé el doc."
        );
        return c.json({ ok: true });
      }

      const notionEpisodeUrl = nextEpisodeDocResponse.results[0]?.url;
      const response = `Capítulo ${nextEpisode.number}: ${topic} ${notionEpisodeUrl}`;
      const sentMessage: any = await sendMessage(process.env.CHAT_ID, response);
      const oldMessageProperty =
        nextEpisodeDocResponse.results[0]?.properties?.telegram_message_id;
      await updateEpisodeDoc(
        nextEpisodeDocResponse.results[0]?.id,
        `${EPISODE_NAME_PREFIX} ${nextEpisode.number}: ${topic}`,
        oldMessageProperty.id,
        sentMessage?.result?.message_id
      );

      if (oldMessageProperty?.number) {
        await unpinMessage(process.env.CHAT_ID, oldMessageProperty.number);
      }
      await pinMessage(process.env.CHAT_ID, sentMessage?.result?.message_id);
    }
  }
  return c.json({ ok: true });
});
