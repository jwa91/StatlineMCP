// src/index.ts
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import log from "./shared/logger.js";
import { registerAllCbsTools } from "./tools/toolDefinitions.js";

/**
 * Main entry point for the CBS Statline MCP Server.
 * Initializes the server, registers tools, and connects the transport.
 */
async function main(): Promise<void> {
  log.info("Initializing CBS Statline MCP Server...");

  const server = new McpServer({
    name: "cbs-statline",
    version: "1.1.0", // Updated version
    // Capabilities are often implicitly declared by registering tools/prompts/resources
    // using the McpServer helper methods. Explicit declaration might be needed
    // for specific capabilities or if using lower-level Server class directly.
    // capabilities: { tools: {}, resources: {}, prompts: {} },
  });

  // Register all tools defined in toolDefinitions.ts
  registerAllCbsTools(server);

  // Setup the communication transport (stdio for local integration)
  const transport = new StdioServerTransport();

  try {
    // Connect the server logic to the transport layer
    await server.connect(transport);
    log.info("CBS Statline MCP Server connected via stdio and ready.");
  } catch (error) {
    log.error("Failed to connect the server via transport:", error);
    process.exit(1); // Exit if connection fails
  }
}

// Execute the main function and catch any top-level errors
main().catch((error) => {
  log.error("Fatal error during server execution:", error);
  process.exit(1);
});
