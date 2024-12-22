import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
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
        },
      }
    );

    this.setupHandlers();
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
      navigateTo: async (x: number, y: number, z: number) => {
        const goal = new goals.GoalNear(x, y, z, 1);
        await bot.pathfinder.goto(goal);
      },
      digBlock: async (x: number, y: number, z: number) => {
        const block = bot.blockAt(new Vec3(x, y, z));
        if (!block) throw new Error("No block at position");
        await bot.dig(block);
      },
      digArea: async (start, end) => {
        // Implement area digging logic
      },
      // ... implement remaining MinecraftBot methods ...
    } as MinecraftBot; // Type assertion since we're not implementing all methods yet

    this.toolHandler = new MinecraftToolHandler(wrapper);

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
          // ... rest of the tool handlers ...
          default:
            throw new Error(`Unknown tool: ${request.params.name}`);
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
