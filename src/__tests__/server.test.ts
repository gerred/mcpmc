import { MinecraftServer } from "../server";
import { MinecraftToolHandler } from "../handlers/tools";
import type { MinecraftBot } from "../types/minecraft";

describe("MinecraftServer", () => {
  let server: MinecraftServer;
  let toolHandler: MinecraftToolHandler;
  let mockBot: MinecraftBot;

  beforeEach(() => {
    mockBot = {
      chat: jest.fn(),
      navigateRelative: jest.fn(),
      digBlockRelative: jest.fn(),
      digAreaRelative: jest.fn(),
    } as unknown as MinecraftBot;

    server = new MinecraftServer({
      host: "localhost",
      port: 25565,
      username: "testBot",
    });

    toolHandler = new MinecraftToolHandler(mockBot);
  });

  describe("tool handling", () => {
    it("should handle chat tool", async () => {
      const result = await toolHandler.handleChat("hello");
      expect(result).toBeDefined();
      expect(result.content[0].text).toContain("hello");
      expect(mockBot.chat).toHaveBeenCalledWith("hello");
    });

    it("should handle navigate_relative tool", async () => {
      const result = await toolHandler.handleNavigateRelative(1, 0, 1);
      expect(result).toBeDefined();
      expect(result.content[0].text).toContain("Navigated relative");
      expect(mockBot.navigateRelative).toHaveBeenCalledWith(1, 0, 1, expect.any(Function));
    });

    it("should handle dig_block_relative tool", async () => {
      const result = await toolHandler.handleDigBlockRelative(1, 0, 1);
      expect(result).toBeDefined();
      expect(result.content[0].text).toContain("Dug block relative");
      expect(mockBot.digBlockRelative).toHaveBeenCalledWith(1, 0, 1);
    });

    it("should handle dig_area_relative tool", async () => {
      const result = await toolHandler.handleDigAreaRelative(
        { dx: 0, dy: 0, dz: 0 },
        { dx: 2, dy: 2, dz: 2 }
      );
      expect(result).toBeDefined();
      expect(result.content[0].text).toContain("Successfully completed");
      expect(mockBot.digAreaRelative).toHaveBeenCalledWith(
        { dx: 0, dy: 0, dz: 0 },
        { dx: 2, dy: 2, dz: 2 },
        expect.any(Function)
      );
    });
  });
});
