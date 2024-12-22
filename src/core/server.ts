import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import type {
  Request,
  Result,
  Notification,
  Tool,
} from "@modelcontextprotocol/sdk/types.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { MineflayerBot } from "./bot";
import type { MinecraftBot } from "../types/minecraft";
import { MinecraftToolHandler } from "../handlers/tools";
import type { ToolHandler } from "../handlers/tools";
import { MinecraftResourceHandler } from "../handlers/resources";
import type { ResourceHandler } from "../handlers/resources";
import type { ResourceResponse as HandlerResourceResponse } from "../handlers/resources";
import { z } from "zod";

const NavigateParams = z.object({
  x: z.number(),
  y: z.number(),
  z: z.number(),
});

const ChatParams = z.object({
  message: z.string(),
});

const DigBlockParams = z.object({
  x: z.number(),
  y: z.number(),
  z: z.number(),
});

const PositionParams = z.object({
  x: z.number(),
  y: z.number(),
  z: z.number(),
});

const DigAreaParams = z.object({
  start: PositionParams,
  end: PositionParams,
});

const PlaceBlockParams = z.object({
  x: z.number(),
  y: z.number(),
  z: z.number(),
  blockName: z.string(),
});

const FollowPlayerParams = z.object({
  username: z.string(),
  distance: z.number().default(2),
});

const AttackEntityParams = z.object({
  entityName: z.string(),
  maxDistance: z.number().default(5),
});

const NavigateRelativeParams = z.object({
  dx: z.number(),
  dy: z.number(),
  dz: z.number(),
});

const DigBlockRelativeParams = z.object({
  dx: z.number(),
  dy: z.number(),
  dz: z.number(),
});

const RelativePositionParams = z.object({
  dx: z.number(),
  dy: z.number(),
  dz: z.number(),
});

const DigAreaRelativeParams = z.object({
  start: RelativePositionParams,
  end: RelativePositionParams,
});

const CraftItemParams = z.object({
  itemName: z.string(),
  quantity: z.number().default(1),
  craftingTable: z.boolean().default(false),
});

const InspectBlockParams = z.object({
  position: PositionParams,
  includeState: z.boolean().default(true),
});

const FindBlocksParams = z.object({
  blockTypes: z.array(z.string()),
  maxDistance: z.number().default(32),
  maxCount: z.number().default(1),
  // For more complex queries like "find diamond ore above y=12"
  constraints: z
    .object({
      minY: z.number().optional(),
      maxY: z.number().optional(),
      requireReachable: z.boolean().default(false),
    })
    .optional(),
});

const InspectInventoryParams = z.object({
  itemType: z.string().optional(), // If provided, only get info about this item
  includeEquipment: z.boolean().default(true),
});

const FindEntitiesParams = z.object({
  entityTypes: z.array(z.string()),
  maxDistance: z.number().default(32),
  maxCount: z.number().default(1),
  // For more complex queries like "find hostile mobs in front of me"
  constraints: z
    .object({
      mustBeVisible: z.boolean().default(false),
      inFrontOnly: z.boolean().default(false),
      minHealth: z.number().optional(),
      maxHealth: z.number().optional(),
    })
    .optional(),
});

const CheckPathParams = z.object({
  destination: PositionParams,
  // Allow checking if we can reach somewhere without actually moving
  dryRun: z.boolean().default(true),
  // Get detailed info about what's blocking us if we can't reach it
  includeObstacles: z.boolean().default(false),
});

const CraftItemSchema = z.object({
  itemName: z.string(),
  quantity: z.number().optional(),
  useCraftingTable: z.boolean().optional(),
});

const SmeltItemSchema = z.object({
  itemName: z.string(),
  fuelName: z.string(),
  quantity: z.number().optional(),
});

const EquipItemSchema = z.object({
  itemName: z.string(),
  destination: z.enum(["hand", "off-hand", "head", "torso", "legs", "feet"]),
});

const ContainerInteractionSchema = z.object({
  containerPosition: z.object({
    x: z.number(),
    y: z.number(),
    z: z.number(),
  }),
  itemName: z.string(),
  quantity: z.number().optional(),
});

