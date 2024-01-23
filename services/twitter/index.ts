import { TwitterClient } from 'twitter-api-client';

export async function tweetMessage(text) {
    console.log('Tweet length: ', text.length);
    const twitterClient = new TwitterClient({
        apiKey: process.env.CONSUMER_KEY,
        apiSecret: process.env.CONSUMER_SECRET,
        accessToken: process.env.ACCESS_TOKEN,
        accessTokenSecret: process.env.ACCESS_TOKEN_SECRET,
    });
    return twitterClient.tweetsV2.createTweet({ text });
}
