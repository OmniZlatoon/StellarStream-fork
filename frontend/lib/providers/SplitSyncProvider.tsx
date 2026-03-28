"use client";

import {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useRef,
    useState,
    type ReactNode,
} from "react";
import { io, type Socket } from "socket.io-client";
import type { DraftProposal } from "@/app/api/v3/proposals/pending/route";

// ─── Event shapes emitted by the V3 backend ──────────────────────────────────

export interface DraftUpdatedPayload {
    proposal: DraftProposal;
    editorAddress: string;
    timestamp: string;
}

export interface DraftEditorPayload {
    proposalId: string;
    editorAddress: string;
    /** true = started editing, false = stopped */
    isEditing: boolean;
}

// ─── Context value ────────────────────────────────────────────────────────────

interface SplitSyncContextValue {
    /** Live proposal state, kept in sync via DRAFT_UPDATED events */
    proposals: DraftProposal[];
    setProposals: React.Dispatch<React.SetStateAction<DraftProposal[]>>;
    /** proposalId → address of whoever is currently editing */
    activeEditors: Record<string, string>;
    connected: boolean;
    /** Clear all local draft proposals */
    clearLocalDrafts: () => void;
}

const SplitSyncContext = createContext<SplitSyncContextValue | null>(null);

export function useSplitSync(): SplitSyncContextValue {
    const ctx = useContext(SplitSyncContext);
    if (!ctx) throw new Error("useSplitSync must be used inside SplitSyncProvider");
    return ctx;
}

// ─── Provider ─────────────────────────────────────────────────────────────────

const WS_URL = process.env.NEXT_PUBLIC_WS_URL ?? "http://localhost:3001";
const STORAGE_KEY = "stellar_stream_split_drafts";

interface SplitSyncProviderProps {
    children: ReactNode;
    /** The wallet address of the current user — used to join the correct room */
    userAddress: string | null;
}

export function SplitSyncProvider({ children, userAddress }: SplitSyncProviderProps) {
    const [proposals, setProposals] = useState<DraftProposal[]>([]);
    const [activeEditors, setActiveEditors] = useState<Record<string, string>>({});
    const [connected, setConnected] = useState(false);
    const socketRef = useRef<Socket | null>(null);

    // ── Persistence ───────────────────────────────────────────────────────────

    // Load from localStorage on mount
    useEffect(() => {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
            try {
                const parsed = JSON.parse(saved);
                if (Array.isArray(parsed)) {
                    setProposals(parsed);
                }
            } catch (err) {
                console.error("[SplitSyncProvider] Failed to load drafts from localStorage", err);
            }
        }
    }, []);

    // Save to localStorage on change
    useEffect(() => {
        if (proposals.length > 0) {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(proposals));
        } else {
            localStorage.removeItem(STORAGE_KEY);
        }
    }, [proposals]);

    const clearLocalDrafts = useCallback(() => {
        setProposals([]);
        localStorage.removeItem(STORAGE_KEY);
    }, []);

    const applyDraftUpdated = useCallback((payload: DraftUpdatedPayload) => {
        setProposals((prev) => {
            const idx = prev.findIndex((p) => p.id === payload.proposal.id);
            if (idx === -1) return [...prev, payload.proposal];
            const next = [...prev];
            next[idx] = payload.proposal;
            return next;
        });
    }, []);

    const applyEditorPresence = useCallback((payload: DraftEditorPayload) => {
        setActiveEditors((prev) => {
            if (!payload.isEditing) {
                const { [payload.proposalId]: _, ...rest } = prev;
                return rest;
            }
            return { ...prev, [payload.proposalId]: payload.editorAddress };
        });
    }, []);

    useEffect(() => {
        const socket = io(WS_URL, {
            transports: ["websocket"],
            autoConnect: true,
            reconnectionAttempts: 5,
        });
        socketRef.current = socket;

        socket.on("connect", () => {
            setConnected(true);
            if (userAddress) {
                // Join the user's personal room (existing backend pattern)
                socket.emit("join-stream-room", userAddress);
                // Also join the shared proposals room
                socket.emit("join-proposals-room", userAddress);
            }
        });

        socket.on("disconnect", () => setConnected(false));

        // V3 draft sync events
        socket.on("DRAFT_UPDATED", applyDraftUpdated);
        socket.on("DRAFT_EDITOR_PRESENCE", applyEditorPresence);

        return () => {
            socket.disconnect();
            socketRef.current = null;
        };
    }, [userAddress, applyDraftUpdated, applyEditorPresence]);

    return (
        <SplitSyncContext.Provider
            value={{ proposals, setProposals, activeEditors, connected, clearLocalDrafts }}
        >
            {children}
        </SplitSyncContext.Provider>
    );
}
