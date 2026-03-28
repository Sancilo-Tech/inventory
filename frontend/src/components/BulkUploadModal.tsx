import React, { useState, useRef, useCallback } from 'react';
import {
  X, Upload, Download, FileDown, AlertCircle,
  CheckCircle, FileSpreadsheet, Loader2,
} from 'lucide-react';
import { toast } from 'react-toastify';
import {
  parseExcelFile, downloadSampleTemplate, downloadErrorReport,
  type ParseResult, type ParsedRow,
} from '../utils/excelParser';
import { itemAPI } from '../services/api';

interface BulkUploadModalProps {
  onClose: () => void;
  onSuccess: () => void;
  locationId: string;
}

interface UploadResult {
  successCount: number;
  failed: { row: number; error: string }[];
}

const CHUNK_SIZE = 100;

const BulkUploadModal: React.FC<BulkUploadModalProps> = ({ onClose, onSuccess, locationId }) => {
  const [parseResult, setParseResult] = useState<ParseResult | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadResult, setUploadResult] = useState<UploadResult | null>(null);
  const [allowPartial, setAllowPartial] = useState(true);
  const [fileName, setFileName] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const processFile = useCallback(async (file: File) => {
    if (!file.name.match(/\.(xlsx|csv|xls)$/i)) {
      toast.error('Only .xlsx, .xls, or .csv files are supported');
      return;
    }
    setFileName(file.name);
    setParseResult(null);
    setUploadResult(null);
    try {
      const result = await parseExcelFile(file);
      setParseResult(result);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to parse file');
    }
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) processFile(file);
  }, [processFile]);

  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); setIsDragging(true); };
  const handleDragLeave = () => setIsDragging(false);

  const handleUpload = async () => {
    if (!parseResult) return;

    const rowsToUpload: ParsedRow[] = allowPartial
      ? parseResult.rows.filter(r => r.isValid)
      : parseResult.rows;

    if (rowsToUpload.length === 0) {
      toast.error('No valid rows to upload');
      return;
    }

    if (!allowPartial && parseResult.invalidCount > 0) {
      toast.error('Fix all errors before uploading, or enable partial upload');
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);

    const payload = rowsToUpload.map(r => ({
      ...r.data,
      location_id: r.data.location_id || locationId,
    }));

    // Chunk into batches of CHUNK_SIZE
    const chunks: typeof payload[] = [];
    for (let i = 0; i < payload.length; i += CHUNK_SIZE) {
      chunks.push(payload.slice(i, i + CHUNK_SIZE));
    }

    let totalSuccess = 0;
    const allFailed: { row: number; error: string }[] = [];

    for (let i = 0; i < chunks.length; i++) {
      try {
        const res = await itemAPI.bulkUpload(chunks[i]);
        totalSuccess += res.data.successCount;
        allFailed.push(...(res.data.failed ?? []));
      } catch {
        // If a whole chunk fails, mark all rows in it as failed
        const chunkStart = i * CHUNK_SIZE;
        chunks[i].forEach((_, j) => {
          allFailed.push({ row: rowsToUpload[chunkStart + j].rowIndex, error: 'Chunk upload failed' });
        });
      }
      setUploadProgress(Math.round(((i + 1) / chunks.length) * 100));
    }

    setUploadResult({ successCount: totalSuccess, failed: allFailed });
    setIsUploading(false);

    if (totalSuccess > 0) {
      toast.success(`${totalSuccess} item(s) uploaded successfully`);
      onSuccess();
    }
    if (allFailed.length > 0) {
      toast.warning(`${allFailed.length} row(s) failed. Download the error report for details.`);
    }
  };

  const handleDownloadErrors = () => {
    if (!parseResult) return;
    downloadErrorReport(parseResult.rows);
  };

  const canUpload = parseResult && (allowPartial ? parseResult.validCount > 0 : parseResult.invalidCount === 0);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <FileSpreadsheet className="text-blue-600" size={22} />
            <h2 className="text-lg font-bold text-gray-900">Bulk Item Upload</h2>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <X size={22} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-5">
          {/* Template download */}
          <div className="flex items-center justify-between bg-blue-50 border border-blue-200 rounded-lg px-4 py-3">
            <p className="text-sm text-blue-700">
              Download the sample template, fill in your items, then upload.
            </p>
            <button
              onClick={downloadSampleTemplate}
              className="flex items-center gap-1.5 text-sm font-medium text-blue-600 hover:text-blue-800 whitespace-nowrap ml-4"
            >
              <Download size={15} /> Sample Template
            </button>
          </div>

          {/* Drop zone */}
          <div
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${
              isDragging ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-blue-400 hover:bg-gray-50'
            }`}
          >
            <Upload className="mx-auto mb-2 text-gray-400" size={32} />
            {fileName ? (
              <p className="text-sm font-medium text-gray-700">{fileName}</p>
            ) : (
              <>
                <p className="text-sm font-medium text-gray-700">Drag & drop your file here</p>
                <p className="text-xs text-gray-400 mt-1">or click to browse — .xlsx, .xls, .csv</p>
              </>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              className="hidden"
              onChange={handleFileChange}
            />
          </div>

          {/* Validation summary */}
          {parseResult && (
            <>
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-gray-50 rounded-lg p-3 text-center border border-gray-200">
                  <p className="text-2xl font-bold text-gray-800">{parseResult.rows.length}</p>
                  <p className="text-xs text-gray-500 mt-0.5">Total Rows</p>
                </div>
                <div className="bg-green-50 rounded-lg p-3 text-center border border-green-200">
                  <p className="text-2xl font-bold text-green-700">{parseResult.validCount}</p>
                  <p className="text-xs text-green-600 mt-0.5">Valid</p>
                </div>
                <div className="bg-red-50 rounded-lg p-3 text-center border border-red-200">
                  <p className="text-2xl font-bold text-red-700">{parseResult.invalidCount}</p>
                  <p className="text-xs text-red-600 mt-0.5">Invalid</p>
                </div>
              </div>

              {/* Partial upload toggle */}
              {parseResult.invalidCount > 0 && (
                <div className="flex items-center justify-between bg-amber-50 border border-amber-200 rounded-lg px-4 py-3">
                  <div>
                    <p className="text-sm font-medium text-amber-800">Partial Upload</p>
                    <p className="text-xs text-amber-600">Upload only valid rows and skip invalid ones</p>
                  </div>
                  <button
                    onClick={() => setAllowPartial(p => !p)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      allowPartial ? 'bg-amber-500' : 'bg-gray-300'
                    }`}
                  >
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      allowPartial ? 'translate-x-6' : 'translate-x-1'
                    }`} />
                  </button>
                </div>
              )}

              {/* Row preview table */}
              <div className="border border-gray-200 rounded-lg overflow-hidden">
                <div className="bg-gray-50 px-4 py-2 flex items-center justify-between border-b border-gray-200">
                  <p className="text-sm font-medium text-gray-700">Preview</p>
                  {parseResult.invalidCount > 0 && (
                    <button
                      onClick={handleDownloadErrors}
                      className="flex items-center gap-1 text-xs text-red-600 hover:text-red-800"
                    >
                      <FileDown size={13} /> Download Error Report
                    </button>
                  )}
                </div>
                <div className="overflow-x-auto max-h-64">
                  <table className="w-full text-xs">
                    <thead className="bg-gray-50 sticky top-0">
                      <tr>
                        <th className="px-3 py-2 text-left text-gray-500 font-medium">Row</th>
                        <th className="px-3 py-2 text-left text-gray-500 font-medium">Status</th>
                        <th className="px-3 py-2 text-left text-gray-500 font-medium">Item Code</th>
                        <th className="px-3 py-2 text-left text-gray-500 font-medium">Item Name</th>
                        <th className="px-3 py-2 text-left text-gray-500 font-medium">Price</th>
                        <th className="px-3 py-2 text-left text-gray-500 font-medium">Qty</th>
                        <th className="px-3 py-2 text-left text-gray-500 font-medium min-w-[200px]">Errors</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {parseResult.rows.map(row => (
                        <tr key={row.rowIndex} className={row.isValid ? 'bg-white' : 'bg-red-50'}>
                          <td className="px-3 py-2 text-gray-500">{row.rowIndex}</td>
                          <td className="px-3 py-2">
                            {row.isValid
                              ? <CheckCircle size={14} className="text-green-500" />
                              : <AlertCircle size={14} className="text-red-500" />}
                          </td>
                          <td className="px-3 py-2 font-mono text-gray-700">{row.data.item_code || '—'}</td>
                          <td className="px-3 py-2 text-gray-700">{row.data.item_name || '—'}</td>
                          <td className="px-3 py-2 text-gray-700">
                            {row.data.purchase_price > 0 ? `€${row.data.purchase_price}` : '—'}
                          </td>
                          <td className="px-3 py-2 text-gray-700">{row.data.current_qty}</td>
                          <td className="px-3 py-2 text-red-600">{row.errors.join('; ') || '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}

          {/* Upload progress */}
          {isUploading && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm text-gray-600">
                <span className="flex items-center gap-1.5">
                  <Loader2 size={14} className="animate-spin" /> Uploading...
                </span>
                <span>{uploadProgress}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
          )}

          {/* Upload result */}
          {uploadResult && (
            <div className={`rounded-lg p-4 border ${
              uploadResult.failed.length === 0
                ? 'bg-green-50 border-green-200'
                : 'bg-amber-50 border-amber-200'
            }`}>
              <p className="text-sm font-medium text-gray-800">
                ✅ {uploadResult.successCount} item(s) inserted successfully.
                {uploadResult.failed.length > 0 && ` ❌ ${uploadResult.failed.length} row(s) failed.`}
              </p>
              {uploadResult.failed.length > 0 && (
                <ul className="mt-2 space-y-0.5 max-h-28 overflow-y-auto">
                  {uploadResult.failed.map((f, i) => (
                    <li key={i} className="text-xs text-red-700">Row {f.row}: {f.error}</li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
          <p className="text-xs text-gray-400">Max 1000 rows per upload. Barcodes auto-generated.</p>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Close
            </button>
            <button
              onClick={handleUpload}
              disabled={!canUpload || isUploading}
              className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
            >
              {isUploading ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
              {allowPartial && parseResult && parseResult.invalidCount > 0
                ? `Upload ${parseResult.validCount} Valid Rows`
                : 'Upload All'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BulkUploadModal;
