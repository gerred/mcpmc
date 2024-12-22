import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ReadResourceRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import { createBot } from "mineflayer";
import type { Bot } from "mineflayer";
import { pathfinder, goals, Movements } from "mineflayer-pathfinder";
import type { Pathfinder } from "mineflayer-pathfinder";
import { Vec3 } from "vec3";
import { MinecraftToolHandler } from "./handlers/tools.js";
import { MINECRAFT_TOOLS } from "./tools/index.js";
import * as schemas from "./schemas.js";
import { cliSchema } from "./cli.js";
import type { MinecraftBot } from "./types/minecraft.js";
import { MinecraftResourceHandler } from "./handlers/resources.js";
import type { ResourceHandler } from "./handlers/resources.js";
import type { ResourceResponse } from "./handlers/resources.js";

const MINECRAFT_RESOURCES = [
  {
    name: "players",
    uri: "minecraft://players",
    description:
      "List of players currently on the server, including their usernames and connection info",
    mimeType: "application/json",
  },
  {
    name: "position",
    uri: "minecraft://position",
    description:
      "Current position of the bot in the world (x, y, z coordinates)",
    mimeType: "application/json",
  },
  {
    name: "blocks/nearby",
    uri: "minecraft://blocks/nearby",
    description:
      "List of blocks in the bot's vicinity, including their positions and types",
    mimeType: "application/json",
  },
  {
    name: "entities/nearby",
    uri: "minecraft://entities/nearby",
    description:
      "List of entities (players, mobs, items) near the bot, including their positions and types",
    mimeType: "application/json",
  },
  {
    name: "inventory",
    uri: "minecraft://inventory",
    description:
      "Current contents of the bot's inventory, including item names, counts, and slots",
    mimeType: "application/json",
  },
  {
    name: "health",
    uri: "minecraft://health",
    description: "Bot's current health, food, saturation, and armor status",
    mimeType: "application/json",
  },
  {
    name: "weather",
    uri: "minecraft://weather",
    description:
      "Current weather conditions in the game (clear, raining, thundering)",
    mimeType: "application/json",
  },
];

interface ExtendedBot extends Bot {
  pathfinder: Pathfinder & {
    setMovements(movements: Movements): void;
    goto(goal: goals.Goal): Promise<void>;
  };
}

export class MinecraftServer {
  private server: Server;
  private bot: ExtendedBot | null = null;
  private toolHandler!: MinecraftToolHandler;
  private resourceHandler!: MinecraftResourceHandler;
  private connectionParams: z.infer<typeof cliSchema>;
  private isConnected: boolean = false;
  private reconnectAttempts: number = 0;
  private readonly maxReconnectAttempts: number = 3;
  private readonly reconnectDelay: number = 5000; // 5 seconds

  constructor(connectionParams: z.infer<typeof cliSchema>) {
    this.connectionParams = connectionParams;
    this.server = new Server(
      {
        name: "mineflayer-mcp-server",
        version: "0.1.0",
      },
      {
        capabilities: {
          tools: {
            enabled: true,
          },
          resources: {
            enabled: true,
          },
        },
      }
    );

    this.setupHandlers();
  }

  private sendJsonRpcNotification(method: string, params: any) {
    this.server
      .notification({
        method,
        params,
      })
      .catch((error) => {
        console.error("Failed to send notification:", error);
      });
  }

