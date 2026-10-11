// @vitest-environment node
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

vi.mock("../../services/twitter", () => ({
  sendMessage: vi.fn().mockResolvedValue({}),
}));

import handler from "../../pages/api/check_live";
import { sendMessage } from "../../services/twitter";
import { createMockRequest, createMockResponse } from "./helpers";

const mockedSendMessage = vi.mocked(sendMessage);
const fetchMock = vi.fn();

function jsonResponse(payload: unknown) {
  return { json: () => Promise.resolve(payload) } as Response;
}

describe("POST /api/check_live", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("announces the stream when the channel is live", async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse({ access_token: "token-123" }))
      .mockResolvedValueOnce(jsonResponse({ data: [{ title: "Stream de hoy" }] }));
    const response = createMockResponse();

    await handler(createMockRequest({ body: {} }), response);

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(mockedSendMessage).toHaveBeenCalledTimes(1);
    const [text] = mockedSendMessage.mock.calls[0];
    expect(text).toContain("ESTAMOS LIVE");
    expect(text).toContain("Stream de hoy");
    expect(response.status).toHaveBeenCalledWith(200);
  });

  it("does not announce when the channel is offline", async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse({ access_token: "token-123" }))
      .mockResolvedValueOnce(jsonResponse({ data: [] }));
    const response = createMockResponse();

    await handler(createMockRequest({ body: {} }), response);

    expect(mockedSendMessage).not.toHaveBeenCalled();
    expect(response.status).toHaveBeenCalledWith(200);
  });

  it("answers the Twitch webhook verification challenge", async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse({ access_token: "token-123" }))
      .mockResolvedValueOnce(jsonResponse({ data: [] }));
    const response = createMockResponse();

    await handler(
      createMockRequest({
        body: { challenge: "challenge-abc" },
        headers: { "twitch-eventsub-message-type": "webhook_callback_verification" },
      }),
      response
    );

    expect(response.setHeader).toHaveBeenCalledWith("Content-Type", "text/plain");
    expect(response.status).toHaveBeenCalledWith(200);
    expect(response.send).toHaveBeenCalledWith("challenge-abc");
  });
});
