import type { Transport } from "@modelcontextprotocol/sdk/shared/transport.js";
import type {
  Request,
  Result,
  Notification,
} from "@modelcontextprotocol/sdk/types.js";

export type Message = Request | Result | Notification;

export class MockTransport implements Transport {
  onclose?: () => void;
  onerror?: (error: Error) => void;
  onmessage?: (message: Message) => void;

  private messages: Message[] = [];

  async start(): Promise<void> {}
  async close(): Promise<void> {
    this.onclose?.();
  }

  async send(message: Message): Promise<void> {
    this.messages.push(message);
  }

  getMessages(): Message[] {
    return this.messages;
  }

  simulateReceive(message: Message): void {
    this.onmessage?.(message);
  }

  simulateError(error: Error): void {
    this.onerror?.(error);
  }

  simulateClose(): void {
    this.onclose?.();
  }
}
