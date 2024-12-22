import { describe, it, expect, beforeEach } from "@jest/globals";
import { MockMinecraftBot } from "./mocks/mockBot";
import type { MinecraftBot } from "../types/minecraft";

describe("MinecraftBot", () => {
  let bot: MinecraftBot;

  beforeEach(() => {
    bot = new MockMinecraftBot({
      host: "localhost",
      port: 25565,
      username: "testBot",
    });
  });

  describe("connection", () => {
    it("should initialize with default position", () => {
      expect(bot.getPosition()).toMatchObject({ x: 0, y: 64, z: 0 });
    });

    it("should return position after initialization", () => {
      const pos = bot.getPosition();
      expect(pos).toMatchObject({ x: 0, y: 64, z: 0 });
    });

    it("should throw on operations when not connected", () => {
      bot.disconnect();
      expect(() => bot.getHealth()).toThrow("Not connected");
      expect(() => bot.getInventory()).toThrow("Not connected");
      expect(() => bot.getPlayers()).toThrow("Not connected");
    });
  });

  describe("navigation", () => {
    it("should update position after navigation", async () => {
      await bot.navigateTo(100, 64, 100);
      const pos = bot.getPosition();
      expect(pos).toMatchObject({ x: 100, y: 64, z: 100 });
    });

    it("should update position after relative navigation", async () => {
      await bot.navigateRelative(10, 0, 10);
      const pos = bot.getPosition();
      expect(pos).toMatchObject({ x: 10, y: 64, z: 10 });
    });
  });

  describe("game state", () => {
    it("should return health status", () => {
      const health = bot.getHealthStatus();
      expect(health).toMatchObject({
        health: 20,
        food: 20,
        saturation: 5,
        armor: 0,
      });
    });

    it("should return weather status", () => {
      const weather = bot.getWeather();
      expect(weather).toMatchObject({
        isRaining: false,
        rainState: "clear",
        thunderState: 0,
      });
    });
  });
});
