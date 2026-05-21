import React, { useState, useCallback, useMemo } from 'react';
import * as XLSX from 'xlsx';
import { Upload, FileSpreadsheet, X, AlertCircle, CheckCircle2, ArrowRight, Loader2 } from 'lucide-react';

const FIELD_OPTIONS = [
  { value: 'category', label: 'Category' },
  { value: 'title', label: 'Company / Title' },
  { value: 'subtitle', label: 'Subtitle' },
  { value: 'name', label: 'Contact Name' },
  { value: 'role', label: 'Role' },
  { value: 'email', label: 'Email' },
  { value: 'phone', label: 'Phone' },
  { value: 'location', label: 'Location' },
  { value: 'tags', label: 'Tags' },
  { value: '_skip', label: 'Skip Column' },
];

function autoDetectMapping(headers) {
  const rules = {
    title: ['title', 'company', 'organization', 'entity', 'brand', 'business', 'venue'],
    subtitle: ['subtitle', 'sub', 'subheading', 'specialty'],
    name: ['name', 'contact', 'person', 'representative', 'contact name', 'point of contact'],
    role: ['role', 'position', 'job title', 'designation', 'job'],
    email: ['email', 'e-mail', 'mail', 'email address'],
    phone: ['phone', 'telephone', 'tel', 'mobile', 'cell', 'phone number'],
    location: ['location', 'address', 'city', 'place', 'region', 'state', 'metro'],
    tags: ['tags', 'tag', 'filter', 'label', 'genre'],
    category: ['category', 'group', 'department', 'section', 'industry', 'vertical'],
  };
  const mapping = {};
  headers.forEach(h => {
    const hh = (h || '').toString().toLowerCase().trim();
    for (const [field, keywords] of Object.entries(rules)) {
      if (keywords.some(kw => hh === kw || hh.includes(kw) || kw.includes(hh))) {
        mapping[h] = field;
        return;
      }
    }
    mapping[h] = '_skip';
  });
  return mapping;
}

