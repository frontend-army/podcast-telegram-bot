import { Hono } from "hono";
import { router as checkBluesky } from "./routes/check_bluesky";
import { router as checkLive } from "./routes/check_live";
import { router as checkTweets } from "./routes/check_tweets";
import { router as createEpisode } from "./routes/create_episode";
import { router as newEpisode } from "./routes/new_episode";
import { router as scheduled } from "./routes/scheduled";
import { router as tweet } from "./routes/tweet";

const app = new Hono();

app.route("/", checkBluesky);
app.route("/", checkLive);
app.route("/", checkTweets);
app.route("/", createEpisode);
app.route("/", newEpisode);
app.route("/", scheduled);
app.route("/", tweet);

export default app;

if (import.meta.main) {
  Bun.serve({ fetch: app.fetch, port: 3000 });
  console.log("Server running on http://localhost:3000");
}
