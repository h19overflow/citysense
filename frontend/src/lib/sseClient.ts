/**
 * Framework-agnostic SSE client with auto-reconnect.
 * Also exports readSseStream for POST-based streaming (fetch + ReadableStream).
 */

export interface SseMessage {
  type: string;
  data: unknown;
}

export interface SseOptions {
  url: string;
  onMessage: (msg: SseMessage) => void;
  onStatusChange?: (connected: boolean) => void;
  reconnectDelay?: number;
}

/**
 * Opens an EventSource connection, parses JSON messages,
 * and auto-reconnects on error. Returns a cleanup function.
 */
export function connectSseStream(options: SseOptions): () => void {
  const { url, onMessage, onStatusChange, reconnectDelay = 3000 } = options;
  let eventSource: EventSource | null = null;
  let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  let disposed = false;

  function connect() {
    if (disposed) return;

    eventSource = new EventSource(url);

    eventSource.onopen = () => {
      onStatusChange?.(true);
    };

    eventSource.onmessage = (event) => {
      try {
        const parsed: SseMessage = JSON.parse(event.data);
        onMessage(parsed);
      } catch {
        console.warn("[SSE] Failed to parse message:", event.data);
      }
    };

    eventSource.onerror = () => {
      onStatusChange?.(false);
      eventSource?.close();
      eventSource = null;
      if (!disposed) {
        reconnectTimer = setTimeout(connect, reconnectDelay);
      }
    };
  }

  connect();

  return () => {
    disposed = true;
    if (reconnectTimer) clearTimeout(reconnectTimer);
    eventSource?.close();
    eventSource = null;
    onStatusChange?.(false);
  };
}

function parseSseLines(
  lines: string[],
  onToken: (token: string) => void,
  onToolCall?: (toolName: string) => void,
): "done" | "error" | "continue" {
  let currentEvent = "token";
  for (const line of lines) {
    if (line.startsWith("event: ")) {
      currentEvent = line.slice(7).trim();
      if (currentEvent === "done") return "done";
      if (currentEvent === "error") return "error";
      continue;
    }
    if (line.startsWith("data: ")) {
      const data = line.slice(6);
      if (currentEvent === "tool_call" && onToolCall) {
        onToolCall(data);
      } else if (currentEvent === "token") {
        onToken(data);
      }
      currentEvent = "token";
    }
  }
  return "continue";
}

/**
 * Sends a POST request and reads the SSE stream, calling onToken for each
 * data token and onToolCall when the agent uses a tool.
 * Returns the full concatenated response text.
 */
export async function readSseStream(
  url: string,
  body: object,
  onToken: (token: string) => void,
  onToolCall?: (toolName: string) => void,
): Promise<string> {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!response.ok || !response.body) {
    throw new Error(`Request failed: ${response.status}`);
  }

  const reader = response.body.pipeThrough(new TextDecoderStream()).getReader();
  let buffer = "";
  let fullText = "";

  const collectingOnToken = (token: string) => {
    fullText += token;
    onToken(token);
  };

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += value;
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";
    const result = parseSseLines(lines, collectingOnToken, onToolCall);
    if (result === "done") break;
    if (result === "error") throw new Error("Stream error from server");
  }

  return fullText;
}
