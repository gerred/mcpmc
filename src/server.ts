import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import { MineflayerBot } from "./core/bot.js";
import { MinecraftToolHandler } from "./handlers/tools.js";
import { MINECRAFT_TOOLS } from "./tools/index.js";
import * as schemas from "./schemas.js";
import { cliSchema } from "./cli.js";

export class MinecraftServer {
  private server: Server;
  private bot: MineflayerBot;
  private toolHandler: MinecraftToolHandler;
  private connectionParams: z.infer<typeof cliSchema>;

  constructor(connectionParams: z.infer<typeof cliSchema>) {
    this.connectionParams = connectionParams;
    this.bot = new MineflayerBot(connectionParams);
    this.toolHandler = new MinecraftToolHandler(this.bot);

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

  private setupHandlers() {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: MINECRAFT_TOOLS,
    }));

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      try {
        if (!request.params.arguments) {
          return {
            content: [
              {
                type: "text",
                text: "Arguments are required",
              },
            ],
            isError: true,
          };
        }

        switch (request.params.name) {
          case "chat": {
            const args = schemas.ChatSchema.parse(request.params.arguments);
            return this.toolHandler.handleChat(args.message);
          }

          case "navigate_to": {
            const args = schemas.NavigateSchema.parse(request.params.arguments);
            return this.toolHandler.handleNavigateTo(args.x, args.y, args.z);
          }

          case "navigate_relative": {
            const args = schemas.NavigateRelativeSchema.parse(
              request.params.arguments
            );
            return this.toolHandler.handleNavigateRelative(
              args.dx,
              args.dy,
              args.dz
            );
          }

          case "dig_block": {
            const args = schemas.DigBlockSchema.parse(request.params.arguments);
            return this.toolHandler.handleDigBlock(args.x, args.y, args.z);
          }

          case "dig_block_relative": {
            const args = schemas.DigBlockRelativeSchema.parse(
              request.params.arguments
            );
            return this.toolHandler.handleDigBlockRelative(
              args.dx,
              args.dy,
              args.dz
            );
          }

          case "dig_area": {
            const args = schemas.DigAreaSchema.parse(request.params.arguments);
            return this.toolHandler.handleDigArea(args.start, args.end);
          }

          case "dig_area_relative": {
            const args = schemas.DigAreaRelativeSchema.parse(
              request.params.arguments
            );
            return this.toolHandler.handleDigAreaRelative(args.start, args.end);
          }

          case "place_block": {
            const args = schemas.PlaceBlockSchema.parse(
              request.params.arguments
            );
            return this.toolHandler.handlePlaceBlock(
              args.x,
              args.y,
              args.z,
              args.blockName
            );
          }

          case "follow_player": {
            const args = schemas.FollowPlayerSchema.parse(
              request.params.arguments
            );
            return this.toolHandler.handleFollowPlayer(
              args.username,
              args.distance
            );
          }

          case "attack_entity": {
            const args = schemas.AttackEntitySchema.parse(
              request.params.arguments
            );
            return this.toolHandler.handleAttackEntity(
              args.entityName,
              args.maxDistance
            );
          }

          case "inspect_block": {
            const args = schemas.InspectBlockSchema.parse(
              request.params.arguments
            );
            return this.toolHandler.handleInspectBlock(
              args.position,
              args.includeState
            );
          }

          case "find_blocks": {
            const args = schemas.FindBlocksSchema.parse(
              request.params.arguments
            );
            return this.toolHandler.handleFindBlocks(
              args.blockTypes,
              args.maxDistance,
              args.maxCount,
              args.constraints
            );
          }

          case "find_entities": {
            const args = schemas.FindEntitiesSchema.parse(
              request.params.arguments
            );
            return this.toolHandler.handleFindEntities(
              args.entityTypes,
              args.maxDistance,
              args.maxCount,
              args.constraints
            );
          }

          case "check_path": {
            const args = schemas.CheckPathSchema.parse(
              request.params.arguments
            );
            return this.toolHandler.handleCheckPath(
              args.destination,
              args.dryRun,
              args.includeObstacles
            );
          }

          default:
            return {
              content: [
                {
                  type: "text",
                  text: `Unknown tool: ${request.params.name}`,
                },
              ],
              isError: true,
            };
        }
      } catch (error) {
        if (error instanceof z.ZodError) {
          return {
            content: [
              {
                type: "text",
                text: `Invalid arguments: ${error.errors
                  .map((e) => `${e.path.join(".")}: ${e.message}`)
                  .join(", ")}`,
              },
            ],
            isError: true,
          };
        }
        return {
          content: [
            {
              type: "text",
              text: `Error: ${
                error instanceof Error ? error.message : String(error)
              }`,
            },
          ],
          isError: true,
        };
      }
    });
  }

  async start(): Promise<void> {
    try {
      await this.bot.connect(
        this.connectionParams.host,
        this.connectionParams.port,
        this.connectionParams.username
      );

      // Send connection status through JSON-RPC
      this.sendJsonRpcNotification("server.status", {
        type: "connection",
        status: "connected",
        host: this.connectionParams.host,
        port: this.connectionParams.port,
      });

      // Then start the MCP server
      const transport = new StdioServerTransport();
      await this.server.connect(transport);

      // Send startup status through JSON-RPC
      this.sendJsonRpcNotification("server.status", {
        type: "startup",
        status: "running",
        transport: "stdio",
      });
    } catch (error) {
      // Send error through JSON-RPC
      this.sendJsonRpcError(-32000, "Server startup failed", {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  private sendJsonRpcNotification(method: string, params: any) {
    process.stdout.write(
      JSON.stringify({
        jsonrpc: "2.0",
        method,
        params,
      }) + "\n"
    );
  }

  private sendJsonRpcError(code: number, message: string, data?: any) {
    process.stdout.write(
      JSON.stringify({
        jsonrpc: "2.0",
        error: {
          code,
          message,
          data,
        },
        id: null,
      }) + "\n"
    );
  }
}
