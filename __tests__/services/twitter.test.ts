// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("twitter-api-v2", () => ({
  TwitterApi: vi.fn(function () {
    return instance;
  }),
}));

vi.mock("../../services/buffer", () => ({
  getSentPosts: vi.fn(),
}));

import { TwitterApi } from "twitter-api-v2";
import { getSentPosts } from "../../services/buffer";
import { getLatestTweets, sendMessage } from "../../services/twitter";

const instance = {
  v2: {
    tweet: vi.fn().mockResolvedValue({ data: { id: "tweet-1" } }),
  },
};

const mockedTwitterApi = vi.mocked(TwitterApi);
const mockedGetSentPosts = vi.mocked(getSentPosts);

describe("services/twitter", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.CONSUMER_KEY = "consumer-key";
    process.env.CONSUMER_SECRET = "consumer-secret";
    process.env.ACCESS_TOKEN = "access-token";
    process.env.ACCESS_TOKEN_SECRET = "access-token-secret";
    process.env.BUFFER_API_KEY = "buffer-key";
  });

  it("creates an OAuth1 client with the env credentials when publishing", async () => {
    await sendMessage("Hola");

    expect(mockedTwitterApi).toHaveBeenCalledWith({
      appKey: "consumer-key",
      appSecret: "consumer-secret",
      accessToken: "access-token",
      accessSecret: "access-token-secret",
    });
  });

  it("returns the twitter posts sent in the last 15 minutes", async () => {
    mockedGetSentPosts.mockResolvedValueOnce([
      {
        id: "p-1",
        text: "Capitulo 85",
        createdAt: "2026-10-11T13:00:00.000Z",
        dueAt: "2026-10-11T13:00:00.000Z",
        channelId: "684f34030530b816c2112c7d",
      },
    ]);

    const tweets = await getLatestTweets(15);

    expect(mockedGetSentPosts).toHaveBeenCalledTimes(1);
    const [orgId, channelId, since] = mockedGetSentPosts.mock.calls[0];
    expect(orgId).toBe("64ea378b095a1835ebf8b89b");
    expect(channelId).toBe("684f34030530b816c2112c7d");
    expect(since).toEqual(expect.any(String));
    expect(tweets).toEqual([
      {
        id: "p-1",
        text: "Capitulo 85",
        created_at: "2026-10-11T13:00:00.000Z",
      },
    ]);
  });

  it("returns an empty list when there are no sent posts", async () => {
    mockedGetSentPosts.mockResolvedValueOnce([]);

    const tweets = await getLatestTweets();

    expect(tweets).toEqual([]);
  });

  it("publishes a truncated message", async () => {
    const longText = "a".repeat(300);
    await sendMessage(longText);

    expect(instance.v2.tweet).toHaveBeenCalledTimes(1);
    const [published] = instance.v2.tweet.mock.calls[0];
    expect(published.length).toBeLessThanOrEqual(280);
    expect(published.endsWith("…")).toBe(true);
  });
});