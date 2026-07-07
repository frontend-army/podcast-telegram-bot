import { Hono } from "hono";
import { tweetMessage } from "../../services/twitter";

const MESSAGE_TYPE = "Twitch-Eventsub-Message-Type".toLowerCase();
const MESSAGE_TYPE_VERIFICATION = "webhook_callback_verification";

export const router = new Hono();

router.post("/api/check_live", async (c) => {
  const data = new URLSearchParams();
  data.append("client_id", process.env.TWITCH_CLIENT_ID!);
  data.append("client_secret", process.env.TWITCH_CLIENT_SECRET!);
  data.append("grant_type", "client_credentials");

  const accessToken: string = await fetch("https://id.twitch.tv/oauth2/token", {
    method: "POST",
    body: data,
  })
    .then((response) => response.json() as Promise<{ access_token: string }>)
    .then((data) => data.access_token);

  const streams = await fetch(
    "https://api.twitch.tv/helix/streams?user_login=frontend_army",
    {
      headers: {
        "Client-ID": process.env.TWITCH_CLIENT_ID!,
        Authorization: `Bearer ${accessToken}`,
      },
    }
  ).then((response) => response.json() as Promise<{ data: Array<{ title: string }> }>);

  console.log(streams.data);
  const streamTitle = streams.data[0]?.title;
  if (streamTitle) {
    await tweetMessage(`🔴ESTAMOS LIVE🔴

🔥🔥🔥
${streamTitle}
🔥🔥🔥

No se lo pierdan!
⬇️⬇️⬇️⬇️⬇️⬇️⬇️
http://bit.ly/3Sg5M0K`);
  }

  if (MESSAGE_TYPE_VERIFICATION === c.req.header(MESSAGE_TYPE)) {
    const { challenge } = await c.req.json();
    return c.text(challenge, 200, { "Content-Type": "text/plain" });
  }

  return c.json({ ok: true });
});
