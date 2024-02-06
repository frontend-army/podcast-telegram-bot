import { NextApiRequest, NextApiResponse } from 'next';
import { sendMessage } from '../../services/telegram';

export default async function handler(request: NextApiRequest, response: NextApiResponse) {
  console.log(request.body);
  const res = await sendMessage(request.body);
  return response.status(200).json({ message: `${res.data.length} Tweets sent`});
}
