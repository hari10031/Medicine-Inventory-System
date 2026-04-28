import { useEffect, useState } from 'react';
import { supabase, fromMedicineRow } from '../lib/supabase';
import { useAuthStore } from '../store/auth';
import { Search, Trash2, Edit, X, Save } from 'lucide-react';
import toast from 'react-hot-toast';
import { fmtDate, expiryStatus, stockStatus } from '../lib/format';

export default function Inventory() {
  const { user } = useAuthStore();
  const isAdmin = user?.role === 'admin';
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [q, setQ] = useState('');
  const [sortBy, setSortBy] = useState('createdAt');
  const [order, setOrder] = useState('desc');
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const sortMap = {
        createdAt: 'created_at',
        name: 'name',
        expiryDate: 'expiry_date',
        remainingQuantity: 'remaining_quantity',
        quantity: 'quantity',
      };
      let query = supabase
        .from('medicines')
        .select('*', { count: 'exact' })
        .order(sortMap[sortBy] || 'created_at', { ascending: order === 'asc' })
        .limit(200);
      if (q.trim()) query = query.or(`name.ilike.%${q}%,batch_no.ilike.%${q}%`);
      const { data, error, count } = await query;
      if (error) throw error;
      setItems((data || []).map(fromMedicineRow));
      setTotal(count || 0);
    } catch (e) {
      toast.error(e.message || 'Failed to load');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const t = setTimeout(load, 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line
  }, [q, sortBy, order]);

  const remove = async (id) => {
    if (!confirm('Delete this medicine?')) return;
    try {
      const { error } = await supabase.from('medicines').delete().eq('id', id);
      if (error) throw error;
      toast.success('Deleted');
      load();
    } catch (e) {
      toast.error(e.message || 'Failed');
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl font-bold">Inventory</h1>
        <div className="text-sm text-slate-500">{total} items</div>
      </div>

      <div className="card p-4 flex flex-wrap gap-3 items-end">
        <div className="flex-1 min-w-[200px]">
          <label className="label">Search</label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input
              className="input pl-9"
              placeholder="Name or batch number..."
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>
        </div>
        <div>
          <label className="label">Sort by</label>
          <select className="input" value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
            <option value="createdAt">Date Added</option>
            <option value="name">Name</option>
            <option value="expiryDate">Expiry Date</option>
            <option value="remainingQuantity">Remaining Quantity</option>
            <option value="quantity">Total Quantity</option>
          </select>
        </div>
        <div>
          <label className="label">Order</label>
          <select className="input" value={order} onChange={(e) => setOrder(e.target.value)}>
            <option value="desc">Desc</option>
            <option value="asc">Asc</option>
          </select>
        </div>
      </div>

      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 dark:bg-slate-800/50 text-left">
            <tr>
              <th className="px-4 py-3">S.No</th>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Batch</th>
              <th className="px-4 py-3">Mfg Date</th>
              <th className="px-4 py-3">Expiry</th>
              <th className="px-4 py-3">Total</th>
              <th className="px-4 py-3">Remaining</th>
              <th className="px-4 py-3">Status</th>
              {isAdmin && <th className="px-4 py-3">Actions</th>}
            </tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan={isAdmin ? 9 : 8} className="px-4 py-8 text-center text-slate-500">Loading...</td></tr>}
            {!loading && items.length === 0 && <tr><td colSpan={isAdmin ? 9 : 8} className="px-4 py-8 text-center text-slate-500">No medicines found</td></tr>}
            {items.map((m, i) => {
              const exp = expiryStatus(m.expiryDate);
              const stk = stockStatus(m.remainingQuantity);
              return (
                <tr key={m._id} className="border-t border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/30">
                  <td className="px-4 py-3">{i + 1}</td>
                  <td className="px-4 py-3 font-medium">{m.name}</td>
                  <td className="px-4 py-3">{m.batchNo}</td>
                  <td className="px-4 py-3">{fmtDate(m.manufacturingDate)}</td>
                  <td className="px-4 py-3">
                    <div>{fmtDate(m.expiryDate)}</div>
                    <span className={exp.cls}>{exp.label}</span>
                  </td>
                  <td className="px-4 py-3">{m.quantity}</td>
                  <td className="px-4 py-3 font-semibold">{m.remainingQuantity}</td>
                  <td className="px-4 py-3"><span className={stk.cls}>{stk.label}</span></td>
                  {isAdmin && (
                    <td className="px-4 py-3">
                      <div className="flex gap-1">
                        <button className="btn-ghost p-2" onClick={() => setEditing(m)} title="Edit"><Edit size={16} /></button>
                        <button className="btn-ghost p-2 text-red-600" onClick={() => remove(m._id)} title="Delete"><Trash2 size={16} /></button>
                      </div>
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {editing && <EditModal med={editing} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); load(); }} />}
    </div>
  );
}

function EditModal({ med, onClose, onSaved }) {
  const [form, setForm] = useState({
    name: med.name,
    batchNo: med.batchNo,
    manufacturingDate: med.manufacturingDate?.slice(0, 10),
    expiryDate: med.expiryDate?.slice(0, 10),
    quantity: med.quantity,
  });
  const [saving, setSaving] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const dispensed = (med.quantity || 0) - (med.remainingQuantity || 0);
      const newRemaining = Math.max(0, Number(form.quantity) - dispensed);
      const { error } = await supabase
        .from('medicines')
        .update({
          name: form.name.trim(),
          batch_no: form.batchNo.trim(),
          manufacturing_date: form.manufacturingDate,
          expiry_date: form.expiryDate,
          quantity: Number(form.quantity),
          remaining_quantity: newRemaining,
        })
        .eq('id', med._id);
      if (error) throw error;
      toast.success('Updated');
      onSaved();
    } catch (err) {
      toast.error(err.message || 'Failed');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="card w-full max-w-lg p-6" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-lg">Edit Medicine</h3>
          <button className="btn-ghost p-1" onClick={onClose}><X size={18} /></button>
        </div>
        <form onSubmit={submit} className="grid grid-cols-2 gap-3">
          <div className="col-span-2">
            <label className="label">Name</label>
            <input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          </div>
          <div className="col-span-2">
            <label className="label">Batch No</label>
            <input className="input" value={form.batchNo} onChange={(e) => setForm({ ...form, batchNo: e.target.value })} required />
          </div>
          <div>
            <label className="label">Mfg Date</label>
            <input type="date" className="input" value={form.manufacturingDate} onChange={(e) => setForm({ ...form, manufacturingDate: e.target.value })} required />
          </div>
          <div>
            <label className="label">Expiry Date</label>
            <input type="date" className="input" value={form.expiryDate} onChange={(e) => setForm({ ...form, expiryDate: e.target.value })} required />
          </div>
          <div className="col-span-2">
            <label className="label">Total Quantity</label>
            <input type="number" min="0" className="input" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: parseInt(e.target.value) })} required />
          </div>
          <div className="col-span-2 flex justify-end gap-2 mt-2">
            <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn-primary" disabled={saving}>
              <Save size={16} /> {saving ? 'Saving...' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
