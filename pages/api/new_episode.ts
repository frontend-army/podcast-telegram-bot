import { tweetMessage } from "../../services/twitter";
import { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(request: NextApiRequest, response: NextApiResponse) {
    const chapter = request.body.record;
    const text = `📢Subimos el Capitulo ${chapter.id} a YouTube y Spotify! 📢

${chapter.description}

➡️Spotify: ${chapter.spotify_url}
➡️YouTube: ${chapter.youtube_url}
Tambien te esperamos en nuestro Discord! 👋
➡️Discord: https://discord.com/invite/pKQ6KdPBj3`;
    await tweetMessage(text);
    return response.status(200).json({ ok: true });
}
