// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../../services/twitter", () => ({
  sendMessage: vi.fn().mockResolvedValue({ data: { id: "tweet-1" } }),
}));

import handler from "../../pages/api/new_episode";
import { sendMessage } from "../../services/twitter";
import { createMockRequest, createMockResponse } from "./helpers";

const mockedSendMessage = vi.mocked(sendMessage);

describe("POST /api/new_episode", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("publishes a formatted message containing the new episode info", async () => {
    const request = createMockRequest({
      body: {
        record: {
          id: 42,
          description: "Una charla sobre testing",
          spotify_url: "https://spotify.com/ep42",
          youtube_url: "https://youtube.com/watch?v=42",
        },
      },
    });
    const response = createMockResponse();

    await handler(request, response);

    expect(mockedSendMessage).toHaveBeenCalledTimes(1);
    const [text] = mockedSendMessage.mock.calls[0];
    expect(text).toContain("Capitulo 42");
    expect(text).toContain("Una charla sobre testing");
    expect(text).toContain("https://spotify.com/ep42");
    expect(text).toContain("https://youtube.com/watch?v=42");
    expect(text).toContain("https://discord.com/invite/pKQ6KdPBj3");

    expect(response.status).toHaveBeenCalledWith(200);
    expect(response.json).toHaveBeenCalledWith({ ok: true });
  });
});
