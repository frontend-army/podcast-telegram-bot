// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest";

const insert = vi.fn();

vi.mock("@supabase/supabase-js", () => ({
  createClient: vi.fn(() => ({
    from: vi.fn(() => ({ insert })),
  })),
}));

import handler from "../../pages/api/tweet";

describe("POST /api/tweet", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    insert.mockResolvedValue({
      data: [{ id: 1, text: "Hola mundo" }],
      error: null,
    });
  });

  it("inserts the tweet text into the tweets table", async () => {
    const request = {
      method: "POST",
      body: { text: "Hola mundo", date: "2025-06-04" },
    } as never;

    const response = await handler(request);

    expect(insert).toHaveBeenCalledTimes(1);
    const [rows] = insert.mock.calls[0];
    expect(rows).toHaveLength(1);
    expect(rows[0].text).toBe("Hola mundo");
    expect(rows[0].publish_date).toBeInstanceOf(Date);

    expect(response).toBeDefined();
    expect(response!.status).toBe(200);
    await expect(response!.json()).resolves.toEqual({
      data: [{ id: 1, text: "Hola mundo" }],
      error: null,
    });
  });

  it("does not touch the database for non-POST requests", async () => {
    const request = { method: "GET", body: {} } as never;

    const response = await handler(request);

    expect(insert).not.toHaveBeenCalled();
    expect(response).toBeUndefined();
  });
});
