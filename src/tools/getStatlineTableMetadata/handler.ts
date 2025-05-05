import {
  fetchDimensionSampleCodesFromCBS,
  fetchTableDimensionsFromCBS,
  fetchTablePropertiesFromCBS,
  fetchDataPropertiesFromCBS,
} from "./query.js";
import {
  type CbsDataProperty,
  type CbsDimension,
  type GetStatlineTableMetadataInput,
  type GetStatlineTableMetadataOutput,
  getStatlineTableMetadataOutputSchema,
} from "./schemas.js";
import { handleToolExecution } from "../../shared/mcpUtils.js";
import log from "../../shared/logger.js";

/** Name of the tool. */
export const getStatlineTableMetadataToolName = "get_statline_table_metadata";

const MAX_DESC_LENGTH_DIM_MEASURE = 250; // Limit description length for conciseness

/**
 * Processes dimension data, fetching sample codes for relevant dimensions.
 * @param tableId The table ID for context.
 * @param dimensions Array of dimension objects from the API.
 * @returns Array of processed dimension objects including sample codes.
 */
async function processDimensionsWithSampleCodes(
  tableId: string,
  dimensions: CbsDimension[]
): Promise<GetStatlineTableMetadataOutput["dimensions"]> {
  const context = `${getStatlineTableMetadataToolName}.processDimensions`;
  const processedDimensions: GetStatlineTableMetadataOutput["dimensions"] = [];

  await Promise.all(
    dimensions.map(async (dim: CbsDimension) => {
      let sampleCodesData: { id: string; title: string }[] | undefined = undefined;

      // Fetch sample codes only if CodesUrl exists and it's not a measure dimension
      if (typeof dim.CodesUrl === "string" && dim.Kind !== "Measure" && dim.Kind !== "Topic") {
        const codes = await fetchDimensionSampleCodesFromCBS(tableId, dim.Identifier, dim.CodesUrl);
        if (codes) {
          sampleCodesData = codes.map((c) => ({ id: c.Identifier, title: c.Title }));
        } else {
          log.warn(`[${context}] No sample codes retrieved for dimension ${dim.Identifier} using URL ${dim.CodesUrl}.`);
        }
      }

      // Truncate long descriptions
      const truncatedDescription = dim.Description
        ? dim.Description.length > MAX_DESC_LENGTH_DIM_MEASURE
          ? // FIX 1: Ensure template literal is used for truncation string
            `${dim.Description.substring(0, MAX_DESC_LENGTH_DIM_MEASURE)}...`
          : dim.Description
        : undefined;

      processedDimensions.push({
        key: dim.Identifier,
        title: dim.Title,
        description: truncatedDescription,
        sampleCodes: sampleCodesData,
      });
    })
  );

  return processedDimensions;
}

/**
 * Core logic for the get_statline_table_metadata tool. Fetches properties, dimensions (with codes),
 * and measures (from data properties), then formats the output.
 */
async function getMetadataLogic(input: GetStatlineTableMetadataInput): Promise<GetStatlineTableMetadataOutput | null> {
  const { tableId } = input;
  const context = `${getStatlineTableMetadataToolName}.logic`;

  // Fetch base properties, dimensions, and data properties concurrently
  const [properties, dimensions, dataProperties] = await Promise.all([
    fetchTablePropertiesFromCBS(tableId),
    fetchTableDimensionsFromCBS(tableId), // Needed for CodesUrl
    fetchDataPropertiesFromCBS(tableId), // Needed primarily for Measures ('Topic' type)
  ]);

  // Essential metadata failed to load
  if (!properties || !dimensions) {
    log.error(`[${context}] Failed to retrieve essential base metadata (properties/dimensions) for table ${tableId}.`);
    return null;
  }

  log.info(`[${context}] Retrieved properties for table ${tableId} with Status: ${properties.Status ?? "N/A"}`);

  // Fetch sample codes based on dimension info
  const processedDimensions = await processDimensionsWithSampleCodes(tableId, dimensions);

  // Extract measures from the DataProperties response
  let measures: GetStatlineTableMetadataOutput["measures"] = [];
  if (dataProperties) {
    measures = dataProperties
      .filter((prop) => prop.Type === "Topic") // 'Topic' usually indicates a measure
      .map((prop) => {
        // Truncate long descriptions
        const truncatedDescription = prop.Description
          ? prop.Description.length > MAX_DESC_LENGTH_DIM_MEASURE
            ? // FIX 2: Ensure template literal is used for truncation string
              `${prop.Description.substring(0, MAX_DESC_LENGTH_DIM_MEASURE)}...`
            : prop.Description
          : undefined;
        return {
          key: prop.Key,
          title: prop.Title,
          description: truncatedDescription,
          unit: prop.Unit,
          decimals: prop.Decimals,
        };
      });
    log.info(`[${context}] Extracted ${measures.length} measures from DataProperties.`);
  } else {
    log.warn(`[${context}] Failed to retrieve DataProperties, measures list will be empty.`);
  }

  // Construct the final output object
  const output: GetStatlineTableMetadataOutput = {
    tableId: tableId,
    properties: properties, // Use the processed properties object
    dimensions: processedDimensions,
    measures: measures,
  };

  // Validate the final structure before returning
  const parsedOutput = getStatlineTableMetadataOutputSchema.safeParse(output);
  if (!parsedOutput.success) {
    log.error(`[${context}] Failed to validate final tool output structure:`, parsedOutput.error.format());
    return null;
  }

  return parsedOutput.data;
}

/**
 * Exported handler function wrapping the core logic with execution handling.
 */
export const getStatlineTableMetadataHandler = (input: GetStatlineTableMetadataInput) => {
  return handleToolExecution(getStatlineTableMetadataToolName, input, getMetadataLogic);
};
