import { useSyncExternalStore } from "react";
import type { AgentState, IncidentInput, Investigation, StreamEvent } from "./types";
import { emptyAgents } from "./types";
import { EMPTY_INCIDENT } from "./demo";

export interface AppState {
  input: IncidentInput;
  agents: AgentState[];
  running: boolean;
  error: string | null;
  current: Investigation | null;
  history: Investigation[];
  backendOnline: boolean | null;
}

const STORAGE_KEY = "pipelinemind.state.v1";

let state: AppState = {
  input: EMPTY_INCIDENT,
  agents: emptyAgents(),
  running: false,
  error: null,
  current: null,
  history: [],
  backendOnline: null,
};

const listeners = new Set<() => void>();

function emit() {
  for (const l of listeners) l();
}

function persist() {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ input: state.input, current: state.current, history: state.history }),
    );
  } catch {
    /* quota — ignore */
  }
}

export function hydrateStore() {
  if (typeof window === "undefined") return;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw) as Partial<AppState>;
    state = {
      ...state,
      input: parsed.input ?? state.input,
      current: parsed.current ?? null,
      history: parsed.history ?? [],
      agents: parsed.current?.agents ?? state.agents,
    };
    emit();
  } catch {
    /* corrupt storage — ignore */
  }
}

function set(patch: Partial<AppState>) {
  state = { ...state, ...patch };
  emit();
}

export const store = {
  getState: () => state,
  setInput(input: Partial<IncidentInput>) {
    set({ input: { ...state.input, ...input } });
    persist();
  },
  replaceInput(input: IncidentInput) {
    set({ input });
    persist();
  },
  reset() {
    set({ input: EMPTY_INCIDENT, agents: emptyAgents(), current: null, error: null });
    persist();
  },
  setBackendOnline(online: boolean) {
    set({ backendOnline: online });
  },
  startRun() {
    set({ running: true, error: null, agents: emptyAgents(), current: null });
  },
  applyEvent(event: StreamEvent) {
    if (event.type === "agent") {
      set({
        agents: state.agents.map((a) =>
          a.id === event.id
            ? {
                ...a,
                status: event.status,
                durationMs: event.durationMs ?? a.durationMs,
                summary: event.summary ?? a.summary,
              }
            : a,
        ),
      });
    } else if (event.type === "result") {
      const investigation = { ...event.investigation, agents: state.agents };
      set({
        current: investigation,
        history: [investigation, ...state.history].slice(0, 25),
      });
      persist();
    } else if (event.type === "error") {
      set({
        error: event.message,
        agents: state.agents.map((a) => (a.status === "running" ? { ...a, status: "failed" } : a)),
      });
    }
  },
  finishRun() {
    set({ running: false });
  },
  fail(message: string) {
    set({
      running: false,
      error: message,
      agents: state.agents.map((a) => (a.status === "running" ? { ...a, status: "failed" } : a)),
    });
  },
  selectInvestigation(id: string) {
    const found = state.history.find((h) => h.id === id);
    if (found) set({ current: found, agents: found.agents });
  },
};

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useAppState(): AppState {
  return useSyncExternalStore(
    subscribe,
    () => state,
    () => state,
  );
}
