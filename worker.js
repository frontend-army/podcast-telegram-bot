/**
 * Welcome to Cloudflare Workers! This is your first worker.
 *
 * - Run "npm run dev" in your terminal to start a development server
 * - Open a browser tab at http://localhost:8787/ to see your worker in action
 * - Run "npm run deploy" to publish your worker
 *
 * Learn more at https://developers.cloudflare.com/workers/
 */
const PRINT_REMAINING_DAYS = false;
const PODCAST_DAY_OF_WEEK = 3;
const PODCAST_FREQUENCY = 2;
const STARTING_PODCAST_DATE = "2023-10-04T21:00:00";
const STARTING_PODCAST_NUMBER = 35;
const EPISODE_NAME_PREFIX = "Capítulo";
const EPISODE_NAME_SUFIX = "<A DEFINIR>";
const SET_TOPIC_COMMAND = "/definir_tema";
const MIN_QUESTIONS = 4;
const NICE_TO_HAVE_QUESTIONS = 8;

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

async function createNotionPage(env, title = "") {
  const response = await fetch("https://api.notion.com/v1/pages", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${env.NOTION_SECRET}`,
      "Content-Type": "application/json",
      "Notion-Version": "2022-06-28",
    },
    body: JSON.stringify({
      "parent": { "database_id": env.NOTION_EPISODES_DB_ID },
      "properties": {
        "Título": {
          "title": [
            {
              "text": {
                "content": title
              }
            }
          ]
        },
      },
      "children": [
        {
          "object": "block",
          "type": "heading_1",
          "heading_1": {
            "rich_text": [{ "type": "text", "text": { "content": "Preguntas" } }]
          }
        },
        {
          "object": "block",
          "type": "bulleted_list_item",
          "bulleted_list_item": {
            "rich_text": [{
              "type": "text",
              "text": {
                "content": "",
              }
            }]
          }
        }
      ]
    }),
  });
  return response.json();
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

// TODO: re-use https://api.notion.com/v1/search query in all functions
async function episodeDocExists(env, episodeNumber = 0) {
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
  const responseJson = await response.json()
  return responseJson.results.length > 0;
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

async function episodeDocHasTopic(env, episodeNumber = 0) {
  const response = await fetch(`https://api.notion.com/v1/search`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${env.NOTION_SECRET}`,
      "Content-Type": "application/json",
      "Notion-Version": "2022-06-28",
    },
    body: JSON.stringify({
      "query": `"${EPISODE_NAME_PREFIX} ${episodeNumber}: ${EPISODE_NAME_SUFIX}"`,
      "filter": {
        "value": "page",
        "property": "object"
      },
    }),
  });
  return (await response.json()).results.length === 0;
}

async function episodeDocQuestionsCount(env, episodeNumber = 0) {
  const response = await fetch(`https://api.notion.com/v1/search`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${env.NOTION_SECRET}`,
      "Content-Type": "application/json",
      "Notion-Version": "2022-06-28",
    },
    body: JSON.stringify({
      "query": `"${EPISODE_NAME_PREFIX} ${episodeNumber}:"`,
      "filter": {
        "value": "page",
        "property": "object"
      },
    }),
  });

  const result = await response.json();
  if (!result.results.length) {
    return null;
  }

  const blockResponse = await fetch(`https://api.notion.com/v1/blocks/${result.results[0].id}/children?page_size=100`, {
    method: "GET",
    headers: {
      "Authorization": `Bearer ${env.NOTION_SECRET}`,
      "Content-Type": "application/json",
      "Notion-Version": "2022-06-28",
    },
  });
  const r = await blockResponse.json();
  console.log(r);
  return (r).results.filter(block => block.type === "bulleted_list_item" && block.bulleted_list_item?.rich_text?.length).length;
}

function getNextEpisodeNumber() {
  const today = new Date();
  return STARTING_PODCAST_NUMBER + Math.round(dateDiffInDays(new Date(STARTING_PODCAST_DATE), getNextPodcastDate(today)) / 7 / PODCAST_FREQUENCY);
}

