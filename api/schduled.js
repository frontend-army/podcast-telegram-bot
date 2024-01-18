const PRINT_REMAINING_DAYS = false;
const PODCAST_FREQUENCY = 2;
const EPISODE_NAME_PREFIX = "Capítulo";
const EPISODE_NAME_SUFIX = "<A DEFINIR>";
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

async function sendMessage(apiKey, chatId, text) {
  const url = `https://api.telegram.org/bot${apiKey}/sendMessage?chat_id=${chatId}&text=${text}`;
  return fetch(url).then(resp => resp.json());
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


function getNextEpisodeNumber() {
  const today = new Date();
  return STARTING_PODCAST_NUMBER + Math.round(dateDiffInDays(new Date(STARTING_PODCAST_DATE), getNextPodcastDate(today)) / 7 / PODCAST_FREQUENCY);
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

export default async (event, env) => {
    const today = new Date();
    const days = dateDiffInDays(today, getNextPodcastDate(today));
    const nextEpisodeNumber = getNextEpisodeNumber();

    if (PRINT_REMAINING_DAYS) {
      if (days === 0) {
        await sendMessage(env.TELEGRAM_API_KEY, env.CHAT_ID, `Hoy es el el podcast`);
      } else if (days === 1) {
        await sendMessage(env.TELEGRAM_API_KEY, env.CHAT_ID, `Falta ${days} día para el podcast`);
      } else {
        await sendMessage(env.TELEGRAM_API_KEY, env.CHAT_ID, `Faltan ${days} días para el podcast`);
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
        await sendMessage(env.TELEGRAM_API_KEY, env.CHAT_ID, `Reminder: Definir tema para el capítulo ${nextEpisodeNumber}`);
      }
    }

    // Episode Questions Reminder
    if (days <= 2) {
      if (await episodeDocHasTopic(env, nextEpisodeNumber)) {
        const episodeQuestionsCount = await episodeDocQuestionsCount(env, nextEpisodeNumber);
        if (episodeQuestionsCount === 0) {
          await sendMessage(env.TELEGRAM_API_KEY, env.CHAT_ID, `Reminder: Todavía no hay preguntas en el doc`);
        } else if (episodeQuestionsCount < MIN_QUESTIONS) {
          await sendMessage(env.TELEGRAM_API_KEY, env.CHAT_ID, `Reminder: Agregar preguntas al doc, solo hay ${episodeQuestionsCount} por ahora.`);
        } else if (episodeQuestionsCount < NICE_TO_HAVE_QUESTIONS) {
          await sendMessage(env.TELEGRAM_API_KEY, env.CHAT_ID, `Reminder: Ya tenemos ${episodeQuestionsCount} preguntas en el doc. ¿Alguno quiere sumar más?`);
        }
      }
    }
  }