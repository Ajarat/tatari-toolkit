/**
 * Cloud save. The plan always lives on the device first (localStorage); while signed in, it's copied
 * to the cloud a moment after each change and reconciled when the app opens or comes back into view.
 *
 * Reconciling keeps the newest save, and a device with nothing entered yet always takes the cloud copy.
 * The one exception: when you actively sign in on a device whose data differs from the cloud's,
 * nothing is replaced until you choose which one to keep.
 */
import { create } from 'zustand';
import { currentSave, Save, useStore } from '../state/store';
import { createSupabaseSync } from './supabase';
import type { CloudSync, CloudUser } from './types';

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY;

/** Null when no backend is configured; the app then works device-only. */
export const cloud: CloudSync | null = url && key ? createSupabaseSync(url, key) : null;

export type SaveSummary = { updatedAt: string; tatari: number };
export type SyncConflict = { device: SaveSummary; cloud: SaveSummary; cloudSave: Save };

type SyncState = {
  user: CloudUser | null;
  status: 'idle' | 'syncing' | 'error';
  lastSyncedAt?: string;
  error?: string;
  /** Set while waiting for the user to pick which save to keep; syncing pauses until then. */
  conflict?: SyncConflict;
};

export const useSyncStore = create<SyncState>(() => ({ user: null, status: 'idle' }));

const PUSH_DELAY_MS = 1500;
let pushTimer: ReturnType<typeof setTimeout> | undefined;
let applyingRemote = false;
/** Set by signIn/signUp, so the auth callback can tell a deliberate sign-in from a session refresh. */
let explicitSignIn = false;

/** Compare as instants: Postgres returns "+00:00" offsets where the app stores "Z". */
const time = (iso: string) => Date.parse(iso);
const hasData = (s: Save) => s.owned.length > 0;
/** The data itself, ignoring timestamps, so two copies with the same content count as equal. */
const signature = ({ owned, rotation, goldRush, goal }: Save) => JSON.stringify([owned, rotation, goldRush, goal]);
const summarize = (s: Save): SaveSummary => ({ updatedAt: s.updatedAt, tatari: s.owned.length });

/** A readable message for sync/auth failures ("Failed to fetch" means we couldn't reach the service). */
export function describeError(e: unknown): string {
  const message = e instanceof Error ? e.message : String(e);
  return /failed to fetch|networkerror|load failed/i.test(message) ? "Couldn't reach the cloud save service. Check your connection and try again." : message;
}

/** Runs a sync task, tracking status. The task returns false if it stopped without syncing (a conflict). */
async function run(task: () => Promise<boolean | void>) {
  useSyncStore.setState({ status: 'syncing', error: undefined });
  try {
    const synced = (await task()) !== false;
    useSyncStore.setState({ status: 'idle', ...(synced ? { lastSyncedAt: new Date().toISOString() } : {}) });
  } catch (e) {
    useSyncStore.setState({ status: 'error', error: describeError(e) });
  }
}

const canSync = () => !!cloud && !!useSyncStore.getState().user && !useSyncStore.getState().conflict;

function applyCloud(save: Save) {
  applyingRemote = true;
  useStore.getState().replace(save);
  applyingRemote = false;
}

async function push() {
  if (!canSync()) return;
  const save = currentSave();
  await run(() => cloud!.push(save, save.updatedAt));
}

/**
 * Bring device and cloud in line: take the cloud copy if it's newer (or the device is empty), else
 * upload. With `askOnConflict`, differing data on both sides pauses for the user to choose instead.
 */
export async function reconcile({ askOnConflict = false } = {}) {
  if (!canSync()) return;
  await run(async () => {
    const remote = await cloud!.pull();
    const local = currentSave();
    if (!remote) {
      await cloud!.push(local, local.updatedAt);
      return;
    }
    const parsed = Save.safeParse(remote.data);
    if (!parsed.success) throw new Error("The cloud save couldn't be read. Your device copy is unchanged.");
    if (!hasData(local)) {
      applyCloud(parsed.data);
      return;
    }
    if (signature(local) === signature(parsed.data)) return;
    if (askOnConflict && hasData(parsed.data)) {
      useSyncStore.setState({ conflict: { device: summarize(local), cloud: summarize(parsed.data), cloudSave: parsed.data } });
      return false;
    }
    if (time(remote.updatedAt) > time(local.updatedAt)) applyCloud(parsed.data);
    else await cloud!.push(local, local.updatedAt);
  });
}

/** The user's answer to a conflict: keep the cloud save (replacing this device's) or keep this device's. */
export async function resolveConflict(keep: 'cloud' | 'device') {
  const conflict = useSyncStore.getState().conflict;
  if (!conflict || !cloud) return;
  useSyncStore.setState({ conflict: undefined });
  await run(async () => {
    if (keep === 'cloud') applyCloud(conflict.cloudSave);
    else {
      // Stamp the kept save as the newest so other devices pick it up rather than the old cloud copy.
      const save = { ...currentSave(), updatedAt: new Date().toISOString() };
      useStore.getState().replace(save);
      await cloud.push(save, save.updatedAt);
    }
  });
}

/** Sign in from the UI; a deliberate sign-in checks for differing data before syncing. */
export async function signIn(email: string, password: string) {
  explicitSignIn = true;
  try {
    await cloud!.signIn(email, password);
  } catch (e) {
    explicitSignIn = false;
    throw e;
  }
}

export async function signUp(email: string, password: string) {
  explicitSignIn = true;
  try {
    const result = await cloud!.signUp(email, password);
    if (result.needsConfirmation) explicitSignIn = false;
    return result;
  } catch (e) {
    explicitSignIn = false;
    throw e;
  }
}

export function initSync() {
  if (!cloud) return;
  cloud.onAuthChange((user, event) => {
    const wasSignedIn = !!useSyncStore.getState().user;
    useSyncStore.setState({ user, ...(user ? {} : { lastSyncedAt: undefined, status: 'idle', error: undefined, conflict: undefined }) });
    if (!user) return;
    if (event === 'signed-in' && explicitSignIn) {
      explicitSignIn = false;
      void reconcile({ askOnConflict: true });
    } else if (event === 'initial' || (event === 'signed-in' && !wasSignedIn)) {
      void reconcile();
    }
  });
  useStore.subscribe((s, prev) => {
    if (applyingRemote || s.updatedAt === prev.updatedAt) return;
    clearTimeout(pushTimer);
    pushTimer = setTimeout(() => void push(), PUSH_DELAY_MS);
  });
  // Coming back to the app (e.g. switching from the desktop to the phone) picks up the other device's changes.
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') void reconcile();
  });
}
