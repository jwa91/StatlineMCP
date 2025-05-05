import { z } from "zod";

/** Input schema for the query_statline_data tool. */
export const queryStatlineDataInputSchema = z.object({
  tableId: z
    .string()
    .min(1)
    .describe("The unique identifier of the CBS Statline dataset (e.g., '85644NED', '03759ned')."),
  filters: z
    .record(z.string(), z.string())
    .describe(
      "Filters to apply as key-value pairs. Keys must be valid dimension Identifiers from metadata. Values MUST be valid codes from that dimension. Example: { 'RegioS': 'GM0363', 'Perioden': '2023JJ00' }."
    ),
  select: z
    .array(z.string().min(1))
    .optional()
    .describe(
      "Specific columns (dimension keys or measure keys like 'Value') to return. If omitted, returns all available columns."
    ),
  maxRows: z
    .number()
    .int()
    .positive()
    .optional()
    .default(100)
    .describe("Maximum number of data rows (observations) to return (default: 100)."),
});
export type QueryStatlineDataInput = z.infer<typeof queryStatlineDataInputSchema>;

/** Zod schema for a single observation record returned by the /Observations API endpoint. Uses a flexible record type. */
const cbsObservationSchema = z.record(z.string().or(z.number()).or(z.boolean()).nullable());
export type CbsObservation = z.infer<typeof cbsObservationSchema>;

/** Zod schema for the overall structure of the /Observations API response. */
export const cbsObservationsResponseSchema = z.object({
  value: z.array(cbsObservationSchema),
});

/** Zod schema for the final output structure returned by the query_statline_data tool handler. */
export const queryStatlineDataOutputSchema = z
  .array(cbsObservationSchema)
  .describe(
    "An array of data records matching the query. Each record is an object where keys are column names (dimensions/measures) and values are the corresponding data points."
  );
export type QueryStatlineDataOutput = z.infer<typeof queryStatlineDataOutputSchema>;
