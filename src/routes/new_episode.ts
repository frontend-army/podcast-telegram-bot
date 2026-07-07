import { tweetMessage } from "../../services/twitter";
import { Hono } from "hono";

export const router = new Hono();

router.post("/api/new_episode", async (c) => {
  const { record: chapter } = await c.req.json();
  const text = `📢Subimos el Capitulo ${chapter.id} a YouTube y Spotify! 📢

${chapter.description}

➡️Spotify: ${chapter.spotify_url}
➡️YouTube: ${chapter.youtube_url}
Tambien te esperamos en nuestro Discord! 👋
➡️Discord: https://discord.com/invite/pKQ6KdPBj3`;
  await tweetMessage(text);
  return c.json({ ok: true });
});
