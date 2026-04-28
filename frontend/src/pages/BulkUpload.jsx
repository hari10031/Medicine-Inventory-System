import { useRef, useState } from 'react';
import * as XLSX from 'xlsx';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';
import { Upload, FileSpreadsheet, CheckCircle2, AlertCircle } from 'lucide-react';

const pickField = (row, ...keys) => {
  for (const k of keys) {
    const found = Object.keys(row).find(
      (rk) => rk.toLowerCase().replace(/[\s_-]/g, '') === k.toLowerCase().replace(/[\s_-]/g, '')
    );
    if (found && row[found] !== '' && row[found] != null) return row[found];
  }
  return undefined;
};

const toDate = (v) => {
  if (v == null || v === '') return null;
  // Excel serial number?
  if (typeof v === 'number') {
    const epoch = new Date(Date.UTC(1899, 11, 30));
    return new Date(epoch.getTime() + v * 86400000);
  }
  const d = new Date(v);
  return isNaN(d.getTime()) ? null : d;
};

const normalizeRow = (row, idx) => {
  const name = pickField(row, 'name', 'medicine', 'medicinename');
  const batchNo = pickField(row, 'batchNo', 'batch', 'batchnumber');
  const mfgRaw = pickField(row, 'manufacturingDate', 'mfg', 'mfgdate', 'manufactureddate');
  const expRaw = pickField(row, 'expiryDate', 'expiry', 'exp', 'expdate');
  const qtyRaw = pickField(row, 'quantity', 'qty', 'totalquantity');

  const mfg = toDate(mfgRaw);
  const exp = toDate(expRaw);
  const qty = qtyRaw !== undefined ? Number(qtyRaw) : NaN;

  const errors = [];
  if (!name) errors.push('name missing');
  if (!batchNo) errors.push('batchNo missing');
  if (mfgRaw && !mfg) errors.push('mfg invalid');
  if (!mfg) errors.push('manufacturingDate missing');
  if (expRaw && !exp) errors.push('expiry invalid');
  if (!exp) errors.push('expiryDate missing');
  if (mfg && exp && exp <= mfg) errors.push('expiry must be after mfg');
  if (Number.isNaN(qty)) errors.push('quantity invalid');
  if (qty < 0) errors.push('quantity negative');

  return {
    row: idx + 2,
    valid: errors.length === 0,
    errors,
    data: {
      name: name ? String(name).trim() : '',
      batchNo: batchNo ? String(batchNo).trim() : '',
      manufacturingDate: mfg,
      expiryDate: exp,
      quantity: qty,
    },
  };
};

const parseFile = async (file) => {
  const buf = await file.arrayBuffer();
  const wb = XLSX.read(buf, { type: 'array', cellDates: false });
  const sheet = wb.Sheets[wb.SheetNames[0]];
  return XLSX.utils.sheet_to_json(sheet, { defval: '' });
};

