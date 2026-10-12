import { NextApiRequest, NextApiResponse } from "next";
import axios from "axios";
import * as discord from "../../services/discord";
import * as bluesky from "../../services/bluesky";
import * as linkedin from "../../services/linkedin";
import { getLatestTweets } from "../../services/twitter";
import { getLookbackMinutes } from "../../constants/podcast/episodes";

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

function toSerializable(value: unknown): unknown {
  try {
    return JSON.parse(JSON.stringify(value));
  } catch {
    return String(value);
  }
}

function serializeError(error: unknown): Record<string, unknown> {
  if (axios.isAxiosError(error)) {
    // Never spread the raw axios error: it holds circular request/response
    // objects that break JSON serialization of the API response.
    return {
      name: error.name,
      message: error.message,
      ...(error.response?.status ? { status: error.response.status } : {}),
      ...(error.response?.data !== undefined
        ? { data: toSerializable(error.response.data) }
        : {}),
    };
  }

  if (error instanceof Error) {
    return { name: error.name, message: error.message };
  }

  return { raw: toSerializable(error) };
}

function reportProviderError(
  provider: "bluesky" | "discord" | "linkedin",
  error: unknown
): ProviderResult {
  const details = formatError(error);
  const exception = serializeError(error);
  console.error(`[${provider}] ${details}`);
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

    // 1. Check if there's a new tweet in the lookback window
    const tweets = await getLatestTweets(lookbackMinutes);
    if (!tweets.length) {
      response.status(200).json({ message: "No new tweets" });
      return;
    }

    const latestTweet = tweets.reduce((newest, tweet) =>
      tweet.created_at > newest.created_at ? tweet : newest
    );
    const text = latestTweet.text;

    const results = {
      bluesky: "ok" as ProviderResult,
      discord: "ok" as ProviderResult,
      linkedin: "ok" as ProviderResult,
    };

    // Try each provider independently so one failure does not crash the endpoint.
    try {
      await bluesky.sendMessage(text);
    } catch (error) {
      results.bluesky = reportProviderError("bluesky", error);
    }

    try {
      await discord.sendMessage(text);
    } catch (error) {
      results.discord = reportProviderError("discord", error);
    }

    try {
      await linkedin.sendMessage(text);
    } catch (error) {
      results.linkedin = reportProviderError("linkedin", error);
    }

    response.status(200).json({ message: text, results });
  } catch (error) {
    const details = formatError(error);
    console.error(details);

    response
      .status(500)
      .json({ message: "Failed to check latest tweets", error: details });
  }
}