async function tweetMessage(text) {
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

export default async (request) => {
    const chapter = request.payload.record;
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
