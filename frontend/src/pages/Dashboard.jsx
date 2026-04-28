import { useEffect, useState } from 'react';
import { supabase, fromMedicineRow } from '../lib/supabase';
import { useAuthStore } from '../store/auth';
import { Package, AlertTriangle, Clock, XCircle, Boxes, Receipt } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  LineChart, Line, PieChart, Pie, Cell,
} from 'recharts';
import { fmtDate, expiryStatus, stockStatus } from '../lib/format';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#f43f5e', '#84cc16'];

function Stat({ icon: Icon, label, value, tone = 'brand' }) {
  const tones = {
    brand: 'bg-brand-50 text-brand-700 dark:bg-brand-600/20 dark:text-brand-200',
    green: 'bg-green-50 text-green-700 dark:bg-green-600/20 dark:text-green-200',
    yellow: 'bg-yellow-50 text-yellow-700 dark:bg-yellow-600/20 dark:text-yellow-200',
    red: 'bg-red-50 text-red-700 dark:bg-red-600/20 dark:text-red-200',
    purple: 'bg-purple-50 text-purple-700 dark:bg-purple-600/20 dark:text-purple-200',
    cyan: 'bg-cyan-50 text-cyan-700 dark:bg-cyan-600/20 dark:text-cyan-200',
  };
  return (
    <div className="card p-5 flex items-center gap-4">
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${tones[tone]}`}>
        <Icon size={22} />
      </div>
      <div>
        <div className="text-2xl font-bold">{value ?? '-'}</div>
        <div className="text-xs text-slate-500 dark:text-slate-400">{label}</div>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { user } = useAuthStore();
  const isAdmin = user?.role === 'admin';
  const [summary, setSummary] = useState(null);
  const [trend, setTrend] = useState([]);
  const [topMeds, setTopMeds] = useState([]);
  const [stockDist, setStockDist] = useState([]);
  const [alerts, setAlerts] = useState({ lowStock: [], expiringSoon: [], expired: [] });

  useEffect(() => {
    (async () => {
      try {
        const today = new Date();
        const in30 = new Date(Date.now() + 30 * 86400000);

        // Alerts (visible to all authenticated users)
        const [lowRes, expSoonRes, expiredRes] = await Promise.all([
          supabase.from('medicines').select('*').lte('remaining_quantity', 10).order('remaining_quantity'),
          supabase.from('medicines').select('*').gte('expiry_date', today.toISOString().slice(0, 10)).lte('expiry_date', in30.toISOString().slice(0, 10)).order('expiry_date'),
          supabase.from('medicines').select('*').lt('expiry_date', today.toISOString().slice(0, 10)).order('expiry_date'),
        ]);
        setAlerts({
          lowStock: (lowRes.data || []).map(fromMedicineRow),
          expiringSoon: (expSoonRes.data || []).map(fromMedicineRow),
          expired: (expiredRes.data || []).map(fromMedicineRow),
        });

        if (!isAdmin) return;

        // Summary KPIs
        const [allMeds, txCount] = await Promise.all([
          supabase.from('medicines').select('quantity, remaining_quantity, expiry_date'),
          supabase.from('transactions').select('id', { count: 'exact', head: true }),
        ]);
        const meds = allMeds.data || [];
        const todayStr = today.toISOString().slice(0, 10);
        const in30Str = in30.toISOString().slice(0, 10);
        setSummary({
          totalMedicines: meds.length,
          totalUnitsInStock: meds.reduce((s, m) => s + (m.remaining_quantity || 0), 0),
          lowStock: meds.filter((m) => m.remaining_quantity <= 10).length,
          expiringSoon: meds.filter((m) => m.expiry_date >= todayStr && m.expiry_date <= in30Str).length,
          expired: meds.filter((m) => m.expiry_date < todayStr).length,
          totalTransactions: txCount.count || 0,
        });

        // Trend
        const { data: trendData } = await supabase.rpc('sales_trend', { p_days: 14 });
        setTrend(
          (trendData || []).map((d) => ({
            label: String(d.label).slice(5), // MM-DD
            units: Number(d.units),
            count: Number(d.tx_count),
          }))
        );

        // Top medicines
        const { data: topData } = await supabase.rpc('top_medicines', { p_limit: 5 });
        setTopMeds((topData || []).map((d) => ({ name: d.name, units: Number(d.units) })));

        // Stock distribution: top 8 by remaining
        const { data: distData } = await supabase
          .from('medicines')
          .select('name, remaining_quantity')
          .order('remaining_quantity', { ascending: false })
          .limit(8);
        setStockDist((distData || []).map((m) => ({ name: m.name, units: m.remaining_quantity })));
      } catch (e) {
        console.error(e);
      }
    })();
  }, [isAdmin]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Welcome back, {user?.name || user?.username}
        </p>
      </div>

      {isAdmin && summary && (
        <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
          <Stat icon={Package} label="Total Medicines" value={summary.totalMedicines} tone="brand" />
          <Stat icon={Boxes} label="Units in Stock" value={summary.totalUnitsInStock} tone="green" />
          <Stat icon={AlertTriangle} label="Low Stock" value={summary.lowStock} tone="yellow" />
          <Stat icon={Clock} label="Expiring Soon" value={summary.expiringSoon} tone="purple" />
          <Stat icon={XCircle} label="Expired" value={summary.expired} tone="red" />
          <Stat icon={Receipt} label="Transactions" value={summary.totalTransactions} tone="cyan" />
        </div>
      )}

      {isAdmin && (
        <>
          {/* Stock Distribution — full-width feature card */}
          <div className="card p-6 bg-gradient-to-br from-white to-brand-50/40 dark:from-slate-900 dark:to-brand-600/5 border-brand-100 dark:border-brand-900/40">
            <div className="flex items-start justify-between mb-4 flex-wrap gap-2">
              <div>
                <h3 className="font-semibold text-lg flex items-center gap-2">
                  <span className="w-1.5 h-5 bg-brand-600 rounded-full" />
                  Stock Distribution
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Top medicines by units currently in stock
                </p>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-brand-600 dark:text-brand-300">
                  {stockDist.reduce((s, x) => s + x.units, 0)}
                </div>
                <div className="text-xs text-slate-500">total units</div>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
              <div className="h-72">
                <ResponsiveContainer>
                  <PieChart>
                    <Pie
                      data={stockDist}
                      dataKey="units"
                      nameKey="name"
                      innerRadius={55}
                      outerRadius={100}
                      paddingAngle={2}
                    >
                      {stockDist.map((_, i) => (
                        <Cell key={i} fill={COLORS[i % COLORS.length]} stroke="none" />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        background: 'rgba(15,23,42,0.95)',
                        border: 'none',
                        borderRadius: 8,
                        color: '#fff',
                        fontSize: 12,
                      }}
                      labelStyle={{ color: '#fff' }}
                      itemStyle={{ color: '#fff' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                {stockDist.length === 0 && (
                  <p className="text-sm text-slate-500">No stock data yet.</p>
                )}
                {stockDist.map((s, i) => {
                  const total = stockDist.reduce((a, b) => a + b.units, 0) || 1;
                  const pct = ((s.units / total) * 100).toFixed(1);
                  return (
                    <div key={s.name} className="flex items-center gap-3">
                      <span
                        className="w-3 h-3 rounded-sm shrink-0"
                        style={{ background: COLORS[i % COLORS.length] }}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between text-sm">
                          <span className="truncate font-medium">{s.name}</span>
                          <span className="text-slate-500 ml-2">{s.units}</span>
                        </div>
                        <div className="h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden mt-1">
                          <div
                            className="h-full rounded-full"
                            style={{ width: `${pct}%`, background: COLORS[i % COLORS.length] }}
                          />
                        </div>
                      </div>
                      <span className="text-xs text-slate-500 w-12 text-right">{pct}%</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Dispensing Trend + Most Used */}
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
            <div className="card p-5 lg:col-span-3">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h3 className="font-semibold flex items-center gap-2">
                    <span className="w-1.5 h-5 bg-blue-500 rounded-full" />
                    Dispensing Trend
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Units dispensed over the last 14 days
                  </p>
                </div>
                <span className="badge-blue">
                  {trend.reduce((s, x) => s + x.units, 0)} units
                </span>
              </div>
              <div className="h-64">
                <ResponsiveContainer>
                  <LineChart data={trend} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                    <defs>
                      <linearGradient id="trendGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.4} />
                        <stop offset="100%" stopColor="#3b82f6" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" className="dark:opacity-20" />
                    <XAxis dataKey="label" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 10 }} />
                    <Tooltip
                      contentStyle={{
                        background: 'rgba(15,23,42,0.95)',
                        border: 'none',
                        borderRadius: 8,
                        color: '#fff',
                        fontSize: 12,
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey="units"
                      stroke="#3b82f6"
                      strokeWidth={2.5}
                      dot={{ r: 3, fill: '#3b82f6' }}
                      activeDot={{ r: 5 }}
                      fill="url(#trendGrad)"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div className="card p-5 lg:col-span-2">
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <span className="w-1.5 h-5 bg-green-500 rounded-full" />
                Most Used Medicines
              </h3>
              <div className="h-64">
                <ResponsiveContainer>
                  <BarChart data={topMeds} layout="vertical" margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" className="dark:opacity-20" horizontal={false} />
                    <XAxis type="number" tick={{ fontSize: 10 }} />
                    <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} width={100} />
                    <Tooltip
                      contentStyle={{
                        background: 'rgba(15,23,42,0.95)',
                        border: 'none',
                        borderRadius: 8,
                        color: '#fff',
                        fontSize: 12,
                      }}
                      labelStyle={{ color: '#fff' }}
                      itemStyle={{ color: '#fff' }}
                    />
                    <Bar dataKey="units" fill="#10b981" radius={[0, 6, 6, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <AlertCard title="Low Stock" tone="yellow" items={alerts.lowStock} field="remainingQuantity" />
        <AlertCard title="Expiring Soon" tone="purple" items={alerts.expiringSoon} field="expiryDate" />
        <AlertCard title="Expired" tone="red" items={alerts.expired} field="expiryDate" />
      </div>
    </div>
  );
}

function AlertCard({ title, items, field, tone }) {
  return (
    <div className="card p-5">
      <h3 className="font-semibold mb-3 flex items-center justify-between">
        {title}
        <span className={`badge-${tone === 'yellow' ? 'yellow' : tone === 'red' ? 'red' : 'blue'}`}>
          {items.length}
        </span>
      </h3>
      {items.length === 0 ? (
        <p className="text-sm text-slate-500">All good!</p>
      ) : (
        <ul className="space-y-2 max-h-72 overflow-y-auto">
          {items.map((m) => (
            <li key={m._id} className="flex items-center justify-between text-sm">
              <div className="min-w-0">
                <div className="font-medium truncate">{m.name}</div>
                <div className="text-xs text-slate-500">Batch: {m.batchNo}</div>
              </div>
              <div className="text-right">
                {field === 'remainingQuantity' ? (
                  <span className={stockStatus(m.remainingQuantity).cls}>{m.remainingQuantity} left</span>
                ) : (
                  <>
                    <div className="text-xs">{fmtDate(m.expiryDate)}</div>
                    <span className={expiryStatus(m.expiryDate).cls}>{expiryStatus(m.expiryDate).label}</span>
                  </>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
