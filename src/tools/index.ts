import { zodToJsonSchema } from "zod-to-json-schema";
import type { Tool } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import {
  ChatSchema,
  NavigateSchema,
  NavigateRelativeSchema,
  DigBlockSchema,
  DigBlockRelativeSchema,
  DigAreaSchema,
  DigAreaRelativeSchema,
  PlaceBlockSchema,
  FollowPlayerSchema,
  AttackEntitySchema,
  InspectBlockSchema,
  FindBlocksSchema,
  FindEntitiesSchema,
  CheckPathSchema,
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
    name: "navigate_to",
    description:
      "Make the bot walk to specific absolute coordinates in the world. X is east(+)/west(-), Y is up(+)/down(-), Z is south(+)/north(-)",
    inputSchema: toInputSchema(NavigateSchema),
  },
  {
    name: "navigate_relative",
    description:
      "Make the bot walk relative to its current position. dx moves right(+)/left(-), dy moves up(+)/down(-), dz moves forward(+)/back(-) relative to bot's current position and orientation",
    inputSchema: toInputSchema(NavigateRelativeSchema),
  },
  {
    name: "dig_block",
    description:
      "Dig a single block at specific absolute coordinates. X is east(+)/west(-), Y is up(+)/down(-), Z is south(+)/north(-)",
    inputSchema: toInputSchema(DigBlockSchema),
  },
  {
    name: "dig_block_relative",
    description:
      "Dig a single block relative to the bot's current position. dx moves right(+)/left(-), dy moves up(+)/down(-), dz moves forward(+)/back(-) relative to bot's current position and orientation",
    inputSchema: toInputSchema(DigBlockRelativeSchema),
  },
  {
    name: "dig_area",
    description:
      "Dig all blocks in a rectangular area defined by two corner points using absolute coordinates. X is east(+)/west(-), Y is up(+)/down(-), Z is south(+)/north(-)",
    inputSchema: toInputSchema(DigAreaSchema),
  },
  {
    name: "dig_area_relative",
    description:
      "Dig all blocks in a rectangular area relative to the bot's current position. For both start and end points: dx moves right(+)/left(-), dy moves up(+)/down(-), dz moves forward(+)/back(-) relative to bot's current position and orientation",
    inputSchema: toInputSchema(DigAreaRelativeSchema),
  },
  {
    name: "place_block",
    description:
      "Place a block at specific coordinates. X is east(+)/west(-), Y is up(+)/down(-), Z is south(+)/north(-). The bot must have the block in its inventory",
    inputSchema: toInputSchema(PlaceBlockSchema),
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
  {
    name: "inspect_block",
    description:
      "Get detailed information about a block at a specific position",
    inputSchema: toInputSchema(InspectBlockSchema),
  },
  {
    name: "find_blocks",
    description: "Search for blocks of specific types within range",
    inputSchema: toInputSchema(FindBlocksSchema),
  },
  {
    name: "find_entities",
    description: "Search for entities of specific types within range",
    inputSchema: toInputSchema(FindEntitiesSchema),
  },
  {
    name: "check_path",
    description:
      "Check if a path exists to a destination and get information about obstacles",
    inputSchema: toInputSchema(CheckPathSchema),
  },
  {
    name: "craft_item",
    description: "Craft an item using available materials in inventory",
    inputSchema: toInputSchema(CraftItemSchema),
  },
  {
    name: "smelt_item",
    description: "Smelt an item using a furnace and specified fuel",
    inputSchema: toInputSchema(SmeltItemSchema),
  },
  {
    name: "equip_item",
    description: "Equip an item from inventory to a specific slot",
    inputSchema: toInputSchema(EquipItemSchema),
  },
  {
    name: "deposit_item",
    description: "Deposit an item from inventory into a container",
    inputSchema: toInputSchema(ContainerInteractionSchema),
  },
  {
    name: "withdraw_item",
    description: "Withdraw an item from a container into inventory",
    inputSchema: toInputSchema(ContainerInteractionSchema),
  },
];
