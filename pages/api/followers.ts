import { NextApiRequest, NextApiResponse } from 'next';
import { sendMessage } from '../../services/telegram';
import axios from 'axios';
import { createClient } from '@supabase/supabase-js';

const client = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_ANON_KEY!
);


export default async function handler(request: NextApiRequest, response: NextApiResponse) {
  let instagram = await axios.get('https://www.instagram.com/graphql/query/?query_id=17851374694183129&variables=%7B%22id%22%3A%2262006479490%22%2C%22first%22%3A12%7D', {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Linux; Android 9; GM1903 Build/PKQ1.190110.001; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/75.0.3770.143 Mobile Safari/537.36 Instagram 103.1.0.15.119 Android (28/9; 420dpi; 1080x2260; OnePlus; GM1903; OnePlus7; qcom; sv_SE; 164094539)',
      Origin: 'https://www.instagram.com',
      Referer: 'https://www.instagram.com/',
      Cookie: `sessionId=12312313212`
    }
  });
  console.log(instagram);
  const count = instagram.data?.data.user.edge_followed_by.count;
  const followerCount = await client.from('follow_count').select('count').eq('id', 1).single();
  const previousCount = followerCount.data?.count ?? 0;
  console.log(count, previousCount);
  if(count > previousCount + 10) { 
    await sendMessage(process.env.CHAT_ID, `👤 Followers: ${count}`);
    await client.from('follow_count').upsert({ id: 1, count });
  }
  return response.status(200).json({ ok: true });
}
