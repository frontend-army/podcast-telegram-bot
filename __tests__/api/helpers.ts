import { vi } from "vitest";
import type { NextApiRequest, NextApiResponse } from "next";

type Mocked<T> = T & {
  status: ReturnType<typeof vi.fn>;
  json: ReturnType<typeof vi.fn>;
  send: ReturnType<typeof vi.fn>;
  setHeader: ReturnType<typeof vi.fn>;
};

export function createMockResponse(): Mocked<NextApiResponse> {
  const res = {
    status: vi.fn(),
    json: vi.fn(),
    send: vi.fn(),
    setHeader: vi.fn(),
  } as unknown as Mocked<NextApiResponse>;

  res.status.mockReturnValue(res);
  res.json.mockReturnValue(res);
  res.send.mockReturnValue(res);
  res.setHeader.mockReturnValue(res);

  return res;
}

export function createMockRequest(
  overrides: Record<string, unknown> = {}
): NextApiRequest {
  return {
    method: "POST",
    body: {},
    query: {},
    headers: {},
    ...overrides,
  } as unknown as NextApiRequest;
}