export default {
  async scheduled(event, env, ctx) {
    const today = new Date();
    const days = dateDiffInDays(today, getNextPodcastDate(today));
    const nextEpisodeNumber = getNextEpisodeNumber();

    if (PRINT_REMAINING_DAYS) {
      if (days === 0) {
        await this.sendMessage(env.TELEGRAM_API_KEY, env.CHAT_ID, `Hoy es el el podcast`);
      } else if (days === 1) {
        await this.sendMessage(env.TELEGRAM_API_KEY, env.CHAT_ID, `Falta ${days} día para el podcast`);
      } else {
        await this.sendMessage(env.TELEGRAM_API_KEY, env.CHAT_ID, `Faltan ${days} días para el podcast`);
      }
    }

    // Next Episode Document Creation (Day after the podcast)
    if (days === 7 * PODCAST_FREQUENCY - 1) {
      // Create doc for next podcast from template
      if (await episodeDocExists(env, nextEpisodeNumber)) {
      } else {
        // TODO: Unpin old doc!
        await createNotionPage(env, `${EPISODE_NAME_PREFIX} ${nextEpisodeNumber}: ${EPISODE_NAME_SUFIX}`);
      }
    }

    // Episode Topic Reminder
    if (days <= 9) {
      if (!await episodeDocHasTopic(env, nextEpisodeNumber)) {
        await this.sendMessage(env.TELEGRAM_API_KEY, env.CHAT_ID, `Reminder: Definir tema para el capítulo ${nextEpisodeNumber}`);
      }
    }

    // Episode Questions Reminder
    if (days <= 2) {
      if (await episodeDocHasTopic(env, nextEpisodeNumber)) {
        const episodeQuestionsCount = await episodeDocQuestionsCount(env, nextEpisodeNumber);
        if (episodeQuestionsCount === 0) {
          await this.sendMessage(env.TELEGRAM_API_KEY, env.CHAT_ID, `Reminder: Todavía no hay preguntas en el doc`);
        } else if (episodeQuestionsCount < MIN_QUESTIONS) {
          await this.sendMessage(env.TELEGRAM_API_KEY, env.CHAT_ID, `Reminder: Agregar preguntas al doc, solo hay ${episodeQuestionsCount} por ahora.`);
        } else if (episodeQuestionsCount < NICE_TO_HAVE_QUESTIONS) {
          await this.sendMessage(env.TELEGRAM_API_KEY, env.CHAT_ID, `Reminder: Ya tenemos ${episodeQuestionsCount} preguntas en el doc. ¿Alguno quiere sumar más?`);
        }
      }
    }
  },

  async fetch(request, env, ctx) {
    if (request.method === "POST") {
      const payload = await request.json();
      console.log(payload);
      if ('message' in payload) {
        const input = String(payload.message.text);
        if (input.split(" ")[0].toLowerCase() === SET_TOPIC_COMMAND.toLowerCase()) {
          if (payload.message.chat.id.toString() !== env.CHAT_ID) {
            await this.sendMessage(env.TELEGRAM_API_KEY, payload.message.chat.id, "Solo respondo a comandos en el grupo.");
            return new Response('OK');
          }

          const topic = input.slice(SET_TOPIC_COMMAND.length).trim();
          if (topic?.length === 0) {
            await this.sendMessage(env.TELEGRAM_API_KEY, payload.message.chat.id, "Agregá el tema después del comando");
            return new Response('OK');
          }

          const today = new Date();
          const days = dateDiffInDays(today, getNextPodcastDate(today));
          const nextEpisodeNumber = getNextEpisodeNumber();
          const nextEpisodeDocResponse = await getEpisodeDoc(env, nextEpisodeNumber);

          if (days === 7 * PODCAST_FREQUENCY - 1 || days === 0 || nextEpisodeDocResponse.results.length === 0) {
            await this.sendMessage(env.TELEGRAM_API_KEY, payload.message.chat.id, "Bancá que todavía ni creé el doc.");
            return new Response('OK');
          }

          const notionEpisodeUrl = nextEpisodeDocResponse.results[0]?.url;
          const response = `Capítulo ${nextEpisodeNumber}: ${topic} ${notionEpisodeUrl}`;
          const sentMessage = await this.sendMessage(env.TELEGRAM_API_KEY, env.CHAT_ID, response);
          const oldMessageProperty = nextEpisodeDocResponse.results[0]?.properties?.telegram_message_id
          // TODO: Separate updating title from message_id and get new url for message.
          await updateEpisodeDoc(env, nextEpisodeDocResponse.results[0]?.id, `${EPISODE_NAME_PREFIX} ${nextEpisodeNumber}: ${topic}`, oldMessageProperty.id, sentMessage?.result?.message_id)

          // unpin old message
          if (oldMessageProperty?.number) {
            await this.unpinMessage(env.TELEGRAM_API_KEY, env.CHAT_ID, oldMessageProperty.number);
          }
          // pin new message
          await this.pinMessage(env.TELEGRAM_API_KEY, env.CHAT_ID, sentMessage?.result?.message_id);
        }
      }
    }
    return new Response('OK');
  },

  async sendMessage(apiKey, chatId, text) {
    const url = `https://api.telegram.org/bot${apiKey}/sendMessage?chat_id=${chatId}&text=${text}`;
    return fetch(url).then(resp => resp.json());
  },

  async pinMessage(apiKey, chatId, messageId) {
    const url = `https://api.telegram.org/bot${apiKey}/pinChatMessage?chat_id=${chatId}&message_id=${messageId}`;
    return fetch(url).then(resp => resp.json());
  },

  async unpinMessage(apiKey, chatId, messageId) {
    const url = `https://api.telegram.org/bot${apiKey}/unpinChatMessage?chat_id=${chatId}&message_id=${messageId}`;
    return fetch(url).then(resp => resp.json());
  },
};
