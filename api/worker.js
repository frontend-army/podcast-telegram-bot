const PODCAST_DAY_OF_WEEK = 3;
const PODCAST_FREQUENCY = 2;
const STARTING_PODCAST_DATE = "2023-10-04T21:00:00";
const STARTING_PODCAST_NUMBER = 35;
const EPISODE_NAME_PREFIX = "Capítulo";
const SET_TOPIC_COMMAND = "/definir_tema";

function getNextPodcastDate(fromDate) {
  var nextPodcastDate = new Date(fromDate.getTime());
  nextPodcastDate.setDate(nextPodcastDate.getDate() + (PODCAST_DAY_OF_WEEK + 7 - nextPodcastDate.getDay()) % 7);
  const weeksToPocast = (dateDiffInDays(new Date(STARTING_PODCAST_DATE), nextPodcastDate) / 7) % PODCAST_FREQUENCY;
  nextPodcastDate.setUTCDate(nextPodcastDate.getUTCDate() + 7 * weeksToPocast);
  return nextPodcastDate;
}

function dateDiffInDays(a, b) {
  const _MS_PER_DAY = 1000 * 60 * 60 * 24;
  // Discard the time and time-zone information.
  const utc1 = Date.UTC(a.getFullYear(), a.getMonth(), a.getDate());
  const utc2 = Date.UTC(b.getFullYear(), b.getMonth(), b.getDate());

  return Math.floor((utc2 - utc1) / _MS_PER_DAY);
}

async function updateEpisodeDoc(env, pageId, title, propertyId, messageId) {
  console.log(env, pageId, title, propertyId, messageId);
  const response = await fetch(`https://api.notion.com/v1/pages/${pageId}`, {
    method: "PATCH",
    headers: {
      "Authorization": `Bearer ${env.NOTION_SECRET}`,
      "Content-Type": "application/json",
      "Notion-Version": "2022-06-28",
    },
    body: JSON.stringify({
      "properties": {
        "telegram_message_id": {
          "number": messageId,
          "id": propertyId,
        },
        "Título": {
          "title": [
            {
              "type": "text",
              "text": {
                "content": title,
                "link": null
              },
              "annotations": {
                "bold": false,
                "italic": false,
                "strikethrough": false,
                "underline": false,
                "code": false,
                "color": "default"
              },
              "plain_text": title,
              "href": null
            }
          ],
          "id": "title"
        }
      },
    }),
  });
  const responseJson = await response.json();
  console.log(responseJson);
  return responseJson;
}

async function sendMessage(apiKey, chatId, text) {
  const url = `https://api.telegram.org/bot${apiKey}/sendMessage?chat_id=${chatId}&text=${text}`;
  return fetch(url).then(resp => resp.json());
}

async function pinMessage(apiKey, chatId, messageId) {
  const url = `https://api.telegram.org/bot${apiKey}/pinChatMessage?chat_id=${chatId}&message_id=${messageId}`;
  return fetch(url).then(resp => resp.json());
}

async function unpinMessage(apiKey, chatId, messageId) {
  const url = `https://api.telegram.org/bot${apiKey}/unpinChatMessage?chat_id=${chatId}&message_id=${messageId}`;
  return fetch(url).then(resp => resp.json());
}


