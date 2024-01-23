
import { NextRequest, NextResponse } from 'next/server';
import { tweetMessage } from '../../services/twitter';

export default async function handler(request: NextRequest, response: NextResponse) {
  await tweetMessage(`🔴ESTAMOS LIVE!!!🔴
${request.body!.title}
Los esperamos! 👋 🔥🔥🔥
https://www.twitch.tv/frontend_army`);
return response.status(200).send('ok');
}
