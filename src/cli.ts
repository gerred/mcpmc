import { z } from "zod";

export const cliSchema = z.object({
  host: z.string().default("localhost"),
  port: z.number().int().min(1).max(65535).default(25565),
  username: z.string().min(1).default("Claude"),
});

export type CLIArgs = z.infer<typeof cliSchema>;

export function parseArgs(args: string[]): CLIArgs {
  const parsedArgs: Record<string, string | number> = {};

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg.startsWith("--")) {
      const key = arg.slice(2);
      const value = args[i + 1];
      if (value && !value.startsWith("--")) {
        parsedArgs[key] = key === "port" ? parseInt(value, 10) : value;
        i++; // Skip the value in next iteration
      }
    }
  }

  // Parse with schema and get defaults
  return cliSchema.parse({
    host: parsedArgs.host || undefined,
    port: parsedArgs.port || undefined,
    username: parsedArgs.username || undefined,
  });
}
