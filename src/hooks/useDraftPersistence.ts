import { useEffect, useRef, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

/**
 * useDraftPersistence — auto-saves an in-progress form to BOTH localStorage
 * (instant, this browser) and the user_drafts table (cross-device, survives
 * tab discards by the OS/browser when backgrounded for long periods).
 *
 * Restore-on-mount: returns `restoredDraft` (the most recent of local/cloud
 * by updated_at) so the host component can hydrate its state once and then
 * call `clearDraft()` when the work is submitted.
 */

interface Options<T> {
  draftKey: string;            // unique per form/page, e.g. "tos-builder"
  data: T;                     // current form state
  enabled?: boolean;           // skip persistence (e.g. while loading existing record)
  debounceMs?: number;         // default 1500ms
  isEmpty?: (data: T) => boolean; // skip writes when empty
}

interface StoredDraft<T> {
  payload: T;
  updatedAt: number;
}

const STORAGE_PREFIX = 'lov_draft:';

function readLocal<T>(key: string): StoredDraft<T> | null {
  try {
    const raw = localStorage.getItem(STORAGE_PREFIX + key);
    if (!raw) return null;
    return JSON.parse(raw) as StoredDraft<T>;
  } catch {
    return null;
  }
}

function writeLocal<T>(key: string, payload: T) {
  try {
    const record: StoredDraft<T> = { payload, updatedAt: Date.now() };
    localStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(record));
  } catch {
    /* quota exceeded — ignore */
  }
}

function removeLocal(key: string) {
  try { localStorage.removeItem(STORAGE_PREFIX + key); } catch { /* noop */ }
}

export function useDraftPersistence<T>({
  draftKey,
  data,
  enabled = true,
  debounceMs = 1500,
  isEmpty,
}: Options<T>) {
  const [restoredDraft, setRestoredDraft] = useState<StoredDraft<T> | null>(null);
  const [hasCheckedRestore, setHasCheckedRestore] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<number | null>(null);
  const userIdRef = useRef<string | null>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSerialized = useRef<string>('');

  // Restore on mount: pick most recent of local vs cloud
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const local = readLocal<T>(draftKey);
      const { data: { user } } = await supabase.auth.getUser();
      userIdRef.current = user?.id ?? null;

      let cloud: StoredDraft<T> | null = null;
      if (user) {
        const { data: row } = await supabase
          .from('user_drafts')
          .select('payload, updated_at')
          .eq('user_id', user.id)
          .eq('draft_key', draftKey)
          .maybeSingle();
        if (row) {
          cloud = {
            payload: row.payload as T,
            updatedAt: new Date(row.updated_at).getTime(),
          };
        }
      }

      if (cancelled) return;
      const winner = !local ? cloud : !cloud ? local : (cloud.updatedAt > local.updatedAt ? cloud : local);
      setRestoredDraft(winner);
      setHasCheckedRestore(true);
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draftKey]);

  const persist = useCallback(async (payload: T) => {
    writeLocal(draftKey, payload);
    setIsSaving(true);
    try {
      const uid = userIdRef.current;
      if (uid) {
        await supabase
          .from('user_drafts')
          .upsert(
            { user_id: uid, draft_key: draftKey, payload: payload as any, updated_at: new Date().toISOString() },
            { onConflict: 'user_id,draft_key' }
          );
      }
      setLastSavedAt(Date.now());
    } catch {
      /* network failure is OK — local copy is the safety net */
    } finally {
      setIsSaving(false);
    }
  }, [draftKey]);

  // Debounced auto-save whenever data changes (after restore check)
  useEffect(() => {
    if (!enabled || !hasCheckedRestore) return;
    if (isEmpty && isEmpty(data)) return;

    const serialized = JSON.stringify(data);
    if (serialized === lastSerialized.current) return;
    lastSerialized.current = serialized;

    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => persist(data), debounceMs);

    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, [data, enabled, hasCheckedRestore, isEmpty, debounceMs, persist]);

  // Flush on tab hide / unload so we don't lose the last few keystrokes
  useEffect(() => {
    const flush = () => {
      if (!enabled) return;
      if (isEmpty && isEmpty(data)) return;
      writeLocal(draftKey, data); // synchronous local write
      // Best-effort cloud write (may not complete, but local has it)
      const uid = userIdRef.current;
      if (uid) {
        supabase.from('user_drafts').upsert(
          { user_id: uid, draft_key: draftKey, payload: data as any, updated_at: new Date().toISOString() },
          { onConflict: 'user_id,draft_key' }
        );
      }
    };
    const onVisibility = () => { if (document.visibilityState === 'hidden') flush(); };
    window.addEventListener('beforeunload', flush);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      window.removeEventListener('beforeunload', flush);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [data, draftKey, enabled, isEmpty]);

  const clearDraft = useCallback(async () => {
    removeLocal(draftKey);
    lastSerialized.current = '';
    setRestoredDraft(null);
    const uid = userIdRef.current;
    if (uid) {
      await supabase
        .from('user_drafts')
        .delete()
        .eq('user_id', uid)
        .eq('draft_key', draftKey);
    }
  }, [draftKey]);

  const dismissRestore = useCallback(() => {
    setRestoredDraft(null);
  }, []);

  return {
    restoredDraft,        // null until checked, then either StoredDraft<T> or null
    hasCheckedRestore,
    isSaving,
    lastSavedAt,
    clearDraft,           // call after successful submit
    dismissRestore,       // call when user declines to restore
  };
}