  private async connectBot(): Promise<void> {
    if (this.bot) {
      this.bot.end();
      this.bot = null;
    }

    const bot = createBot({
      host: this.connectionParams.host,
      port: this.connectionParams.port,
      username: this.connectionParams.username,
      hideErrors: false,
    }) as ExtendedBot;

    bot.loadPlugin(pathfinder);
    this.bot = bot;

    // Create a wrapper that implements MinecraftBot interface
    const wrapper: MinecraftBot = {
      chat: (message: string) => bot.chat(message),
      disconnect: () => bot.end(),
      getPosition: () => {
        const pos = bot.entity?.position;
        return pos ? { x: pos.x, y: pos.y, z: pos.z } : null;
      },
      getHealth: () => bot.health,
      getInventory: () =>
        bot.inventory.items().map((item) => ({
          name: item.name,
          count: item.count,
          slot: item.slot,
        })),
      getPlayers: () =>
        Object.values(bot.players).map((player) => ({
          username: player.username,
          uuid: player.uuid,
          ping: player.ping,
        })),
      navigateTo: async (
        x: number,
        y: number,
        z: number,
        progressCallback?: (progress: number) => void
      ) => {
        const goal = new goals.GoalNear(x, y, z, 1);
        const startPos = bot.entity.position;
        const targetPos = new Vec3(x, y, z);
        const totalDistance = startPos.distanceTo(targetPos);

        // Set up progress monitoring
        const progressToken = Date.now().toString();
        const checkProgress = () => {
          if (!bot) return;
          const currentPos = bot.entity.position;
          const remainingDistance = currentPos.distanceTo(targetPos);
          const progress = Math.min(
            100,
            ((totalDistance - remainingDistance) / totalDistance) * 100
          );

          if (progressCallback) {
            progressCallback(progress);
          }

          this.sendJsonRpcNotification("tool/progress", {
            token: progressToken,
            progress,
            status: progress < 100 ? "in_progress" : "complete",
            message: `Navigation progress: ${Math.round(progress)}%`,
          });
        };

        const progressInterval = setInterval(checkProgress, 500);

        try {
          await bot.pathfinder.goto(goal);
        } finally {
          clearInterval(progressInterval);
          // Send final progress
          if (progressCallback) {
            progressCallback(100);
          }
          this.sendJsonRpcNotification("tool/progress", {
            token: progressToken,
            progress: 100,
            status: "complete",
            message: "Navigation complete",
          });
        }
      },
      navigateRelative: async (
        dx: number,
        dy: number,
        dz: number,
        progressCallback?: (progress: number) => void
      ) => {
        const pos = bot.entity.position;
        const yaw = bot.entity.yaw;
        const sin = Math.sin(yaw);
        const cos = Math.cos(yaw);
        const worldDx = dx * cos - dz * sin;
        const worldDz = dx * sin + dz * cos;

        await wrapper.navigateTo(
          pos.x + worldDx,
          pos.y + dy,
          pos.z + worldDz,
          progressCallback
        );
      },
      digBlock: async (x: number, y: number, z: number) => {
        const block = bot.blockAt(new Vec3(x, y, z));
        if (!block) throw new Error("No block at position");
        await bot.dig(block);
      },
      digBlockRelative: async (dx: number, dy: number, dz: number) => {
        const pos = bot.entity.position;
        const yaw = bot.entity.yaw;
        const sin = Math.sin(yaw);
        const cos = Math.cos(yaw);
        const worldDx = dx * cos - dz * sin;
        const worldDz = dx * sin + dz * cos;
        const block = bot.blockAt(
          new Vec3(
            Math.floor(pos.x + worldDx),
            Math.floor(pos.y + dy),
            Math.floor(pos.z + worldDz)
          )
        );
        if (!block) throw new Error("No block at relative position");
        await bot.dig(block);
      },
      digArea: async (start, end, progressCallback) => {
        // Implement area digging logic
        const minX = Math.min(start.x, end.x);
        const maxX = Math.max(start.x, end.x);
        const minY = Math.min(start.y, end.y);
        const maxY = Math.max(start.y, end.y);
        const minZ = Math.min(start.z, end.z);
        const maxZ = Math.max(start.z, end.z);

        const totalBlocks =
          (maxX - minX + 1) * (maxY - minY + 1) * (maxZ - minZ + 1);
        let blocksDug = 0;

        for (let y = maxY; y >= minY; y--) {
          for (let x = minX; x <= maxX; x++) {
            for (let z = minZ; z <= maxZ; z++) {
              const block = bot.blockAt(new Vec3(x, y, z));
              if (block && block.name !== "air") {
                await bot.dig(block);
                blocksDug++;
                if (progressCallback) {
                  progressCallback(
                    (blocksDug / totalBlocks) * 100,
                    blocksDug,
                    totalBlocks
                  );
                }
              }
            }
          }
        }
      },
      digAreaRelative: async (start, end, progressCallback) => {
        const pos = bot.entity.position;
        const yaw = bot.entity.yaw;
        const sin = Math.sin(yaw);
        const cos = Math.cos(yaw);

        const transformPoint = (dx: number, dy: number, dz: number) => ({
          x: Math.floor(pos.x + dx * cos - dz * sin),
          y: Math.floor(pos.y + dy),
          z: Math.floor(pos.z + dx * sin + dz * cos),
        });

        const absStart = transformPoint(start.dx, start.dy, start.dz);
        const absEnd = transformPoint(end.dx, end.dy, end.dz);

        await wrapper.digArea(absStart, absEnd, progressCallback);
      },
      getBlocksNearby: () => {
        const pos = bot.entity.position;
        const radius = 4;
        const blocks = [];

        for (let x = -radius; x <= radius; x++) {
          for (let y = -radius; y <= radius; y++) {
            for (let z = -radius; z <= radius; z++) {
              const block = bot.blockAt(
                new Vec3(
                  Math.floor(pos.x + x),
                  Math.floor(pos.y + y),
                  Math.floor(pos.z + z)
                )
              );
              if (block && block.name !== "air") {
                blocks.push({
                  name: block.name,
                  position: {
                    x: Math.floor(pos.x + x),
                    y: Math.floor(pos.y + y),
                    z: Math.floor(pos.z + z),
                  },
                });
              }
            }
          }
        }
        return blocks;
      },
      getEntitiesNearby: () => {
        return Object.values(bot.entities)
          .filter((e) => e !== bot.entity && e.position)
          .map((e) => ({
            name: e.name || "unknown",
            type: e.type,
            position: {
              x: e.position.x,
              y: e.position.y,
              z: e.position.z,
            },
            velocity: e.velocity,
            health: e.health,
          }));
      },
      getWeather: () => ({
        isRaining: bot.isRaining,
        rainState: bot.isRaining ? "raining" : "clear",
        thunderState: bot.thunderState,
      }),
    } as MinecraftBot;

    this.toolHandler = new MinecraftToolHandler(wrapper);
    this.resourceHandler = new MinecraftResourceHandler(wrapper);

    return new Promise((resolve, reject) => {
      if (!this.bot) return reject(new Error("Bot not initialized"));

      this.bot.once("spawn", () => {
        this.isConnected = true;
        this.reconnectAttempts = 0;
        resolve();
      });

      this.bot.on("end", async () => {
        this.isConnected = false;
        try {
          await this.server.notification({
            method: "server/status",
            params: {
              type: "connection",
              status: "disconnected",
              host: this.connectionParams.host,
              port: this.connectionParams.port,
            },
          });

          if (this.reconnectAttempts < this.maxReconnectAttempts) {
            this.reconnectAttempts++;
            await new Promise((resolve) =>
              setTimeout(resolve, this.reconnectDelay)
            );
            await this.connectBot();
          }
        } catch (error) {
          console.error("Failed to handle disconnection:", error);
        }
      });

      this.bot.on("error", async (error) => {
        try {
          await this.server.notification({
            method: "server/status",
            params: {
              type: "error",
              error: error instanceof Error ? error.message : String(error),
            },
          });
        } catch (notificationError) {
          console.error(
            "Failed to send error notification:",
            notificationError
          );
        }
      });
    });
  }

