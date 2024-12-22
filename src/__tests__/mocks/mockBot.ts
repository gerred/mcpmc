import { EventEmitter } from "events";
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

export class MockMinecraftBot extends EventEmitter implements MinecraftBot {
  private position = { x: 0, y: 64, z: 0 };
  private isConnected = true;
  private _inventory: { items: InventoryItem[] } = { items: [] };
  private connectCount = 0;

  get entity() {
    if (!this.isConnected) throw new Error("Not connected");
    return {
      position: new Vec3(this.position.x, this.position.y, this.position.z),
      velocity: new Vec3(0, 0, 0),
      yaw: 0,
      pitch: 0,
    };
  }

  get entities() {
    if (!this.isConnected) throw new Error("Not connected");
    return {};
  }

  get inventory() {
    if (!this.isConnected) throw new Error("Not connected");
    return {
      items: () => this._inventory.items,
      slots: {},
    };
  }

  get pathfinder() {
    if (!this.isConnected) throw new Error("Not connected");
    return {
      setMovements: () => {},
      goto: () => Promise.resolve(),
      getPathTo: () => Promise.resolve(null),
    };
  }

  constructor(private connectionParams: ConnectionParams) {
    super();
    setTimeout(() => {
      this.emit("spawn");
    }, 0);
  }

  async connect(host: string, port: number, username: string): Promise<void> {
    this.isConnected = true;
    this.connectCount++;
    setTimeout(() => {
      this.emit("spawn");
    }, 10);
    return Promise.resolve();
  }

  disconnect(): void {
    if (this.isConnected) {
      this.isConnected = false;
      this.emit("end");
    }
  }

  chat(message: string): void {
    if (!this.isConnected) throw new Error("Not connected");
  }

  getPosition() {
    if (!this.isConnected) throw new Error("Not connected");
    return { ...this.position };
  }

  getHealth() {
    if (!this.isConnected) throw new Error("Not connected");
    return 20;
  }

  getHealthStatus() {
    if (!this.isConnected) throw new Error("Not connected");
    return {
      health: 20,
      food: 20,
      saturation: 5,
      armor: 0,
    };
  }

  getWeather(): Weather {
    if (!this.isConnected) throw new Error("Not connected");
    return {
      isRaining: false,
      rainState: "clear",
      thunderState: 0,
    };
  }

  getInventory() {
    if (!this.isConnected) throw new Error("Not connected");
    return this._inventory.items;
  }

  getPlayers() {
    if (!this.isConnected) throw new Error("Not connected");
    return [];
  }

  async navigateTo(x: number, y: number, z: number) {
    if (!this.isConnected) throw new Error("Not connected");
    this.position = { x, y, z };
  }

  async navigateRelative(dx: number, dy: number, dz: number) {
    if (!this.isConnected) throw new Error("Not connected");
    this.position = {
      x: this.position.x + dx,
      y: this.position.y + dy,
      z: this.position.z + dz,
    };
  }

  async digBlock(x: number, y: number, z: number) {
    if (!this.isConnected) throw new Error("Not connected");
  }

  async digArea(start: any, end: any) {
    if (!this.isConnected) throw new Error("Not connected");
  }

  async placeBlock(x: number, y: number, z: number, blockName: string) {
    if (!this.isConnected) throw new Error("Not connected");
  }

  async followPlayer(username: string, distance: number) {
    if (!this.isConnected) throw new Error("Not connected");
  }

  async attackEntity(entityName: string, maxDistance: number) {
    if (!this.isConnected) throw new Error("Not connected");
  }

  getEntitiesNearby(maxDistance?: number): Entity[] {
    if (!this.isConnected) throw new Error("Not connected");
    return [];
  }

  getBlocksNearby(maxDistance?: number, count?: number): Block[] {
    if (!this.isConnected) throw new Error("Not connected");
    return [];
  }

  async digBlockRelative(dx: number, dy: number, dz: number): Promise<void> {
    if (!this.isConnected) throw new Error("Not connected");
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
    if (!this.isConnected) throw new Error("Not connected");
    if (progressCallback) {
      progressCallback(100, 1, 1);
    }
  }

  blockAt(position: Vec3): Block | null {
    if (!this.isConnected) throw new Error("Not connected");
    return null;
  }

  findBlocks(options: {
    matching: ((block: Block) => boolean) | string | string[];
    maxDistance: number;
    count: number;
    point?: Vec3;
  }): Vec3[] {
    if (!this.isConnected) throw new Error("Not connected");
    return [];
  }

  getEquipmentDestSlot(destination: string): number {
    if (!this.isConnected) throw new Error("Not connected");
    return 0;
  }

  canSeeEntity(entity: Entity): boolean {
    if (!this.isConnected) throw new Error("Not connected");
    return false;
  }

  async craftItem(
    itemName: string,
    quantity?: number,
    useCraftingTable?: boolean
  ): Promise<void> {
    if (!this.isConnected) throw new Error("Not connected");
  }

  async equipItem(itemName: string, destination: string): Promise<void> {
    if (!this.isConnected) throw new Error("Not connected");
  }

  async dropItem(itemName: string, quantity?: number): Promise<void> {
    if (!this.isConnected) throw new Error("Not connected");
  }

  async openContainer(position: Position): Promise<Container> {
    if (!this.isConnected) throw new Error("Not connected");
    return {
      type: "chest",
      position,
      slots: {},
    };
  }

  closeContainer(): void {
    if (!this.isConnected) throw new Error("Not connected");
  }

  getRecipe(itemName: string): Recipe | null {
    if (!this.isConnected) throw new Error("Not connected");
    return null;
  }

  listAvailableRecipes(): Recipe[] {
    if (!this.isConnected) throw new Error("Not connected");
    return [];
  }

  async smeltItem(
    itemName: string,
    fuelName: string,
    quantity?: number
  ): Promise<void> {
    if (!this.isConnected) throw new Error("Not connected");
  }

  async depositItem(
    containerPosition: Position,
    itemName: string,
    quantity?: number
  ): Promise<void> {
    if (!this.isConnected) throw new Error("Not connected");
  }

  async withdrawItem(
    containerPosition: Position,
    itemName: string,
    quantity?: number
  ): Promise<void> {
    if (!this.isConnected) throw new Error("Not connected");
  }

  canCraft(recipe: Recipe): boolean {
    if (!this.isConnected) throw new Error("Not connected");
    return false;
  }

  getConnectCount(): number {
    return this.connectCount;
  }
}
