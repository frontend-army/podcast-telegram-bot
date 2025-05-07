import axios from 'axios';

export function sendMessageToLinkedin(message: string) {
  return axios.post(process.env.MAKE_WEBHOOK_URL!, { message });
}
