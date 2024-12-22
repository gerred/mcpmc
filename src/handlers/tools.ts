import type { MinecraftBot } from "../types/minecraft";
import { Vec3 } from "vec3";
import { goals } from "mineflayer-pathfinder";
import type { ToolResponse } from "../types/tools";
import type { Position } from "../types/minecraft";

export interface ToolHandler {
  handleChat(message: string): Promise<ToolResponse>;
  handleNavigateTo(x: number, y: number, z: number): Promise<ToolResponse>;
  handleNavigateRelative(
    dx: number,
    dy: number,
    dz: number
  ): Promise<ToolResponse>;
  handleDigBlock(x: number, y: number, z: number): Promise<ToolResponse>;
  handleDigBlockRelative(
    dx: number,
    dy: number,
    dz: number
  ): Promise<ToolResponse>;
  handleDigArea(
    start: { x: number; y: number; z: number },
    end: { x: number; y: number; z: number }
  ): Promise<ToolResponse>;
  handleDigAreaRelative(
    start: { dx: number; dy: number; dz: number },
    end: { dx: number; dy: number; dz: number }
  ): Promise<ToolResponse>;
  handlePlaceBlock(
    x: number,
    y: number,
    z: number,
    blockName: string
  ): Promise<ToolResponse>;
  handleFollowPlayer(username: string, distance: number): Promise<ToolResponse>;
  handleAttackEntity(
    entityName: string,
    maxDistance: number
  ): Promise<ToolResponse>;
  handleInspectBlock(
    position: { x: number; y: number; z: number },
    includeState: boolean
  ): Promise<ToolResponse>;
  handleFindBlocks(
    blockTypes: string | string[],
    maxDistance: number,
    maxCount: number,
    constraints?: {
      minY?: number;
      maxY?: number;
      requireReachable?: boolean;
    }
  ): Promise<ToolResponse>;
  handleFindEntities(
    entityTypes: string[],
    maxDistance: number,
    maxCount: number,
    constraints?: {
      mustBeVisible?: boolean;
      inFrontOnly?: boolean;
      minHealth?: number;
      maxHealth?: number;
    }
  ): Promise<ToolResponse>;
  handleCheckPath(
    destination: { x: number; y: number; z: number },
    dryRun: boolean,
    includeObstacles: boolean
  ): Promise<ToolResponse>;
  handleInspectInventory(
    itemType?: string,
    includeEquipment?: boolean
  ): Promise<ToolResponse>;
  handleCraftItem(
    itemName: string,
    quantity?: number,
    useCraftingTable?: boolean
  ): Promise<ToolResponse>;
  handleSmeltItem(
    itemName: string,
    fuelName: string,
    quantity?: number
  ): Promise<ToolResponse>;
  handleEquipItem(
    itemName: string,
    destination: "hand" | "off-hand" | "head" | "torso" | "legs" | "feet"
  ): Promise<ToolResponse>;
  handleDepositItem(
    containerPosition: Position,
    itemName: string,
    quantity?: number
  ): Promise<ToolResponse>;
  handleWithdrawItem(
    containerPosition: Position,
    itemName: string,
    quantity?: number
  ): Promise<ToolResponse>;
}

export class MinecraftToolHandler implements ToolHandler {
  constructor(private bot: MinecraftBot) {}

  async handleChat(message: string): Promise<ToolResponse> {
    this.bot.chat(message);
    return {
      _meta: {},
      content: [
        {
          type: "text",
          text: `Sent message: ${message}`,
        },
      ],
    };
  }

  async handleNavigateTo(
    x: number,
    y: number,
    z: number
  ): Promise<ToolResponse> {
    await this.bot.navigateTo(x, y, z);
    return {
      _meta: {},
      content: [
        {
          type: "text",
          text: `Navigated to ${x}, ${y}, ${z}`,
        },
      ],
    };
  }

  async handleNavigateRelative(
    dx: number,
    dy: number,
    dz: number
  ): Promise<ToolResponse> {
    await this.bot.navigateRelative(dx, dy, dz);
    return {
      _meta: {},
      content: [
        {
          type: "text",
          text: `Navigated relative to current position: ${dx} blocks right/left, ${dy} blocks up/down, ${dz} blocks forward/back`,
        },
      ],
    };
  }

  async handleDigBlock(x: number, y: number, z: number): Promise<ToolResponse> {
    await this.bot.digBlock(x, y, z);
    return {
      _meta: {},
      content: [
        {
          type: "text",
          text: `Dug block at ${x}, ${y}, ${z}`,
        },
      ],
    };
  }

