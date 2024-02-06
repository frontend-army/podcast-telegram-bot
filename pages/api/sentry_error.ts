import { NextApiRequest, NextApiResponse } from 'next';
import { sendMessage } from '../../services/telegram';

export default async function handler(request: NextApiRequest, response: NextApiResponse) {
    const {action, data} = request.body;
    console.log('action', action);
    console.log('data', data);
    if (data.issue && action === "created") {
      await sendMessage(process.env.CHAT_ID, `New issue created: ${data.issue.title}, link: https://frontend-army.sentry.io/issues/${data.issue.id}`);
    }

  return response.status(200).json({ message: 'Message sent'});
}
