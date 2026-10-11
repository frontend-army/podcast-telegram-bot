// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest";

let selectResult: { data: unknown[]; error: { message: string } | null } = {
  data: [],
  error: null,
};

const filter = vi.fn(() => Promise.resolve(selectResult));
const match = vi.fn(() => Promise.resolve({ error: null }));

vi.mock("@supabase/supabase-js", () => ({
  createClient: vi.fn(() => ({
    from: vi.fn(() => ({
      select: vi.fn(() => ({ filter })),
      delete: vi.fn(() => ({ match })),
    })),
  })),
}));

vi.mock("../../services/twitter", () => ({
  sendMessage: vi.fn().mockResolvedValue({ data: { id: "tweet-1" } }),
}));

import handler from "../../pages/api/check_tweets";
import { sendMessage } from "../../services/twitter";
import { createMockRequest, createMockResponse } from "./helpers";

const mockedSendMessage = vi.mocked(sendMessage);

describe("GET /api/check_tweets", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    selectResult = { data: [], error: null };
  });

  it("publishes every due tweet and deletes it from the queue", async () => {
    selectResult = {
      data: [
        { id: 1, text: "primer tweet" },
        { id: 2, text: "segundo tweet" },
      ],
      error: null,
    };
    const response = createMockResponse();

    await handler(createMockRequest({ method: "GET" }), response);

    expect(mockedSendMessage).toHaveBeenCalledTimes(2);
    expect(mockedSendMessage).toHaveBeenNthCalledWith(1, "primer tweet");
    expect(mockedSendMessage).toHaveBeenNthCalledWith(2, "segundo tweet");

    expect(match).toHaveBeenCalledTimes(2);
    expect(match).toHaveBeenNthCalledWith(1, { id: 1 });
    expect(match).toHaveBeenNthCalledWith(2, { id: 2 });

    expect(response.status).toHaveBeenCalledWith(200);
    expect(response.json).toHaveBeenCalledWith({ message: "2 Tweets sent" });
  });

  it("returns 500 when the query fails", async () => {
    selectResult = { data: [], error: { message: "boom" } };
    const response = createMockResponse();

    await handler(createMockRequest({ method: "GET" }), response);

    expect(mockedSendMessage).not.toHaveBeenCalled();
    expect(response.status).toHaveBeenCalledWith(500);
    expect(response.json).toHaveBeenCalledWith({ error: "boom" });
  });

  it("reports zero tweets when the queue is empty", async () => {
    const response = createMockResponse();

    await handler(createMockRequest({ method: "GET" }), response);

    expect(mockedSendMessage).not.toHaveBeenCalled();
    expect(match).not.toHaveBeenCalled();
    expect(response.json).toHaveBeenCalledWith({ message: "0 Tweets sent" });
  });
});
