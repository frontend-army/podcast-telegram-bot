// @vitest-environment node
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

vi.mock("../../services/discord", () => ({
  sendMessage: vi.fn().mockResolvedValue({}),
}));
vi.mock("../../services/twitter", () => ({
  sendMessage: vi.fn().mockResolvedValue({}),
}));
vi.mock("../../services/linkedin", () => ({
  sendMessage: vi.fn().mockResolvedValue({}),
}));
vi.mock("../../services/bluesky", () => ({
  getAuthorFeed: vi.fn(),
}));

import handler from "../../pages/api/check_bluesky";
import { getAuthorFeed } from "../../services/bluesky";
import * as discord from "../../services/discord";
import * as twitter from "../../services/twitter";
import * as linkedin from "../../services/linkedin";
import { createMockRequest, createMockResponse } from "./helpers";

const ACTOR = "frontendarmy.tech";
const NOW = new Date("2025-06-04T15:00:00.000Z");

const mockedGetAuthorFeed = vi.mocked(getAuthorFeed);
const mockedDiscord = vi.mocked(discord.sendMessage);
const mockedTwitter = vi.mocked(twitter.sendMessage);
const mockedLinkedin = vi.mocked(linkedin.sendMessage);

function feedItem(
  text: string,
  createdAt: string,
  handle: string = ACTOR
): unknown {
  return { post: { record: { text, createdAt }, author: { handle } } };
}

describe("GET /api/check_bluesky", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("reports when the account has no posts", async () => {
    mockedGetAuthorFeed.mockResolvedValue({ feed: [] });
    const response = createMockResponse();

    await handler(createMockRequest({ method: "GET" }), response);

    expect(mockedGetAuthorFeed).toHaveBeenCalledWith(ACTOR);
    expect(mockedTwitter).not.toHaveBeenCalled();
    expect(mockedDiscord).not.toHaveBeenCalled();
    expect(mockedLinkedin).not.toHaveBeenCalled();
    expect(response.json).toHaveBeenCalledWith({
      message: "Our account has no tweets",
    });
  });

  it("reports when there are no new posts within the lookback window", async () => {
    mockedGetAuthorFeed.mockResolvedValue({
      feed: [feedItem("viejo", "2025-06-04T14:00:00.000Z")],
    });
    const response = createMockResponse();

    await handler(createMockRequest({ method: "GET" }), response);

    expect(mockedTwitter).not.toHaveBeenCalled();
    expect(response.json).toHaveBeenCalledWith({ message: "No new tweets" });
  });

  it("ignores recent posts from other accounts", async () => {
    mockedGetAuthorFeed.mockResolvedValue({
      feed: [feedItem("ajeno", "2025-06-04T14:55:00.000Z", "otro.bsky.social")],
    });
    const response = createMockResponse();

    await handler(createMockRequest({ method: "GET" }), response);

    expect(mockedTwitter).not.toHaveBeenCalled();
    expect(response.json).toHaveBeenCalledWith({ message: "No new tweets" });
  });

  it("cross-posts a new post to twitter, discord and linkedin", async () => {
    const text = "Nuevo capitulo disponible!";
    mockedGetAuthorFeed.mockResolvedValue({
      feed: [feedItem(text, "2025-06-04T14:55:00.000Z")],
    });
    const response = createMockResponse();

    await handler(createMockRequest({ method: "GET" }), response);

    expect(mockedTwitter).toHaveBeenCalledWith(text);
    expect(mockedDiscord).toHaveBeenCalledWith(text);
    expect(mockedLinkedin).toHaveBeenCalledWith(text);

    expect(response.status).toHaveBeenCalledWith(200);
    expect(response.json).toHaveBeenCalledWith({
      message: text,
      results: { twitter: "ok", discord: "ok", linkedin: "ok" },
    });
  });

  it("keeps going when one provider fails", async () => {
    const text = "Nuevo capitulo disponible!";
    mockedGetAuthorFeed.mockResolvedValue({
      feed: [feedItem(text, "2025-06-04T14:55:00.000Z")],
    });
    mockedDiscord.mockRejectedValueOnce(new Error("discord down"));
    const response = createMockResponse();

    await handler(createMockRequest({ method: "GET" }), response);

    expect(mockedTwitter).toHaveBeenCalledWith(text);
    expect(mockedLinkedin).toHaveBeenCalledWith(text);

    expect(response.status).toHaveBeenCalledWith(200);
    const payload = response.json.mock.calls[0][0];
    expect(payload.message).toBe(text);
    expect(payload.results.twitter).toBe("ok");
    expect(payload.results.linkedin).toBe("ok");
    expect(payload.results.discord.error).toBe("discord down");
  });

  it("returns 500 when fetching the feed throws", async () => {
    mockedGetAuthorFeed.mockRejectedValue(new Error("network error"));
    const response = createMockResponse();

    await handler(createMockRequest({ method: "GET" }), response);

    expect(response.status).toHaveBeenCalledWith(500);
    expect(response.json).toHaveBeenCalledWith(
      expect.objectContaining({
        message: "Failed to check Bluesky feed",
        error: "network error",
      })
    );
  });
});
