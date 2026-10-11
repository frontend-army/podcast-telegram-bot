import axios from 'axios';
import type { SendMessage } from '../types';

export const sendMessage: SendMessage = (message: string) => {
  return axios.post(process.env.MAKE_WEBHOOK_URL!, { message });
};
