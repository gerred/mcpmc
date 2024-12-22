import { jest } from "@jest/globals";

// Make jest available globally
(global as any).jest = jest;

jest.mock("mineflayer", () => ({
  createBot: jest.fn(),
}));
