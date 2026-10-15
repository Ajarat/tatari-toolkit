import { createClient, type User } from '@supabase/supabase-js';
import type { AuthEvent, CloudSync, CloudUser } from './types';

/** Saves are keyed by app so future tools can share the same table (and accounts). */
const APP = 'evolution-calendar';

export function createSupabaseSync(url: string, key: string): CloudSync {
  const supabase = createClient(url, key, { auth: { persistSession: true, autoRefreshToken: true } });
  const toUser = (u: User | null | undefined): CloudUser | null => (u ? { id: u.id, email: u.email ?? '' } : null);

  async function currentUser() {
    const { data } = await supabase.auth.getUser();
    if (!data.user) throw new Error('Not signed in.');
    return data.user;
  }

  return {
    async signIn(email, password) {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
    },

    async signUp(email, password) {
      const { data, error } = await supabase.auth.signUp({ email, password });
      if (error) throw error;
      return { needsConfirmation: !data.session };
    },

    async signOut() {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
    },

    onAuthChange(callback) {
      supabase.auth.onAuthStateChange((event, session) => {
        const kind: AuthEvent =
          event === 'INITIAL_SESSION' ? 'initial' : event === 'SIGNED_IN' ? 'signed-in' : event === 'SIGNED_OUT' ? 'signed-out' : 'other';
        // Supabase recommends not awaiting other Supabase calls inside this callback.
        setTimeout(() => callback(toUser(session?.user), kind), 0);
      });
    },

    async pull() {
      const user = await currentUser();
      const { data, error } = await supabase.from('saves').select('data, updated_at').eq('user_id', user.id).eq('app', APP).maybeSingle();
      if (error) throw error;
      return data ? { data: data.data, updatedAt: data.updated_at } : null;
    },

    async push(data, updatedAt) {
      const user = await currentUser();
      const { error } = await supabase.from('saves').upsert({ user_id: user.id, app: APP, data, updated_at: updatedAt });
      if (error) throw error;
    },
  };
}
