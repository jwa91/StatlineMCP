import type { FindStatlineTablesInput, CatalogTable, FindStatlineTablesOutput } from "./schemas.js";
import { cbsDatasetSearchResponseSchema, catalogTableResponseSchema } from "./schemas.js";
import { CBS_ODATA_BASE_URL, fetchAndValidate } from "../../shared/cbsApi.js";
import log from "../../shared/logger.js";

const V1_DATASETS_ENDPOINT = `${CBS_ODATA_BASE_URL}Datasets`;
const CATALOG_TABLES_ENDPOINT = "https://opendata.cbs.nl/ODataCatalog/Tables";

/**
 * Fetches rich metadata for a single table ID from the OData Catalog.
 * @param tableId The Identifier of the table.
 * @param context Logging context prefix.
 * @returns CatalogTable object or null if not found or error occurred.
 */
async function fetchCatalogMetadata(tableId: string, context: string): Promise<CatalogTable | null> {
  const selectFields =
    "Identifier,Title,Summary,ShortDescription,OutputStatus,Frequency,Period,MetaDataModified,Modified";
  const url = new URL(CATALOG_TABLES_ENDPOINT);
  url.searchParams.set("$format", "json");
  url.searchParams.set("$filter", `Identifier eq '${encodeURIComponent(tableId)}'`);
  url.searchParams.set("$select", selectFields);

  const catalogContext = `${context}.catalogFetch-${tableId}`;
  const data = await fetchAndValidate(url.toString(), catalogTableResponseSchema, catalogContext);

  // Schema validation ensures 'value' is an array of length 1 on success.
  if (data?.value?.[0]) {
    return data.value[0];
  }

  log.warn(`[${catalogContext}] Did not find unique entry for ID ${tableId} in catalog, or fetch/parse failed.`);
  return null;
}

/**
 * Fetches datasets using keyword search on the v1 endpoint, then enriches
 * the top results with metadata from the OData Catalog for a more complete output.
 * @param input Validated search input (query, maxResults).
 * @returns A promise resolving to the enriched list of datasets or null on failure.
 */
export async function fetchAndEnrichDatasetsFromCBS(
  input: FindStatlineTablesInput
): Promise<FindStatlineTablesOutput | null> {
  const { query, maxResults } = input;
  const context = "findStatlineTables.query.hybrid";

  // --- Step 1: Initial Search & Sort on v1 Endpoint ---
  // Use the v1 endpoint for keyword search as it supports text search better,
  // but fetch only the IDs, ordered by modification date.
  const searchTerms = query.toLowerCase().split(/\s+/).filter(Boolean);
  if (searchTerms.length === 0) {
    log.warn(`[${context}] Empty search query after processing.`);
    return []; // Return empty array for empty query
  }

  const filterClauses = searchTerms
    .map((term) => {
      const escapedTerm = term.replace(/'/g, "''");
      // Search in Title and Description
      return `(contains(tolower(Title),'${escapedTerm}') or contains(tolower(Description),'${escapedTerm}'))`;
    })
    .join(" and ");

  const initialUrl = new URL(V1_DATASETS_ENDPOINT);
  initialUrl.searchParams.set("$filter", filterClauses);
  initialUrl.searchParams.set("$select", "Identifier"); // Only need the ID from this endpoint
  initialUrl.searchParams.set("$top", String(maxResults));
  initialUrl.searchParams.set("$format", "json");
  initialUrl.searchParams.set("$orderby", "Modified desc"); // Get most recently modified first

  const initialData = await fetchAndValidate(
    initialUrl.toString(),
    cbsDatasetSearchResponseSchema, // Schema expects { value: [{ Identifier: string }] }
    `${context}.initialSearch`
  );

  if (!initialData?.value || initialData.value.length === 0) {
    log.info(`[${context}] Initial search returned no results for query: "${query}"`);
    return []; // Return empty array if no initial matches
  }

  const candidateIds = initialData.value.map((item) => item.Identifier);
  log.debug(`[${context}] Found ${candidateIds.length} candidate IDs from initial search.`);

  // --- Step 2: Enrich with Catalog Metadata ---
  // For each ID found, fetch detailed metadata from the OData Catalog endpoint.
  const enrichedResults: FindStatlineTablesOutput = [];
  for (const tableId of candidateIds) {
    const catalogData = await fetchCatalogMetadata(tableId, context);
    if (catalogData) {
      // Map the richer Catalog data to the final output structure
      enrichedResults.push({
        id: catalogData.Identifier,
        title: catalogData.Title ?? `Title missing for ${tableId}`, // Fallback title
        summary: catalogData.Summary ?? catalogData.ShortDescription, // Prefer Summary, fallback to ShortDescription
        status: catalogData.OutputStatus,
        frequency: catalogData.Frequency,
        period: catalogData.Period,
        modified: catalogData.MetaDataModified ?? catalogData.Modified, // Prefer MetaDataModified date
      });
    } else {
      // Log if enrichment fails for an ID, but continue with others.
      log.warn(`[${context}] Skipping table ${tableId} as catalog metadata fetch failed.`);
    }
  }

  log.info(`[${context}] Returning ${enrichedResults.length} enriched results for query: "${query}".`);
  return enrichedResults;
}
