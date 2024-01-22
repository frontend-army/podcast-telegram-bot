import { TwitterClient } from 'twitter-api-client';

async function tweetMessage(text) {
    console.log('Tweet length: ', text.length);
    const twitterClient = new TwitterClient({
        apiKey: process.env.CONSUMER_KEY,
        apiSecret: process.env.CONSUMER_SECRET,
        accessToken: process.env.ACCESS_TOKEN,
        accessTokenSecret: process.env.ACCESS_TOKEN_SECRET,
    });

    return twitterClient.tweetsV2.createTweet({
        text
    });
}

export default async function handler(request, response) {
    const chapter = request.body.record;
    const text = `📢Subimos el Capitulo ${chapter.id} a YouTube y Spotify! 📢

    ${chapter.title}

    ➡️Spotify: ${chapter.spotify_url}
    ➡️YouTube: ${chapter.youtube_url}
    Tambien te esperamos en nuestro Discord! 👋
    ➡️Discord: https://discord.com/invite/pKQ6KdPBj3`;
    await tweetMessage(text);
    return response.status(200).json({ ok: true });
}
