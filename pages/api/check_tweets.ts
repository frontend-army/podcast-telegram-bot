
import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
import { tweetMessage } from '../../services/twitter';

const client = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_ANON_KEY!
);
export default async function handler(request: NextRequest, response: NextResponse) {
  const res = await client.from('tweets').select('*').filter('publish_date', 'lt', new Date().toUTCString());
  if(res.error) {
    return response.status(500).json({ error: res.error });
  }

  for (const tweet of res.data) {
    await tweetMessage(tweet.text);
    client.from('tweets').delete().match({ id: tweet.id });
  }

  return response.status(200).json({ published: res.data.length });
}