  async handleDigBlockRelative(
    dx: number,
    dy: number,
    dz: number
  ): Promise<ToolResponse> {
    await this.bot.digBlockRelative(dx, dy, dz);
    return {
      _meta: {},
      content: [
        {
          type: "text",
          text: `Dug block relative to current position: ${dx} blocks right/left, ${dy} blocks up/down, ${dz} blocks forward/back`,
        },
      ],
    };
  }

  async handleDigArea(
    start: { x: number; y: number; z: number },
    end: { x: number; y: number; z: number }
  ): Promise<ToolResponse> {
    let progress = 0;
    let blocksDug = 0;
    let totalBlocks = 0;

    try {
      await this.bot.digArea(
        start,
        end,
        (currentProgress, currentBlocksDug, currentTotalBlocks) => {
          progress = currentProgress;
          blocksDug = currentBlocksDug;
          totalBlocks = currentTotalBlocks;
        }
      );

      return {
        _meta: {},
        content: [
          {
            type: "text",
            text: `Successfully completed digging area from (${start.x}, ${start.y}, ${start.z}) to (${end.x}, ${end.y}, ${end.z}). Dug ${blocksDug} blocks.`,
          },
        ],
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      const progressMessage =
        totalBlocks > 0
          ? `Progress before error: ${progress}% (${blocksDug}/${totalBlocks} blocks)`
          : "";

      return {
        _meta: {},
        content: [
          {
            type: "text",
            text: `Failed to dig area: ${errorMessage}${
              progressMessage ? `\n${progressMessage}` : ""
            }`,
          },
        ],
        isError: true,
      };
    }
  }

  async handleDigAreaRelative(
    start: { dx: number; dy: number; dz: number },
    end: { dx: number; dy: number; dz: number }
  ): Promise<ToolResponse> {
    let progress = 0;
    let blocksDug = 0;
    let totalBlocks = 0;

    try {
      await this.bot.digAreaRelative(
        start,
        end,
        (currentProgress, currentBlocksDug, currentTotalBlocks) => {
          progress = currentProgress;
          blocksDug = currentBlocksDug;
          totalBlocks = currentTotalBlocks;
        }
      );

      return {
        _meta: {},
        content: [
          {
            type: "text",
            text: `Successfully completed digging area relative to current position:\nFrom: ${start.dx} right/left, ${start.dy} up/down, ${start.dz} forward/back\nTo: ${end.dx} right/left, ${end.dy} up/down, ${end.dz} forward/back\nDug ${blocksDug} blocks.`,
          },
        ],
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      const progressMessage =
        totalBlocks > 0
          ? `Progress before error: ${progress}% (${blocksDug}/${totalBlocks} blocks)`
          : "";

      return {
        _meta: {},
        content: [
          {
            type: "text",
            text: `Failed to dig relative area: ${errorMessage}${
              progressMessage ? `\n${progressMessage}` : ""
            }`,
          },
        ],
        isError: true,
      };
    }
  }

  async handlePlaceBlock(
    x: number,
    y: number,
    z: number,
    blockName: string
  ): Promise<ToolResponse> {
    await this.bot.placeBlock(x, y, z, blockName);
    return {
      _meta: {},
      content: [
        {
          type: "text",
          text: `Placed ${blockName} at ${x}, ${y}, ${z}`,
        },
      ],
    };
  }

  async handleFollowPlayer(
    username: string,
    distance: number
  ): Promise<ToolResponse> {
    await this.bot.followPlayer(username, distance);
    return {
      _meta: {},
      content: [
        {
          type: "text",
          text: `Following player ${username}${
            distance ? ` at distance ${distance}` : ""
          }`,
        },
      ],
    };
  }

  async handleAttackEntity(
    entityName: string,
    maxDistance: number
  ): Promise<ToolResponse> {
    await this.bot.attackEntity(entityName, maxDistance);
    return {
      _meta: {},
      content: [
        {
          type: "text",
          text: `Attacked ${entityName}`,
        },
      ],
    };
  }

  async handleInspectBlock(
    position: { x: number; y: number; z: number },
    includeState: boolean
  ): Promise<ToolResponse> {
    const block = this.bot.blockAt(
      new Vec3(position.x, position.y, position.z)
    );
    if (!block) {
      return {
        content: [
          { type: "text", text: "No block found at specified position" },
        ],
        isError: true,
      };
    }

    const blockInfo: any = {
      name: block.name,
      type: block.type,
      position: position,
    };

    if (includeState && "metadata" in block) {
      blockInfo.metadata = block.metadata;
      blockInfo.stateId = (block as any).stateId;
      blockInfo.light = (block as any).light;
      blockInfo.skyLight = (block as any).skyLight;
      blockInfo.boundingBox = (block as any).boundingBox;
    }

    return {
      content: [
        {
          type: "text",
          text: `Block at (${position.x}, ${position.y}, ${position.z}):`,
        },
        {
          type: "json",
          text: JSON.stringify(blockInfo, null, 2),
        },
      ],
    };
  }

  async handleFindBlocks(
    blockTypes: string | string[],
    maxDistance: number,
    maxCount: number,
    constraints?: {
      minY?: number;
      maxY?: number;
      requireReachable?: boolean;
    }
  ): Promise<ToolResponse> {
    if (!this.bot) throw new Error("Not connected");

    const blockTypesArray = Array.isArray(blockTypes)
      ? blockTypes
      : [blockTypes];

    const matches = this.bot.findBlocks({
      matching: (block) => blockTypesArray.includes(block.name),
      maxDistance,
      count: maxCount,
      point: this.bot.entity.position,
    });

    // Apply additional constraints
    let filteredMatches = matches;
    if (constraints) {
      filteredMatches = matches.filter((pos) => {
        if (constraints.minY !== undefined && pos.y < constraints.minY)
          return false;
        if (constraints.maxY !== undefined && pos.y > constraints.maxY)
          return false;

        if (constraints.requireReachable) {
          // Check if we can actually reach this block
          const goal = new goals.GoalGetToBlock(pos.x, pos.y, pos.z);
          const result = this.bot.pathfinder.getPathTo(goal, maxDistance);
          if (!result?.path?.length) return false;
        }

        return true;
      });
    }

    const blocks = filteredMatches.map((pos) => {
      const block = this.bot!.blockAt(pos);
      return {
        position: { x: pos.x, y: pos.y, z: pos.z },
        name: block?.name || "unknown",
        distance: pos.distanceTo(this.bot!.entity.position),
      };
    });

    return {
      content: [
        {
          type: "text",
          text: `Found ${blocks.length} matching blocks:`,
        },
        {
          type: "json",
          text: JSON.stringify(blocks, null, 2),
        },
      ],
    };
  }

  async handleFindEntities(
    entityTypes: string[],
    maxDistance: number,
    maxCount: number,
    constraints?: {
      mustBeVisible?: boolean;
      inFrontOnly?: boolean;
      minHealth?: number;
      maxHealth?: number;
    }
  ): Promise<ToolResponse> {
    if (!this.bot) throw new Error("Not connected");

    let entities = Object.values(this.bot.entities)
      .filter((entity) => {
        if (!entity || !entity.position) return false;
        if (!entityTypes.includes(entity.name || "")) return false;

        const distance = entity.position.distanceTo(this.bot!.entity.position);
        if (distance > maxDistance) return false;

        if (constraints) {
          if (
            constraints.minHealth !== undefined &&
            (entity.health || 0) < constraints.minHealth
          )
            return false;
          if (
            constraints.maxHealth !== undefined &&
            (entity.health || 0) > constraints.maxHealth
          )
            return false;

          if (constraints.mustBeVisible && !this.bot!.canSeeEntity(entity))
            return false;

          if (constraints.inFrontOnly) {
            // Check if entity is in front of the bot using dot product
            const botDir = this.bot!.entity.velocity;
            const toEntity = entity.position.minus(this.bot!.entity.position);
            const dot = botDir.dot(toEntity);
            if (dot <= 0) return false;
          }
        }

        return true;
      })
      .slice(0, maxCount)
      .map((entity) => ({
        name: entity.name || "unknown",
        type: entity.type,
        position: {
          x: entity.position.x,
          y: entity.position.y,
          z: entity.position.z,
        },
        velocity: entity.velocity,
        health: entity.health,
        distance: entity.position.distanceTo(this.bot!.entity.position),
      }));

    return {
      content: [
        {
          type: "text",
          text: `Found ${entities.length} matching entities:`,
        },
        {
          type: "json",
          text: JSON.stringify(entities, null, 2),
        },
      ],
    };
  }

  async handleCheckPath(
    destination: { x: number; y: number; z: number },
    dryRun: boolean,
    includeObstacles: boolean
  ): Promise<ToolResponse> {
    if (!this.bot) throw new Error("Not connected");

    const goal = new goals.GoalBlock(
      destination.x,
      destination.y,
      destination.z
    );
    const pathResult = await this.bot.pathfinder.getPathTo(goal);

    const response: any = {
      pathExists: !!pathResult?.path?.length,
      distance: pathResult?.path?.length || 0,
      estimatedTime: (pathResult?.path?.length || 0) * 0.25, // Rough estimate: 4 blocks per second
    };

    if (!pathResult?.path?.length && includeObstacles) {
      // Try to find what's blocking the path
      const obstacles = [];
      const line = this.getPointsOnLine(
        this.bot.entity.position,
        new Vec3(destination.x, destination.y, destination.z)
      );

      for (const point of line) {
        const block = this.bot.blockAt(point);
        if (block && (block as any).boundingBox !== "empty") {
          obstacles.push({
            position: { x: point.x, y: point.y, z: point.z },
            block: block.name,
            type: block.type,
          });
          if (obstacles.length >= 5) break; // Limit to first 5 obstacles
        }
      }

      response.obstacles = obstacles;
    }

    if (!dryRun && pathResult?.path?.length) {
      await this.bot.pathfinder.goto(goal);
      response.status = "Reached destination";
    }

    return {
      content: [
        {
          type: "text",
          text: `Path check to (${destination.x}, ${destination.y}, ${destination.z}):`,
        },
        {
          type: "json",
          text: JSON.stringify(response, null, 2),
        },
      ],
    };
  }

  private getPointsOnLine(start: Vec3, end: Vec3): Vec3[] {
    const points: Vec3[] = [];
    const distance = start.distanceTo(end);
    const steps = Math.ceil(distance);

    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      points.push(start.scaled(1 - t).plus(end.scaled(t)));
    }

    return points;
  }

  async handleInspectInventory(
    itemType?: string,
    includeEquipment?: boolean
  ): Promise<ToolResponse> {
    const inventory = this.bot.getInventory();
    let items = inventory;

    if (itemType) {
      items = items.filter((item) => item.name === itemType);
    }

    const response = {
      items,
      totalCount: items.reduce((sum, item) => sum + item.count, 0),
      uniqueItems: new Set(items.map((item) => item.name)).size,
    };

    return {
      content: [
        {
          type: "text",
          text: `Inventory contents${
            itemType ? ` (filtered by ${itemType})` : ""
          }:`,
        },
        {
          type: "json",
          text: JSON.stringify(response, null, 2),
        },
      ],
    };
  }

  async handleCraftItem(
    itemName: string,
    quantity?: number,
    useCraftingTable?: boolean
  ): Promise<ToolResponse> {
    try {
      await this.bot.craftItem(itemName, quantity, useCraftingTable);
      return {
        content: [
          {
            type: "text",
            text: `Successfully crafted ${quantity || 1}x ${itemName}${
              useCraftingTable ? " using crafting table" : ""
            }`,
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `Failed to craft ${itemName}: ${
              error instanceof Error ? error.message : String(error)
            }`,
          },
        ],
        isError: true,
      };
    }
  }

  async handleSmeltItem(
    itemName: string,
    fuelName: string,
    quantity?: number
  ): Promise<ToolResponse> {
    try {
      await this.bot.smeltItem(itemName, fuelName, quantity);
      return {
        content: [
          {
            type: "text",
            text: `Successfully smelted ${
              quantity || 1
            }x ${itemName} using ${fuelName} as fuel`,
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `Failed to smelt ${itemName}: ${
              error instanceof Error ? error.message : String(error)
            }`,
          },
        ],
        isError: true,
      };
    }
  }

  async handleEquipItem(
    itemName: string,
    destination: "hand" | "off-hand" | "head" | "torso" | "legs" | "feet"
  ): Promise<ToolResponse> {
    try {
      await this.bot.equipItem(itemName, destination);
      return {
        content: [
          {
            type: "text",
            text: `Successfully equipped ${itemName} to ${destination}`,
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `Failed to equip ${itemName}: ${
              error instanceof Error ? error.message : String(error)
            }`,
          },
        ],
        isError: true,
      };
    }
  }

  async handleDepositItem(
    containerPosition: Position,
    itemName: string,
    quantity?: number
  ): Promise<ToolResponse> {
    try {
      await this.bot.depositItem(
        containerPosition as Position,
        itemName,
        quantity
      );
      return {
        content: [
          {
            type: "text",
            text: `Successfully deposited ${
              quantity || 1
            }x ${itemName} into container at (${containerPosition.x}, ${
              containerPosition.y
            }, ${containerPosition.z})`,
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `Failed to deposit ${itemName}: ${
              error instanceof Error ? error.message : String(error)
            }`,
          },
        ],
        isError: true,
      };
    }
  }

  async handleWithdrawItem(
    containerPosition: Position,
    itemName: string,
    quantity?: number
  ): Promise<ToolResponse> {
    try {
      await this.bot.withdrawItem(
        containerPosition as Position,
        itemName,
        quantity
      );
      return {
        content: [
          {
            type: "text",
            text: `Successfully withdrew ${
              quantity || 1
            }x ${itemName} from container at (${containerPosition.x}, ${
              containerPosition.y
            }, ${containerPosition.z})`,
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `Failed to withdraw ${itemName}: ${
              error instanceof Error ? error.message : String(error)
            }`,
          },
        ],
        isError: true,
      };
    }
  }
}
