import { useState } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { Pill, LogIn, UserPlus } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuthStore } from '../store/auth';

export default function Login() {
  const { session, signIn, signUp } = useAuthStore();
  const navigate = useNavigate();
  const [mode, setMode] = useState('signin'); // 'signin' | 'signup'
  const [form, setForm] = useState({ username: '', password: '', name: '' });
  const [loading, setLoading] = useState(false);

  if (session) return <Navigate to="/" replace />;

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === 'signin') {
        await signIn(form.username, form.password);
        toast.success('Welcome back');
      } else {
        if (form.password.length < 6) throw new Error('Password must be at least 6 characters');
        await signUp({ username: form.username, password: form.password, name: form.name });
        toast.success('Account created. The first user becomes admin.');
      }
      navigate('/');
    } catch (err) {
      toast.error(err.message || 'Failed');
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

        <div className="flex bg-slate-100 dark:bg-slate-800 rounded-lg p-1 mb-5 text-sm">
          <button
            type="button"
            onClick={() => setMode('signin')}
            className={`flex-1 py-1.5 rounded-md font-medium transition ${mode === 'signin' ? 'bg-white dark:bg-slate-900 shadow' : 'text-slate-500'
              }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => setMode('signup')}
            className={`flex-1 py-1.5 rounded-md font-medium transition ${mode === 'signup' ? 'bg-white dark:bg-slate-900 shadow' : 'text-slate-500'
              }`}
          >
            Sign Up
          </button>
        </div>

        <form onSubmit={submit} className="space-y-4">
          {mode === 'signup' && (
            <div>
              <label className="label">Full Name</label>
              <input
                className="input"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Your name"
              />
            </div>
          )}
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
              minLength={6}
              placeholder={mode === 'signup' ? 'At least 6 characters' : ''}
            />
          </div>
          <button type="submit" disabled={loading} className="btn-primary w-full">
            {mode === 'signin' ? <LogIn size={16} /> : <UserPlus size={16} />}
            {loading ? 'Working...' : mode === 'signin' ? 'Sign in' : 'Create account'}
          </button>
        </form>
        <div className="mt-6 text-xs text-slate-500 dark:text-slate-400 text-center space-y-1">
          <p>The first user to sign up automatically becomes admin.</p>
        </div>
      </div>
    </div>
  );
}
