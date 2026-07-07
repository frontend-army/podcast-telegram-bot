import { Hono } from "hono";
import axios from "axios";
import { subMinutes } from "date-fns/subMinutes";
import { sendMessageToDiscord } from "../../services/discord";
import { tweetMessage } from "../../services/twitter";
import { sendMessageToLinkedin } from "../../services/linkedin";
import { getAuthorFeed } from "../../services/bluesky";
import { getLookbackMinutes } from "../../constants/podcast/episodes";

const actorAlias = "frontendarmy.tech";

function formatError(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const statusCode = error.response?.status;
    const responseData =
      typeof error.response?.data === "string"
        ? error.response.data
        : JSON.stringify(error.response?.data ?? {});

    return statusCode
      ? `HTTP ${statusCode}: ${responseData}`
      : error.message;
  }

  if (typeof error === "object" && error !== null) {
    const genericError = error as {
      statusCode?: number;
      data?: string;
      message?: string;
    };

    if (genericError.statusCode || genericError.data || genericError.message) {
      return [
        genericError.statusCode ? `HTTP ${genericError.statusCode}` : null,
        genericError.data ?? null,
        genericError.message ?? null,
      ]
        .filter(Boolean)
        .join(": ");
    }
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "Unknown error";
}

type ProviderResult = "ok" | { error: string; exception: Record<string, unknown> };

function serializeError(error: unknown): Record<string, unknown> {
  if (error instanceof Error) {
    const errorObject = error as unknown as Record<string, unknown>;
    return { ...errorObject, message: error.message, name: error.name };
  }
  if (typeof error === "object" && error !== null) {
    return { ...error as Record<string, unknown> };
  }
  return { raw: String(error) };
}

function reportProviderError(
  provider: "twitter" | "discord" | "linkedin",
  error: unknown
): ProviderResult {
  const details = formatError(error);
  const exception = serializeError(error);
  console.error(`[${provider}] ${details}`);
  return { error: details, exception };
}

export const router = new Hono();

router.get("/api/check_bluesky", async (c) => {
  const lookbackMinutes = getLookbackMinutes(
    c.req.query("lookbackMinutes") ?? c.req.query("minutes")
  );

  try {
    const data = await getAuthorFeed(actorAlias);
    const { feed } = data;
    if (!feed.length) {
      return c.json({ message: "Our account has no tweets" });
    }

    const latestTweet = feed.find(
      (tweet: { post: { record: { createdAt: string }; author: { handle: string } } }) =>
        new Date(tweet.post.record.createdAt) >
          subMinutes(new Date(), lookbackMinutes) &&
        tweet.post.author.handle === actorAlias
    );
    if (!latestTweet) {
      return c.json({ message: "No new tweets" });
    }

    const text = latestTweet.post.record.text;

    const results = {
      twitter: "ok" as ProviderResult,
      discord: "ok" as ProviderResult,
      linkedin: "ok" as ProviderResult,
    };

    try {
      await tweetMessage(text);
    } catch (error) {
      results.twitter = reportProviderError("twitter", error);
    }

    try {
      await sendMessageToDiscord(text);
    } catch (error) {
      results.discord = reportProviderError("discord", error);
    }

    try {
      await sendMessageToLinkedin(text);
    } catch (error) {
      results.linkedin = reportProviderError("linkedin", error);
    }

    return c.json({ message: text, results });
  } catch (error) {
    const details = formatError(error);
    console.error(details);

    return c.json(
      { message: "Failed to check Bluesky feed", error: details },
      500
    );
  }
});
