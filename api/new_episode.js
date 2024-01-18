async function tweetMessage(text) {

    const CONSUMER_KEY=""
    const CONSUMER_SECRET=""
    const ACCESS_TOKEN=""
    const ACCESS_TOKEN_SECRET=""

    const twitterClient = new TwitterClient({
        apiKey: CONSUMER_KEY,
        apiSecret: CONSUMER_SECRET,
        accessToken: ACCESS_TOKEN,
        accessTokenSecret: ACCESS_TOKEN_SECRET,
    });
    return twitterClient.tweetsV2.createTweet({
        text
    });

}

export default async (request, env, ctx) => {
    const chapter = payload.record;
    const response = `
    📢Subimos el Capitulo ${chapter.id} a YouTube y Spotify! 📢

    ${chapter.description}

    ➡️Spotify: ${chapter.spotify_url}

    ➡️YouTube: ${chapter.youtube_url}

    Tambien te esperamos en nuestro Discord! 👋

    ➡️Discord: https://discord.com/invite/pKQ6KdPBj3`;
    await tweetMessage(response);
    return new Response('OK');
}