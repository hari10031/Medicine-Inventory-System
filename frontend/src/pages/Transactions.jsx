import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { fmtDate } from '../lib/format';

export default function Transactions() {
  const [items, setItems] = useState([]);
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  const load = async () => {
    const params = {};
    if (from) params.from = from;
    if (to) params.to = to;
    const { data } = await api.get('/transactions', { params: { ...params, limit: 200 } });
    setItems(data.items);
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [from, to]);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Transactions</h1>
      <div className="card p-4 flex flex-wrap gap-3 items-end">
        <div>
          <label className="label">From</label>
          <input type="date" className="input" value={from} onChange={(e) => setFrom(e.target.value)} />
        </div>
        <div>
          <label className="label">To</label>
          <input type="date" className="input" value={to} onChange={(e) => setTo(e.target.value)} />
        </div>
        <button className="btn-secondary" onClick={() => { setFrom(''); setTo(''); }}>Clear</button>
      </div>
      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 dark:bg-slate-800/50 text-left">
            <tr>
              <th className="px-4 py-3">Date</th>
              <th className="px-4 py-3">Medicine</th>
              <th className="px-4 py-3">Batch</th>
              <th className="px-4 py-3">Qty</th>
              <th className="px-4 py-3">Recipient</th>
              <th className="px-4 py-3">Phone</th>
              <th className="px-4 py-3">Reason</th>
              <th className="px-4 py-3">Handled by</th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 && <tr><td colSpan="8" className="px-4 py-8 text-center text-slate-500">No transactions</td></tr>}
            {items.map((t) => (
              <tr key={t._id} className="border-t border-slate-200 dark:border-slate-800">
                <td className="px-4 py-3">{new Date(t.date).toLocaleString()}</td>
                <td className="px-4 py-3 font-medium">{t.medicineName}</td>
                <td className="px-4 py-3">{t.batchNo}</td>
                <td className="px-4 py-3 font-semibold">{t.quantitySold}</td>
                <td className="px-4 py-3">{t.customerName || '-'}</td>
                <td className="px-4 py-3">{t.customerPhone || '-'}</td>
                <td className="px-4 py-3 max-w-xs truncate" title={t.reason}>{t.reason || '-'}</td>
                <td className="px-4 py-3">{t.handledByName}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
