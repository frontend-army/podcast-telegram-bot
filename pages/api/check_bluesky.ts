import { NextApiRequest, NextApiResponse } from "next";
import axios from "axios";
import { subMinutes } from "date-fns/subMinutes";
import * as Sentry from "@sentry/nextjs";
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
  error: unknown,
  context: { lookbackMinutes: number; actorAlias: string; textLength: number }
): ProviderResult {
  const details = formatError(error);
  const exception = serializeError(error);

  Sentry.withScope(scope => {
    scope.setTag("operation", "check_bluesky");
    scope.setTag("provider", provider);
    scope.setLevel("error");
    scope.setContext("check_bluesky", {
      details,
      exception,
      lookbackMinutes: context.lookbackMinutes,
      actorAlias: context.actorAlias,
      textLength: context.textLength,
    });

    Sentry.captureException(error instanceof Error ? error : new Error(details));
  });

  return { error: details, exception };
}

export default async function handler(
  request: NextApiRequest,
  response: NextApiResponse
) {
  try {
    const lookbackMinutes = getLookbackMinutes(
      request.query.lookbackMinutes ?? request.query.minutes
    );

    // 1. Check if there's a new tweet from @bluesky
    const data = await getAuthorFeed(actorAlias);
    const { feed } = data;
    if (!feed.length) {
      response.status(200).json({ message: "Our account has no tweets" });
      return;
    }

    const latestTweet = feed.find(
      tweet =>
        new Date(tweet.post.record.createdAt) >
          subMinutes(new Date(), lookbackMinutes) &&
        tweet.post.author.handle === actorAlias
    );
    if (!latestTweet) {
      response.status(200).json({ message: "No new tweets" });
      return;
    }

    const text = latestTweet.post.record.text;
    const providerContext = {
      lookbackMinutes,
      actorAlias,
      textLength: text.length,
    };

    const results: { twitter: ProviderResult; discord: ProviderResult; linkedin: ProviderResult } = {
      twitter: "ok",
      discord: "ok",
      linkedin: "ok",
    };

    // Try each provider independently so one failure does not crash the endpoint.
    try {
      await tweetMessage(text);
    } catch (error) {
      results.twitter = reportProviderError("twitter", error, providerContext);
    }

    try {
      await sendMessageToDiscord(text);
    } catch (error) {
      results.discord = reportProviderError("discord", error, providerContext);
    }

    try {
      await sendMessageToLinkedin(text);
    } catch (error) {
      results.linkedin = reportProviderError("linkedin", error, providerContext);
    }

    response.status(200).json({ message: text, results });
  } catch (error) {
    const details = formatError(error);
    Sentry.captureException(error instanceof Error ? error : new Error(details));

    response
      .status(500)
      .json({ message: "Failed to check Bluesky feed", error: details });
  }
}
