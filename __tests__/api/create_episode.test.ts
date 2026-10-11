// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../../services/notion", () => ({
  updateEpisodeDoc: vi.fn().mockResolvedValue({}),
  getEpisodeDoc: vi.fn(),
}));

vi.mock("../../services/telegram", () => ({
  sendMessage: vi.fn(),
  pinMessage: vi.fn().mockResolvedValue({ ok: true }),
  unpinMessage: vi.fn().mockResolvedValue({ ok: true }),
}));

vi.mock("../../constants/podcast/episodes", () => ({
  getNextEpisode: vi.fn(),
  dateDiffInDays: vi.fn(),
}));

import handler from "../../pages/api/create_episode";
import { updateEpisodeDoc, getEpisodeDoc } from "../../services/notion";
import { sendMessage, pinMessage, unpinMessage } from "../../services/telegram";
import { getNextEpisode, dateDiffInDays } from "../../constants/podcast/episodes";
import { createMockResponse } from "./helpers";

const mockedUpdate = vi.mocked(updateEpisodeDoc);
const mockedGetDoc = vi.mocked(getEpisodeDoc);
const mockedSendMessage = vi.mocked(sendMessage);
const mockedPin = vi.mocked(pinMessage);
const mockedUnpin = vi.mocked(unpinMessage);
const mockedGetNextEpisode = vi.mocked(getNextEpisode);
const mockedDateDiff = vi.mocked(dateDiffInDays);

function telegramRequest(text: string, chatId = 999) {
  return {
    method: "POST",
    body: {
      message: {
        date: Date.now(),
        chat: {
          id: chatId,
          type: "group",
          first_name: "Fran",
          last_name: "P",
          username: "fran",
        },
        message_id: 10,
        from: { id: 1, first_name: "Fran", last_name: "P", username: "fran" },
        text,
      },
    },
  } as never;
}

function setupEpisode() {
  mockedGetNextEpisode.mockReturnValue({
    number: 70,
    date: new Date("2025-06-04T15:00:00.000Z"),
  });
}

describe("POST /api/create_episode", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.CHAT_ID = "999";
    mockedSendMessage.mockResolvedValue({
      ok: true,
      result: { message_id: 555 },
    } as never);
    mockedUpdate.mockResolvedValue({} as never);
    mockedUnpin.mockResolvedValue({ ok: true } as never);
    mockedPin.mockResolvedValue({ ok: true } as never);
  });

  it("ignores messages that are not the set-topic command", async () => {
    const response = createMockResponse();

    await handler(telegramRequest("hola equipo"), response);

    expect(mockedSendMessage).not.toHaveBeenCalled();
    expect(mockedGetDoc).not.toHaveBeenCalled();
    expect(response.status).toHaveBeenCalledWith(200);
    expect(response.json).toHaveBeenCalledWith({ ok: true });
  });

  it("refuses the command when it comes from another chat", async () => {
    const response = createMockResponse();

    await handler(telegramRequest("/definir_tema Tema;Desc", 111), response);

    expect(mockedSendMessage).toHaveBeenCalledWith(
      "111",
      "Solo respondo a comandos en el grupo."
    );
    expect(mockedGetDoc).not.toHaveBeenCalled();
  });

  it("asks for a topic when the command has none", async () => {
    const response = createMockResponse();

    await handler(telegramRequest("/definir_tema"), response);

    expect(mockedSendMessage).toHaveBeenCalledWith(
      "999",
      "Agregá el tema después del comando"
    );
    expect(mockedGetDoc).not.toHaveBeenCalled();
  });

  it("warns when the episode doc does not exist yet", async () => {
    setupEpisode();
    mockedDateDiff.mockReturnValue(5);
    mockedGetDoc.mockResolvedValue({ results: [] } as never);
    const response = createMockResponse();

    await handler(telegramRequest("/definir_tema Tema;Desc"), response);

    expect(mockedGetDoc).toHaveBeenCalledWith(70);
    expect(mockedSendMessage).toHaveBeenCalledWith(
      "999",
      "Bancá que todavía ni creé el doc."
    );
    expect(mockedUpdate).not.toHaveBeenCalled();
  });

  it("updates the doc, pins the new message and unpins the old one", async () => {
    setupEpisode();
    mockedDateDiff.mockReturnValue(5);
    mockedGetDoc.mockResolvedValue({
      results: [
        {
          id: "page-1",
          url: "https://notion.so/page-1",
          properties: { telegram_message_id: { id: "prop-1", number: 321 } },
        },
      ],
    } as never);
    const response = createMockResponse();

    await handler(
      telegramRequest("/definir_tema Testing en producción;Charla sobre testing"),
      response
    );

    expect(mockedSendMessage).toHaveBeenCalledWith(
      "999",
      "Capítulo 70: Testing en producción https://notion.so/page-1"
    );
    expect(mockedUpdate).toHaveBeenCalledWith(
      "page-1",
      "Capítulo 70: Testing en producción",
      "prop-1",
      555
    );
    expect(mockedUnpin).toHaveBeenCalledWith("999", 321);
    expect(mockedPin).toHaveBeenCalledWith("999", 555);
    expect(response.json).toHaveBeenCalledWith({ ok: true });
  });
});
