import { z } from "zod";

/** Input schema for the find_statline_tables tool. */
export const findStatlineTablesInputSchema = z.object({
  query: z.string().min(1).describe("Keywords to search for CBS Statline datasets (e.g., 'bevolking', 'inflatie')."),
  maxResults: z
    .number()
    .int()
    .positive()
    .optional()
    .default(10)
    .describe("Maximum number of datasets to return (default: 10)."),
});
export type FindStatlineTablesInput = z.infer<typeof findStatlineTablesInputSchema>;

// --- Schemas for API calls ---

/** Represents ONE item from the /v1/CBS/Datasets endpoint (used for initial search). */
export const cbsDatasetSchema = z.object({
  Identifier: z.string(),
  // Other fields like Title, Description, Modified might be available but only Identifier is used here.
});
/** Response from /v1/CBS/Datasets search. */
export const cbsDatasetSearchResponseSchema = z.object({
  value: z.array(cbsDatasetSchema),
});

/** Represents ONE item from the /ODataCatalog/Tables endpoint (provides richer metadata). */
export const catalogTableSchema = z
  .object({
    Identifier: z.string(),
    Title: z.string().optional(),
    Summary: z.string().optional(),
    ShortDescription: z.string().optional(), // Use as fallback for summary
    OutputStatus: z.string().optional(), // e.g., "Regulier", "Gediscontinueerd"
    Frequency: z.string().optional(),
    Period: z.string().optional(),
    // Use string().nullable().optional() for dates to handle potential nulls and avoid parsing issues
    MetaDataModified: z.string().nullable().optional(),
    Modified: z.string().nullable().optional(),
  })
  .passthrough(); // Allow other fields from the API response
export type CatalogTable = z.infer<typeof catalogTableSchema>;

/** Response from /ODataCatalog/Tables when fetching a single item by ID. */
export const catalogTableResponseSchema = z.object({
  value: z.array(catalogTableSchema).length(1, { message: "Expected exactly one table entry when filtering by ID" }),
});
/** Response from /ODataCatalog/Tables when fetching multiple items (not currently used but defined). */
export const catalogTablesResponseSchema = z.object({
  value: z.array(catalogTableSchema),
});

// --- Tool Output Schema ---
/** Schema for the final enriched output returned by the find_statline_tables tool handler. */
export const findStatlineTablesOutputSchema = z.array(
  z.object({
    id: z.string().describe("The unique identifier of the dataset (e.g., '83625NED')."),
    title: z.string().describe("The title of the dataset."),
    summary: z.string().optional().describe("A concise summary of the dataset content provided by CBS."),
    status: z.string().optional().describe("Publication status (e.g., 'Regulier', 'Gediscontinueerd')."),
    frequency: z.string().optional().describe("Update frequency (e.g., 'Per jaar', 'Stopgezet')."),
    period: z.string().optional().describe("The time period covered by the data (e.g., '2010 t/m 2024')."),
    // Date is passed as string | null from source data
    modified: z
      .string()
      .nullable()
      .optional()
      .describe("The date the metadata was last modified (string format from source)."),
  })
);
export type FindStatlineTablesOutput = z.infer<typeof findStatlineTablesOutputSchema>;
