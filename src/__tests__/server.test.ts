import { describe, it, expect, beforeEach } from "@jest/globals";
import { MockMinecraftBot } from "./mocks/mockBot";
import { MinecraftServer } from "../core/server";
import type { ToolHandler } from "../handlers/tools";
import type { ResourceHandler } from "../handlers/resources";

describe("MinecraftServer", () => {
  let mockBot: MockMinecraftBot;
  let server: MinecraftServer;
  let toolHandler: ToolHandler;
  let resourceHandler: ResourceHandler;

  beforeEach(() => {
    mockBot = new MockMinecraftBot({
      host: "localhost",
      port: 25565,
      username: "testBot",
    });
    server = new MinecraftServer(mockBot);
    toolHandler = (server as any).toolHandler;
    resourceHandler = (server as any).resourceHandler;
  });

  describe("tool handling", () => {
    it("should handle chat message", async () => {
      const response = await toolHandler.handleChat("Hello, world!");

      expect(response.content[0].text).toContain("Sent message: Hello, world!");
    });

    it("should handle navigation request", async () => {
      const response = await toolHandler.handleNavigateTo(100, 64, 100);

      expect(response.content[0].text).toContain("Navigated to 100, 64, 100");
      expect(mockBot.getPosition()).toEqual({ x: 100, y: 64, z: 100 });
    });

    it("should handle relative navigation request", async () => {
      const response = await toolHandler.handleNavigateRelative(10, 0, 10);

      expect(response.content[0].text).toContain(
        "Navigated relative to current position"
      );
      expect(mockBot.getPosition()).toEqual({ x: 10, y: 64, z: 10 });
    });
  });

  describe("resource handling", () => {
    it("should handle position resource request", async () => {
      const response = await resourceHandler.handleGetPosition(
        "minecraft://position"
      );

      const position = JSON.parse(response.contents[0].text);
      expect(position).toEqual({ x: 0, y: 64, z: 0 });
    });

    it("should handle health resource request", async () => {
      const response = await resourceHandler.handleGetHealth(
        "minecraft://health"
      );

      const health = JSON.parse(response.contents[0].text);
      expect(health).toEqual({
        health: 20,
        food: 20,
        saturation: 5,
        armor: 0,
      });
    });

    it("should handle weather resource request", async () => {
      const response = await resourceHandler.handleGetWeather(
        "minecraft://weather"
      );

      const weather = JSON.parse(response.contents[0].text);
      expect(weather).toEqual({
        isRaining: false,
        rainState: "clear",
        thunderState: 0,
      });
    });

    it("should handle inventory resource request", async () => {
      const response = await resourceHandler.handleGetInventory(
        "minecraft://inventory"
      );

      const inventory = JSON.parse(response.contents[0].text);
      expect(Array.isArray(inventory)).toBe(true);
      expect(inventory).toEqual([]);
    });
  });
});
