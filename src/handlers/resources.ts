import type { MinecraftBot } from "../types/minecraft";

export interface ResourceResponse {
  _meta?: {
    progressToken?: string | number;
  };
  contents: Array<{
    uri: string;
    mimeType: string;
    text: string;
  }>;
}

export interface ResourceHandler {
  handleGetPlayers(uri: string): Promise<ResourceResponse>;
  handleGetPosition(uri: string): Promise<ResourceResponse>;
  handleGetBlocksNearby(uri: string): Promise<ResourceResponse>;
  handleGetEntitiesNearby(uri: string): Promise<ResourceResponse>;
  handleGetInventory(uri: string): Promise<ResourceResponse>;
  handleGetHealth(uri: string): Promise<ResourceResponse>;
  handleGetWeather(uri: string): Promise<ResourceResponse>;
}

export class MinecraftResourceHandler implements ResourceHandler {
  constructor(private bot: MinecraftBot) {}

  async handleGetPlayers(uri: string): Promise<ResourceResponse> {
    const players = this.bot.getPlayers();
    return {
      _meta: {},
      contents: [
        {
          uri,
          mimeType: "application/json",
          text: JSON.stringify(players, null, 2),
        },
      ],
    };
  }

  async handleGetPosition(uri: string): Promise<ResourceResponse> {
    const position = this.bot.getPosition();
    return {
      _meta: {},
      contents: [
        {
          uri,
          mimeType: "application/json",
          text: JSON.stringify(position, null, 2),
        },
      ],
    };
  }

  async handleGetBlocksNearby(uri: string): Promise<ResourceResponse> {
    const blocks = this.bot.getBlocksNearby();
    return {
      _meta: {},
      contents: [
        {
          uri,
          mimeType: "application/json",
          text: JSON.stringify(blocks, null, 2),
        },
      ],
    };
  }

  async handleGetEntitiesNearby(uri: string): Promise<ResourceResponse> {
    const entities = this.bot.getEntitiesNearby();
    return {
      _meta: {},
      contents: [
        {
          uri,
          mimeType: "application/json",
          text: JSON.stringify(entities, null, 2),
        },
      ],
    };
  }

  async handleGetInventory(uri: string): Promise<ResourceResponse> {
    const inventory = this.bot.getInventory();
    return {
      _meta: {},
      contents: [
        {
          uri,
          mimeType: "application/json",
          text: JSON.stringify(inventory, null, 2),
        },
      ],
    };
  }

  async handleGetHealth(uri: string): Promise<ResourceResponse> {
    const health = this.bot.getHealthStatus();
    return {
      _meta: {},
      contents: [
        {
          uri,
          mimeType: "application/json",
          text: JSON.stringify(health, null, 2),
        },
      ],
    };
  }

  async handleGetWeather(uri: string): Promise<ResourceResponse> {
    const weather = this.bot.getWeather();
    return {
      _meta: {},
      contents: [
        {
          uri,
          mimeType: "application/json",
          text: JSON.stringify(weather, null, 2),
        },
      ],
    };
  }
}
