
export async function sendMessage(apiKey, chatId, text) {
  const url = `https://api.telegram.org/bot${apiKey}/sendMessage?chat_id=${chatId}&text=${text}`;
  return fetch(url).then(resp => resp.json());
}

export async function pinMessage(apiKey, chatId, messageId) {
  const url = `https://api.telegram.org/bot${apiKey}/pinChatMessage?chat_id=${chatId}&message_id=${messageId}`;
  return fetch(url).then(resp => resp.json());
}

export async function unpinMessage(apiKey, chatId, messageId) {
  const url = `https://api.telegram.org/bot${apiKey}/unpinChatMessage?chat_id=${chatId}&message_id=${messageId}`;
  return fetch(url).then(resp => resp.json());
}
