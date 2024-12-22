import { createBot } from "mineflayer";
import type { Bot, Furnace } from "mineflayer";
import { Vec3 } from "vec3";
import { pathfinder, Movements, goals } from "mineflayer-pathfinder";
import type { Pathfinder } from "mineflayer-pathfinder";
import type {
  Position,
  MinecraftBot,
  ToolResponse,
  Player,
  InventoryItem,
  Entity as CustomEntity,
  Block,
  HealthStatus,
  Weather,
  Recipe,
  Container,
} from "../types/minecraft";
import { TypeConverters } from "../types/minecraft";
import { Block as PrismarineBlock } from "prismarine-block";
import { Item } from "prismarine-item";
import { EventEmitter } from "events";

interface PrismarineBlockWithBoundingBox extends PrismarineBlock {
  boundingBox: string;
}

type EquipmentDestination =
  | "hand"
  | "off-hand"
  | "head"
  | "torso"
  | "legs"
  | "feet";

interface ExtendedBot extends Bot {
  pathfinder: Pathfinder & {
    setMovements(movements: Movements): void;
    goto(goal: goals.Goal): Promise<void>;
  };
}

interface ConnectionParams {
  host: string;
  port: number;
  username: string;
  version?: string;
  hideErrors?: boolean;
}

export class MineflayerBot extends EventEmitter implements MinecraftBot {
  private bot: ExtendedBot | null = null;
  private isConnected: boolean = false;
  private isConnecting: boolean = false;
  private reconnectAttempts: number = 0;
  private readonly maxReconnectAttempts: number = 3;
  private lastConnectionParams: ConnectionParams;
  private movements: Movements | null = null;

  constructor(connectionParams: ConnectionParams) {
    super();
    this.lastConnectionParams = connectionParams;
    this.setupBot();
  }

  async connect(host: string, port: number, username: string): Promise<void> {
    if (this.isConnecting) {
      return;
    }
    this.isConnecting = true;
    try {
      const params: ConnectionParams = { host, port, username };
      this.lastConnectionParams = params;
      await this.setupBot();
    } finally {
      this.isConnecting = false;
    }
  }

