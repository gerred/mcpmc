import type { MinecraftBot } from "../../types/minecraft";
import type {
  Player,
  InventoryItem,
  Entity,
  Block,
  HealthStatus,
  Weather,
  Position,
  Recipe,
  Container,
} from "../../types/minecraft";
import { Vec3 } from "vec3";
import { goals, Movements } from "mineflayer-pathfinder";

interface ConnectionParams {
  host: string;
  port: number;
  username: string;
}

export class MockMinecraftBot implements MinecraftBot {
  private connected = true;
  private position: Position = { x: 0, y: 64, z: 0 };
  private _inventory: { items: InventoryItem[] } = { items: [] };

  constructor(params: ConnectionParams) {
    // In a mock, we just store the params but don't actually connect
    this.connected = true;
  }

  get entity() {
    this.checkConnection();
    return {
      position: new Vec3(this.position.x, this.position.y, this.position.z),
      velocity: new Vec3(0, 0, 0),
      yaw: 0,
      pitch: 0,
    };
  }

  get entities() {
    this.checkConnection();
    return {};
  }

  get inventory() {
    this.checkConnection();
    return {
      items: () => this._inventory.items,
      slots: {},
    };
  }

  get pathfinder() {
    this.checkConnection();
    return {
      setMovements: (movements: Movements) => {},
      goto: (goal: goals.Goal) => Promise.resolve(),
      getPathTo: async (
        movements: Movements,
        goal: goals.Goal,
        timeout?: number
      ) => {
        return {
          path: [new Vec3(0, 0, 0)],
        };
      },
    };
  }

  disconnect(): void {
    this.connected = false;
  }

  private checkConnection() {
    if (!this.connected) throw new Error("Not connected");
  }

  chat(message: string): void {
    this.checkConnection();
  }

  getPosition(): Position | null {
    if (!this.connected) return null;
    return this.position;
  }

  getHealth(): number {
    this.checkConnection();
    return 20;
  }

  getInventory(): InventoryItem[] {
    this.checkConnection();
    return [];
  }

  getPlayers(): Player[] {
    this.checkConnection();
    return [];
  }

  async navigateTo(x: number, y: number, z: number): Promise<void> {
    this.checkConnection();
    this.position = { x, y, z };
  }

  async digBlock(x: number, y: number, z: number): Promise<void> {
    this.checkConnection();
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
    this.checkConnection();
    if (progressCallback) {
      progressCallback(100, 1, 1);
    }
  }

  async placeBlock(
    x: number,
    y: number,
    z: number,
    blockName: string
  ): Promise<void> {
    this.checkConnection();
  }

  async followPlayer(username: string, distance?: number): Promise<void> {
    this.checkConnection();
  }

  async attackEntity(entityName: string, maxDistance?: number): Promise<void> {
    this.checkConnection();
  }

  getEntitiesNearby(maxDistance?: number): Entity[] {
    this.checkConnection();
    return [];
  }

  getBlocksNearby(maxDistance?: number, count?: number): Block[] {
    this.checkConnection();
    return [];
  }

  getHealthStatus(): HealthStatus {
    this.checkConnection();
    return {
      health: 20,
      food: 20,
      saturation: 5,
      armor: 0,
    };
  }

  getWeather(): Weather {
    this.checkConnection();
    return {
      isRaining: false,
      rainState: "clear",
      thunderState: 0,
    };
  }

  async navigateRelative(dx: number, dy: number, dz: number): Promise<void> {
    this.checkConnection();
    const pos = this.position;
    this.position = { x: pos.x + dx, y: pos.y + dy, z: pos.z + dz };
  }

  async digBlockRelative(dx: number, dy: number, dz: number): Promise<void> {
    this.checkConnection();
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
    this.checkConnection();
    if (progressCallback) {
      progressCallback(100, 1, 1);
    }
  }

  blockAt(position: Vec3): Block | null {
    this.checkConnection();
    return null;
  }

  findBlocks(options: {
    matching: ((block: Block) => boolean) | string | string[];
    maxDistance: number;
    count: number;
    point?: Vec3;
  }): Vec3[] {
    this.checkConnection();
    return [];
  }

  getEquipmentDestSlot(destination: string): number {
    this.checkConnection();
    return 0;
  }

  canSeeEntity(entity: Entity): boolean {
    this.checkConnection();
    return false;
  }

  async craftItem(
    itemName: string,
    quantity?: number,
    useCraftingTable?: boolean
  ): Promise<void> {
    this.checkConnection();
  }

  async equipItem(itemName: string, destination: string): Promise<void> {
    this.checkConnection();
  }

  async dropItem(itemName: string, quantity?: number): Promise<void> {
    this.checkConnection();
  }

  async openContainer(position: Position): Promise<Container> {
    this.checkConnection();
    return {
      type: "chest",
      position,
      slots: {},
    };
  }

  closeContainer(): void {
    this.checkConnection();
  }

  getRecipe(itemName: string): Recipe | null {
    this.checkConnection();
    return null;
  }

  listAvailableRecipes(): Recipe[] {
    this.checkConnection();
    return [];
  }

  async smeltItem(
    itemName: string,
    fuelName: string,
    quantity?: number
  ): Promise<void> {
    this.checkConnection();
  }

  async depositItem(
    containerPosition: Position,
    itemName: string,
    quantity?: number
  ): Promise<void> {
    this.checkConnection();
  }

  async withdrawItem(
    containerPosition: Position,
    itemName: string,
    quantity?: number
  ): Promise<void> {
    this.checkConnection();
  }

  canCraft(recipe: Recipe): boolean {
    this.checkConnection();
    return false;
  }
}
