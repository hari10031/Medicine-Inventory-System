import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import toast from 'react-hot-toast';
import { PlusSquare } from 'lucide-react';

const empty = { name: '', batchNo: '', manufacturingDate: '', expiryDate: '', quantity: '' };

export default function AddMedicine() {
  const [form, setForm] = useState(empty);
  const [saving, setSaving] = useState(false);
  const navigate = useNavigate();

  const validate = () => {
    if (!form.name.trim()) return 'Name is required';
    if (!form.batchNo.trim()) return 'Batch number is required';
    if (!form.manufacturingDate) return 'Manufacturing date is required';
    if (!form.expiryDate) return 'Expiry date is required';
    if (new Date(form.expiryDate) <= new Date(form.manufacturingDate)) return 'Expiry must be after manufacturing date';
    if (!form.quantity || Number(form.quantity) < 0) return 'Quantity must be 0 or more';
    return null;
  };

  const submit = async (e) => {
    e.preventDefault();
    const err = validate();
    if (err) return toast.error(err);
    setSaving(true);
    try {
      await api.post('/medicines', {
        ...form,
        quantity: Number(form.quantity),
      });
      toast.success('Medicine added');
      navigate('/inventory');
    } catch (e) {
      toast.error(e.response?.data?.message || 'Failed to add');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold mb-4">Add Medicine</h1>
      <form onSubmit={submit} className="card p-6 grid grid-cols-2 gap-4">
        <div className="col-span-2">
          <label className="label">Medicine Name *</label>
          <input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Paracetamol 500mg" />
        </div>
        <div className="col-span-2">
          <label className="label">Batch Number *</label>
          <input className="input" value={form.batchNo} onChange={(e) => setForm({ ...form, batchNo: e.target.value })} placeholder="e.g. PCM-001" />
        </div>
        <div>
          <label className="label">Manufacturing Date *</label>
          <input type="date" className="input" value={form.manufacturingDate} onChange={(e) => setForm({ ...form, manufacturingDate: e.target.value })} />
        </div>
        <div>
          <label className="label">Expiry Date *</label>
          <input type="date" className="input" value={form.expiryDate} onChange={(e) => setForm({ ...form, expiryDate: e.target.value })} />
        </div>
        <div className="col-span-2">
          <label className="label">Total Quantity *</label>
          <input type="number" min="0" className="input" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} placeholder="100" />
        </div>
        <div className="col-span-2 flex justify-end gap-2 pt-2">
          <button type="button" className="btn-secondary" onClick={() => setForm(empty)}>Reset</button>
          <button type="submit" className="btn-primary" disabled={saving}>
            <PlusSquare size={16} /> {saving ? 'Saving...' : 'Add Medicine'}
          </button>
        </div>
      </form>
    </div>
  );
}
