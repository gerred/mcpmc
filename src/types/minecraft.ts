import type { Entity as PrismarineEntity } from "prismarine-entity";
import type { Block as PrismarineBlock } from "prismarine-block";
import type { Item as PrismarineItem } from "prismarine-item";
import { Vec3 } from "vec3";

export interface Position {
  x: number;
  y: number;
  z: number;
}

export interface Block {
  position: Vec3;
  type: number;
  name: string;
  hardness: number;
}

export interface Entity {
  name: string;
  type: string;
  position: Vec3;
  velocity: Vec3;
  health: number;
}

export interface InventoryItem {
  name: string;
  count: number;
  slot: number;
}

export interface Player {
  username: string;
  uuid: string;
  ping: number;
}

export interface HealthStatus {
  health: number;
  food: number;
  saturation: number;
  armor: number;
}

export interface Weather {
  isRaining: boolean;
  rainState: "clear" | "raining";
  thunderState: number;
}

export interface Recipe {
  name: string;
  ingredients: { [itemName: string]: number };
  requiresCraftingTable: boolean;
}

export interface Container {
  type: "chest" | "furnace" | "crafting_table";
  position: Position;
  slots: { [slot: number]: InventoryItem | null };
}

/**
 * Core interface for the bot. Each method is a single action
 * that an LLM agent can call in multiple steps.
 */
export interface MinecraftBot {
  // ---- Connection ----
  connect(host: string, port: number, username: string): Promise<void>;
  disconnect(): void;

  // ---- Chat ----
  chat(message: string): void;

  // ---- State & Info ----
  getPosition(): Position | null;
  getHealth(): number;
  getInventory(): InventoryItem[];
  getPlayers(): Player[];
  getBlocksNearby(maxDistance?: number, count?: number): Block[];
  getEntitiesNearby(maxDistance?: number): Entity[];
  getHealthStatus(): HealthStatus;
  getWeather(): Weather;

  // ---- Relative Movement & Actions ----
  navigateRelative(
    dx: number,
    dy: number,
    dz: number,
    progressCallback?: (progress: number) => void
  ): Promise<void>;
  navigateTo(x: number, y: number, z: number): Promise<void>;
  digBlockRelative(dx: number, dy: number, dz: number): Promise<void>;
  digAreaRelative(
    start: { dx: number; dy: number; dz: number },
    end: { dx: number; dy: number; dz: number },
    progressCallback?: (
      progress: number,
      blocksDug: number,
      totalBlocks: number
    ) => void
  ): Promise<void>;
  placeBlock(x: number, y: number, z: number, blockName: string): Promise<void>;

  // ---- Entity Interaction ----
  followPlayer(username: string, distance?: number): Promise<void>;
  attackEntity(entityName: string, maxDistance?: number): Promise<void>;

  // ---- Block & Pathfinding Info ----
  blockAt(position: Vec3): Block | null;
  findBlocks(options: {
    matching: (block: Block) => boolean;
    maxDistance: number;
    count: number;
    point?: Vec3;
  }): Vec3[];
  getEquipmentDestSlot(destination: string): number;
  canSeeEntity(entity: Entity): boolean;

  // ---- Crafting & Item Management ----
  craftItem(
    itemName: string,
    quantity?: number,
    useCraftingTable?: boolean
  ): Promise<void>;
  smeltItem(
    itemName: string,
    fuelName: string,
    quantity?: number
  ): Promise<void>;
  equipItem(
    itemName: string,
    destination: "hand" | "off-hand" | "head" | "torso" | "legs" | "feet"
  ): Promise<void>;
  depositItem(
    containerPosition: Position,
    itemName: string,
    quantity?: number
  ): Promise<void>;
  withdrawItem(
    containerPosition: Position,
    itemName: string,
    quantity?: number
  ): Promise<void>;

  // ---- Expose underlying info for reference ----
  readonly entity: {
    position: Vec3;
    velocity: Vec3;
    yaw: number;
    pitch: number;
  };
  readonly entities: { [id: string]: Entity };
  readonly inventory: {
    items: () => InventoryItem[];
    slots: { [slot: string]: InventoryItem | null };
  };
  readonly pathfinder: any;
}

// Utility classes for type conversion between prismarine-xxx and your interfaces
export class TypeConverters {
  static entity(entity: PrismarineEntity): Entity {
    return {
      name: entity.name || "unknown",
      type: entity.type || "unknown",
      position: entity.position,
      velocity: entity.velocity,
      health: entity.health || 0,
    };
  }

  static block(block: PrismarineBlock): Block {
    return {
      position: block.position,
      type: block.type,
      name: block.name,
      hardness: block.hardness || 0,
    };
  }

  static item(item: PrismarineItem): InventoryItem {
    return {
      name: item.name,
      count: item.count,
      slot: item.slot,
    };
  }
}

export type { ToolResponse } from "./tools";
