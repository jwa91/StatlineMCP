// src/shared/cbsApi.ts
import type { ZodTypeAny, infer as ZodInfer } from "zod";
import log from "./logger.js";

/** Base URL for the CBS Statline OData v1 API. */
export const CBS_ODATA_BASE_URL = "https://datasets.cbs.nl/odata/v1/CBS/";

/**
 * Generic fetch helper for CBS OData API endpoints with Zod validation.
 * @param url The full URL to fetch.
 * @param schema The Zod schema to validate the response with.
 * @param context A string for logging to identify the source of the call.
 * @returns The validated data object or null on failure.
 */
export async function fetchAndValidate<T extends ZodTypeAny>(
  url: string,
  schema: T,
  context: string
): Promise<ZodInfer<T> | null> {
  log.debug(`[${context}] Fetching URL: ${url}`);
  try {
    const response = await fetch(url, { method: "GET", headers: { Accept: "application/json" } });

    if (!response.ok) {
      const errorText = await response.text();
      log.error(`[${context}] API request failed status ${response.status}: ${errorText}`);
      log.error(`[${context}] Failing URL was: ${url}`);
      return null;
    }

    const rawData: unknown = await response.json();
    const parsed = schema.safeParse(rawData);

    if (!parsed.success) {
      log.error(`[${context}] Failed to parse API response:`, parsed.error.format());
      log.error(`[${context}] URL whose response failed parsing: ${url}`);
      // log.debug(`[${context}] Raw JSON received:`, JSON.stringify(rawData)); // Keep commented out unless debugging
      return null;
    }

    log.debug(`[${context}] Successfully fetched and parsed data.`);
    return parsed.data;
  } catch (error) {
    log.error(`[${context}] Network or fetch error for URL ${url}:`, error);
    return null;
  }
}