export default function SpreadsheetImport({ isOpen, onClose, onImport, existingCategories }) {
  const [step, setStep] = useState('upload');
  const [file, setFile] = useState(null);
  const [rawHeaders, setRawHeaders] = useState([]);
  const [rawRows, setRawRows] = useState([]);
  const [columnMapping, setColumnMapping] = useState({});
  const [defaultCategory, setDefaultCategory] = useState('');
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState(null);
  const [error, setError] = useState('');

  const handleFileChange = useCallback((e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setError('');
    setFile(f);
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = new Uint8Array(evt.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const json = XLSX.utils.sheet_to_json(sheet, { defval: '' });
        if (!json.length) {
          setError('Spreadsheet appears empty. Check the file and try again.');
          return;
        }
        const headers = Object.keys(json[0]);
        const rows = json.map(row => {
          const obj = {};
          headers.forEach(h => { obj[h] = row[h] !== undefined ? String(row[h]) : ''; });
          return obj;
        });
        setRawHeaders(headers);
        setRawRows(rows);
        setColumnMapping(autoDetectMapping(headers));
        setStep('mapping');
      } catch (err) {
        setError('Failed to parse file. Ensure it is a valid CSV or Excel file.');
      }
    };
    reader.readAsArrayBuffer(f);
  }, []);

  const mappedRows = useMemo(() => {
    const fieldToCol = {};
    Object.entries(columnMapping).forEach(([col, field]) => {
      if (field !== '_skip') fieldToCol[field] = col;
    });
    return rawRows.map(row => {
      const entry = {};
      Object.entries(fieldToCol).forEach(([field, col]) => {
        entry[field] = row[col] || '';
      });
      if (!entry.category || !entry.category.trim()) {
        entry.category = defaultCategory;
      }
      Object.keys(entry).forEach(k => {
        if (!entry[k] || entry[k] === 'N/A') entry[k] = '';
      });
      return entry;
    });
  }, [rawRows, columnMapping, defaultCategory]);

  const newCategories = useMemo(() => {
    const existing = new Set((existingCategories || []).map(c => c.toLowerCase()));
    const found = new Set();
    mappedRows.forEach(r => {
      if (r.category && !existing.has(r.category.toLowerCase())) {
        found.add(r.category);
      }
    });
    return Array.from(found);
  }, [mappedRows, existingCategories]);

  const nonEmptyRowCount = useMemo(() => {
    return mappedRows.filter(r => r.title || r.name).length;
  }, [mappedRows]);

  const handleColumnMapChange = (header, field) => {
    setColumnMapping(prev => ({ ...prev, [header]: field }));
  };

  const handleImport = async () => {
    setImporting(true);
    setError('');
    try {
      const validRows = mappedRows.filter(r => r.title || r.name);
      if (!validRows.length) {
        setError('No valid rows to import (need at least a title or name).');
        setImporting(false);
        return;
      }
      const result = await onImport(validRows);
      setImportResult(result);
      setStep('done');
    } catch (err) {
      setError(err.message || 'Import failed.');
    }
    setImporting(false);
  };

  const reset = () => {
    setFile(null);
    setRawHeaders([]);
    setRawRows([]);
    setColumnMapping({});
    setDefaultCategory('');
    setImportResult(null);
    setError('');
    setStep('upload');
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-neutral-900 border border-neutral-800 rounded-xl w-full max-w-3xl shadow-2xl relative my-8 max-h-[90vh] flex flex-col">
        <div className="sticky top-0 bg-neutral-900 border-b border-neutral-800 p-4 rounded-t-xl flex justify-between items-center z-10">
          <h2 className="text-lg font-bold text-white flex items-center gap-2 tracking-tight">
            <FileSpreadsheet size={18} className="text-amber-500" />
            Import Spreadsheet
          </h2>
          <button onClick={handleClose} className="text-neutral-500 hover:text-white p-1">
            <X size={18} />
          </button>
        </div>

        <div className="p-5 overflow-y-auto flex-1">
          {step === 'upload' && (
            <div>
              <div className="border-2 border-dashed border-neutral-700 rounded-xl p-12 text-center hover:border-amber-500/40 transition-colors cursor-pointer bg-neutral-800/20"
                onClick={() => document.getElementById('spreadsheet-input').click()}>
                <Upload size={40} className="mx-auto text-neutral-600 mb-4" />
                <p className="text-neutral-300 font-medium mb-1">Click to upload a spreadsheet</p>
                <p className="text-neutral-500 text-xs">Supports .csv, .xlsx, .xls files</p>
                <input
                  id="spreadsheet-input"
                  type="file"
                  accept=".csv,.xlsx,.xls"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </div>
              {error && (
                <div className="mt-4 flex items-center gap-2 text-red-400 text-sm bg-red-400/5 border border-red-400/20 rounded-lg p-3">
                  <AlertCircle size={16} /> {error}
                </div>
              )}
              <div className="mt-6 bg-neutral-800/30 rounded-lg p-4 text-xs text-neutral-400">
                <p className="font-medium text-neutral-300 mb-2">Expected columns (auto-detected):</p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-1">
                  {['Category', 'Title', 'Subtitle', 'Name', 'Role', 'Email', 'Phone', 'Location', 'Tags'].map(col => (
                    <span key={col} className="text-neutral-500">• {col}</span>
                  ))}
                </div>
                <p className="mt-3 text-neutral-500">New categories found in the spreadsheet will be added automatically.</p>
              </div>
            </div>
          )}

          {step === 'mapping' && (
            <div>
              {error && (
                <div className="mb-4 flex items-center gap-2 text-red-400 text-sm bg-red-400/5 border border-red-400/20 rounded-lg p-3">
                  <AlertCircle size={16} /> {error}
                </div>
              )}

              <div className="mb-4">
                <p className="text-sm text-neutral-300 font-medium mb-1">File: <span className="text-amber-400">{file?.name}</span></p>
                <p className="text-xs text-neutral-500">{rawRows.length} rows detected</p>
              </div>

              <div className="mb-4">
                <label className="block text-neutral-400 mb-1 text-xs font-bold uppercase tracking-wider">
                  Default Category (for rows without a category column)
                </label>
                <select
                  value={defaultCategory}
                  onChange={e => setDefaultCategory(e.target.value)}
                  className="w-full sm:w-64 bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-amber-500 text-sm"
                >
                  <option value="">— None —</option>
                  {existingCategories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                </select>
              </div>

              <div className="overflow-x-auto border border-neutral-800 rounded-lg">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-neutral-800/50">
                      {rawHeaders.map(h => (
                        <th key={h} className="p-2 text-left font-medium text-neutral-300 whitespace-nowrap border-b border-neutral-700">
                          <div className="mb-1">{h}</div>
                          <select
                            value={columnMapping[h] || '_skip'}
                            onChange={e => handleColumnMapChange(h, e.target.value)}
                            className="bg-neutral-950 border border-neutral-700 rounded px-2 py-1 text-white text-[10px] w-full focus:outline-none focus:border-amber-500"
                          >
                            {FIELD_OPTIONS.map(opt => (
                              <option key={opt.value} value={opt.value}>{opt.label}</option>
                            ))}
                          </select>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {rawRows.slice(0, 5).map((row, i) => (
                      <tr key={i} className="border-b border-neutral-800/50 last:border-0">
                        {rawHeaders.map(h => (
                          <td key={h} className="p-2 text-neutral-400 max-w-[160px] truncate">{row[h]}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="text-[10px] text-neutral-600 mt-2">Showing first 5 rows of {rawRows.length}</p>

              {nonEmptyRowCount > 0 && (
                <div className="mt-4 bg-neutral-800/30 rounded-lg p-3 text-xs">
                  <p className="text-neutral-300 font-medium">
                    {nonEmptyRowCount} rows mapped • {newCategories.length > 0
                      ? <span className="text-amber-400">{newCategories.length} new categor{newCategories.length === 1 ? 'y' : 'ies'}: {newCategories.join(', ')}</span>
                      : <span className="text-green-400">No new categories</span>
                    }
                  </p>
                </div>
              )}
            </div>
          )}

          {step === 'done' && importResult && (
            <div className="text-center py-8">
              {importResult.success ? (
                <>
                  <div className="w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
                    <CheckCircle2 size={32} className="text-green-400" />
                  </div>
                  <h3 className="text-lg font-bold text-white mb-1">Import Complete</h3>
                  <p className="text-neutral-400 text-sm">{importResult.count} records added successfully.</p>
                  {importResult.newCategories?.length > 0 && (
                    <p className="text-amber-400 text-xs mt-2">
                      New categor{importResult.newCategories.length === 1 ? 'y' : 'ies'}: {importResult.newCategories.join(', ')}
                    </p>
                  )}
                </>
              ) : (
                <>
                  <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
                    <AlertCircle size={32} className="text-red-400" />
                  </div>
                  <h3 className="text-lg font-bold text-white mb-1">Import Failed</h3>
                  <p className="text-neutral-400 text-sm">{importResult.error}</p>
                </>
              )}
            </div>
          )}
        </div>

        <div className="sticky bottom-0 bg-neutral-900 border-t border-neutral-800 p-4 rounded-b-xl flex justify-between items-center">
          {step === 'upload' && (
            <div className="flex items-center gap-2 text-xs text-neutral-500">
              <FileSpreadsheet size={14} /> No file selected
            </div>
          )}
          {step === 'mapping' && (
            <>
              <button onClick={handleClose} className="px-4 py-2 text-sm text-neutral-400 hover:text-white transition-colors">
                Cancel
              </button>
              <div className="flex items-center gap-3">
                {nonEmptyRowCount > 0 && (
                  <span className="text-xs text-neutral-500">{nonEmptyRowCount} rows ready</span>
                )}
                <button
                  onClick={handleImport}
                  disabled={importing || nonEmptyRowCount === 0}
                  className="flex items-center gap-2 px-5 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold transition-colors disabled:opacity-50 shadow-md shadow-amber-500/10 text-sm"
                >
                  {importing ? <Loader2 size={16} className="animate-spin" /> : <ArrowRight size={16} />}
                  {importing ? 'Importing...' : `Import ${nonEmptyRowCount} Record${nonEmptyRowCount !== 1 ? 's' : ''}`}
                </button>
              </div>
            </>
          )}
          {step === 'done' && (
            <button onClick={handleClose} className="px-5 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold transition-colors text-sm">
              Done
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
