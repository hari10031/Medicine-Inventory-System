import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/auth';
import {
  LayoutDashboard, Package, PlusSquare, Upload, ShoppingCart,
  ClipboardList, Users as UsersIcon, LogOut, Moon, Sun, Pill, Menu, X,
} from 'lucide-react';
import { useState, useEffect } from 'react';

const navItems = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, roles: ['admin', 'employee'] },
  { to: '/inventory', label: 'Inventory', icon: Package, roles: ['admin', 'employee'] },
  { to: '/dispense', label: 'Dispense', icon: ShoppingCart, roles: ['admin', 'employee'] },
  { to: '/transactions', label: 'Transactions', icon: ClipboardList, roles: ['admin', 'employee'] },
  { to: '/add', label: 'Add Medicine', icon: PlusSquare, roles: ['admin'] },
  { to: '/bulk', label: 'Bulk Upload', icon: Upload, roles: ['admin'] },
  { to: '/users', label: 'Users', icon: UsersIcon, roles: ['admin'] },
];

export default function Layout() {
  const { user, signOut } = useAuthStore();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [dark, setDark] = useState(document.documentElement.classList.contains('dark'));

  useEffect(() => {
    if (dark) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [dark]);

  const handleLogout = async () => {
    await signOut();
    navigate('/login');
  };

  const items = navItems.filter((i) => i.roles.includes(user?.role));

  return (
    <div className="min-h-screen flex bg-slate-50 dark:bg-slate-950">
      {/* Sidebar */}
      <aside
        className={`fixed lg:static inset-y-0 left-0 z-30 w-64 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 transform transition-transform ${open ? 'translate-x-0' : '-translate-x-full'
          } lg:translate-x-0`}
      >
        <div className="h-16 flex items-center justify-between px-6 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-lg bg-brand-600 text-white flex items-center justify-center">
              <Pill size={18} />
            </div>
            <span className="font-bold text-lg">MedStock</span>
          </div>
          <button className="lg:hidden btn-ghost p-1" onClick={() => setOpen(false)}>
            <X size={20} />
          </button>
        </div>
        <nav className="p-3 space-y-1">
          {items.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              onClick={() => setOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${isActive
                  ? 'bg-brand-50 text-brand-700 dark:bg-brand-600/20 dark:text-brand-100'
                  : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`
              }
            >
              <Icon size={18} />
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="absolute bottom-0 left-0 right-0 p-3 border-t border-slate-200 dark:border-slate-800">
          <div className="flex items-center justify-between mb-2 px-2">
            <div className="text-xs">
              <div className="font-semibold">{user?.name || user?.username}</div>
              <div className="text-slate-500 capitalize">{user?.role}</div>
            </div>
          </div>
          <button onClick={handleLogout} className="btn-secondary w-full text-sm">
            <LogOut size={16} /> Logout
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-16 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between px-4 lg:px-8 sticky top-0 z-20">
          <button className="lg:hidden btn-ghost p-2" onClick={() => setOpen(true)}>
            <Menu size={20} />
          </button>
          <div className="flex-1" />
          <button onClick={() => setDark(!dark)} className="btn-ghost p-2" title="Toggle theme">
            {dark ? <Sun size={18} /> : <Moon size={18} />}
          </button>
        </header>
        <main className="flex-1 p-4 lg:p-8 overflow-x-hidden">
          <Outlet />
        </main>
      </div>

      {open && (
        <div className="fixed inset-0 bg-black/30 z-20 lg:hidden" onClick={() => setOpen(false)} />
      )}
    </div>
  );
}
