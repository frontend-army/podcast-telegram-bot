// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../../services/notion", () => ({
  createNotionPage: vi.fn().mockResolvedValue({}),
  episodeDocExists: vi.fn(),
  episodeDocHasTopic: vi.fn(),
  episodeDocQuestionsCount: vi.fn(),
}));

vi.mock("../../services/telegram", () => ({
  sendMessage: vi.fn().mockResolvedValue({ ok: true }),
}));

vi.mock("../../constants/podcast/episodes", () => ({
  getNextEpisode: vi.fn(),
  dateDiffInDays: vi.fn(),
}));

import handler from "../../pages/api/scheduled";
import {
  createNotionPage,
  episodeDocExists,
  episodeDocHasTopic,
  episodeDocQuestionsCount,
} from "../../services/notion";
import { sendMessage } from "../../services/telegram";
import { getNextEpisode, dateDiffInDays } from "../../constants/podcast/episodes";
import { createMockRequest, createMockResponse } from "./helpers";

const mockedCreatePage = vi.mocked(createNotionPage);
const mockedDocExists = vi.mocked(episodeDocExists);
const mockedHasTopic = vi.mocked(episodeDocHasTopic);
const mockedQuestions = vi.mocked(episodeDocQuestionsCount);
const mockedSendMessage = vi.mocked(sendMessage);
const mockedGetNextEpisode = vi.mocked(getNextEpisode);
const mockedDateDiff = vi.mocked(dateDiffInDays);

function setupDays(days: number) {
  mockedGetNextEpisode.mockReturnValue({
    number: 70,
    date: new Date("2025-06-04T15:00:00.000Z"),
  });
  mockedDateDiff.mockReturnValue(days);
}

describe("GET /api/scheduled", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.CHAT_ID = "999";
    mockedCreatePage.mockResolvedValue({});
    mockedSendMessage.mockResolvedValue({ ok: true } as never);
  });

  it("creates the episode doc three weeks ahead when it does not exist", async () => {
    setupDays(21);
    mockedDocExists.mockResolvedValue(false);
    const response = createMockResponse();

    await handler(createMockRequest({ method: "GET" }), response);

    expect(mockedDocExists).toHaveBeenCalledWith(70);
    expect(mockedCreatePage).toHaveBeenCalledWith("Capítulo 70: <A DEFINIR>");
    expect(response.status).toHaveBeenCalledWith(200);
    expect(response.json).toHaveBeenCalledWith({ ok: true });
  });

  it("does not create the doc when it already exists", async () => {
    setupDays(21);
    mockedDocExists.mockResolvedValue(true);
    const response = createMockResponse();

    await handler(createMockRequest({ method: "GET" }), response);

    expect(mockedCreatePage).not.toHaveBeenCalled();
  });

  it("reminds to set the topic two weeks ahead", async () => {
    setupDays(14);
    mockedHasTopic.mockResolvedValue(false);
    const response = createMockResponse();

    await handler(createMockRequest({ method: "GET" }), response);

    expect(mockedHasTopic).toHaveBeenCalledWith(70);
    expect(mockedSendMessage).toHaveBeenCalledWith(
      "999",
      "Reminder: Definir tema para el capítulo 70"
    );
  });

  it("does not remind the topic when it is already defined", async () => {
    setupDays(14);
    mockedHasTopic.mockResolvedValue(true);
    const response = createMockResponse();

    await handler(createMockRequest({ method: "GET" }), response);

    expect(mockedSendMessage).not.toHaveBeenCalled();
  });

  it("reminds to add questions one week ahead when there are none", async () => {
    setupDays(7);
    mockedHasTopic.mockResolvedValue(true);
    mockedQuestions.mockResolvedValue(0);
    const response = createMockResponse();

    await handler(createMockRequest({ method: "GET" }), response);

    expect(mockedQuestions).toHaveBeenCalledWith(70);
    expect(mockedSendMessage).toHaveBeenCalledWith(
      "999",
      "Reminder: Sumar preguntas para el podcast al notion"
    );
  });

  it("reports the current question count when below the minimum", async () => {
    setupDays(7);
    mockedHasTopic.mockResolvedValue(true);
    mockedQuestions.mockResolvedValue(3);
    const response = createMockResponse();

    await handler(createMockRequest({ method: "GET" }), response);

    expect(mockedSendMessage).toHaveBeenCalledWith(
      "999",
      "Reminder: Sumar preguntas para el podcast al notion, por ahora hay 3."
    );
  });

  it("asks for more questions when above the minimum but below the ideal", async () => {
    setupDays(7);
    mockedHasTopic.mockResolvedValue(true);
    mockedQuestions.mockResolvedValue(5);
    const response = createMockResponse();

    await handler(createMockRequest({ method: "GET" }), response);

    expect(mockedSendMessage).toHaveBeenCalledWith(
      "999",
      "Reminder: Ya tenemos 5 preguntas en el notion. ¿Alguno quiere sumar más?"
    );
  });

  it("does not remind questions when there are enough", async () => {
    setupDays(7);
    mockedHasTopic.mockResolvedValue(true);
    mockedQuestions.mockResolvedValue(10);
    const response = createMockResponse();

    await handler(createMockRequest({ method: "GET" }), response);

    expect(mockedSendMessage).not.toHaveBeenCalled();
  });

  it("skips question reminders when the topic is not defined", async () => {
    setupDays(7);
    mockedHasTopic.mockResolvedValue(false);
    const response = createMockResponse();

    await handler(createMockRequest({ method: "GET" }), response);

    expect(mockedQuestions).not.toHaveBeenCalled();
    expect(mockedSendMessage).toHaveBeenCalledWith(
      "999",
      "Reminder: Definir tema para el capítulo 70"
    );
  });
});
