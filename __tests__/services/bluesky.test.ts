// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("axios", () => ({
  default: { get: vi.fn(), post: vi.fn() },
}));

import axios from "axios";
import { sendMessage, getAuthorFeed } from "../../services/bluesky";

const mockedPost = vi.mocked(axios.post);
const mockedGet = vi.mocked(axios.get);

describe("services/bluesky", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.BLUESKY_IDENTIFIER = "frontendarmy.tech";
    process.env.BLUESKY_APP_PASSWORD = "app-pass";
  });

  it("creates a session and posts a record", async () => {
    mockedPost
      .mockResolvedValueOnce({
        data: { did: "did:plc:abc", accessJwt: "jwt-123" },
      })
      .mockResolvedValueOnce({
        data: { uri: "at://did:plc:abc/app.bsky.feed.post/1" },
      });

    const result = await sendMessage("Hola Bluesky");

    expect(mockedPost).toHaveBeenNthCalledWith(
      1,
      "https://bsky.social/xrpc/com.atproto.server.createSession",
      {
        identifier: "frontendarmy.tech",
        password: "app-pass",
      }
    );

    const [url, body, config] = mockedPost.mock.calls[1];
    expect(url).toBe("https://bsky.social/xrpc/com.atproto.repo.createRecord");
    expect(body).toMatchObject({
      repo: "did:plc:abc",
      collection: "app.bsky.feed.post",
      record: {
        $type: "app.bsky.feed.post",
        text: "Hola Bluesky",
      },
    });
    expect((body as any).record.createdAt).toEqual(expect.any(String));
    expect(config?.headers).toEqual({ Authorization: "Bearer jwt-123" });

    expect(result).toEqual({ uri: "at://did:plc:abc/app.bsky.feed.post/1" });
  });

  it("reads the author feed from the public API", async () => {
    mockedGet.mockResolvedValueOnce({ data: { feed: [] } });

    const result = await getAuthorFeed("frontendarmy.tech");

    expect(mockedGet).toHaveBeenCalledWith(
      "https://public.api.bsky.app/xrpc/app.bsky.feed.getAuthorFeed",
      { params: { actor: "frontendarmy.tech" } }
    );
    expect(result).toEqual({ feed: [] });
  });
});
