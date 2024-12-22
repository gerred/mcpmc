import { z } from "zod";

// Base schemas
export const PositionSchema = z.object({
  x: z.number(),
  y: z.number(),
  z: z.number(),
});

export const RelativePositionSchema = z.object({
  dx: z.number(),
  dy: z.number(),
  dz: z.number(),
});

// Tool input schemas
export const ConnectSchema = z.object({
  host: z.string(),
  port: z.number().default(25565),
  username: z.string(),
});

export const ChatSchema = z.object({
  message: z.string(),
});

export const NavigateSchema = z.object({
  x: z.number(),
  y: z.number(),
  z: z.number(),
});

export const NavigateRelativeSchema = z.object({
  dx: z.number(),
  dy: z.number(),
  dz: z.number(),
});

export const DigBlockSchema = z.object({
  x: z.number(),
  y: z.number(),
  z: z.number(),
});

export const DigBlockRelativeSchema = z.object({
  dx: z.number(),
  dy: z.number(),
  dz: z.number(),
});

export const DigAreaSchema = z.object({
  start: PositionSchema,
  end: PositionSchema,
});

export const DigAreaRelativeSchema = z.object({
  start: RelativePositionSchema,
  end: RelativePositionSchema,
});

export const PlaceBlockSchema = z.object({
  x: z.number(),
  y: z.number(),
  z: z.number(),
  blockName: z.string(),
});

export const FollowPlayerSchema = z.object({
  username: z.string(),
  distance: z.number().default(2),
});

export const AttackEntitySchema = z.object({
  entityName: z.string(),
  maxDistance: z.number().default(5),
});

export const InspectBlockSchema = z.object({
  position: PositionSchema,
  includeState: z.boolean().default(true),
});

export const FindBlocksSchema = z.object({
  blockTypes: z.union([
    z.string(),
    z.array(z.string()),
    z.string().transform((str) => {
      try {
        // Handle string that looks like an array
        if (str.startsWith("[") && str.endsWith("]")) {
          const parsed = JSON.parse(str.replace(/'/g, '"'));
          return Array.isArray(parsed) ? parsed : [str];
        }
        return [str];
      } catch {
        return [str];
      }
    }),
  ]),
  maxDistance: z.number().default(32),
  maxCount: z.number().default(1),
  constraints: z
    .object({
      minY: z.number().optional(),
      maxY: z.number().optional(),
      requireReachable: z.boolean().default(false),
    })
    .optional(),
});

export const FindEntitiesSchema = z.object({
  entityTypes: z.array(z.string()),
  maxDistance: z.number().default(32),
  maxCount: z.number().default(1),
  constraints: z
    .object({
      mustBeVisible: z.boolean().default(false),
      inFrontOnly: z.boolean().default(false),
      minHealth: z.number().optional(),
      maxHealth: z.number().optional(),
    })
    .optional(),
});

export const CheckPathSchema = z.object({
  destination: PositionSchema,
  dryRun: z.boolean().default(true),
  includeObstacles: z.boolean().default(false),
});

// Response schemas
export const ToolResponseSchema = z.object({
  _meta: z.object({}).optional(),
  content: z.array(
    z.object({
      type: z.string(),
      text: z.string(),
    })
  ),
  isError: z.boolean().optional(),
});

export type ToolResponse = z.infer<typeof ToolResponseSchema>;
export type Position = z.infer<typeof PositionSchema>;
export type RelativePosition = z.infer<typeof RelativePositionSchema>;