async function getEpisodeDoc(env, episodeNumber = 0) {
  const response = await fetch(`https://api.notion.com/v1/search`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${env.NOTION_SECRET}`,
      "Content-Type": "application/json",
      "Notion-Version": "2022-06-28",
    },
    body: JSON.stringify({
      "query": `"${EPISODE_NAME_PREFIX} ${episodeNumber}"`,
      "filter": {
        "value": "page",
        "property": "object"
      },
    }),
  });
  const responseJson = await response.json();
  console.log(responseJson);
  return responseJson;
}


function getNextEpisodeNumber() {
  const today = new Date();
  return STARTING_PODCAST_NUMBER + Math.round(dateDiffInDays(new Date(STARTING_PODCAST_DATE), getNextPodcastDate(today)) / 7 / PODCAST_FREQUENCY);
}

export default async(request, env) => {
    if (request.method === "POST") {
      const payload = await request.json();
      console.log(payload);
      if ('message' in payload) {
        const input = String(payload.message.text);
        if (input.split(" ")[0].toLowerCase() === SET_TOPIC_COMMAND.toLowerCase()) {
          if (payload.message.chat.id.toString() !== env.CHAT_ID) {
            await sendMessage(env.TELEGRAM_API_KEY, payload.message.chat.id, "Solo respondo a comandos en el grupo.");
            return new Response('OK');
          }

          const [topic, description] = input.slice(SET_TOPIC_COMMAND.length).trim().split(';');
          if (topic?.length === 0) {
            await sendMessage(env.TELEGRAM_API_KEY, payload.message.chat.id, "Agregá el tema después del comando");
            return new Response('OK');
          }

          const today = new Date();
          const days = dateDiffInDays(today, getNextPodcastDate(today));
          const nextEpisodeNumber = getNextEpisodeNumber();
          const nextEpisodeDocResponse = await getEpisodeDoc(env, nextEpisodeNumber);

          if (days === 7 * PODCAST_FREQUENCY - 1 || days === 0 || nextEpisodeDocResponse.results.length === 0) {
            await sendMessage(env.TELEGRAM_API_KEY, payload.message.chat.id, "Bancá que todavía ni creé el doc.");
            return new Response('OK');
          }

          const notionEpisodeUrl = nextEpisodeDocResponse.results[0]?.url;
          const response = `Capítulo ${nextEpisodeNumber}: ${topic} ${notionEpisodeUrl}
           ========================================================
            🗓️Miercoles ${getNextPodcastDate(today).getDate()} de ${MONTHS[getNextPodcastDate(today).getMonth()]}🗓️

            18:30Hs 🇦🇷
            16:30Hs 🇨🇴
            22:30Hs 🇪🇸

            Tenemos nuevo capitulo, ${topic}!

            ${description}

            Los esperamos! 🔥
            ========================================================
            HOY🗓️

            18:30Hs 🇦🇷 - 16:30Hs 🇨🇴 - 22:30Hs 🇪🇸

            ${description}!

            Nos vemos! 👋
            ========================================================
            📢En 30 minutos arrancamos!📢

            Capítulo ${nextEpisodeNumber}: ${topic}

            Te esperamos!
            ⬇️⬇️⬇️⬇️⬇️⬇️⬇️
            https://www.twitch.tv/frontend_army
            ========================================================
            🔴ESTAMOS LIVE🔴

            🔥🔥🔥
              Capitulo ${nextEpisodeNumber}: ${topic}
            🔥🔥🔥

            No se lo pierdan!
            ⬇️⬇️⬇️⬇️⬇️⬇️⬇️
            https://www.twitch.tv/frontend_army
          `;
          const sentMessage = await sendMessage(env.TELEGRAM_API_KEY, env.CHAT_ID, response);
          const oldMessageProperty = nextEpisodeDocResponse.results[0]?.properties?.telegram_message_id
          // TODO: Separate updating title from message_id and get new url for message.
          await updateEpisodeDoc(env, nextEpisodeDocResponse.results[0]?.id, `${EPISODE_NAME_PREFIX} ${nextEpisodeNumber}: ${topic}`, oldMessageProperty.id, sentMessage?.result?.message_id)

          // unpin old message
          if (oldMessageProperty?.number) {
            await unpinMessage(env.TELEGRAM_API_KEY, env.CHAT_ID, oldMessageProperty.number);
          }
          // pin new message
          await pinMessage(env.TELEGRAM_API_KEY, env.CHAT_ID, sentMessage?.result?.message_id);
        }
      }
    }
    return new Response('OK');
  };