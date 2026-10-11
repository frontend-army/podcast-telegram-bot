import axios from "axios";
import type { SendMessage } from "../types";

const BLUESKY_PUBLIC_API_BASE_URL = "https://public.api.bsky.app/xrpc";
const BLUESKY_API_BASE_URL = "https://bsky.social/xrpc";
const POST_COLLECTION = "app.bsky.feed.post";

export async function getAuthorFeed(actor: string) {
  const { data } = await axios.get(
    `${BLUESKY_PUBLIC_API_BASE_URL}/app.bsky.feed.getAuthorFeed`,
    {
      params: { actor },
    }
  );

  return data;
}

async function createSession() {
  const { data } = await axios.post(
    `${BLUESKY_API_BASE_URL}/com.atproto.server.createSession`,
    {
      identifier: process.env.BLUESKY_IDENTIFIER!,
      password: process.env.BLUESKY_APP_PASSWORD!,
    }
  );

  return data;
}

export const sendMessage: SendMessage = async (text: string) => {
  const session = await createSession();

  const { data } = await axios.post(
    `${BLUESKY_API_BASE_URL}/com.atproto.repo.createRecord`,
    {
      repo: session.did,
      collection: POST_COLLECTION,
      record: {
        $type: POST_COLLECTION,
        text,
        createdAt: new Date().toISOString(),
      },
    },
    {
      headers: { Authorization: `Bearer ${session.accessJwt}` },
    }
  );

  return data;
};
