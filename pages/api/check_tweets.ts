
import { createClient } from '@supabase/supabase-js';
import { tweetMessage } from '../../services/twitter';
import { NextApiRequest, NextApiResponse } from 'next';

const client = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_ANON_KEY!
);
export default async function handler(request: NextApiRequest, response: NextApiResponse) {
  const res = await client.from('tweets').select('*').filter('publish_date', 'lt', new Date().toUTCString());
  if(res.error) {
    return response.status(500).json({ error: res.error.message });
  }

  for (const tweet of res.data) {
    await tweetMessage(tweet.text);
    await client.from('tweets').delete().match({ id: tweet.id });
  }

  return response.status(200).json({ message: `${res.data.length} Tweets sent`});
}
