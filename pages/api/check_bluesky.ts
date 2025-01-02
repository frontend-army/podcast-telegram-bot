import { NextApiRequest, NextApiResponse } from 'next';
import { tweetMessage } from '../../services/twitter';
import axios from 'axios';
import subMinutes from 'date-fns/subMinutes';
import { sendMessageToDiscord } from '../../services/discord';
const actorAlias = 'frankiglesias.bsky.social';
export default async function handler(request: NextApiRequest, response: NextApiResponse) {
  // 1. Check if there's a new tweet from @bluesky
  const { data } = await axios.get(`https://public.api.bsky.app/xrpc/app.bsky.feed.getAuthorFeed?actor=${actorAlias}`);
  const { feed } = data;
  const latestTweet = feed[0];
  if(new Date(latestTweet.post.record.createdAt) > subMinutes(new Date(), 15)) {
    // 2. If there is, send it to tweeter / x
    await tweetMessage(latestTweet.post.record.text);
    // 3. If there is one send it to discord
    await sendMessageToDiscord(latestTweet.post.record.text);
    response.status(200).json({ message: latestTweet.post.record.text });
  } else {
    response.status(200).json({ message: 'No new tweets' });
  }
  // 3. If there is one send it to discord
}
