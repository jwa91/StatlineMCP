import type { CbsObservation, QueryStatlineDataInput } from "./schemas.js";
import { cbsObservationsResponseSchema } from "./schemas.js";
import { CBS_ODATA_BASE_URL, fetchAndValidate } from "../../shared/cbsApi.js";
import log from "../../shared/logger.js";

/**
 * Fetches observation data from the CBS Statline API based on input criteria.
 * @param input The validated query input containing tableId, filters, select, and maxRows.
 * @returns A promise resolving to the array of observation records or null on failure.
 */
export async function fetchObservationsFromCBS(input: QueryStatlineDataInput): Promise<CbsObservation[] | null> {
  const { tableId, filters, select, maxRows } = input;
  const context = `queryStatlineData.query-${tableId}`;

  const observationsEndpoint = `${CBS_ODATA_BASE_URL}${tableId}/Observations`;
  let url: URL;
  try {
    url = new URL(observationsEndpoint);
  } catch (urlError) {
    log.error(`[${context}] Failed to create URL object:`, urlError);
    return null;
  }

  if (filters && Object.keys(filters).length > 0) {
    try {
      const filterClauses = Object.entries(filters)
        .map(([key, value]) => {
          // TODO: Consider stricter validation for key/value formats if needed.
          const escapedValue = value.replace(/'/g, "''"); // Escape single quotes for OData strings
          return `${key} eq '${escapedValue}'`;
        })
        .join(" and ");

      if (filterClauses) {
        url.searchParams.set("$filter", filterClauses);
      }
    } catch (filterError) {
      log.error(`[${context}] Failed to build filter clauses:`, filterError);
      // Filters are crucial, failure here should prevent the request.
      return null;
    }
  }

  if (select && select.length > 0) {
    url.searchParams.set("$select", select.join(","));
  }

  url.searchParams.set("$top", String(maxRows));
  url.searchParams.set("$format", "json");

  const data = await fetchAndValidate(url.toString(), cbsObservationsResponseSchema, context);

  if (!data?.value) {
    log.warn(`[${context}] fetchAndValidate returned null or empty value for observations.`);
    return null;
  }

  return data.value;
}
