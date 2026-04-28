import { useState } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { Pill, LogIn } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuthStore } from '../store/auth';

export default function Login() {
  const { session, signIn } = useAuthStore();
  const navigate = useNavigate();
  const [form, setForm] = useState({ username: '', password: '' });
  const [loading, setLoading] = useState(false);

  if (session) return <Navigate to="/" replace />;

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await signIn(form.username, form.password);
      toast.success('Welcome back');
      navigate('/');
    } catch (err) {
      toast.error(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-brand-50 via-white to-slate-100 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 p-4">
      <div className="card w-full max-w-md p-8">
        <div className="flex flex-col items-center mb-6">
          <div className="w-14 h-14 rounded-2xl bg-brand-600 text-white flex items-center justify-center mb-3">
            <Pill size={26} />
          </div>
          <h1 className="text-2xl font-bold">MedStock</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">Medicine Inventory Management</p>
        </div>

        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="label">Username</label>
            <input
              className="input"
              value={form.username}
              onChange={(e) => setForm({ ...form, username: e.target.value })}
              required
              autoFocus
              placeholder="e.g. admin"
            />
          </div>
          <div>
            <label className="label">Password</label>
            <input
              type="password"
              className="input"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              required
            />
          </div>
          <button type="submit" disabled={loading} className="btn-primary w-full">
            <LogIn size={16} /> {loading ? 'Signing in...' : 'Sign in'}
          </button>
        </form>
        <div className="mt-6 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 p-3 text-xs text-slate-600 dark:text-slate-400">
          <p className="font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Demo credentials</p>
          <div className="grid grid-cols-2 gap-2 font-mono">
            <div>
              <span className="text-slate-500">admin</span>
              <span className="mx-1">/</span>
              <span>admin123</span>
            </div>
            <div>
              <span className="text-slate-500">employee</span>
              <span className="mx-1">/</span>
              <span>employee123</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
