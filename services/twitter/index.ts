import { TwitterApi } from 'twitter-api-v2';

function getClientOAuth1() {
    return new TwitterApi({
        appKey: process.env.CONSUMER_KEY!,
        appSecret: process.env.CONSUMER_SECRET!,
        accessToken: process.env.ACCESS_TOKEN!,
        accessSecret: process.env.ACCESS_TOKEN_SECRET!,
    });
}

// Twitter counts most chars as 1, emoji as 2, URLs as 23 regardless of length
function twitterWeightedLength(text: string): number {
    const urlLength = 23;
    const urlRegex = /https?:\/\/\S+/g;
    const withoutUrls = text.replace(urlRegex, '_'.repeat(urlLength));
    let count = 0;
    for (const char of withoutUrls) {
        const cp = char.codePointAt(0) ?? 0;
        // Emoji / surrogate pairs count as 2
        count += cp > 0xFFFF ? 2 : 1;
    }
    return count;
}

function truncateForTwitter(text: string): string {
    const TWITTER_MAX_CHARS = 280;
    if (twitterWeightedLength(text) <= TWITTER_MAX_CHARS) return text;
    const chars = text.match(/[\s\S]/gu) ?? [];
    while (chars.length > 0) {
        chars.pop();
        const candidate = chars.join('') + '…';
        if (twitterWeightedLength(candidate) <= TWITTER_MAX_CHARS) return candidate;
    }
    return text;
}

export async function tweetMessage(text: string) {
    const client = getClientOAuth1();
    return await client.v2.tweet(truncateForTwitter(text));
}
