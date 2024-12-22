import { describe, it, expect, beforeEach } from "@jest/globals";
import { MockMinecraftBot } from "./mocks/mockBot";
import { MinecraftServer } from "../core/server";
import { MockTransport } from "./mocks/mockTransport";
import type { Message } from "./mocks/mockTransport";

interface ServerStatusParams {
  type: "startup" | "connection" | "error";
  status?: "running" | "connected" | "disconnected";
  transport?: string;
  error?: string;
}

describe("MinecraftServer", () => {
  let mockBot: MockMinecraftBot;
  let server: MinecraftServer;
  let transport: MockTransport;

  beforeEach(async () => {
    mockBot = new MockMinecraftBot({
      host: "localhost",
      port: 25565,
      username: "testBot",
    });
    transport = new MockTransport();
    server = new MinecraftServer(mockBot);
    await server.start(transport);
  });

  it("should send startup notification", async () => {
    const messages = transport.getMessages();
    const startupMsg = messages.find(
      (msg: Message) =>
        msg.method === "server/status" &&
        (msg.params as ServerStatusParams).type === "startup"
    );
    expect(startupMsg).toBeDefined();
  });

  it("should handle bot disconnection", async () => {
    mockBot.emit("end");
    await new Promise((resolve) => setTimeout(resolve, 100));

    const messages = transport.getMessages();
    const disconnectMsg = messages.find(
      (msg: Message) =>
        msg.method === "server/status" &&
        (msg.params as ServerStatusParams).status === "disconnected"
    );
    expect(disconnectMsg).toBeDefined();
  });

  it("should handle tool calls", async () => {
    transport.simulateReceive({
      jsonrpc: "2.0",
      method: "tools/call",
      params: {
        name: "chat",
        arguments: { message: "test" },
      },
      id: 1,
    });

    await new Promise((resolve) => setTimeout(resolve, 100));
    const messages = transport.getMessages();
    const response = messages.find(
      (msg: Message) => "id" in msg && msg.id === 1
    );

    expect(response).toBeDefined();
    expect(response).toMatchObject({
      jsonrpc: "2.0",
      id: 1,
      result: expect.any(Object),
    });
  });
});