export default function BulkUpload() {
  const fileRef = useRef(null);
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [saving, setSaving] = useState(false);
  const [previewing, setPreviewing] = useState(false);

  const onPick = (e) => {
    const f = e.target.files?.[0];
    if (f) { setFile(f); setPreview(null); }
  };

  const doPreview = async () => {
    if (!file) return toast.error('Choose a file first');
    setPreviewing(true);
    try {
      const rows = await parseFile(file);
      const parsed = rows.map(normalizeRow);
      setPreview({
        total: parsed.length,
        validCount: parsed.filter((r) => r.valid).length,
        rows: parsed,
      });
    } catch (e) {
      toast.error(e.message || 'Preview failed');
    } finally {
      setPreviewing(false);
    }
  };

  const doSave = async () => {
    if (!preview) return;
    const validRows = preview.rows
      .filter((r) => r.valid)
      .map((r) => ({
        name: r.data.name,
        batch_no: r.data.batchNo,
        manufacturing_date: r.data.manufacturingDate.toISOString().slice(0, 10),
        expiry_date: r.data.expiryDate.toISOString().slice(0, 10),
        quantity: r.data.quantity,
        remaining_quantity: r.data.quantity,
      }));
    if (validRows.length === 0) return toast.error('No valid rows to save');
    setSaving(true);
    try {
      const { data, error } = await supabase
        .from('medicines')
        .upsert(validRows, { onConflict: 'name,batch_no', ignoreDuplicates: true })
        .select();
      if (error) throw error;
      const inserted = data?.length ?? 0;
      const skipped = validRows.length - inserted;
      toast.success(`Inserted ${inserted}, skipped ${skipped} duplicates`);
      setFile(null);
      setPreview(null);
      if (fileRef.current) fileRef.current.value = '';
    } catch (e) {
      toast.error(e.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Bulk Upload</h1>
      <div className="card p-6 space-y-4">
        <p className="text-sm text-slate-600 dark:text-slate-400">
          Upload an Excel (<code>.xlsx</code>) or CSV (<code>.csv</code>) file. Required columns:
          <code className="mx-1">name</code>,
          <code className="mx-1">batchNo</code>,
          <code className="mx-1">manufacturingDate</code>,
          <code className="mx-1">expiryDate</code>,
          <code className="mx-1">quantity</code>.
        </p>

        <div className="flex flex-wrap gap-3 items-center">
          <input
            ref={fileRef}
            type="file"
            accept=".xlsx,.xls,.csv"
            onChange={onPick}
            className="block text-sm file:mr-3 file:btn-primary file:border-0 file:px-4 file:py-2"
          />
          <button className="btn-secondary" onClick={doPreview} disabled={!file || previewing}>
            <FileSpreadsheet size={16} /> {previewing ? 'Parsing...' : 'Preview'}
          </button>
          <button className="btn-primary" onClick={doSave} disabled={!preview || preview.validCount === 0 || saving}>
            <Upload size={16} /> {saving ? 'Saving...' : `Save ${preview?.validCount || 0} valid rows`}
          </button>
        </div>
      </div>

      {preview && (
        <div className="card p-0 overflow-hidden">
          <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <div>
              <h3 className="font-semibold">Preview</h3>
              <p className="text-xs text-slate-500">{preview.validCount} valid / {preview.total} total</p>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 dark:bg-slate-800/50 text-left">
                <tr>
                  <th className="px-3 py-2">Row</th>
                  <th className="px-3 py-2">Status</th>
                  <th className="px-3 py-2">Name</th>
                  <th className="px-3 py-2">Batch</th>
                  <th className="px-3 py-2">Mfg</th>
                  <th className="px-3 py-2">Expiry</th>
                  <th className="px-3 py-2">Qty</th>
                  <th className="px-3 py-2">Errors</th>
                </tr>
              </thead>
              <tbody>
                {preview.rows.map((r) => (
                  <tr key={r.row} className="border-t border-slate-200 dark:border-slate-800">
                    <td className="px-3 py-2">{r.row}</td>
                    <td className="px-3 py-2">
                      {r.valid ? (
                        <span className="badge-green inline-flex items-center gap-1"><CheckCircle2 size={12} /> Valid</span>
                      ) : (
                        <span className="badge-red inline-flex items-center gap-1"><AlertCircle size={12} /> Invalid</span>
                      )}
                    </td>
                    <td className="px-3 py-2">{r.data.name || '-'}</td>
                    <td className="px-3 py-2">{r.data.batchNo || '-'}</td>
                    <td className="px-3 py-2">{r.data.manufacturingDate ? new Date(r.data.manufacturingDate).toISOString().slice(0, 10) : '-'}</td>
                    <td className="px-3 py-2">{r.data.expiryDate ? new Date(r.data.expiryDate).toISOString().slice(0, 10) : '-'}</td>
                    <td className="px-3 py-2">{Number.isNaN(r.data.quantity) ? '-' : r.data.quantity}</td>
                    <td className="px-3 py-2 text-red-600 text-xs">{r.errors.join(', ')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
