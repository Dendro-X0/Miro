export interface WebSearchResult {
  readonly title: string;
  readonly url: string;
  readonly snippet: string;
}

interface DuckDuckGoTopic {
  readonly Text?: string;
  readonly FirstURL?: string;
}

interface DuckDuckGoResponse {
  readonly AbstractText?: string;
  readonly AbstractURL?: string;
  readonly Heading?: string;
  readonly RelatedTopics?: readonly (DuckDuckGoTopic | { readonly Topics?: readonly DuckDuckGoTopic[] })[];
}

function pushTopic(results: WebSearchResult[], topic: DuckDuckGoTopic): void {
  const text = topic.Text?.trim();
  if (!text) {
    return;
  }
  const url = topic.FirstURL?.trim() ?? "";
  const title = text.split(" - ")[0]?.trim() || text.slice(0, 80);
  const snippet = text.length > title.length ? text : "";
  results.push({ title, url, snippet });
}

export async function searchWeb(
  query: string,
  maxResults = 5,
): Promise<readonly WebSearchResult[]> {
  const trimmed = query.trim();
  if (!trimmed) {
    return [];
  }

  const endpoint = `https://api.duckduckgo.com/?q=${encodeURIComponent(trimmed)}&format=json&no_html=1&skip_disambig=1`;
  const response = await fetch(endpoint, {
    headers: {
      Accept: "application/json",
      "User-Agent": "Miro/0.2 (+https://github.com/miro-workspace/miro)",
    },
  });
  if (!response.ok) {
    throw new Error(`Web search failed (${response.status})`);
  }

  const data = (await response.json()) as DuckDuckGoResponse;
  const results: WebSearchResult[] = [];

  if (data.AbstractText?.trim()) {
    results.push({
      title: data.Heading?.trim() || trimmed,
      url: data.AbstractURL?.trim() ?? "",
      snippet: data.AbstractText.trim(),
    });
  }

  for (const item of data.RelatedTopics ?? []) {
    if ("Topics" in item && Array.isArray(item.Topics)) {
      for (const topic of item.Topics) {
        pushTopic(results, topic);
      }
      continue;
    }
    pushTopic(results, item as DuckDuckGoTopic);
    if (results.length >= maxResults) {
      break;
    }
  }

  return results.slice(0, maxResults);
}
