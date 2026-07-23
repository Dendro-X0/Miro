import { jsonSchema, tool } from "ai";
import { searchWeb } from "./web-search";

export function createWebSearchTool() {
  return tool({
    description:
      "Search the public web for current events, documentation, prices, or facts that may be missing from training data.",
    inputSchema: jsonSchema<{ query: string }>({
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "Short web search query",
        },
      },
      required: ["query"],
      additionalProperties: false,
    }),
    execute: async ({ query }) => {
      const results = await searchWeb(query);
      if (results.length === 0) {
        return {
          query,
          results: [],
          summary: "No web results were returned for this query.",
        };
      }
      return {
        query,
        results,
        summary: results
          .map((result, index) => {
            const link = result.url ? ` (${result.url})` : "";
            return `${index + 1}. ${result.title}${link}: ${result.snippet}`;
          })
          .join("\n"),
      };
    },
  });
}
