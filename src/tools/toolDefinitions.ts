// biome-ignore lint/style/useImportType: 'z' is used as a value here to define Zod schemas.
import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { CallToolResult, ToolAnnotations } from "@modelcontextprotocol/sdk/types.js";
import log from "../shared/logger.js";

import { findStatlineTablesInputSchema } from "./findStatlineTables/schemas.js";
import { getStatlineTableMetadataInputSchema } from "./getStatlineTableMetadata/schemas.js";
import { queryStatlineDataInputSchema } from "./queryStatlineData/schemas.js";

import { findStatlineTablesHandler, findStatlineTablesToolName } from "./findStatlineTables/handler.js";
import {
  getStatlineTableMetadataHandler,
  getStatlineTableMetadataToolName,
} from "./getStatlineTableMetadata/handler.js";
import { queryStatlineDataHandler, queryStatlineDataToolName } from "./queryStatlineData/handler.js";

/** Defines the structure for registering an MCP tool. */
interface CbsToolDefinition {
  name: string;
  description: string;
  /** The Zod schema defining the input parameters for the tool. */
  inputSchema: z.ZodObject<z.ZodRawShape>;
  /**
   * The handler function that executes the tool's logic.
   * It receives validated input and returns a Promise resolving to a CallToolResult.
   */
  // biome-ignore lint/suspicious/noExplicitAny: Input type safety is enforced by Zod schema validation during SDK registration and handler execution.
  handler: (input: any) => Promise<CallToolResult>;
  /** Optional MCP Tool Annotations providing hints about behavior. */
  annotations?: ToolAnnotations;
}

export const cbsTools: CbsToolDefinition[] = [
  {
    name: findStatlineTablesToolName,
    description: `Searches the CBS Statline OData Catalog for datasets (tables) matching keywords, ordered by modification date (most recent first). Returns a list including table ID, title, summary, status (e.g., 'Regulier', 'Gediscontinueerd'), frequency, data period, and modification date. Use the 'id' with other tools. Tip: Check 'status' before deciding to query data for a table. Start with broad keywords for searching.`,
    inputSchema: findStatlineTablesInputSchema,
    handler: findStatlineTablesHandler,
    annotations: {
      title: "Find CBS Statline Datasets",
      readOnlyHint: true,
      openWorldHint: true,
    },
  },
  {
    name: getStatlineTableMetadataToolName,
    description: `Retrieves detailed metadata for a specific CBS Statline dataset ID. Returns:
1. 'properties': Table info like Title, Summary, Status, Frequency. Check 'Status' field before querying data.
2. 'dimensions': A list of available dimensions for filtering. Each object contains 'key' (e.g., 'RegioS', 'Perioden', maybe 'Measure'), 'title', and sample 'codes' (like {id: 'PV23', title: 'Overijssel'}). Use these dimension 'key's and code 'id's in the 'filters' of query_statline_data.
3. 'measures': A list of available data measures/topics in the table. Each object contains 'key' (e.g., 'NietGenormaliseerdeProductie_2'), 'title', 'unit', etc. This list tells you WHAT data is available. See query_statline_data tool description for tips on retrieving specific measure values.`,
    inputSchema: getStatlineTableMetadataInputSchema,
    handler: getStatlineTableMetadataHandler,
    annotations: {
      title: "Get CBS Dataset Metadata",
      readOnlyHint: true,
      openWorldHint: true,
    },
  },
  {
    name: queryStatlineDataToolName,
    description: `Retrieves data rows (observations) from a CBS Statline table ID using 'filters' and optionally 'select'.
- 'filters': REQUIRED object using dimension 'key's and code 'id's from metadata.
- 'select': OPTIONAL array of column keys to return.
- **TIP:** To reliably find the correct measure code (often needed in 'filters' under a 'Measure' key) and the right value column name (often 'Value', needed for 'select'), it's recommended to first call this tool with your dimension filters but **leave 'select' empty** and set 'maxRows' to a small number (e.g., 1-5). Examine the keys and values in the result to determine the correct 'Measure' code to filter on (if needed) and the correct column name (like 'Value') to select in your final, more specific query.
- Example Final Query (after sampling): filters: {"RegioS": "PV23", "Perioden": "2023JJ00", "Measure": "M002195"}, select: ["Value", "RegioS"]
- Returns an array of data records. Remember to check table 'Status' from metadata first; querying 'Discontinued' tables may fail.`,
    inputSchema: queryStatlineDataInputSchema,
    handler: queryStatlineDataHandler,
    annotations: {
      title: "Query CBS Statline Data",
      readOnlyHint: true,
      openWorldHint: true,
    },
  },
];

/**
 * Registers all defined CBS tools with the MCP server instance.
 * @param server The McpServer instance.
 */
export function registerAllCbsTools(server: McpServer): void {
  log.info("Registering CBS Statline tools...");
  for (const toolDef of cbsTools) {
    server.tool(toolDef.name, toolDef.description, toolDef.inputSchema.shape, toolDef.handler);
  }
  log.info(`Registered ${cbsTools.length} tools.`);
}
