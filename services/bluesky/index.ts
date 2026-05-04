import axios from "axios";

const BLUESKY_PUBLIC_API_BASE_URL = "https://public.api.bsky.app/xrpc";

export async function getAuthorFeed(actor: string) {
  const { data } = await axios.get(
    `${BLUESKY_PUBLIC_API_BASE_URL}/app.bsky.feed.getAuthorFeed`,
    {
      params: { actor },
    }
  );

  return data;
}
