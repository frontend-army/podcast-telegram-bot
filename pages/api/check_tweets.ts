
import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { tweetMessage } from '../../services/twitter';

const client = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_ANON_KEY!
);
export default async function handler() {
  const res = await client.from('tweets').select('*').filter('publish_date', 'lt', new Date().toUTCString());
  if(res.error) {
    return NextResponse.json({ error: res.error.message }, { status: 500 });
  }

  for (const tweet of res.data) {
    await tweetMessage(tweet.text);
    await client.from('tweets').delete().match({ id: tweet.id });
  }

  return NextResponse.json({ ok: true });
}
