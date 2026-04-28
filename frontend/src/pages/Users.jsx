import { useEffect, useState } from 'react';
import { supabase, fromProfileRow } from '../lib/supabase';
import { useAuthStore } from '../store/auth';
import toast from 'react-hot-toast';
import { UserPlus, Info } from 'lucide-react';

export default function Users() {
  const { signUp, session } = useAuthStore();
  const [users, setUsers] = useState([]);
  const [form, setForm] = useState({ username: '', password: '', name: '', role: 'employee' });
  const [saving, setSaving] = useState(false);

  const load = async () => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false });
    if (!error) setUsers((data || []).map(fromProfileRow));
  };
  useEffect(() => { load(); }, []);

  const submit = async (e) => {
    e.preventDefault();
    if (form.password.length < 6) return toast.error('Password must be at least 6 characters');
    setSaving(true);
    try {
      // Note: Supabase signUp will sign in as the new user. We capture the original session
      // and restore it after creation so the admin remains logged in.
      const adminAccessToken = session?.access_token;
      const adminRefreshToken = session?.refresh_token;
      await signUp(form);
      // Restore admin session
      if (adminAccessToken && adminRefreshToken) {
        await supabase.auth.setSession({
          access_token: adminAccessToken,
          refresh_token: adminRefreshToken,
        });
      }
      toast.success('User created');
      setForm({ username: '', password: '', name: '', role: 'employee' });
      load();
    } catch (e) {
      toast.error(e.message || 'Failed');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Users</h1>
      <div className="card p-3 bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800/40 text-sm text-blue-900 dark:text-blue-200 flex gap-2">
        <Info size={16} className="shrink-0 mt-0.5" />
        <div>
          New users are created via Supabase Auth. Disable email confirmation in <code>Authentication → Providers → Email</code> in your Supabase dashboard, otherwise users won't be able to sign in.
        </div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <form onSubmit={submit} className="card p-5 space-y-3">
          <h3 className="font-semibold">Create User</h3>
          <div>
            <label className="label">Full Name</label>
            <input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <div>
            <label className="label">Username *</label>
            <input className="input" value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} required />
          </div>
          <div>
            <label className="label">Password *</label>
            <input type="password" className="input" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required />
          </div>
          <div>
            <label className="label">Role</label>
            <select className="input" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
              <option value="employee">Employee</option>
              <option value="admin">Admin</option>
            </select>
          </div>
          <button type="submit" className="btn-primary w-full" disabled={saving}>
            <UserPlus size={16} /> {saving ? 'Creating...' : 'Create User'}
          </button>
        </form>
        <div className="card p-0 lg:col-span-2 overflow-hidden">
          <div className="p-4 border-b border-slate-200 dark:border-slate-800">
            <h3 className="font-semibold">All Users</h3>
          </div>
          <table className="w-full text-sm">
            <thead className="bg-slate-50 dark:bg-slate-800/50 text-left">
              <tr>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Username</th>
                <th className="px-4 py-3">Role</th>
                <th className="px-4 py-3">Created</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u._id} className="border-t border-slate-200 dark:border-slate-800">
                  <td className="px-4 py-3">{u.name || '-'}</td>
                  <td className="px-4 py-3 font-medium">{u.username}</td>
                  <td className="px-4 py-3">
                    <span className={u.role === 'admin' ? 'badge-blue' : 'badge-green'}>{u.role}</span>
                  </td>
                  <td className="px-4 py-3">{new Date(u.createdAt).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
