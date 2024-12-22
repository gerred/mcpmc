#!/usr/bin/env node

// Only if this file is run directly, create and start the server
if (import.meta.url === `file://${process.argv[1]}`) {
  const { MinecraftServer } = await import("./server.js");
  const { parseArgs } = await import("./cli.js");

  try {
    const connectionParams = parseArgs(process.argv.slice(2));
    const server = new MinecraftServer(connectionParams);

    // Suppress deprecation warnings
    process.removeAllListeners("warning");
    process.on("warning", (warning) => {
      if (warning.name !== "DeprecationWarning") {
        process.stderr.write(
          JSON.stringify({
            jsonrpc: "2.0",
            method: "system.warning",
            params: {
              message: warning.toString(),
              type: "warning",
            },
          }) + "\n"
        );
      }
    });

    await server.start();
  } catch (error: unknown) {
    throw {
      code: -32000,
      message: "Server startup failed",
      data: {
        error: error instanceof Error ? error.message : String(error),
      },
    };
  }
}

export * from "./server.js";
export * from "./schemas.js";
export * from "./tools/index.js";
export * from "./core/bot.js";
export * from "./handlers/tools.js";
export * from "./handlers/resources.js";
