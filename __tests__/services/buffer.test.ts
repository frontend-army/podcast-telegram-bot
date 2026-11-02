// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("axios", () => ({
  default: { post: vi.fn() },
}));

import axios from "axios";
import { getSentPosts } from "../../services/buffer";

const mockedPost = vi.mocked(axios.post);

describe("services/buffer", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.BUFFER_API_KEY = "buffer-key";
  });

  it("fetches sent posts for a channel within a window", async () => {
    mockedPost.mockResolvedValueOnce({
      data: {
        data: {
          posts: {
            edges: [
              {
                node: {
                  id: "p-1",
                  text: "Capitulo 85",
                  createdAt: "2026-10-11T13:00:00.000Z",
                  dueAt: "2026-10-11T13:00:00.000Z",
                  channelId: "c-1",
                },
              },
            ],
          },
        },
      },
    });

    const result = await getSentPosts(
      "org-1",
      "c-1",
      "2026-10-11T16:00:00.000Z"
    );

    const [url, body, config] = mockedPost.mock.calls[0];
    expect(url).toBe("https://api.buffer.com");
    expect(config).toEqual({
      headers: { Authorization: "Bearer buffer-key" },
    });
    expect((body as any).query).toContain('status: [sent]');
    expect((body as any).query).toContain('channelIds: ["c-1"]');
    expect((body as any).query).toContain(
      'dueAt: { start: "2026-10-11T16:00:00.000Z" }'
    );
    expect(result).toEqual([
      {
        id: "p-1",
        text: "Capitulo 85",
        createdAt: "2026-10-11T13:00:00.000Z",
        dueAt: "2026-10-11T13:00:00.000Z",
        channelId: "c-1",
      },
    ]);
  });

  it("throws when the buffer api returns errors", async () => {
    mockedPost.mockResolvedValueOnce({
      data: { errors: [{ message: "Invalid API key" }] },
    });

    await expect(
      getSentPosts("org-1", "c-1", "2026-10-11T16:00:00.000Z")
    ).rejects.toThrow("Invalid API key");
  });
});