interface ToolRequest extends Request {
  method: "callTool";
  params: {
    name: string;
    arguments: unknown;
  };
}

interface ResourceRequest extends Request {
  method: "resources/read";
  params: {
    uri: string;
    _meta?: {
      progressToken?: string | number;
    };
  };
}

interface ToolResult extends Result {
  _meta?: {
    progressToken?: string | number;
  };
  content: Array<{
    type: string;
    text: string;
  }>;
  [key: string]: unknown;
}

const MINECRAFT_TOOLS: Tool[] = [
  {
    name: "disconnect",
    description: "Disconnect from the current Minecraft server",
    inputSchema: {
      type: "object",
      properties: {},
      examples: [{}],
    },
  },
  {
    name: "chat",
    description: "Send a chat message to the server",
    inputSchema: {
      type: "object",
      properties: {
        message: {
          type: "string",
          description: "Message to send in chat",
          examples: ["Hello, world!"],
        },
      },
      required: ["message"],
      examples: [
        {
          message: "Hello, world!",
        },
      ],
    },
  },
  {
    name: "navigate_to",
    description:
      "Make the bot walk to specific absolute coordinates in the world. Use minecraft://position resource first to get current position.",
    inputSchema: {
      type: "object",
      properties: {
        x: {
          type: "number",
          description: "Absolute X coordinate to walk to",
        },
        y: {
          type: "number",
          description: "Absolute Y coordinate (height) to walk to",
        },
        z: {
          type: "number",
          description: "Absolute Z coordinate to walk to",
        },
      },
      required: ["x", "y", "z"],
      examples: [
        {
          x: 100,
          y: 64,
          z: 100,
        },
      ],
    },
  },
  {
    name: "navigate_relative",
    description: "Make the bot walk relative to its current position",
    inputSchema: {
      type: "object",
      properties: {
        dx: {
          type: "number",
          description: "Right/Left: Positive = right, negative = left",
        },
        dy: {
          type: "number",
          description: "Up/Down: Positive = up, negative = down",
        },
        dz: {
          type: "number",
          description: "Forward/Back: Positive = forward, negative = back",
        },
      },
      required: ["dx", "dy", "dz"],
      examples: [
        {
          dx: 5, // 5 blocks right
          dy: 0, // Same height
          dz: 10, // 10 blocks forward
        },
      ],
    },
  },
  {
    name: "dig_block",
    description:
      "Dig a single block at specific absolute coordinates. Use minecraft://position first to get current position.",
    inputSchema: {
      type: "object",
      properties: {
        x: {
          type: "number",
          description: "Absolute X coordinate of block",
        },
        y: {
          type: "number",
          description: "Absolute Y coordinate (height) of block",
        },
        z: {
          type: "number",
          description: "Absolute Z coordinate of block",
        },
      },
      required: ["x", "y", "z"],
      examples: [
        {
          x: 100,
          y: 64,
          z: 100,
        },
      ],
    },
  },
  {
    name: "dig_block_relative",
    description: "Dig a single block relative to the bot's current position",
    inputSchema: {
      type: "object",
      properties: {
        dx: {
          type: "number",
          description: "Right/Left: Positive = right, negative = left",
        },
        dy: {
          type: "number",
          description: "Up/Down: Positive = up, negative = down",
        },
        dz: {
          type: "number",
          description: "Forward/Back: Positive = forward, negative = back",
        },
      },
      required: ["dx", "dy", "dz"],
      examples: [
        {
          dx: 0, // Block directly
          dy: -1, // Below
          dz: 0, // The bot
        },
      ],
    },
  },
  {
    name: "dig_area",
    description:
      "Dig all blocks in a rectangular area defined by two corner points using absolute coordinates. The bot will dig from top to bottom. Use minecraft://position first to get current position.",
    inputSchema: {
      type: "object",
      properties: {
        start: {
          type: "object",
          description: "First corner (absolute coordinates)",
          properties: {
            x: {
              type: "number",
              description: "Absolute X coordinate",
            },
            y: {
              type: "number",
              description: "Absolute Y coordinate (height)",
            },
            z: {
              type: "number",
              description: "Absolute Z coordinate",
            },
          },
          required: ["x", "y", "z"],
        },
        end: {
          type: "object",
          description: "Second corner (absolute coordinates)",
          properties: {
            x: {
              type: "number",
              description: "Absolute X coordinate",
            },
            y: {
              type: "number",
              description: "Absolute Y coordinate (height)",
            },
            z: {
              type: "number",
              description: "Absolute Z coordinate",
            },
          },
          required: ["x", "y", "z"],
        },
      },
      required: ["start", "end"],
      examples: [
        {
          start: {
            x: 100,
            y: 64,
            z: 100,
          },
          end: {
            x: 105,
            y: 60,
            z: 105,
          },
        },
      ],
    },
  },
  {
    name: "dig_area_relative",
    description:
      "Dig all blocks in a rectangular area relative to the bot's current position. The bot will dig from top to bottom.",
    inputSchema: {
      type: "object",
      properties: {
        start: {
          type: "object",
          description: "First corner relative to bot",
          properties: {
            dx: {
              type: "number",
              description: "Right/Left: Positive = right, negative = left",
            },
            dy: {
              type: "number",
              description: "Up/Down: Positive = up, negative = down",
            },
            dz: {
              type: "number",
              description: "Forward/Back: Positive = forward, negative = back",
            },
          },
          required: ["dx", "dy", "dz"],
        },
        end: {
          type: "object",
          description: "Second corner relative to bot",
          properties: {
            dx: {
              type: "number",
              description: "Right/Left: Positive = right, negative = left",
            },
            dy: {
              type: "number",
              description: "Up/Down: Positive = up, negative = down",
            },
            dz: {
              type: "number",
              description: "Forward/Back: Positive = forward, negative = back",
            },
          },
          required: ["dx", "dy", "dz"],
        },
      },
      required: ["start", "end"],
      examples: [
        {
          start: {
            dx: -2, // 2 blocks left
            dy: 1, // 1 block up
            dz: -2, // 2 blocks back
          },
          end: {
            dx: 2, // 2 blocks right
            dy: -1, // 1 block down
            dz: 2, // 2 blocks forward
          },
        },
      ],
    },
  },
  {
    name: "place_block",
    description:
      "Place a block at specific coordinates. The bot must have the block in its inventory.",
    inputSchema: {
      type: "object",
      properties: {
        x: {
          type: "number",
          description: "X coordinate where to place block",
        },
        y: {
          type: "number",
          description: "Y coordinate (height) where to place block",
        },
        z: {
          type: "number",
          description: "Z coordinate where to place block",
        },
        blockName: {
          type: "string",
          description:
            "Name of the block to place (e.g. 'dirt', 'stone', 'oak_planks')",
        },
      },
      required: ["x", "y", "z", "blockName"],
    },
  },
  {
    name: "follow_player",
    description: "Make the bot follow a specific player",
    inputSchema: {
      type: "object",
      properties: {
        username: {
          type: "string",
          description: "Username of the player to follow",
        },
        distance: {
          type: "number",
          default: 2,
          description:
            "Distance in blocks to maintain from player (default: 2)",
        },
      },
      required: ["username"],
    },
  },
  {
    name: "attack_entity",
    description: "Attack a specific entity near the bot",
    inputSchema: {
      type: "object",
      properties: {
        entityName: {
          type: "string",
          description:
            "Name of the entity to attack (e.g. 'zombie', 'skeleton')",
        },
        maxDistance: {
          type: "number",
          default: 5,
          description:
            "Maximum distance to search for entity (default: 5 blocks)",
        },
      },
      required: ["entityName"],
    },
  },
  {
    name: "inspect_block",
    description:
      "Get detailed information about a block at a specific position",
    inputSchema: {
      type: "object",
      properties: {
        position: {
          type: "object",
          properties: {
            x: { type: "number" },
            y: { type: "number" },
            z: { type: "number" },
          },
          required: ["x", "y", "z"],
          description: "Position of block to inspect",
        },
        includeState: {
          type: "boolean",
          default: true,
          description: "Whether to include block state information",
        },
      },
      required: ["position"],
    },
  },
  {
    name: "find_blocks",
    description: "Search for blocks of specific types within range",
    inputSchema: {
      type: "object",
      properties: {
        blockTypes: {
          type: "array",
          items: { type: "string" },
          description:
            "Types of blocks to search for (e.g. ['diamond_ore', 'iron_ore'])",
        },
        maxDistance: {
          type: "number",
          default: 32,
          description: "Maximum search distance in blocks",
        },
        maxCount: {
          type: "number",
          default: 1,
          description: "Maximum number of blocks to find",
        },
        constraints: {
          type: "object",
          properties: {
            minY: { type: "number" },
            maxY: { type: "number" },
            requireReachable: { type: "boolean", default: false },
          },
          description: "Additional constraints on block locations",
        },
      },
      required: ["blockTypes"],
    },
  },
  {
    name: "find_entities",
    description: "Search for entities of specific types within range",
    inputSchema: {
      type: "object",
      properties: {
        entityTypes: {
          type: "array",
          items: { type: "string" },
          description:
            "Types of entities to search for (e.g. ['zombie', 'skeleton'])",
        },
        maxDistance: {
          type: "number",
          default: 32,
          description: "Maximum search distance in blocks",
        },
        maxCount: {
          type: "number",
          default: 1,
          description: "Maximum number of entities to find",
        },
        constraints: {
          type: "object",
          properties: {
            mustBeVisible: { type: "boolean", default: false },
            inFrontOnly: { type: "boolean", default: false },
            minHealth: { type: "number" },
            maxHealth: { type: "number" },
          },
          description: "Additional constraints on entity search",
        },
      },
      required: ["entityTypes"],
    },
  },
  {
    name: "check_path",
    description:
      "Check if a path exists to a destination and get information about obstacles",
    inputSchema: {
      type: "object",
      properties: {
        destination: {
          type: "object",
          properties: {
            x: { type: "number" },
            y: { type: "number" },
            z: { type: "number" },
          },
          required: ["x", "y", "z"],
          description: "Destination to check path to",
        },
        dryRun: {
          type: "boolean",
          default: true,
          description: "If true, only checks path without moving",
        },
        includeObstacles: {
          type: "boolean",
          default: false,
          description:
            "Whether to include information about obstacles if path is blocked",
        },
      },
      required: ["destination"],
    },
  },
  {
    name: "craft_item",
    description: "Craft an item using a crafting table",
    inputSchema: {
      type: "object",
      properties: {
        itemName: {
          type: "string",
          description: "Name of the item to craft",
        },
        quantity: {
          type: "number",
          description: "Quantity of the item to craft",
        },
        useCraftingTable: {
          type: "boolean",
          description: "Whether to use a crafting table",
        },
      },
      required: ["itemName", "quantity", "useCraftingTable"],
    },
  },
  {
    name: "smelt_item",
    description: "Smelt an item using a furnace",
    inputSchema: {
      type: "object",
      properties: {
        itemName: {
          type: "string",
          description: "Name of the item to smelt",
        },
        fuelName: {
          type: "string",
          description: "Name of the fuel to use",
        },
        quantity: {
          type: "number",
          description: "Quantity of the item to smelt",
        },
      },
      required: ["itemName", "fuelName", "quantity"],
    },
  },
  {
    name: "equip_item",
    description: "Equip an item in a specific slot",
    inputSchema: {
      type: "object",
      properties: {
        itemName: {
          type: "string",
          description: "Name of the item to equip",
        },
        destination: {
          type: "string",
          description: "Destination slot to equip the item",
        },
      },
      required: ["itemName", "destination"],
    },
  },
  {
    name: "deposit_item",
    description: "Deposit an item into a container",
    inputSchema: {
      type: "object",
      properties: {
        containerPosition: {
          type: "object",
          description: "Position of the container to deposit the item",
          properties: {
            x: { type: "number" },
            y: { type: "number" },
            z: { type: "number" },
          },
          required: ["x", "y", "z"],
        },
        itemName: {
          type: "string",
          description: "Name of the item to deposit",
        },
        quantity: {
          type: "number",
          description: "Quantity of the item to deposit",
        },
      },
      required: ["containerPosition", "itemName", "quantity"],
    },
  },
  {
    name: "withdraw_item",
    description: "Withdraw an item from a container",
    inputSchema: {
      type: "object",
      properties: {
        containerPosition: {
          type: "object",
          description: "Position of the container to withdraw the item",
          properties: {
            x: { type: "number" },
            y: { type: "number" },
            z: { type: "number" },
          },
          required: ["x", "y", "z"],
        },
        itemName: {
          type: "string",
          description: "Name of the item to withdraw",
        },
        quantity: {
          type: "number",
          description: "Quantity of the item to withdraw",
        },
      },
      required: ["containerPosition", "itemName", "quantity"],
    },
  },
];

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

