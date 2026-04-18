import { useState, useRef, useEffect } from 'react';
import {
    Box, Paper, Typography, TextField, IconButton,
    Chip, Fab, Tooltip, Divider,
} from '@mui/material';
import ChatIcon from '@mui/icons-material/Chat';
import SendIcon from '@mui/icons-material/Send';
import CloseIcon from '@mui/icons-material/Close';
import SmartToyIcon from '@mui/icons-material/SmartToy';
import PersonIcon from '@mui/icons-material/Person';

import useChatStore from '../store/chatStore';
import useAuthStore from '../store/authStore';
import { streamChat } from '../api/agent';
import { SHOPEE_GRADIENT, SHOPEE_ORANGE } from '../theme';

// ─── Inline markdown renderer (no extra deps) ────────────────────────────────

/** Turn **bold** and *italic* spans into React elements safely. */
function parseInline(text) {
    // Split on **bold** first, then *italic*
    const boldParts = text.split(/(\*\*[^*\n]+\*\*)/g);
    return boldParts.flatMap((part, bi) => {
        if (part.startsWith('**') && part.endsWith('**')) {
            return <strong key={`b${bi}`} style={{ fontWeight: 600 }}>{part.slice(2, -2)}</strong>;
        }
        // Handle *italic* within non-bold segments
        const italicParts = part.split(/(\*[^*\n]+\*)/g);
        return italicParts.map((ip, ii) => {
            if (ip.startsWith('*') && ip.endsWith('*')) {
                return <em key={`i${bi}-${ii}`}>{ip.slice(1, -1)}</em>;
            }
            return ip;
        });
    });
}

/**
 * Render a markdown-ish string as React elements.
 * Handles: **bold**, *italic*, bullet lines (• or -), blank line spacing.
 */
function renderMarkdown(text) {
    if (!text) return null;
    return text.split('\n').map((line, i) => {
        const blank = line.trim() === '';
        if (blank) return <Box key={i} sx={{ height: '0.35em' }} />;

        const isBullet = /^[•\-]\s/.test(line);
        const content = parseInline(isBullet ? line.replace(/^[•\-]\s/, '') : line);

        if (isBullet) {
            return (
                <Box key={i} sx={{ display: 'flex', gap: 0.75, mb: 0.25, alignItems: 'flex-start' }}>
                    <Box component="span" sx={{ opacity: 0.55, flexShrink: 0, userSelect: 'none', mt: '1px' }}>•</Box>
                    <Box component="span">{content}</Box>
                </Box>
            );
        }

        return <Box key={i} sx={{ mb: 0.1 }}>{content}</Box>;
    });
}

// ─── Message bubble ───────────────────────────────────────────────────────────

function MessageBubble({ msg }) {
    const isUser = msg.role === 'user';
    const isTool = msg.role === 'tool';

    if (isTool) {
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', my: 0.5 }}>
                <Chip
                    size="small"
                    label={`🔍 Searching ${msg.text}…`}
                    sx={{ fontSize: '0.7rem', color: 'text.secondary', bgcolor: '#f0f0f0' }}
                />
            </Box>
        );
    }

    return (
        <Box
            sx={{
                display: 'flex',
                justifyContent: isUser ? 'flex-end' : 'flex-start',
                alignItems: 'flex-end',
                gap: 0.75,
                mb: 1,
            }}
        >
            {!isUser && (
                <Box
                    sx={{
                        width: 26, height: 26, borderRadius: '50%',
                        background: SHOPEE_GRADIENT,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        flexShrink: 0,
                    }}
                >
                    <SmartToyIcon sx={{ fontSize: 15, color: '#fff' }} />
                </Box>
            )}

            <Box
                sx={{
                    maxWidth: '78%',
                    bgcolor: isUser ? SHOPEE_ORANGE : '#fff',
                    color: isUser ? '#fff' : 'text.primary',
                    borderRadius: isUser ? '12px 12px 2px 12px' : '12px 12px 12px 2px',
                    px: 1.5, py: 0.9,
                    boxShadow: isUser ? 'none' : 'rgba(0,0,0,0.08) 0px 1px 4px',
                    fontSize: '0.875rem',
                    lineHeight: 1.6,
                    wordBreak: 'break-word',
                }}
            >
                {isUser ? msg.text : renderMarkdown(msg.text)}
                {msg.isStreaming && (
                    <Box component="span" sx={{ display: 'inline-block', ml: 0.3, animation: 'blink 1s step-start infinite' }}>▋</Box>
                )}
            </Box>

            {isUser && (
                <Box
                    sx={{
                        width: 26, height: 26, borderRadius: '50%',
                        bgcolor: '#e0e0e0',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        flexShrink: 0,
                    }}
                >
                    <PersonIcon sx={{ fontSize: 15, color: '#757575' }} />
                </Box>
            )}
        </Box>
    );
}

// ─── Welcome message ──────────────────────────────────────────────────────────

const WELCOME = 'Hi! 👋 I\'m your ShopFast assistant.\n\nAsk me to find products, compare prices, or answer questions about shipping and returns.';

// ─── Main component ───────────────────────────────────────────────────────────

