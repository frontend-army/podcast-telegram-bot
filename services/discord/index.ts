import axios from 'axios';
import type { SendMessage } from '../types';

export const sendMessage: SendMessage = (content: string) => {
  return axios.post(process.env.DISCORD_WEBHOOK_URL!, { content });
};
