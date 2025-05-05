import type { CbsCode, CbsDimension, CbsTableProperties, CbsDataProperty } from "./schemas.js";
import {
  cbsCodesResponseSchema,
  cbsDimensionsResponseSchema,
  cbsPropertiesResponseSchema,
  cbsDataPropertiesResponseSchema,
  type CbsRawProperties,
} from "./schemas.js";
import { CBS_ODATA_BASE_URL, fetchAndValidate } from "../../shared/cbsApi.js";
import log from "../../shared/logger.js";

/**
 * Fetches and extracts key properties for a given table ID from the /Properties endpoint.
 * @param tableId The ID of the table.
 * @returns A simplified properties object or null on failure.
 */
export async function fetchTablePropertiesFromCBS(tableId: string): Promise<CbsTableProperties | null> {
  const url = `${CBS_ODATA_BASE_URL}${tableId}/Properties?$format=json`;
  const context = `getStatlineTableMetadata.query.properties-${tableId}`;

  const rawData: CbsRawProperties | null = await fetchAndValidate(url, cbsPropertiesResponseSchema, context);

  if (!rawData) {
    log.warn(`[${context}] fetchAndValidate returned null for properties.`);
    return null;
  }

  // Selectively copy desired properties from the raw response
  const properties: CbsTableProperties = {
    Title: rawData.Title,
    Description: rawData.Description,
    Modified: rawData.Modified,
    Summary: rawData.Summary,
    ShortDescription: rawData.ShortDescription,
    Status: rawData.Status,
    Frequency: rawData.Frequency,
  };

  // Remove keys that have undefined values after selective copy
  for (const key of Object.keys(properties)) {
    if (properties[key] === undefined) {
      delete properties[key];
    }
  }

  log.debug(`[${context}] Extracted properties including Status/Frequency.`);
  return properties;
}

/**
 * Fetches the list of dimensions for a given table ID from the /Dimensions endpoint.
 * This is needed primarily to get the CodesUrl for fetching sample codes later.
 * @param tableId The ID of the table.
 * @returns An array of dimension objects or null on failure.
 */
export async function fetchTableDimensionsFromCBS(tableId: string): Promise<CbsDimension[] | null> {
  const url = `${CBS_ODATA_BASE_URL}${tableId}/Dimensions?$format=json`;
  const context = `getStatlineTableMetadata.query.dimensions-${tableId}`;
  const data = await fetchAndValidate(url, cbsDimensionsResponseSchema, context);
  if (!data?.value) {
    log.warn(`[${context}] fetchAndValidate returned null or empty value for dimensions.`);
    return null;
  }
  return data.value;
}

/**
 * Fetches the list of data properties (which include dimensions and measures/topics)
 * for a given table ID from the /DataProperties endpoint (using the separate ODataApi base).
 * This is the primary source for identifying measures.
 * @param tableId The ID of the table.
 * @returns An array of data property objects or null on failure.
 */
export async function fetchDataPropertiesFromCBS(tableId: string): Promise<CbsDataProperty[] | null> {
  // Note: This specific endpoint uses a different base URL structure than /Properties and /Dimensions.
  const url = `https://opendata.cbs.nl/ODataApi/OData/${tableId}/DataProperties?$format=json`;
  const context = `getStatlineTableMetadata.query.dataProperties-${tableId}`;
  const data = await fetchAndValidate(url, cbsDataPropertiesResponseSchema, context);
  if (!data?.value) {
    log.warn(`[${context}] fetchAndValidate returned null or empty value for data properties.`);
    return null;
  }
  log.debug(`[${context}] Retrieved ${data.value.length} data properties.`);
  return data.value;
}

/**
 * Fetches a small sample of codes for a specific dimension using its CodesUrl.
 * @param tableId The ID of the table (used for context).
 * @param dimensionId The ID of the dimension (used for context).
 * @param codesUrl The full URL (from /Dimensions metadata) for the codes endpoint.
 * @param maxCodes The maximum number of codes to fetch.
 * @returns An array of code objects or null on failure.
 */
export async function fetchDimensionSampleCodesFromCBS(
  tableId: string,
  dimensionId: string,
  codesUrl: string,
  maxCodes = 5
): Promise<CbsCode[] | null> {
  const context = `getStatlineTableMetadata.query.sampleCodes-${tableId}-${dimensionId}`;
  let url: URL;
  try {
    // Use the provided CodesUrl directly, but add query parameters
    url = new URL(codesUrl);
    url.searchParams.set("$top", String(maxCodes));
    url.searchParams.set("$select", "Identifier,Title,Description");
    url.searchParams.set("$format", "json"); // Ensure JSON format
  } catch (urlError) {
    log.error(`[${context}] Failed to create sample codes URL object from ${codesUrl}:`, urlError);
    return null;
  }

  const data = await fetchAndValidate(url.toString(), cbsCodesResponseSchema, context);
  if (!data?.value) {
    log.warn(`[${context}] fetchAndValidate returned null or empty value for sample codes.`);
    return null;
  }
  return data.value;
}
