import { fetchObservationsFromCBS } from "./query.js";
import { type QueryStatlineDataInput, type QueryStatlineDataOutput, queryStatlineDataOutputSchema } from "./schemas.js";
import { handleToolExecution } from "../../shared/mcpUtils.js";
import log from "../../shared/logger.js";

/** Name of the tool. */
export const queryStatlineDataToolName = "query_statline_data";

/**
 * Core logic for the query_statline_data tool.
 * Fetches observations based on input and validates the result format.
 * @param input Validated input arguments.
 * @returns The array of observation data or null on failure.
 */
async function queryDataLogic(input: QueryStatlineDataInput): Promise<QueryStatlineDataOutput | null> {
  const context = `${queryStatlineDataToolName}.logic`;
  const observations = await fetchObservationsFromCBS(input);

  if (observations === null) {
    // Error logged in fetchObservationsFromCBS or handled by handleToolExecution wrapper
    return null;
  }

  // Validate the structure received from the API/query function against the expected output schema.
  const parsedOutput = queryStatlineDataOutputSchema.safeParse(observations);
  if (!parsedOutput.success) {
    log.error(
      `[${context}] Failed to validate final output structure received from query:`,
      parsedOutput.error.format()
    );
    return null; // Internal validation/formatting error
  }

  return parsedOutput.data;
}

/**
 * Exported handler function that wraps the core logic with standardized execution handling.
 * @param input Validated input arguments.
 * @returns A Promise resolving to a CallToolResult.
 */
export const queryStatlineDataHandler = (input: QueryStatlineDataInput) => {
  return handleToolExecution(queryStatlineDataToolName, input, queryDataLogic);
};
