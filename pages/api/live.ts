
import { NextRequest, NextResponse } from 'next/server';
import { tweetMessage } from '../../services/twitter';

export default async function handler(request: NextRequest, response: NextResponse) {
  console.log(request.body);
  return response.status(200).json({ published: 1 });
  return await tweetMessage(`🔴ESTAMOS LIVE!!!🔴
Los esperamos! 👋 🔥🔥🔥
https://www.twitch.tv/frontend_army`);
}
