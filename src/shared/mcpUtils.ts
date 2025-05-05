// src/shared/mcpUtils.ts
import type { CallToolResult, TextContent } from "@modelcontextprotocol/sdk/types.js";
import log from "./logger.js";

/**
 * Wraps the execution of a tool handler with standardized error handling and result formatting.
 * @template TInput The expected type of the validated tool input.
 * @template TOutput The expected type of the successful result from the execution function.
 * @param toolName The name of the tool for logging purposes.
 * @param input The validated input arguments for the tool.
 * @param executionFn The asynchronous function performing the core tool logic. It should return the result data or null on failure.
 * @returns A Promise resolving to a CallToolResult object suitable for the MCP client.
 */
export async function handleToolExecution<TInput, TOutput>(
  toolName: string,
  input: TInput,
  executionFn: (input: TInput) => Promise<TOutput | null>
): Promise<CallToolResult> {
  log.info(`[${toolName}] Received call with input:`, input);
  try {
    const resultData = await executionFn(input);

    if (resultData === null) {
      log.warn(`[${toolName}] Execution function returned null, indicating failure.`);
      return {
        isError: true,
        content: [
          {
            type: "text",
            text: `Operation failed for tool '${toolName}'. CBS API might be unavailable or parameters might be invalid. Check server logs for details.`,
          },
        ], // Slightly improved error
      };
    }

    // Attempt to stringify the result for the TextContent
    let resultText: string;
    try {
      resultText = JSON.stringify(resultData, null, 2);
    } catch (stringifyError) {
      log.error(`[${toolName}] Failed to stringify successful result:`, stringifyError);
      return {
        isError: true,
        content: [{ type: "text", text: `Internal error: Failed to format result for tool '${toolName}'.` }],
      };
    }

    const content: TextContent = { type: "text", text: resultText };

    const resultLengthInfo = Array.isArray(resultData) ? `(${resultData.length} items)` : "";
    log.info(`[${toolName}] Returning successful result ${resultLengthInfo}.`);
    return { content: [content] };
  } catch (error) {
    log.error(`[${toolName}] Unhandled error during execution:`, error);
    return {
      isError: true,
      content: [
        {
          type: "text",
          text: `An unexpected error occurred while executing tool '${toolName}': ${
            error instanceof Error ? error.message : "Unknown error"
          }`,
        },
      ],
    };
  }
}
