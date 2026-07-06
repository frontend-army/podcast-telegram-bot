import { createClient } from "@supabase/supabase-js";
import { tweetMessage } from "../../services/twitter";
import { Hono } from "hono";

function getClient() {
  return createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_ANON_KEY!);
}

export const router = new Hono();

router.get("/api/check_tweets", async (c) => {
  const client = getClient();
  const res = await client
    .from("tweets")
    .select("*")
    .filter("publish_date", "lt", new Date().toUTCString());

  if (res.error) {
    return c.json({ error: res.error.message }, 500);
  }

  for (const tweet of res.data) {
    await tweetMessage(tweet.text);
    await client.from("tweets").delete().match({ id: tweet.id });
  }

  return c.json({ message: `${res.data.length} Tweets sent` });
});
