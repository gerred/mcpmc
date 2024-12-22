import { Transport } from '@modelcontextprotocol/sdk/server/transport.js';

interface Message {
  jsonrpc: string;
  id?: string | number;
  method?: string;
  params?: any;
  result?: any;
  error?: any;
}

export class InMemoryTransport implements Transport {
  onmessage?: (message: Message) => void;
  private otherTransport?: InMemoryTransport;

  async start(): Promise<void> {}
  async close(): Promise<void> {}

  async send(message: Message): Promise<void> {
    if (this.otherTransport?.onmessage) {
      await this.otherTransport.onmessage(message);
    }
  }

  static createLinkedPair(): [InMemoryTransport, InMemoryTransport] {
    const transport1 = new InMemoryTransport();
    const transport2 = new InMemoryTransport();
    
    transport1.otherTransport = transport2;
    transport2.otherTransport = transport1;
    
    return [transport1, transport2];
  }
}
