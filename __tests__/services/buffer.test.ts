// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("axios", () => ({
  default: { post: vi.fn() },
}));

import axios from "axios";
import {
  getChannels,
  getOrganizations,
  getSentPosts,
} from "../../services/buffer";

const mockedPost = vi.mocked(axios.post);

describe("services/buffer", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.BUFFER_API_KEY = "buffer-key";
  });

  it("fetches the organizations of the account", async () => {
    mockedPost.mockResolvedValueOnce({
      data: {
        data: {
          account: {
            organizations: [{ id: "org-1", name: "Frontend Army" }],
          },
        },
      },
    });

    const result = await getOrganizations();

    expect(mockedPost).toHaveBeenCalledWith(
      "https://api.buffer.com",
      { query: expect.stringContaining("account") },
      { headers: { Authorization: "Bearer buffer-key" } }
    );
    expect(result).toEqual([{ id: "org-1", name: "Frontend Army" }]);
  });

  it("fetches the channels of an organization", async () => {
    mockedPost.mockResolvedValueOnce({
      data: {
        data: {
          channels: [
            { id: "c-1", name: "frontend_army", service: "twitter" },
          ],
        },
      },
    });

    const result = await getChannels("org-1");

    const [url, body] = mockedPost.mock.calls[0];
    expect(url).toBe("https://api.buffer.com");
    expect((body as any).query).toContain('organizationId: "org-1"');
    expect(result).toEqual([
      { id: "c-1", name: "frontend_army", service: "twitter" },
    ]);
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

    const [url, body] = mockedPost.mock.calls[0];
    expect(url).toBe("https://api.buffer.com");
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

    await expect(getOrganizations()).rejects.toThrow("Invalid API key");
  });
});