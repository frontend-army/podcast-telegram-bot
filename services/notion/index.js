const EPISODE_NAME_PREFIX = "Capítulo";
const EPISODE_NAME_SUFIX = "<A DEFINIR>";

// TODO: re-use https://api.notion.com/v1/search query in all functions
export async function episodeDocExists(episodeNumber = 0) {
  const response = await fetch(`https://api.notion.com/v1/search`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${process.env.NOTION_SECRET}`,
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

export async function episodeDocHasTopic(episodeNumber = 0) {
  const response = await fetch(`https://api.notion.com/v1/search`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${process.env.NOTION_SECRET}`,
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

export async function episodeDocQuestionsCount(episodeNumber = 0) {
  const response = await fetch(`https://api.notion.com/v1/search`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${process.env.NOTION_SECRET}`,
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
      "Authorization": `Bearer ${process.env.NOTION_SECRET}`,
      "Content-Type": "application/json",
      "Notion-Version": "2022-06-28",
    },
  });
  const r = await blockResponse.json();
  console.log(r);
  return (r).results.filter(block => block.type === "bulleted_list_item" && block.bulleted_list_item?.rich_text?.length).length;
}


export async function createNotionPage(title = "") {
  const response = await fetch("https://api.notion.com/v1/pages", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${process.env.NOTION_SECRET}`,
      "Content-Type": "application/json",
      "Notion-Version": "2022-06-28",
    },
    body: JSON.stringify({
      "parent": { "database_id": process.env.NOTION_EPISODES_DB_ID },
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
          "type": "paragraph",
          "paragraph": {
            "rich_text": [
              {
                "type": "text",
                "text": {
                  "content": "Responde la primera pregunta: ",
                },
                "annotations": {
                  "bold": false,
                  "italic": false,
                  "strikethrough": false,
                  "underline": false,
                  "code": false,
                  "color": "gray"
                },
              },
              {
                "type": "text",
                "text": {
                  "content": "A DEFINIR",
                },
                "annotations": {
                  "bold": true,
                  "italic": false,
                  "strikethrough": false,
                  "underline": false,
                  "code": false,
                  "color": "gray"
                },
              }
            ],
            "color": "default"
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
        },
        {
          "object": "block",
          "type": "heading_1",
          "heading_1": {
            "rich_text": [{ "type": "text", "text": { "content": "Thumbnail" } }]
          }
        },
        {
          "object": "block",
          "type": "heading_1",
          "heading_1": {
            "rich_text": [{ "type": "text", "text": { "content": "Highlights" } }]
          }
        },
        {
          "object": "block",
          "type": "paragraph",
          "paragraph": {
            "rich_text": [
              {
                "type": "text",
                "text": {
                  "content": "Hora de comienzo del podcast: ",
                },
              }
            ],
            "color": "default"
          }
        },
        {
          "object": "block",
          "type": "table",
          "table": {
            "table_width": 2,
            "has_column_header": true,
            "has_row_header": false,
            "children": [
              {
                "type": "table_row",
                "table_row": {
                  "cells": [
                    [
                      {
                        "type": "text",
                        "text": {
                          "content": "Timestamp",
                        }
                      }],
                    [{
                      "type": "text",
                      "text": {
                        "content": "Descripción",
                      }
                    }
                    ],
                  ]
                }
              },
              {
                "type": "table_row",
                "table_row": {
                  "cells": [
                    [
                      {
                        "type": "text",
                        "text": {
                          "content": "",
                        }
                      }],
                    [{
                      "type": "text",
                      "text": {
                        "content": "",
                      }
                    }
                    ],
                  ]
                }
              }
            ]
          },
        },
      ]
    }),
  });
  return response.json();
}

export async function updateEpisodeDoc(pageId, title, propertyId, messageId) {
  console.log(pageId, title, propertyId, messageId);
  const response = await fetch(`https://api.notion.com/v1/pages/${pageId}`, {
    method: "PATCH",
    headers: {
      "Authorization": `Bearer ${process.env.NOTION_SECRET}`,
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

export async function getEpisodeDoc(episodeNumber = 0) {
  const response = await fetch(`https://api.notion.com/v1/search`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${process.env.NOTION_SECRET}`,
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
