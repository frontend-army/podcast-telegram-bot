import { NextApiRequest, NextApiResponse } from 'next';
import { sendMessage } from '../../services/twitter';

const MESSAGE_TYPE = 'Twitch-Eventsub-Message-Type'.toLowerCase();

const MESSAGE_TYPE_VERIFICATION = 'webhook_callback_verification';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (MESSAGE_TYPE_VERIFICATION === req.headers[MESSAGE_TYPE]) {
    return res.setHeader('Content-Type', 'text/plain').status(200).send(req.body.challenge);
  }

  try {
    const data = new URLSearchParams();
    data.append('client_id', process.env.TWITCH_CLIENT_ID!);
    data.append('client_secret', process.env.TWITCH_CLIENT_SECRET!);
    data.append('grant_type', 'client_credentials');

    const tokenResponse = await fetch('https://id.twitch.tv/oauth2/token', {
      method: 'POST',
      body: data,
    }).then((response) => response.json());

    const accessToken = tokenResponse?.access_token;
    if (!accessToken) {
      console.error('Failed to obtain Twitch access token', tokenResponse);
      return res.status(200).json({ ok: true });
    }

    const streamsResponse = await fetch('https://api.twitch.tv/helix/streams?user_login=frontend_army', {
      headers: {
        'Client-ID': process.env.TWITCH_CLIENT_ID!,
        Authorization: `Bearer ${accessToken}`,
      },
    }).then((response) => response.json());

    const streams = Array.isArray(streamsResponse?.data) ? streamsResponse.data : [];
    const streamTitle = streams[0]?.title;
    if (streamTitle) {
      await sendMessage(`🔴ESTAMOS LIVE🔴

🔥🔥🔥
${streamTitle}
🔥🔥🔥

No se lo pierdan!
⬇️⬇️⬇️⬇️⬇️⬇️⬇️
http://bit.ly/3Sg5M0K`);
    }
  } catch (error) {
    console.error('check_live failed', error);
  }

  return res.status(200).json({ ok: true });
}
