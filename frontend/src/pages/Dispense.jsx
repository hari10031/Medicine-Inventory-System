import { useEffect, useState } from 'react';
import { supabase, fromMedicineRow } from '../lib/supabase';
import toast from 'react-hot-toast';
import { Search, ShoppingCart } from 'lucide-react';
import { fmtDate, expiryStatus, stockStatus } from '../lib/format';

export default function Dispense() {
  const [q, setQ] = useState('');
  const [items, setItems] = useState([]);
  const [selected, setSelected] = useState(null);
  const [qty, setQty] = useState(1);
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [reason, setReason] = useState('');
  const [dispensing, setDispensing] = useState(false);

  const fetchMedicines = async () => {
    let query = supabase
      .from('medicines')
      .select('*')
      .order('name', { ascending: true })
      .limit(20);
    if (q.trim()) query = query.or(`name.ilike.%${q}%,batch_no.ilike.%${q}%`);
    const { data, error } = await query;
    if (!error) setItems((data || []).map(fromMedicineRow));
  };

  useEffect(() => {
    const t = setTimeout(fetchMedicines, 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line
  }, [q]);

  const resetForm = () => {
    setQty(1);
    setCustomerName('');
    setCustomerPhone('');
    setReason('');
  };

  const dispense = async () => {
    if (!selected) return;
    if (qty <= 0) return toast.error('Quantity must be positive');
    if (qty > selected.remainingQuantity) return toast.error('Insufficient stock');
    if (!customerName.trim()) return toast.error('Recipient name is required');
    setDispensing(true);
    try {
      const { data, error } = await supabase.rpc('dispense_medicine', {
        p_medicine_id: selected._id,
        p_qty: qty,
        p_customer_name: customerName.trim(),
        p_customer_phone: customerPhone.trim() || null,
        p_reason: reason.trim() || null,
      });
      if (error) throw error;
      const updatedMed = fromMedicineRow(data.medicine);
      toast.success(`Dispensed ${qty} of ${updatedMed.name} to ${data.transaction.customer_name}`);
      setSelected(updatedMed);
      resetForm();
      fetchMedicines();
    } catch (e) {
      toast.error(e.message || 'Failed');
    } finally {
      setDispensing(false);
    }
  };

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Dispense Medicine</h1>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="card p-4 lg:col-span-2 space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input
              autoFocus
              className="input pl-9"
              placeholder="Search by medicine name or batch..."
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>
          <div className="divide-y divide-slate-200 dark:divide-slate-800 max-h-[60vh] overflow-y-auto">
            {items.length === 0 && <p className="text-sm text-slate-500 p-4 text-center">No medicines found</p>}
            {items.map((m) => {
              const exp = expiryStatus(m.expiryDate);
              const stk = stockStatus(m.remainingQuantity);
              const isExpired = new Date(m.expiryDate) < new Date();
              return (
                <button
                  key={m._id}
                  onClick={() => !isExpired && setSelected(m)}
                  disabled={isExpired || m.remainingQuantity === 0}
                  className={`w-full text-left p-3 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition disabled:opacity-50 ${selected?._id === m._id ? 'bg-brand-50 dark:bg-brand-600/10' : ''
                    }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium">{m.name}</div>
                      <div className="text-xs text-slate-500">Batch: {m.batchNo} &middot; Exp: {fmtDate(m.expiryDate)}</div>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <span className={stk.cls}>{m.remainingQuantity} left</span>
                      <span className={exp.cls}>{exp.label}</span>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <div className="card p-5">
          <h3 className="font-semibold mb-3">Selected</h3>
          {!selected ? (
            <p className="text-sm text-slate-500">Pick a medicine to dispense.</p>
          ) : (
            <div className="space-y-3">
              <div>
                <div className="text-lg font-semibold">{selected.name}</div>
                <div className="text-xs text-slate-500">Batch: {selected.batchNo}</div>
                <div className="text-xs text-slate-500">Expiry: {fmtDate(selected.expiryDate)}</div>
                <div className="mt-2 text-sm">Remaining: <span className="font-bold">{selected.remainingQuantity}</span></div>
              </div>
              <div>
                <label className="label">Quantity to dispense *</label>
                <input
                  type="number"
                  min="1"
                  max={selected.remainingQuantity}
                  className="input"
                  value={qty}
                  onChange={(e) => setQty(parseInt(e.target.value) || 0)}
                />
              </div>

              <div className="pt-2 border-t border-slate-200 dark:border-slate-800">
                <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400 mb-2">
                  Recipient Details
                </h4>
                <div className="space-y-2">
                  <div>
                    <label className="label">Name *</label>
                    <input
                      className="input"
                      placeholder="Recipient full name"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="label">Phone Number</label>
                    <input
                      type="tel"
                      className="input"
                      placeholder="e.g. +91 98765 43210"
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="label">Cause / Reason</label>
                    <textarea
                      className="input"
                      rows={2}
                      placeholder="e.g. Fever, headache, prescribed by Dr. X"
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              <button onClick={dispense} className="btn-primary w-full" disabled={dispensing}>
                <ShoppingCart size={16} /> {dispensing ? 'Dispensing...' : 'Dispense'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