export default function ChatPopup() {
    const { isOpen, toggle, messages, isLoading, conversationId, addMessage, appendToLast, finishStreaming, setLoading } = useChatStore();
    const { accessToken } = useAuthStore();
    const [input, setInput] = useState('');
    const bottomRef = useRef(null);
    const inputRef = useRef(null);
    const abortRef = useRef(null);   // holds the abort fn for the active stream

    // Add welcome message once on first open
    const hasWelcomed = useRef(false);
    useEffect(() => {
        if (isOpen && !hasWelcomed.current && messages.length === 0) {
            hasWelcomed.current = true;
            addMessage('assistant', WELCOME);
        }
    }, [isOpen]);

    // Scroll to bottom whenever messages change
    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    // Focus input when popup opens
    useEffect(() => {
        if (isOpen) {
            setTimeout(() => inputRef.current?.focus(), 100);
        }
    }, [isOpen]);

    // Cancel any active stream on unmount
    useEffect(() => () => abortRef.current?.(), []);

    const handleSend = () => {
        const text = input.trim();
        if (!text || isLoading) return;

        setInput('');
        addMessage('user', text);
        addMessage('assistant', '');   // placeholder that tokens stream into
        setLoading(true);

        abortRef.current = streamChat(text, {
            onToken: (token) => appendToLast(token),
            onToolStart: (tool) => addMessage('tool', tool),
            onDone: () => { finishStreaming(); setLoading(false); },
            onError: (err) => {
                finishStreaming();
                setLoading(false);
                // Replace the empty assistant placeholder with the error text
                useChatStore.getState().appendToLast(`⚠️ ${err}`);
                finishStreaming();
            },
            token: accessToken,
            conversationId,
        });
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    return (
        <>
            {/* ── Blinking cursor keyframe ── */}
            <style>{`@keyframes blink { 50% { opacity: 0; } }`}</style>

            {/* ── Chat popup panel ── */}
            {isOpen && (
                <Paper
                    elevation={6}
                    sx={{
                        position: 'fixed',
                        bottom: 88,
                        right: 24,
                        width: { xs: 'calc(100vw - 32px)', sm: 360 },
                        height: 520,
                        display: 'flex',
                        flexDirection: 'column',
                        borderRadius: '12px',
                        overflow: 'hidden',
                        zIndex: 1300,
                    }}
                >
                    {/* Header */}
                    <Box
                        sx={{
                            background: SHOPEE_GRADIENT,
                            px: 2, py: 1.25,
                            display: 'flex', alignItems: 'center', gap: 1,
                            flexShrink: 0,
                        }}
                    >
                        <SmartToyIcon sx={{ color: '#fff', fontSize: 20 }} />
                        <Box sx={{ flex: 1 }}>
                            <Typography variant="subtitle2" sx={{ color: '#fff', fontWeight: 700, lineHeight: 1.2 }}>
                                ShopFast Assistant
                            </Typography>
                            <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.8)', fontSize: '0.7rem' }}>
                                Powered by AI · Ask me anything
                            </Typography>
                        </Box>
                        <Tooltip title="Close">
                            <IconButton size="small" onClick={toggle} sx={{ color: '#fff' }}>
                                <CloseIcon fontSize="small" />
                            </IconButton>
                        </Tooltip>
                    </Box>

                    <Divider />

                    {/* Messages */}
                    <Box
                        sx={{
                            flex: 1,
                            overflowY: 'auto',
                            px: 1.5, py: 1.5,
                            bgcolor: '#fafafa',
                            display: 'flex',
                            flexDirection: 'column',
                        }}
                    >
                        {messages.map((msg) => (
                            <MessageBubble key={msg.id} msg={msg} />
                        ))}
                        <div ref={bottomRef} />
                    </Box>

                    <Divider />

                    {/* Input */}
                    <Box
                        sx={{
                            px: 1.5, py: 1,
                            display: 'flex', alignItems: 'flex-end', gap: 1,
                            bgcolor: '#fff',
                            flexShrink: 0,
                        }}
                    >
                        <TextField
                            inputRef={inputRef}
                            fullWidth
                            multiline
                            maxRows={3}
                            size="small"
                            placeholder="Ask about products, prices, policies…"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={handleKeyDown}
                            disabled={isLoading}
                            sx={{
                                '& .MuiOutlinedInput-root': { borderRadius: '20px', fontSize: '0.875rem' },
                            }}
                        />
                        <Tooltip title="Send (Enter)">
                            <span>
                                <IconButton
                                    onClick={handleSend}
                                    disabled={!input.trim() || isLoading}
                                    sx={{
                                        bgcolor: SHOPEE_ORANGE,
                                        color: '#fff',
                                        width: 36, height: 36,
                                        '&:hover': { bgcolor: '#d73211' },
                                        '&.Mui-disabled': { bgcolor: '#e0e0e0', color: '#bdbdbd' },
                                    }}
                                >
                                    <SendIcon sx={{ fontSize: 18 }} />
                                </IconButton>
                            </span>
                        </Tooltip>
                    </Box>
                </Paper>
            )}

            {/* ── Floating action button ── */}
            <Tooltip title={isOpen ? 'Close assistant' : 'Open AI assistant'} placement="left">
                <Fab
                    onClick={toggle}
                    sx={{
                        position: 'fixed',
                        bottom: 24,
                        right: 24,
                        zIndex: 1300,
                        background: SHOPEE_GRADIENT,
                        color: '#fff',
                        boxShadow: '0 4px 14px rgba(238,77,45,0.45)',
                        '&:hover': { background: SHOPEE_GRADIENT, filter: 'brightness(1.08)' },
                    }}
                >
                    {isOpen ? <CloseIcon /> : <ChatIcon />}
                </Fab>
            </Tooltip>
        </>
    );
}
