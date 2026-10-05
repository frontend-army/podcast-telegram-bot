const TELEGRAM_API_BASE_URL = "https://api.telegram.org";

export interface TelegramMessage {
  message_id: number;
  text: string;
}

export interface TelegramResponse<TResult> {
  ok: boolean;
  result: TResult;
  description?: string;
}

function callTelegram<TResult>(
  method: string,
  params: Record<string, string | number>
): Promise<TelegramResponse<TResult>> {
  const url = new URL(
    `${TELEGRAM_API_BASE_URL}/bot${process.env.TELEGRAM_API_KEY!}/${method}`
  );

  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, String(value));
  }

  return fetch(url).then((response) => response.json());
}

export function sendMessage(chatId: string, text: string) {
  return callTelegram<TelegramMessage>("sendMessage", {
    chat_id: chatId,
    text,
  });
}

export function pinMessage(chatId: string, messageId: number) {
  return callTelegram<boolean>("pinChatMessage", {
    chat_id: chatId,
    message_id: messageId,
  });
}

export function unpinMessage(chatId: string, messageId: number) {
  return callTelegram<boolean>("unpinChatMessage", {
    chat_id: chatId,
    message_id: messageId,
  });
}