  private setupBot(): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      try {
        if (this.isConnecting) {
          reject(new Error("Already connecting"));
          return;
        }

        this.isConnecting = true;

        if (this.bot) {
          this.bot.end();
          this.bot = null;
        }

        this.bot = createBot({
          ...this.lastConnectionParams,
          hideErrors: false,
        });

        this.bot.loadPlugin(pathfinder);

        this.bot.on("error", (error: Error) => {
          this.logError("Bot error", error);
          this.isConnecting = false;
          reject(error);
        });

        this.bot.on("kicked", (reason: string, loggedIn: boolean) => {
          this.logError("Bot kicked", { reason, loggedIn });
          this.isConnecting = false;
          this.handleDisconnect();
        });

        this.bot.once("spawn", () => {
          this.logDebug("Bot spawned successfully");
          this.isConnected = true;
          this.isConnecting = false;
          this.reconnectAttempts = 0;
          this.setupMovements();
          resolve();
        });

        this.bot.on("end", (reason: string) => {
          this.logError("Bot connection ended", { reason });
          this.isConnecting = false;
          this.handleDisconnect();
        });
      } catch (error) {
        this.logError("Bot setup error", error);
        this.isConnecting = false;
        this.sendJsonRpcError(-32001, "Failed to create bot", {
          error: error instanceof Error ? error.message : String(error),
        });
        reject(error);
      }
    });
  }

  private setupMovements(): void {
    if (!this.bot) return;

    try {
      this.movements = new Movements(this.bot);
      this.movements.allowParkour = true;
      this.movements.allowSprinting = true;
      this.bot.pathfinder.setMovements(this.movements);
    } catch (error) {
      this.sendJsonRpcError(-32002, "Error setting up movements", {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  private handleDisconnect(): void {
    this.isConnected = false;
    this.movements = null;

    // Only attempt reconnect if we're not already connecting and haven't exceeded attempts
    if (
      !this.isConnecting &&
      this.reconnectAttempts < this.maxReconnectAttempts
    ) {
      this.reconnectAttempts++;
      this.sendJsonRpcNotification("bot.reconnecting", {
        attempt: this.reconnectAttempts,
        maxAttempts: this.maxReconnectAttempts,
      });
      setTimeout(() => {
        if (!this.isConnected && !this.isConnecting) {
          this.setupBot();
        }
      }, 5000 * this.reconnectAttempts);
    } else {
      this.sendJsonRpcError(-32003, "Max reconnection attempts reached", {
        attempts: this.reconnectAttempts,
      });
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

  private logDebug(message: string, data?: any) {
    this.sendJsonRpcNotification("bot.debug", { message, data });
  }

  private logWarning(message: string, data?: any) {
    this.sendJsonRpcNotification("bot.warning", { message, data });
  }

  private logError(message: string, error?: any) {
    this.sendJsonRpcNotification("bot.error", {
      message,
      error: String(error),
    });
  }

  disconnect(): void {
    if (this.bot) {
      this.bot.end();
      this.bot = null;
    }
  }

  chat(message: string): void {
    if (!this.bot) {
      return this.wrapError("Not connected");
    }
    this.bot.chat(message);
  }

  getPosition(): Position | null {
    if (!this.bot?.entity?.position) return null;
    const pos = this.bot.entity.position;
    return { x: pos.x, y: pos.y, z: pos.z };
  }

  getHealth(): number {
    if (!this.bot) {
      return this.wrapError("Not connected");
    }
    return this.bot.health;
  }

  getInventory(): InventoryItem[] {
    if (!this.bot) {
      return this.wrapError("Not connected");
    }
    return this.bot.inventory.items().map(TypeConverters.item);
  }

  getPlayers(): Player[] {
    if (!this.bot) {
      return this.wrapError("Not connected");
    }
    return Object.values(this.bot.players).map((player) => ({
      username: player.username,
      uuid: player.uuid,
      ping: player.ping,
    }));
  }

  async navigateTo(x: number, y: number, z: number): Promise<void> {
    if (!this.bot) return this.wrapError("Not connected");
    const goal = new goals.GoalNear(x, y, z, 1);
    try {
      await this.bot.pathfinder.goto(goal);
    } catch (error) {
      return this.wrapError(
        `Failed to navigate: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }

  async digBlock(x: number, y: number, z: number): Promise<void> {
    if (!this.bot) {
      return this.wrapError("Not connected");
    }

    const targetPos = new Vec3(x, y, z);

    // Try to move close enough to dig if needed
    try {
      const goal = new goals.GoalNear(x, y, z, 3); // Stay within 3 blocks
      await this.bot.pathfinder.goto(goal);
    } catch (error) {
      this.logWarning("Could not move closer to block for digging", error);
      // Continue anyway - the block might still be reachable
    }

    while (true) {
      const block = this.bot.blockAt(targetPos);
      if (!block) {
        // No block at all, so we're done
        return;
      }

      if (block.name === "air") {
        // The target is now air, so we're done
        return;
      }

      // Skip bedrock and other indestructible blocks
      if (block.hardness < 0) {
        this.logWarning(
          `Cannot dig indestructible block ${block.name} at ${x}, ${y}, ${z}`
        );
        return;
      }

      // Attempt to dig
      try {
        await this.bot.dig(block);
      } catch (err) {
        const error = err as Error;
        // If it's a known "cannot dig" error, skip
        if (
          error.message?.includes("cannot be broken") ||
          error.message?.includes("cannot dig") ||
          error.message?.includes("unreachable")
        ) {
          this.logWarning(
            `Failed to dig block ${block.name} at ${x}, ${y}, ${z}: ${error.message}`
          );
          return;
        }
        // For other errors, wrap them
        return this.wrapError(error.message || String(error));
      }

      // Small delay to avoid server spam
      await new Promise((resolve) => setTimeout(resolve, 150));
    }
  }

  async digArea(
    start: Position,
    end: Position,
    progressCallback?: (
      progress: number,
      blocksDug: number,
      totalBlocks: number
    ) => void
  ): Promise<void> {
    if (!this.bot) {
      return this.wrapError("Not connected");
    }

    const minX = Math.min(start.x, end.x);
    const maxX = Math.max(start.x, end.x);
    const minY = Math.min(start.y, end.y);
    const maxY = Math.max(start.y, end.y);
    const minZ = Math.min(start.z, end.z);
    const maxZ = Math.max(start.z, end.z);

    // Create a list of all positions to dig, sorted from top to bottom
    const positions: Vec3[] = [];
    for (let y = maxY; y >= minY; y--) {
      for (let x = minX; x <= maxX; x++) {
        for (let z = minZ; z <= maxZ; z++) {
          positions.push(new Vec3(x, y, z));
        }
      }
    }

    const totalBlocks = positions.length;
    let blocksDug = 0;
    let lastProgressUpdate = Date.now();

    // We'll attach a disconnect handler so that if the bot disconnects,
    // we stop digging
    let disconnected = false;
    const disconnectHandler = () => {
      disconnected = true;
    };
    this.bot.once("end", disconnectHandler);

    try {
      // Try to move near the upper corner first
      const startPos = new Vec3(minX - 1, maxY + 1, minZ - 1);
      try {
        await this.navigateTo(startPos.x, startPos.y, startPos.z);
      } catch {
        this.logWarning("Could not reach optimal digging start position");
      }

      for (const pos of positions) {
        if (disconnected) {
          return this.wrapError("Disconnected while digging area");
        }

        const block = this.bot.blockAt(pos);
        if (!block || block.name === "air") {
          // Skip air but increment progress
          blocksDug++;
          continue;
        }

        try {
          // Check if we need to move closer
          const distance = pos.distanceTo(this.bot.entity.position);
          if (distance > 4) {
            // If we're more than 4 blocks away
            try {
              const goal = new goals.GoalNear(pos.x, pos.y, pos.z, 3);
              await this.bot.pathfinder.goto(goal);
            } catch (error) {
              this.logWarning(
                `Could not move closer to block at ${pos.x}, ${pos.y}, ${pos.z}:`,
                error
              );
              // Continue anyway - the block might still be reachable
            }
          }

          await this.digBlock(pos.x, pos.y, pos.z);
          blocksDug++;

          // Only call progressCallback every 500ms to avoid spam
          const now = Date.now();
          if (progressCallback && now - lastProgressUpdate >= 500) {
            const progress = Math.floor((blocksDug / totalBlocks) * 100);
            progressCallback(progress, blocksDug, totalBlocks);
            lastProgressUpdate = now;
          }
        } catch (error) {
          this.logError(
            `Failed to dig block at ${pos.x}, ${pos.y}, ${pos.z}:`,
            error
          );
          // Continue to next block
        }
      }

      if (progressCallback) {
        progressCallback(100, blocksDug, totalBlocks);
      }
    } finally {
      // Clean up the disconnect handler
      this.bot.removeListener("end", disconnectHandler);
    }
  }

  async placeBlock(
    x: number,
    y: number,
    z: number,
    blockName: string
  ): Promise<void> {
    if (!this.bot) return this.wrapError("Not connected");
    const item = this.bot.inventory.items().find((i) => i.name === blockName);
    if (!item) return this.wrapError(`No ${blockName} in inventory`);

    try {
      await this.bot.equip(item, "hand");
      const targetPos = new Vec3(x, y, z);
      const targetBlock = this.bot.blockAt(targetPos);
      if (!targetBlock)
        return this.wrapError("Invalid target position for placing block");
      const faceVector = new Vec3(0, 1, 0);
      await this.bot.placeBlock(targetBlock, faceVector);
    } catch (error) {
      return this.wrapError(
        `Failed to place block: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }

  async followPlayer(username: string, distance: number = 2): Promise<void> {
    if (!this.bot) return this.wrapError("Not connected");
    const target = this.bot.players[username]?.entity;
    if (!target) return this.wrapError(`Player ${username} not found`);
    const goal = new goals.GoalFollow(target, distance);
    try {
      await this.bot.pathfinder.goto(goal);
    } catch (error) {
      return this.wrapError(
        `Failed to follow player: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }

  async attackEntity(
    entityName: string,
    maxDistance: number = 5
  ): Promise<void> {
    if (!this.bot) return this.wrapError("Not connected");
    const entity = Object.values(this.bot.entities).find(
      (e) =>
        e.name === entityName &&
        e.position.distanceTo(this.bot!.entity.position) <= maxDistance
    );
    if (!entity)
      return this.wrapError(
        `No ${entityName} found within ${maxDistance} blocks`
      );
    try {
      await this.bot.attack(entity as any);
    } catch (error) {
      return this.wrapError(
        `Failed to attack entity: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }

  getEntitiesNearby(maxDistance: number = 10): CustomEntity[] {
    if (!this.bot) return this.wrapError("Not connected");
    return Object.values(this.bot.entities)
      .filter(
        (e) => e.position.distanceTo(this.bot!.entity.position) <= maxDistance
      )
      .map(TypeConverters.entity);
  }

  getBlocksNearby(maxDistance: number = 10, count: number = 100): Block[] {
    if (!this.bot) return this.wrapError("Not connected");
    return this.bot
      .findBlocks({
        matching: () => true,
        maxDistance,
        count,
      })
      .map((pos) => {
        const block = this.bot?.blockAt(pos);
        return block ? TypeConverters.block(block) : null;
      })
      .filter((b): b is Block => b !== null);
  }

  getHealthStatus(): HealthStatus {
    if (!this.bot) return this.wrapError("Not connected");
    return {
      health: this.bot.health,
      food: this.bot.food,
      saturation: this.bot.foodSaturation,
      armor: this.bot.game.gameMode === "creative" ? 20 : 0,
    };
  }

  getWeather(): Weather {
    if (!this.bot) return this.wrapError("Not connected");
    return {
      isRaining: this.bot.isRaining,
      rainState: this.bot.isRaining ? "raining" : "clear",
      thunderState: this.bot.thunderState,
    };
  }

  async navigateRelative(dx: number, dy: number, dz: number): Promise<void> {
    if (!this.bot) return this.wrapError("Not connected");
    const currentPos = this.bot.entity.position;
    const yaw = this.bot.entity.yaw;
    const sin = Math.sin(yaw);
    const cos = Math.cos(yaw);

    const worldDx = dx * cos - dz * sin;
    const worldDz = dx * sin + dz * cos;

    try {
      await this.navigateTo(
        currentPos.x + worldDx,
        currentPos.y + dy,
        currentPos.z + worldDz
      );
    } catch (error) {
      return this.wrapError(
        `Failed to navigate relatively: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }

  private relativeToAbsolute(
    origin: Vec3,
    dx: number,
    dy: number,
    dz: number
  ): Position {
    const yaw = this.bot!.entity.yaw;
    const sin = Math.sin(yaw);
    const cos = Math.cos(yaw);

    // For "forward/back" as +Z, "left/right" as ±X
    const worldDx = dx * cos - dz * sin;
    const worldDz = dx * sin + dz * cos;

    return {
      x: Math.floor(origin.x + worldDx),
      y: Math.floor(origin.y + dy),
      z: Math.floor(origin.z + worldDz),
    };
  }

  async digBlockRelative(dx: number, dy: number, dz: number): Promise<void> {
    if (!this.bot) throw new Error("Not connected");
    const currentPos = this.bot.entity.position;
    const { x, y, z } = this.relativeToAbsolute(currentPos, dx, dy, dz);
    await this.digBlock(x, y, z);
  }

  async digAreaRelative(
    start: { dx: number; dy: number; dz: number },
    end: { dx: number; dy: number; dz: number },
    progressCallback?: (
      progress: number,
      blocksDug: number,
      totalBlocks: number
    ) => void
  ): Promise<void> {
    if (!this.bot) throw new Error("Not connected");
    const currentPos = this.bot.entity.position;

    // Convert both corners to absolute coordinates
    const absStart = this.relativeToAbsolute(
      currentPos,
      start.dx,
      start.dy,
      start.dz
    );
    const absEnd = this.relativeToAbsolute(currentPos, end.dx, end.dy, end.dz);

    // Use the absolute digArea method
    await this.digArea(absStart, absEnd, progressCallback);
  }

  get entity() {
    if (!this.bot?.entity) return this.wrapError("Not connected");
    return {
      position: this.bot.entity.position,
      velocity: this.bot.entity.velocity,
      yaw: this.bot.entity.yaw,
      pitch: this.bot.entity.pitch,
    };
  }

  get entities() {
    if (!this.bot) return this.wrapError("Not connected");
    const converted: { [id: string]: CustomEntity } = {};
    for (const [id, e] of Object.entries(this.bot.entities)) {
      converted[id] = TypeConverters.entity(e);
    }
    return converted;
  }

  get inventory() {
    if (!this.bot) return this.wrapError("Not connected");
    return {
      items: () => this.bot!.inventory.items().map(TypeConverters.item),
      slots: Object.fromEntries(
        Object.entries(this.bot!.inventory.slots).map(([slot, item]) => [
          slot,
          item ? TypeConverters.item(item) : null,
        ])
      ),
    };
  }

  get pathfinder() {
    if (!this.bot) return this.wrapError("Not connected");
    if (!this.movements) {
      this.movements = new Movements(this.bot as unknown as Bot);
    }
    const pf = this.bot.pathfinder;
    const currentMovements = this.movements;

    return {
      setMovements: (movements: Movements) => {
        this.movements = movements;
        pf.setMovements(movements);
      },
      goto: (goal: goals.Goal) => pf.goto(goal),
      getPathTo: async (goal: goals.Goal, timeout?: number) => {
        if (!this.movements) return this.wrapError("Movements not initialized");
        const path = await pf.getPathTo(this.movements, goal, timeout);
        if (!path) return null;
        return {
          path: path.path.map((pos: any) => new Vec3(pos.x, pos.y, pos.z)),
        };
      },
    };
  }

  blockAt(position: Vec3): Block | null {
    if (!this.bot) return this.wrapError("Not connected");
    const block = this.bot.blockAt(position);
    return block ? TypeConverters.block(block) : null;
  }

  findBlocks(options: {
    matching: ((block: Block) => boolean) | string | string[];
    maxDistance: number;
    count: number;
    point?: Vec3;
  }): Vec3[] {
    if (!this.bot) return this.wrapError("Not connected");

    // Convert string or string[] to matching function
    let matchingFn: (block: PrismarineBlock) => boolean;
    if (typeof options.matching === "string") {
      const blockName = options.matching;
      matchingFn = (b: PrismarineBlock) => b.name === blockName;
    } else if (Array.isArray(options.matching)) {
      const blockNames = options.matching;
      matchingFn = (b: PrismarineBlock) => blockNames.includes(b.name);
    } else {
      const matchingFunc = options.matching;
      matchingFn = (b: PrismarineBlock) =>
        matchingFunc(TypeConverters.block(b));
    }

    return this.bot.findBlocks({
      ...options,
      matching: matchingFn,
    });
  }

  getEquipmentDestSlot(destination: string): number {
    if (!this.bot) return this.wrapError("Not connected");
    return this.bot.getEquipmentDestSlot(destination);
  }

  canSeeEntity(entity: CustomEntity): boolean {
    if (!this.bot) return false;
    const prismarineEntity = Object.values(this.bot.entities).find(
      (e) =>
        e.name === entity.name &&
        e.position.equals(
          new Vec3(entity.position.x, entity.position.y, entity.position.z)
        )
    );
    if (!prismarineEntity) return false;

    // Simple line-of-sight check
    const distance = prismarineEntity.position.distanceTo(
      this.bot.entity.position
    );
    return (
      distance <= 32 &&
      this.hasLineOfSight(this.bot.entity.position, prismarineEntity.position)
    );
  }

  private hasLineOfSight(start: Vec3, end: Vec3): boolean {
    if (!this.bot) return false;
    const direction = end.minus(start).normalize();
    const distance = start.distanceTo(end);
    const steps = Math.ceil(distance);

    for (let i = 1; i < steps; i++) {
      const point = start.plus(direction.scaled(i));
      const block = this.getPrismarineBlock(point);
      if (block?.boundingBox !== "empty") {
        return false;
      }
    }
    return true;
  }

  private getPrismarineBlock(
    position: Vec3
  ): PrismarineBlockWithBoundingBox | undefined {
    if (!this.bot) return undefined;
    const block = this.bot.blockAt(position);
    if (!block) return undefined;
    return block as PrismarineBlockWithBoundingBox;
  }

  async craftItem(
    itemName: string,
    quantity: number = 1,
    useCraftingTable: boolean = false
  ): Promise<void> {
    if (!this.bot) return this.wrapError("Not connected");

    try {
      // Find all available recipes
      const itemById = this.bot.registry.itemsByName[itemName];
      if (!itemById) return this.wrapError(`Unknown item: ${itemName}`);
      const recipes = this.bot.recipesFor(itemById.id, 1, null, true);
      const recipe = recipes[0]; // First matching recipe

      if (!recipe) {
        return this.wrapError(`No recipe found for ${itemName}`);
      }

      if (recipe.requiresTable && !useCraftingTable) {
        return this.wrapError(`${itemName} requires a crafting table`);
      }

      // If we need a crafting table, find one nearby or place one
      let craftingTableBlock = null;
      if (useCraftingTable) {
        const nearbyBlocks = this.findBlocks({
          matching: (block) => block.name === "crafting_table",
          maxDistance: 4,
          count: 1,
        });

        if (nearbyBlocks.length > 0) {
          craftingTableBlock = this.bot.blockAt(nearbyBlocks[0]);
        } else {
          // Try to place a crafting table
          const tableItem = this.bot.inventory
            .items()
            .find((i) => i.name === "crafting_table");
          if (!tableItem) {
            return this.wrapError("No crafting table in inventory");
          }

          // Find a suitable position to place the table
          const pos = this.bot.entity.position.offset(0, 0, 1);
          await this.placeBlock(pos.x, pos.y, pos.z, "crafting_table");
          craftingTableBlock = this.bot.blockAt(pos);
        }
      }

      await this.bot.craft(recipe, quantity, craftingTableBlock || undefined);
    } catch (error) {
      return this.wrapError(
        `Failed to craft ${itemName}: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }

  async equipItem(
    itemName: string,
    destination: EquipmentDestination
  ): Promise<void> {
    if (!this.bot) return this.wrapError("Not connected");

    const item = this.bot.inventory.items().find((i) => i.name === itemName);
    if (!item) return this.wrapError(`No ${itemName} in inventory`);

    try {
      await this.bot.equip(item, destination);
    } catch (error) {
      return this.wrapError(
        `Failed to equip ${itemName}: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }

  async dropItem(itemName: string, quantity: number = 1): Promise<void> {
    if (!this.bot) return this.wrapError("Not connected");

    const item = this.bot.inventory.items().find((i) => i.name === itemName);
    if (!item) return this.wrapError(`No ${itemName} in inventory`);

    try {
      await this.bot.toss(item.type, quantity, null);
    } catch (error) {
      return this.wrapError(
        `Failed to drop ${itemName}: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }

  async openContainer(position: Position): Promise<Container> {
    if (!this.bot) return this.wrapError("Not connected");

    const block = this.bot.blockAt(
      new Vec3(position.x, position.y, position.z)
    );
    if (!block) return this.wrapError("No block at specified position");

    try {
      const container = await this.bot.openContainer(block);

      return {
        type: block.name as "chest" | "furnace" | "crafting_table",
        position,
        slots: Object.fromEntries(
          Object.entries(container.slots).map(([slot, item]) => [
            slot,
            item ? TypeConverters.item(item as Item) : null,
          ])
        ),
      };
    } catch (error) {
      return this.wrapError(
        `Failed to open container: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }

  closeContainer(): void {
    if (!this.bot?.currentWindow) return;
    this.bot.closeWindow(this.bot.currentWindow);
  }

  getRecipe(itemName: string): Recipe | null {
    if (!this.bot) return null;

    const itemById = this.bot.registry.itemsByName[itemName];
    if (!itemById) return null;
    const recipes = this.bot.recipesFor(itemById.id, 1, null, true);
    const recipe = recipes[0];
    if (!recipe) return null;

    return {
      name: itemName,
      ingredients: (recipe.ingredients as any[])
        .filter((item) => item != null)
        .reduce((acc: { [key: string]: number }, item) => {
          const name = Object.entries(this.bot!.registry.itemsByName).find(
            ([_, v]) => v.id === item.id
          )?.[0];
          if (name) {
            acc[name] = (acc[name] || 0) + 1;
          }
          return acc;
        }, {}),
      requiresCraftingTable: recipe.requiresTable,
    };
  }

  listAvailableRecipes(): Recipe[] {
    if (!this.bot) return [];

    const recipes = new Set<string>();

    // Get all item names from registry
    Object.keys(this.bot.registry.itemsByName).forEach((name) => {
      const recipe = this.getRecipe(name);
      if (recipe) {
        recipes.add(name);
      }
    });

    return Array.from(recipes)
      .map((name) => this.getRecipe(name))
      .filter((recipe): recipe is Recipe => recipe !== null);
  }

  canCraft(recipe: Recipe): boolean {
    if (!this.bot) return false;

    // Check if we have all required ingredients
    for (const [itemName, count] of Object.entries(recipe.ingredients)) {
      const available = this.bot.inventory
        .items()
        .filter((item) => item.name === itemName)
        .reduce((sum, item) => sum + item.count, 0);

      if (available < count) return false;
    }

    // If it needs a crafting table, check if we have one or can reach one
    if (recipe.requiresCraftingTable) {
      const hasCraftingTable = this.bot.inventory
        .items()
        .some((item) => item.name === "crafting_table");

      if (!hasCraftingTable) {
        const nearbyCraftingTable = this.findBlocks({
          matching: (block) => block.name === "crafting_table",
          maxDistance: 4,
          count: 1,
        });

        if (nearbyCraftingTable.length === 0) return false;
      }
    }

    return true;
  }

  async smeltItem(
    itemName: string,
    fuelName: string,
    quantity: number = 1
  ): Promise<void> {
    if (!this.bot) return this.wrapError("Not connected");

    try {
      // Find a nearby furnace or place one
      const nearbyBlocks = this.findBlocks({
        matching: (block) => block.name === "furnace",
        maxDistance: 4,
        count: 1,
      });

      let furnaceBlock;
      if (nearbyBlocks.length > 0) {
        furnaceBlock = this.bot.blockAt(nearbyBlocks[0]);
      } else {
        // Try to place a furnace
        const furnaceItem = this.bot.inventory
          .items()
          .find((i) => i.name === "furnace");
        if (!furnaceItem) {
          return this.wrapError("No furnace in inventory");
        }

        const pos = this.bot.entity.position.offset(0, 0, 1);
        await this.placeBlock(pos.x, pos.y, pos.z, "furnace");
        furnaceBlock = this.bot.blockAt(pos);
      }

      if (!furnaceBlock)
        return this.wrapError("Could not find or place furnace");

      // Open the furnace
      const furnace = (await this.bot.openContainer(
        furnaceBlock
      )) as unknown as Furnace;

      try {
        // Add the item to smelt
        const itemToSmelt = this.bot.inventory
          .items()
          .find((i) => i.name === itemName);
        if (!itemToSmelt) return this.wrapError(`No ${itemName} in inventory`);

        // Add the fuel
        const fuelItem = this.bot.inventory
          .items()
          .find((i) => i.name === fuelName);
        if (!fuelItem) return this.wrapError(`No ${fuelName} in inventory`);

        // Put items in the furnace
        await furnace.putInput(itemToSmelt.type, null, quantity);
        await furnace.putFuel(fuelItem.type, null, quantity);

        // Wait for smelting to complete
        await new Promise((resolve) => {
          const checkInterval = setInterval(() => {
            if (furnace.fuel === 0 && furnace.progress === 0) {
              clearInterval(checkInterval);
              resolve(null);
            }
          }, 1000);
        });
      } finally {
        // Always close the furnace when done
        this.bot.closeWindow(furnace);
      }
    } catch (error) {
      return this.wrapError(
        `Failed to smelt ${itemName}: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }

  async depositItem(
    containerPosition: Position,
    itemName: string,
    quantity: number = 1
  ): Promise<void> {
    if (!this.bot) return this.wrapError("Not connected");

    try {
      const block = this.bot.blockAt(
        new Vec3(containerPosition.x, containerPosition.y, containerPosition.z)
      );
      if (!block) return this.wrapError("No container at position");

      const window = await this.bot.openContainer(block);
      if (!window) return this.wrapError("Failed to open container");

      try {
        const item = this.bot.inventory.slots.find((i) => i?.name === itemName);
        if (!item) return this.wrapError(`No ${itemName} in inventory`);

        const emptySlot = window.slots.findIndex(
          (slot: Item | null) => slot === null
        );
        if (emptySlot === -1) return this.wrapError("Container is full");

        await this.bot.moveSlotItem(item.slot, emptySlot);
      } finally {
        this.bot.closeWindow(window);
      }
    } catch (error) {
      return this.wrapError(
        `Failed to deposit ${itemName}: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }

  async withdrawItem(
    containerPosition: Position,
    itemName: string,
    quantity: number = 1
  ): Promise<void> {
    if (!this.bot) return this.wrapError("Not connected");

    try {
      const block = this.bot.blockAt(
        new Vec3(containerPosition.x, containerPosition.y, containerPosition.z)
      );
      if (!block) return this.wrapError("No container at position");

      const window = await this.bot.openContainer(block);
      if (!window) return this.wrapError("Failed to open container");

      try {
        const containerSlot = window.slots.findIndex(
          (item: Item | null) => item?.name === itemName
        );
        if (containerSlot === -1)
          return this.wrapError(`No ${itemName} in container`);

        const emptySlot = this.bot.inventory.slots.findIndex(
          (slot) => slot === null
        );
        if (emptySlot === -1) return this.wrapError("Inventory is full");

        await this.bot.moveSlotItem(containerSlot, emptySlot);
      } finally {
        this.bot.closeWindow(window);
      }
    } catch (error) {
      return this.wrapError(
        `Failed to withdraw ${itemName}: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }

  private wrapError(message: string): never {
    // If we're not connected and have connection params, try to reconnect first
    if (!this.bot && this.lastConnectionParams && !this.isConnecting) {
      this.connect(
        this.lastConnectionParams.host,
        this.lastConnectionParams.port,
        this.lastConnectionParams.username
      ).catch((error) => {
        console.error("Failed to reconnect:", error);
      });
    }

    const response: ToolResponse = {
      content: [
        {
          type: "text",
          text: message,
        },
      ],
      isError: true,
    };
    throw response;
  }
}
