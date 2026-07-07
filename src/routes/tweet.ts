import { createClient } from "@supabase/supabase-js";
import { Hono } from "hono";

function getClient() {
  return createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_ANON_KEY!);
}

export const router = new Hono();

router.post("/api/tweet", async (c) => {
  const client = getClient();
  const { text, date } = await c.req.json<{ text: string; date: string }>();
  const res = await client
    .from("tweets")
    .insert([
      { text, publish_date: new Date(date + "-03:00") },
    ]);
  return c.json(res);
});
