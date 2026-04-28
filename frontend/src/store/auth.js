import { create } from 'zustand';
import { supabase, usernameToEmail, fromProfileRow } from '../lib/supabase';

export const useAuthStore = create((set, get) => ({
  loading: true,
  session: null,
  user: null, // mapped profile (id, username, name, role)

  init: async () => {
    const { data } = await supabase.auth.getSession();
    if (data.session) await get()._loadProfile(data.session);
    else set({ loading: false });

    supabase.auth.onAuthStateChange(async (_evt, session) => {
      if (session) await get()._loadProfile(session);
      else set({ session: null, user: null, loading: false });
    });
  },

  _loadProfile: async (session) => {
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', session.user.id)
      .single();
    if (error) {
      // eslint-disable-next-line no-console
      console.error('Profile load failed:', error.message);
    }
    set({ session, user: fromProfileRow(profile), loading: false });
  },

  signIn: async (username, password) => {
    const email = usernameToEmail(username);
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return data;
  },

  signUp: async ({ username, password, name, role = 'employee' }) => {
    const email = usernameToEmail(username);
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { username, name, role } },
    });
    if (error) throw error;
    return data;
  },

  signOut: async () => {
    await supabase.auth.signOut();
    set({ session: null, user: null });
  },
}));
