import { fetchAndEnrichDatasetsFromCBS } from "./query.js";
import {
  type FindStatlineTablesInput,
  type FindStatlineTablesOutput,
  findStatlineTablesOutputSchema,
} from "./schemas.js";
import { handleToolExecution } from "../../shared/mcpUtils.js";
import log from "../../shared/logger.js";

/** Name of the tool. */
export const findStatlineTablesToolName = "find_statline_tables";

/**
 * Core logic for the find_statline_tables tool.
 * Uses the hybrid approach: searches v1 API, then enriches with Catalog data.
 * @param input Validated input arguments.
 * @returns The enriched and structured output data or null on failure.
 */
async function findTablesLogic(input: FindStatlineTablesInput): Promise<FindStatlineTablesOutput | null> {
  const context = `${findStatlineTablesToolName}.logic`;
  // Call the query function that performs both search and enrichment
  const enrichedDatasets = await fetchAndEnrichDatasetsFromCBS(input);

  if (enrichedDatasets === null) {
    // Error already logged in query function or handled by wrapper
    return null;
  }

  // Data should already be in the FindStatlineTablesOutput format.
  // Validate the final structure as a safeguard.
  const parsedOutput = findStatlineTablesOutputSchema.safeParse(enrichedDatasets);
  if (!parsedOutput.success) {
    log.error(`[${context}] Failed to validate final enriched output structure:`, parsedOutput.error.format());
    return null; // Indicate internal validation error
  }

  return parsedOutput.data;
}

/** Exported handler function wrapping the core logic. */
export const findStatlineTablesHandler = (input: FindStatlineTablesInput) => {
  return handleToolExecution(findStatlineTablesToolName, input, findTablesLogic);
};