  private setupHandlers() {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: MINECRAFT_TOOLS,
    }));

    this.server.setRequestHandler(
      ReadResourceRequestSchema,
      async (request) => {
        try {
          if (!this.bot || !this.isConnected) {
            throw new Error("Bot is not connected");
          }

          const { uri } = request.params;
          let result: ResourceResponse;

          switch (uri) {
            case "minecraft://players":
              result = await this.resourceHandler.handleGetPlayers(uri);
              break;
            case "minecraft://position":
              result = await this.resourceHandler.handleGetPosition(uri);
              break;
            case "minecraft://blocks/nearby":
              result = await this.resourceHandler.handleGetBlocksNearby(uri);
              break;
            case "minecraft://entities/nearby":
              result = await this.resourceHandler.handleGetEntitiesNearby(uri);
              break;
            case "minecraft://inventory":
              result = await this.resourceHandler.handleGetInventory(uri);
              break;
            case "minecraft://health":
              result = await this.resourceHandler.handleGetHealth(uri);
              break;
            case "minecraft://weather":
              result = await this.resourceHandler.handleGetWeather(uri);
              break;
            default:
              throw new Error(`Resource not found: ${uri}`);
          }

          return {
            contents: result.contents.map((content) => ({
              uri: content.uri,
              mimeType: content.mimeType || "application/json",
              text:
                typeof content.text === "string"
                  ? content.text
                  : JSON.stringify(content.text),
            })),
          };
        } catch (error) {
          throw {
            code: -32603,
            message: error instanceof Error ? error.message : String(error),
          };
        }
      }
    );

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      try {
        if (!request.params.arguments) {
          throw new Error("Arguments are required");
        }

        if (!this.bot || !this.isConnected) {
          throw new Error("Bot is not connected");
        }

        let result;
        switch (request.params.name) {
          case "chat": {
            const args = schemas.ChatSchema.parse(request.params.arguments);
            result = await this.toolHandler.handleChat(args.message);
            break;
          }
          case "navigate_relative": {
            const args = schemas.NavigateRelativeSchema.parse(
              request.params.arguments
            );
            result = await this.toolHandler.handleNavigateRelative(
              args.dx,
              args.dy,
              args.dz
            );
            break;
          }
          case "dig_block_relative": {
            const args = schemas.DigBlockRelativeSchema.parse(
              request.params.arguments
            );
            result = await this.toolHandler.handleDigBlockRelative(
              args.dx,
              args.dy,
              args.dz
            );
            break;
          }
          case "dig_area_relative": {
            const args = schemas.DigAreaRelativeSchema.parse(
              request.params.arguments
            );
            result = await this.toolHandler.handleDigAreaRelative(
              args.start,
              args.end
            );
            break;
          }
          default:
            throw {
              code: -32601,
              message: `Unknown tool: ${request.params.name}`,
            };
        }

        return {
          content: result?.content || [{ type: "text", text: "Success" }],
          _meta: result?._meta,
        };
      } catch (error) {
        if (error instanceof z.ZodError) {
          throw {
            code: -32602,
            message: "Invalid params",
            data: {
              errors: error.errors.map((e) => ({
                path: e.path.join("."),
                message: e.message,
              })),
            },
          };
        }
        throw {
          code: -32603,
          message: error instanceof Error ? error.message : String(error),
        };
      }
    });
  }

  async start(): Promise<void> {
    try {
      // Start MCP server first
      const transport = new StdioServerTransport();
      await this.server.connect(transport);

      // Send startup status
      await this.server.notification({
        method: "server/status",
        params: {
          type: "startup",
          status: "running",
          transport: "stdio",
        },
      });

      // Then connect bot
      await this.connectBot();

      // Keep process alive and handle termination
      process.stdin.resume();
      process.on("SIGINT", () => {
        this.bot?.end();
        process.exit(0);
      });
      process.on("SIGTERM", () => {
        this.bot?.end();
        process.exit(0);
      });
    } catch (error) {
      throw {
        code: -32000,
        message: "Server startup failed",
        data: {
          error: error instanceof Error ? error.message : String(error),
        },
      };
    }
  }
}
