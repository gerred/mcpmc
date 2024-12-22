# MCPMC (Minecraft Model Context Protocol)

[![npm version](https://badge.fury.io/js/@gerred%2Fmcpmc.svg)](https://badge.fury.io/js/@gerred%2Fmcpmc)
[![npm downloads](https://img.shields.io/npm/dm/@gerred/mcpmc.svg)](https://www.npmjs.com/package/@gerred/mcpmc)
[![CI](https://github.com/gerred/mcpmc/workflows/CI/badge.svg)](https://github.com/gerred/mcpmc/actions?query=workflow%3ACI)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

A Model Context Protocol (MCP) server for interacting with Minecraft via Mineflayer. This package enables AI agents to control Minecraft bots through a standardized JSON-RPC interface.

## Features

- Full MCP compatibility for AI agent integration
- Built on Mineflayer for reliable Minecraft interaction
- Supports navigation, block manipulation, inventory management, and more
- Real-time game state monitoring
- Type-safe API with TypeScript support

## Installation

```bash
# Using npm
npm install @gerred/mcpmc

# Using yarn
yarn add @gerred/mcpmc

# Using bun
bun add @gerred/mcpmc
```

## Usage

```bash
# Start the MCP server
mcpmc
```

The server communicates via stdin/stdout using the Model Context Protocol. For detailed API documentation, use the MCP inspector:

```bash
bun run inspector
```

## Development

```bash
# Install dependencies
bun install

# Run tests
bun test

# Build the project
bun run build

# Watch mode during development
bun run watch

# Run MCP inspector
bun run inspector
```

## Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a new branch for your feature
3. Write tests for your changes
4. Make your changes
5. Run tests and ensure they pass
6. Submit a pull request

Please make sure to update tests as appropriate and adhere to the existing coding style.

## License

MIT License

Copyright (c) 2024 Gerred Dillon

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
