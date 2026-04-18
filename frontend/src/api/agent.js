/**
 * Agent API — streams responses from POST /api/v1/agent/chat
 *
 * Uses native fetch + ReadableStream because Axios cannot stream SSE.
 *
 * SSE event shapes from the backend:
 *   {"type": "token",      "token": "Hello"}
 *   {"type": "tool_start", "tool":  "search_products"}
 *   {"type": "error",      "error": "..."}
 *   data: [DONE]
 *
 * @param {string} message - User's message
 * @param {object} callbacks
 * @param {(token: string) => void}  callbacks.onToken     - Called for each streamed LLM token
 * @param {(tool: string) => void}   callbacks.onToolStart - Called when agent calls a tool
 * @param {() => void}               callbacks.onDone      - Called when stream finishes
 * @param {(err: string) => void}    callbacks.onError     - Called on network or server error
 * @param {string|null}              callbacks.token          - Optional Bearer token; enables order status queries
 * @param {string|null}              callbacks.conversationId  - Conversation ID for memory; send the same UUID for the whole session
 * @returns {() => void} abort function — call to cancel the stream
 */
export function streamChat(message, { onToken, onToolStart, onDone, onError, token = null, conversationId = null }) {
    const controller = new AbortController();

    (async () => {
        try {
            const headers = { 'Content-Type': 'application/json' };
            if (token) headers['Authorization'] = `Bearer ${token}`;

            const resp = await fetch('/api/v1/agent/chat', {
                method: 'POST',
                headers,
                body: JSON.stringify({ message, conversation_id: conversationId }),
                signal: controller.signal,
            });

            if (!resp.ok) {
                const body = await resp.json().catch(() => ({}));
                onError?.(body.detail ?? `Server error ${resp.status}`);
                return;
            }

            const reader = resp.body.getReader();
            const decoder = new TextDecoder();
            let buffer = '';

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                buffer += decoder.decode(value, { stream: true });

                // Process complete lines from the buffer
                const lines = buffer.split('\n');
                // Keep the last (possibly incomplete) line in the buffer
                buffer = lines.pop();

                for (const line of lines) {
                    if (!line.startsWith('data: ')) continue;
                    const payload = line.slice(6).trim();

                    if (payload === '[DONE]') {
                        onDone?.();
                        return;
                    }

                    try {
                        const event = JSON.parse(payload);
                        if (event.type === 'token') onToken?.(event.token);
                        if (event.type === 'tool_start') onToolStart?.(event.tool);
                        if (event.type === 'error') onError?.(event.error);
                    } catch {
                        // Ignore malformed SSE lines
                    }
                }
            }

            onDone?.();
        } catch (err) {
            if (err.name !== 'AbortError') {
                onError?.(err.message ?? 'Network error');
            }
        }
    })();

    return () => controller.abort();
}
