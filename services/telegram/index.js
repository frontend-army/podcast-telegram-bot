
export async function sendMessage(chatId, text) {
  const url = `https://api.telegram.org/bot${process.env.TELEGRAM_API_KEY}/sendMessage?chat_id=${chatId}&text=${text}`;
  return fetch(url).then(resp => resp.json());
}

export async function pinMessage(chatId, messageId) {
  const url = `https://api.telegram.org/bot${process.env.TELEGRAM_API_KEY}/pinChatMessage?chat_id=${chatId}&message_id=${messageId}`;
  return fetch(url).then(resp => resp.json());
}

export async function unpinMessage(chatId, messageId) {
  const url = `https://api.telegram.org/bot${process.env.TELEGRAM_API_KEY}/unpinChatMessage?chat_id=${chatId}&message_id=${messageId}`;
  return fetch(url).then(resp => resp.json());
}
