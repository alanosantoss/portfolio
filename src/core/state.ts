import { INTRO_STATES, type AppState } from "../types/app";

type StateListener = (state: Readonly<AppState>, prevState: Readonly<AppState>) => void;

const initialState: AppState = {
  activeCategory: "home",
  activeSubFilter: "all",
  lockedCategory: null,
  currentItems: [],
  lightboxIndex: -1,
  introState: INTRO_STATES.INITIALIZING,
  isInteractionsLocked: false
};

let currentState: AppState = { ...initialState };
const listeners = new Set<StateListener>();

export function getState(): Readonly<AppState> {
  return currentState;
}

export function setState(patch: Partial<AppState>): Readonly<AppState> {
  const prevState = currentState;
  currentState = { ...currentState, ...patch };
  listeners.forEach((listener) => listener(currentState, prevState));
  return currentState;
}

export function subscribeState(listener: StateListener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function resetState(): void {
  currentState = { ...initialState };
}
