import { useRef, useState } from 'react';
import { api } from '../lib/api';
import toast from 'react-hot-toast';
import { Upload, FileSpreadsheet, CheckCircle2, AlertCircle } from 'lucide-react';

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
    const fd = new FormData();
    fd.append('file', file);
    try {
      const { data } = await api.post('/medicines/bulk/preview', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setPreview(data);
    } catch (e) {
      toast.error(e.response?.data?.message || 'Preview failed');
    } finally {
      setPreviewing(false);
    }
  };

  const doSave = async () => {
    if (!file) return;
    setSaving(true);
    const fd = new FormData();
    fd.append('file', file);
    try {
      const { data } = await api.post('/medicines/bulk/save', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      toast.success(`Inserted ${data.inserted}, skipped ${data.skipped}, invalid ${data.invalid}`);
      setFile(null); setPreview(null);
      if (fileRef.current) fileRef.current.value = '';
    } catch (e) {
      toast.error(e.response?.data?.message || 'Save failed');
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
