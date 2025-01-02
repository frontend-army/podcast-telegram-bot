import axios from 'axios';

export function sendMessageToDiscord(content: string) {
  return axios.post(process.env.DISCORD_WEBHOOK_URL!, { content });
}
