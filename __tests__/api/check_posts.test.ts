// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../../services/discord", () => ({
  sendMessage: vi.fn().mockResolvedValue({}),
}));
vi.mock("../../services/bluesky", () => ({
  sendMessage: vi.fn().mockResolvedValue({}),
}));
vi.mock("../../services/linkedin", () => ({
  sendMessage: vi.fn().mockResolvedValue({}),
}));
vi.mock("../../services/twitter", () => ({
  getLatestTweets: vi.fn(),
}));

import handler from "../../pages/api/check_posts";
import { getLatestTweets } from "../../services/twitter";
import * as discord from "../../services/discord";
import * as bluesky from "../../services/bluesky";
import * as linkedin from "../../services/linkedin";
import { createMockRequest, createMockResponse } from "./helpers";

const mockedGetLatestTweets = vi.mocked(getLatestTweets);
const mockedDiscord = vi.mocked(discord.sendMessage);
const mockedBluesky = vi.mocked(bluesky.sendMessage);
const mockedLinkedin = vi.mocked(linkedin.sendMessage);

function tweet(text: string, createdAt: string) {
  return { id: "p-1", text, created_at: createdAt };
}

describe("GET /api/check_posts", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("reports when there are no new tweets", async () => {
    mockedGetLatestTweets.mockResolvedValue([]);
    const response = createMockResponse();

    await handler(createMockRequest({ method: "GET" }), response);

    expect(mockedGetLatestTweets).toHaveBeenCalledWith(15);
    expect(mockedBluesky).not.toHaveBeenCalled();
    expect(mockedDiscord).not.toHaveBeenCalled();
    expect(mockedLinkedin).not.toHaveBeenCalled();
    expect(response.json).toHaveBeenCalledWith({ message: "No new tweets" });
  });

  it("cross-posts the latest tweet to bluesky, discord and linkedin", async () => {
    const text = "Nuevo capitulo disponible!";
    mockedGetLatestTweets.mockResolvedValue([
      tweet(text, "2025-06-04T14:55:00.000Z"),
    ]);
    const response = createMockResponse();

    await handler(createMockRequest({ method: "GET" }), response);

    expect(mockedBluesky).toHaveBeenCalledWith(text);
    expect(mockedDiscord).toHaveBeenCalledWith(text);
    expect(mockedLinkedin).toHaveBeenCalledWith(text);

    expect(response.status).toHaveBeenCalledWith(200);
    expect(response.json).toHaveBeenCalledWith({
      message: text,
      results: { bluesky: "ok", discord: "ok", linkedin: "ok" },
    });
  });

  it("cross-posts the most recent tweet when several were sent", async () => {
    mockedGetLatestTweets.mockResolvedValue([
      tweet("viejo", "2025-06-04T14:40:00.000Z"),
      tweet("nuevo", "2025-06-04T14:55:00.000Z"),
    ]);
    const response = createMockResponse();

    await handler(createMockRequest({ method: "GET" }), response);

    expect(mockedBluesky).toHaveBeenCalledWith("nuevo");
    expect(response.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: "nuevo" })
    );
  });

  it("keeps going when one provider fails", async () => {
    const text = "Nuevo capitulo disponible!";
    mockedGetLatestTweets.mockResolvedValue([
      tweet(text, "2025-06-04T14:55:00.000Z"),
    ]);
    mockedDiscord.mockRejectedValueOnce(new Error("discord down"));
    const response = createMockResponse();

    await handler(createMockRequest({ method: "GET" }), response);

    expect(mockedBluesky).toHaveBeenCalledWith(text);
    expect(mockedLinkedin).toHaveBeenCalledWith(text);

    expect(response.status).toHaveBeenCalledWith(200);
    const payload = response.json.mock.calls[0][0];
    expect(payload.message).toBe(text);
    expect(payload.results.bluesky).toBe("ok");
    expect(payload.results.linkedin).toBe("ok");
    expect(payload.results.discord.error).toBe("discord down");
  });

  it("returns 500 when fetching tweets throws", async () => {
    mockedGetLatestTweets.mockRejectedValue(new Error("network error"));
    const response = createMockResponse();

    await handler(createMockRequest({ method: "GET" }), response);

    expect(response.status).toHaveBeenCalledWith(500);
    expect(response.json).toHaveBeenCalledWith(
      expect.objectContaining({
        message: "Failed to check latest tweets",
        error: "network error",
      })
    );
  });
});