export class MinecraftServer {
  protected bot: MinecraftBot;
  protected toolHandler: ToolHandler;
  protected resourceHandler: ResourceHandler;
  protected server: Server;
  protected connectionParams?: {
    host: string;
    port: number;
    username: string;
  };

  constructor(
    bot?: MinecraftBot,
    connectionParams?: {
      host: string;
      port: number;
      username: string;
    }
  ) {
    this.bot =
      bot ||
      new MineflayerBot(
        connectionParams || {
          host: "localhost",
          port: 25565,
          username: "bot",
        }
      );
    this.toolHandler = new MinecraftToolHandler(this.bot);
    this.resourceHandler = new MinecraftResourceHandler(this.bot);
    this.connectionParams = connectionParams;

    this.server = new Server(
      {
        name: "mineflayer-server",
        version: "0.1.0",
      },
      {
        capabilities: {
          resources: {
            enabled: true,
          },
          tools: {
            enabled: true,
          },
        },
      }
    );

    // Set up tool handlers
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: MINECRAFT_TOOLS,
    }));

    // Set up resource handlers
    this.server.setRequestHandler(ListResourcesRequestSchema, async () => ({
      resources: MINECRAFT_RESOURCES,
    }));

    this.server.setRequestHandler(
      ReadResourceRequestSchema,
      async (request) => {
        try {
          const { uri } = request.params;
          let result: HandlerResourceResponse;

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
              return {
                contents: [
                  {
                    uri,
                    mimeType: "application/json",
                    text: JSON.stringify({
                      error: `Unknown resource URI: ${uri}`,
                      isError: true,
                    }),
                  },
                ],
              };
          }

          // Ensure the result has the correct structure
          if (!result.contents || !Array.isArray(result.contents)) {
            return {
              contents: [
                {
                  uri,
                  mimeType: "application/json",
                  text: JSON.stringify({
                    error: "Invalid resource result format",
                    isError: true,
                  }),
                },
              ],
            };
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
          return {
            contents: [
              {
                uri: request.params.uri,
                mimeType: "application/json",
                text: JSON.stringify({
                  error: `Resource handler error: ${
                    error instanceof Error ? error.message : String(error)
                  }`,
                  isError: true,
                }),
              },
            ],
          };
        }
      }
    );

    // Set up tool handlers
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      try {
        const { name, arguments: args } = request.params;

        if (!args) {
          return {
            content: [
              {
                type: "text",
                text: "No arguments provided",
              },
            ],
            isError: true,
          };
        }

        switch (name) {
          case "chat": {
            const { message } = ChatParams.parse(args);
            return this.toolHandler.handleChat(message);
          }
          case "navigate_to": {
            const { x, y, z } = NavigateParams.parse(args);
            return this.toolHandler.handleNavigateTo(x, y, z);
          }
          case "navigate_relative": {
            const { dx, dy, dz } = NavigateRelativeParams.parse(args);
            return this.toolHandler.handleNavigateRelative(dx, dy, dz);
          }
          case "dig_block": {
            const { x, y, z } = DigBlockParams.parse(args);
            return this.toolHandler.handleDigBlock(x, y, z);
          }
          case "dig_block_relative": {
            const { dx, dy, dz } = DigBlockRelativeParams.parse(args);
            return this.toolHandler.handleDigBlockRelative(dx, dy, dz);
          }
          case "dig_area": {
            const { start, end } = DigAreaParams.parse(args);
            return this.toolHandler.handleDigArea(start, end);
          }
          case "dig_area_relative": {
            const { start, end } = DigAreaRelativeParams.parse(args);
            return this.toolHandler.handleDigAreaRelative(start, end);
          }
          case "place_block": {
            const { x, y, z, blockName } = PlaceBlockParams.parse(args);
            return this.toolHandler.handlePlaceBlock(x, y, z, blockName);
          }
          case "follow_player": {
            const { username, distance } = FollowPlayerParams.parse(args);
            return this.toolHandler.handleFollowPlayer(username, distance);
          }
          case "attack_entity": {
            const { entityName, maxDistance } = AttackEntityParams.parse(args);
            return this.toolHandler.handleAttackEntity(entityName, maxDistance);
          }
          case "inspect_block": {
            const { position, includeState } = InspectBlockParams.parse(args);
            return this.toolHandler.handleInspectBlock(position, includeState);
          }
          case "find_blocks": {
            const { blockTypes, maxDistance, maxCount, constraints } =
              FindBlocksParams.parse(args);
            return this.toolHandler.handleFindBlocks(
              blockTypes,
              maxDistance,
              maxCount,
              constraints
            );
          }
          case "inspect_inventory": {
            const { itemType, includeEquipment } =
              InspectInventoryParams.parse(args);
            return this.toolHandler.handleInspectInventory(
              itemType,
              includeEquipment
            );
          }
          case "find_entities": {
            const { entityTypes, maxDistance, maxCount, constraints } =
              FindEntitiesParams.parse(args);
            return this.toolHandler.handleFindEntities(
              entityTypes,
              maxDistance,
              maxCount,
              constraints
            );
          }
          case "check_path": {
            const { destination, dryRun, includeObstacles } =
              CheckPathParams.parse(args);
            return this.toolHandler.handleCheckPath(
              destination,
              dryRun,
              includeObstacles
            );
          }
          case "craft_item": {
            const { itemName, quantity, useCraftingTable } =
              CraftItemSchema.parse(args);
            return this.toolHandler.handleCraftItem(
              itemName,
              quantity,
              useCraftingTable
            );
          }
          case "smelt_item": {
            const { itemName, fuelName, quantity } =
              SmeltItemSchema.parse(args);
            return this.toolHandler.handleSmeltItem(
              itemName,
              fuelName,
              quantity
            );
          }
          case "equip_item": {
            const { itemName, destination } = EquipItemSchema.parse(args);
            return this.toolHandler.handleEquipItem(itemName, destination);
          }
          case "deposit_item": {
            const { containerPosition, itemName, quantity } =
              ContainerInteractionSchema.parse(args);
            return this.toolHandler.handleDepositItem(
              containerPosition,
              itemName,
              quantity
            );
          }
          case "withdraw_item": {
            const { containerPosition, itemName, quantity } =
              ContainerInteractionSchema.parse(args);
            return this.toolHandler.handleWithdrawItem(
              containerPosition,
              itemName,
              quantity
            );
          }
          default:
            return {
              content: [{ type: "text", text: `Unknown tool: ${name}` }],
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
      // Connect to Minecraft server first if we have connection params
      if (this.bot instanceof MineflayerBot && this.connectionParams) {
        await this.bot.connect(
          this.connectionParams.host,
          this.connectionParams.port,
          this.connectionParams.username
        );

        // Replace console.error with JSON-RPC notification
        this.server.notification({
          method: "server/status",
          params: {
            type: "info",
            message: `Connected to Minecraft server at ${this.connectionParams.host}:${this.connectionParams.port}`,
          },
        });
      }

      // Then start the MCP server
      const transport = new StdioServerTransport();
      await this.server.connect(transport);

      // Replace console.error with JSON-RPC notification
      this.server.notification({
        method: "server/status",
        params: {
          type: "info",
          message: "Mineflayer MCP Server running on stdio",
        },
      });
    } catch (error) {
      // Replace console.error with JSON-RPC error response
      this.server.notification({
        method: "server/status",
        params: {
          type: "error",
          message: `Failed to start server: ${
            error instanceof Error ? error.message : String(error)
          }`,
        },
      });
      process.exit(1);
    }
  }
}
