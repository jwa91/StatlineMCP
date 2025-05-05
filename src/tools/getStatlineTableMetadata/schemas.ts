import { z } from "zod";

/** Input schema for the get_statline_table_metadata tool. */
export const getStatlineTableMetadataInputSchema = z.object({
  tableId: z
    .string()
    .min(1)
    .describe("The unique identifier of the CBS Statline dataset (e.g., '85644NED', '03759ned')."),
});
export type GetStatlineTableMetadataInput = z.infer<typeof getStatlineTableMetadataInputSchema>;

// --- CBS API Response Schemas (Internal) ---

/** Zod schema for the actual flat object structure returned by the /Properties endpoint. */
export const cbsPropertiesResponseSchema = z
  .object({
    Title: z.string().optional(),
    Description: z.string().optional(),
    ShortDescription: z.string().optional(),
    Summary: z.string().optional(),
    Modified: z.string().datetime({ offset: true }).optional(), // Expects offset format from API
    Status: z.string().optional(),
    Frequency: z.string().optional(),
  })
  .passthrough(); // Allow unexpected fields from the API
export type CbsRawProperties = z.infer<typeof cbsPropertiesResponseSchema>;

/** Type definition for the simplified properties object returned by the tool handler. */
export type CbsTableProperties = {
  Title?: string;
  Description?: string;
  Modified?: string;
  Summary?: string;
  ShortDescription?: string;
  Status?: string;
  Frequency?: string;
  [key: string]: string | undefined; // Allow additional string properties
};

/** Zod schema for a single dimension object within the /Dimensions API response. */
const cbsDimensionSchema = z.object({
  Identifier: z.string(),
  Title: z.string(),
  Description: z.string().optional(),
  Kind: z.string().optional(), // e.g., "Dimension", "TimeDimension", "GeoDimension", "Measure", "Topic"
  Position: z.number().int().optional(),
  Unit: z.string().optional(),
  Decimals: z.number().int().optional(),
  CodesUrl: z.string().url().nullable().optional(), // URL might be null
  GroupsUrl: z.string().url().nullable().optional(), // URL might be null
});
export type CbsDimension = z.infer<typeof cbsDimensionSchema>;

/** Zod schema for the overall structure of the /Dimensions API response. */
export const cbsDimensionsResponseSchema = z.object({
  value: z.array(cbsDimensionSchema),
});

/** Zod schema for a single code/value object from a /*Codes API endpoint. */
const cbsCodeSchema = z.object({
  Identifier: z.string(),
  Title: z.string(),
  Description: z.string().optional(),
});
/** Zod schema for the overall structure of a /*Codes API response. */
export const cbsCodesResponseSchema = z.object({
  value: z.array(cbsCodeSchema),
});
export type CbsCode = z.infer<typeof cbsCodeSchema>;

/** Zod schema for a single item returned by the /DataProperties endpoint. */
const cbsDataPropertySchema = z
  .object({
    Key: z.string(), // Technical identifier
    Title: z.string(), // Human-readable title
    Description: z.string().nullable().optional(), // Can be null in API response
    Type: z.string(), // e.g., "GeoDimension", "TimeDimension", "Topic" (Measure), "TopicGroup"
    Unit: z.string().optional(),
    Decimals: z.number().int().optional(),
    Datatype: z.string().optional(),
  })
  .passthrough(); // Allow other fields
export type CbsDataProperty = z.infer<typeof cbsDataPropertySchema>;

/** Zod schema for the overall structure of the /DataProperties API response. */
export const cbsDataPropertiesResponseSchema = z.object({
  value: z.array(cbsDataPropertySchema),
});

// --- Tool Output Schema ---
/** Defines the structure returned by the get_statline_table_metadata tool handler. */
export const getStatlineTableMetadataOutputSchema = z.object({
  tableId: z.string(),
  properties: z
    .record(z.string().optional())
    .describe("Key properties of the table like Title, Description, Modified, Status, Frequency."),
  dimensions: z
    .array(
      z.object({
        key: z
          .string()
          .describe(
            "Technical key for the dimension. Use this key in the 'filters' object of the 'query_statline_data' tool."
          ),
        title: z.string().describe("Human-readable title of the dimension."),
        description: z.string().optional().describe("Description of the dimension (possibly truncated)."),
        sampleCodes: z
          .array(
            z.object({
              id: z
                .string()
                .describe(
                  "Example code value for this dimension. Use this value in the 'filters' object of 'query_statline_data'."
                ),
              title: z.string().describe("Human-readable title for the sample code."),
            })
          )
          .optional()
          .describe("A small sample of codes/values for this dimension, if available."),
      })
    )
    .describe("Dimensions available in the table, used for filtering data."),
  /** List of available measures (data columns) in the table. Will be an empty array if none found or DataProperties fetch failed. */
  measures: z
    .array(
      z.object({
        key: z
          .string()
          .describe(
            "Technical key for the measure/topic. Use this key in the 'select' array of the 'query_statline_data' tool to retrieve this specific measure."
          ),
        title: z.string().describe("Human-readable title of the measure."),
        description: z
          .string()
          .nullable()
          .optional()
          .describe("Description of the measure (possibly truncated or null)."), // Allow null here too
        unit: z.string().optional().describe("Unit of measurement, if applicable."),
        decimals: z.number().int().optional().describe("Number of decimals, if applicable."),
      })
    )
    .describe(
      "Measures (data columns) available in the table, use their 'key' for the 'select' parameter in 'query_statline_data'."
    ),
});
export type GetStatlineTableMetadataOutput = z.infer<typeof getStatlineTableMetadataOutputSchema>;
