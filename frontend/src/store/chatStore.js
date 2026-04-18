import { create } from 'zustand';

/**
 * Chat store — in-memory only, intentionally not persisted.
 *
 * Message shape:
 *   { id: string, role: 'user' | 'assistant' | 'tool', text: string, isStreaming: boolean }
 */
const useChatStore = create((set, get) => ({
    isOpen: false,
    messages: [],
    isLoading: false,
    // Generated once per page load; reset when the user clears the chat.
    conversationId: crypto.randomUUID(),

    toggle: () => set((s) => ({ isOpen: !s.isOpen })),
    open: () => set({ isOpen: true }),
    close: () => set({ isOpen: false }),

    setLoading: (isLoading) => set({ isLoading }),

    /** Push a new message and return its generated id. */
    addMessage: (role, text, extra = {}) => {
        const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
        set((s) => ({
            messages: [...s.messages, { id, role, text, isStreaming: false, ...extra }],
        }));
        return id;
    },

    /** Append a token to the last assistant message in place (streaming). */
    appendToLast: (token) =>
        set((s) => {
            const msgs = [...s.messages];
            const last = msgs.findLastIndex((m) => m.role === 'assistant');
            if (last === -1) return {};
            msgs[last] = { ...msgs[last], text: msgs[last].text + token, isStreaming: true };
            return { messages: msgs };
        }),

    /** Mark the last assistant message as no longer streaming. */
    finishStreaming: () =>
        set((s) => {
            const msgs = [...s.messages];
            const last = msgs.findLastIndex((m) => m.role === 'assistant');
            if (last === -1) return {};
            msgs[last] = { ...msgs[last], isStreaming: false };
            return { messages: msgs };
        }),

    clearMessages: () => set({ messages: [], conversationId: crypto.randomUUID() }),
}));

export default useChatStore;
