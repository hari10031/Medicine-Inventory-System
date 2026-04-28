import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/auth';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Inventory from './pages/Inventory';
import AddMedicine from './pages/AddMedicine';
import BulkUpload from './pages/BulkUpload';
import Dispense from './pages/Dispense';
import Transactions from './pages/Transactions';
import Users from './pages/Users';

function Protected({ children, roles }) {
  const { loading, session, user } = useAuthStore();
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
        <div className="text-sm text-slate-500">Loading...</div>
      </div>
    );
  }
  if (!session) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user?.role)) return <Navigate to="/" replace />;
  return children;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        path="/"
        element={
          <Protected>
            <Layout />
          </Protected>
        }
      >
        <Route index element={<Dashboard />} />
        <Route path="inventory" element={<Inventory />} />
        <Route path="dispense" element={<Dispense />} />
        <Route path="transactions" element={<Transactions />} />
        <Route
          path="add"
          element={
            <Protected roles={['admin']}>
              <AddMedicine />
            </Protected>
          }
        />
        <Route
          path="bulk"
          element={
            <Protected roles={['admin']}>
              <BulkUpload />
            </Protected>
          }
        />
        <Route
          path="users"
          element={
            <Protected roles={['admin']}>
              <Users />
            </Protected>
          }
        />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
