import { zodToJsonSchema } from "zod-to-json-schema";
import type { Tool } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import {
  ChatSchema,
  NavigateRelativeSchema,
  DigBlockRelativeSchema,
  DigAreaRelativeSchema,
  FollowPlayerSchema,
  AttackEntitySchema,
  FindBlocksSchema,
  FindEntitiesSchema,
} from "../schemas.js";

type InputSchema = {
  type: "object";
  properties?: Record<string, unknown>;
  [k: string]: unknown;
};

const toInputSchema = (schema: z.ZodType): InputSchema => ({
  ...zodToJsonSchema(schema),
  type: "object",
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

export const MINECRAFT_TOOLS: Tool[] = [
  {
    name: "chat",
    description: "Send a chat message to the server",
    inputSchema: toInputSchema(ChatSchema),
  },
  {
    name: "navigate_relative",
    description:
      "Make the bot walk relative to its current position. dx moves right(+)/left(-), dy moves up(+)/down(-), dz moves forward(+)/back(-) relative to bot's current position and orientation",
    inputSchema: toInputSchema(NavigateRelativeSchema),
  },
  {
    name: "dig_block_relative",
    description:
      "Dig a single block relative to the bot's current position. dx moves right(+)/left(-), dy moves up(+)/down(-), dz moves forward(+)/back(-) relative to bot's current position and orientation",
    inputSchema: toInputSchema(DigBlockRelativeSchema),
  },
  {
    name: "dig_area_relative",
    description:
      "Dig multiple blocks in an area relative to the bot's current position. Coordinates use the same relative system as dig_block_relative. Use this for clearing spaces.",
    inputSchema: toInputSchema(DigAreaRelativeSchema),
  },
  {
    name: "place_block",
    description:
      "Place a block from the bot's inventory at the specified position. Use this for building structures.",
    inputSchema: toInputSchema(
      z.object({
        x: z.number(),
        y: z.number(),
        z: z.number(),
        blockName: z.string(),
      })
    ),
  },
  {
    name: "find_blocks",
    description:
      "Find nearby blocks of specific types. Use this to locate building materials or identify terrain.",
    inputSchema: toInputSchema(FindBlocksSchema),
  },
  {
    name: "craft_item",
    description:
      "Craft items using materials in inventory. Can use a crafting table if specified.",
    inputSchema: toInputSchema(CraftItemSchema),
  },
  {
    name: "inspect_inventory",
    description:
      "Check the contents of the bot's inventory to see available materials.",
    inputSchema: toInputSchema(
      z.object({
        itemType: z.string().optional(),
        includeEquipment: z.boolean().optional(),
      })
    ),
  },
  {
    name: "follow_player",
    description: "Make the bot follow a specific player",
    inputSchema: toInputSchema(FollowPlayerSchema),
  },
  {
    name: "attack_entity",
    description: "Attack a specific entity near the bot",
    inputSchema: toInputSchema(AttackEntitySchema),
  },
];
