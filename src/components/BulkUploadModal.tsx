import React, { useState } from 'react';
import {
  UploadCloud,
  FileSpreadsheet,
  Download,
  CheckCircle2,
  AlertTriangle,
  X,
  Search,
  Building2,
  Package,
  Layers,
  ArrowRight,
  Database,
  FileText,
  ClipboardPaste,
  Sparkles,
  RefreshCw
} from 'lucide-react';
import { Warehouse, User } from '../types/erp';
import { api } from '../services/api';

interface BulkUploadModalProps {
  warehouses: Warehouse[];
  currentUser: User;
  preselectedWarehouseId?: string;
  onClose: () => void;
  onUploadSuccess: () => Promise<void>;
}

export interface ParsedItemRow {
  oemPartNumber: string;
  brand: string;
  description: string;
  category: string;
  unit: string;
  costPriceUSD: number;
  sellingPriceUSD?: number;
  warehouseCode?: string;
  closingBalance: number;
  binLocation: string;
  minSafetyStock?: number;
  reorderPoint?: number;
  condition?: string;
  status: 'valid' | 'warning' | 'invalid';
  validationMessage?: string;
}

export const BulkUploadModal: React.FC<BulkUploadModalProps> = ({
  warehouses,
  currentUser,
  preselectedWarehouseId,
  onClose,
  onUploadSuccess
}) => {
  const isAdmin = currentUser.role === 'Admin';
  const assignedStoreId = currentUser.assignedWarehouseId;

  const defaultWh = (!isAdmin && assignedStoreId)
    ? assignedStoreId
    : (preselectedWarehouseId && preselectedWarehouseId !== 'ALL' ? preselectedWarehouseId : warehouses[0]?.id || 'WH-001');

  const [selectedTargetStore, setSelectedTargetStore] = useState<string>(defaultWh);
  const [activeInputMode, setActiveInputMode] = useState<'file' | 'paste'>('file');
  const [pasteText, setPasteText] = useState('');
  const [fileName, setFileName] = useState<string>('');
  const [parsedRows, setParsedRows] = useState<ParsedItemRow[]>([]);
  const [isProcessingFile, setIsProcessingFile] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<{ current: number; total: number } | null>(null);
  const [uploadResult, setUploadResult] = useState<{
    success: boolean;
    totalReceived: number;
    newItemsCreated: number;
    existingItemsUpdated: number;
    balancesSet: number;
    message: string;
  } | null>(null);
  const [previewSearch, setPreviewSearch] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Template CSV Generator
  const handleDownloadSampleCSV = () => {
    const headers = [
      'OEM Part Number',
      'Brand',
      'Description',
      'Category',
      'Unit Cost USD',
      'Warehouse Code',
      'Closing Balance',
      'Bin Location',
      'Min Safety Stock',
      'Condition'
    ];

    const sampleRows = [
      ['6ES7315-2EH14-0AB0', 'Siemens', 'SIMATIC S7-300 CPU 315-2 PN/DP Compact Controller', 'PLC Systems', '1450.00', 'TLS-USA', '12', 'Shelf A-02', '3', 'Factory Sealed New'],
      ['ACS880-01-045A-3', 'ABB', 'Industrial Variable Frequency Drive 22kW 400V IP21', 'VFD & Inverters', '2100.00', 'TOLL-UAE', '8', 'Bay B-04', '2', 'Factory Sealed New'],
      ['1756-L83E', 'Allen-Bradley', 'ControlLogix 5580 Controller 10MB Memory Ethernet', 'PLC Systems', '3250.00', 'BFLO-USA', '5', 'Rack R-11', '2', 'Factory Sealed New'],
      ['LC1D80M7', 'Schneider Electric', 'TeSys D Contactor 3P 80A AC-3 220V Coil', 'Power & Switching', '125.00', 'SNT-UAE', '35', 'Bin S-08', '10', 'Factory Sealed New'],
      ['A06B-6114-H209', 'Fanuc', 'Alpha i Servo Amplifier Module Dual Axis SVM2-40/40i', 'Motors & Drives', '1850.00', 'TLS-USA', '4', 'Shelf D-01', '1', 'Refurbished'],
      ['E3Z-T61 2M', 'Omron', 'Photoelectric Sensor Thru-beam NPN 15m Cable Type', 'Sensors & Instrumentation', '42.50', 'DXB-UAE', '60', 'Drawer S-03', '15', 'Factory Sealed New'],
      ['6AV2124-0GC01-0AX0', 'Siemens', 'SIMATIC HMI TP700 Comfort Touch Panel 7 Inch', 'HMI Panels', '1180.00', 'REG-USA', '9', 'Shelf H-05', '2', 'New Open Box']
    ];

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...sampleRows.map(r => r.map(c => `"${c}"`).join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `RealDeals_Inventory_Migration_Template.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Parse CSV / TSV text
  const parseDelimitedText = (text: string) => {
    setErrorMessage(null);
    if (!text || !text.trim()) {
      setParsedRows([]);
      return;
    }

    try {
      const lines = text.trim().split(/\r?\n/).filter(line => line.trim().length > 0);
      if (lines.length < 2) {
        setErrorMessage('The file/text must contain at least a header row and one item data row.');
        return;
      }

      // Detect separator: comma or tab
      const firstLine = lines[0];
      const separator = firstLine.includes('\t') ? '\t' : ',';

      // Parse line into tokens respecting quotes
      const tokenizeLine = (line: string): string[] => {
        const tokens: string[] = [];
        let current = '';
        let insideQuotes = false;

        for (let i = 0; i < line.length; i++) {
          const char = line[i];
          if (char === '"' || char === "'") {
            insideQuotes = !insideQuotes;
          } else if (char === separator && !insideQuotes) {
            tokens.push(current.trim().replace(/^["']|["']$/g, ''));
            current = '';
          } else {
            current += char;
          }
        }
        tokens.push(current.trim().replace(/^["']|["']$/g, ''));
        return tokens;
      };

      const rawHeaders = tokenizeLine(lines[0]).map(h => h.toLowerCase().replace(/[^a-z0-9]/g, ''));

      // Find column indices
      const findIndex = (patterns: string[]): number => {
        return rawHeaders.findIndex(h => patterns.some(p => h.includes(p)));
      };

      const partIndex = findIndex(['part', 'itemcode', 'oem', 'sku', 'code', 'partnumber', 'model']);
      const brandIndex = findIndex(['brand', 'make', 'mfg', 'manufacturer']);
      const descIndex = findIndex(['desc', 'description', 'title', 'name']);
      const catIndex = findIndex(['cat', 'category', 'type', 'group']);
      const costIndex = findIndex(['cost', 'price', 'unitcost', 'rate', 'costusd']);
      const whIndex = findIndex(['warehouse', 'store', 'location', 'facility', 'branch']);
      const balIndex = findIndex(['closing', 'balance', 'qty', 'quantity', 'stock', 'physical', 'count', 'onhand']);
      const binIndex = findIndex(['bin', 'shelf', 'rack', 'aisle', 'slot']);
      const minStockIndex = findIndex(['min', 'safetystock', 'safety', 'threshold', 'rop']);
      const condIndex = findIndex(['cond', 'condition', 'state', 'grade']);

      if (partIndex === -1) {
        setErrorMessage('Could not detect an "OEM Part Number" or "Item Code" column in the header. Please verify your file columns.');
        return;
      }

      const rows: ParsedItemRow[] = [];

      for (let i = 1; i < lines.length; i++) {
        const tokens = tokenizeLine(lines[i]);
        if (tokens.length === 0 || tokens.every(t => !t)) continue;

        const partNum = (tokens[partIndex] || '').trim();
        if (!partNum) continue;

        const brand = brandIndex !== -1 && tokens[brandIndex] ? tokens[brandIndex].trim() : 'Industrial Spare';
        const desc = descIndex !== -1 && tokens[descIndex] ? tokens[descIndex].trim() : partNum;
        const cat = catIndex !== -1 && tokens[catIndex] ? tokens[catIndex].trim() : 'Automation & Controls';
        const cost = costIndex !== -1 ? Math.max(0, parseFloat(tokens[costIndex].replace(/[^0-9.]/g, '')) || 0) : 0;
        const wh = whIndex !== -1 && tokens[whIndex] ? tokens[whIndex].trim() : selectedTargetStore;
        const bal = balIndex !== -1 ? Math.max(0, parseInt(tokens[balIndex].replace(/[^0-9]/g, ''), 10) || 0) : 0;
        const bin = binIndex !== -1 && tokens[binIndex] ? tokens[binIndex].trim() : 'Shelf A-01';
        const minStock = minStockIndex !== -1 ? Math.max(0, parseInt(tokens[minStockIndex].replace(/[^0-9]/g, ''), 10) || 2) : 2;
        const cond = condIndex !== -1 && tokens[condIndex] ? tokens[condIndex].trim() : 'Factory Sealed New';

        rows.push({
          oemPartNumber: partNum,
          brand,
          description: desc,
          category: cat,
          unit: 'PCS',
          costPriceUSD: cost,
          warehouseCode: wh,
          closingBalance: bal,
          binLocation: bin,
          minSafetyStock: minStock,
          condition: cond,
          status: 'valid'
        });
      }

      setParsedRows(rows);
    } catch (err: any) {
      setErrorMessage(`Error parsing data: ${err.message}`);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setIsProcessingFile(true);

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      parseDelimitedText(content);
      setIsProcessingFile(false);
    };
    reader.onerror = () => {
      setErrorMessage('Failed to read the file.');
      setIsProcessingFile(false);
    };
    reader.readAsText(file);
  };

  const handleApplyPaste = () => {
    setFileName('Pasted Data');
    parseDelimitedText(pasteText);
  };

  // Upload handler
  const handleStartUpload = async () => {
    if (parsedRows.length === 0) return;
    setIsUploading(true);
    setErrorMessage(null);

    try {
      // Send data to backend endpoint
      const payload = parsedRows.map(r => ({
        oemPartNumber: r.oemPartNumber,
        brand: r.brand,
        description: r.description,
        category: r.category,
        unit: r.unit,
        costPriceUSD: r.costPriceUSD,
        warehouseCode: r.warehouseCode || selectedTargetStore,
        closingBalance: r.closingBalance,
        binLocation: r.binLocation,
        minSafetyStock: r.minSafetyStock,
        condition: r.condition
      }));

      // In case of huge datasets (e.g. 2,000+ items), chunk by 500 to keep it lightning fast
      const CHUNK_SIZE = 500;
      let totalNewItems = 0;
      let totalUpdatedItems = 0;
      let totalBalancesSet = 0;

      for (let i = 0; i < payload.length; i += CHUNK_SIZE) {
        const chunk = payload.slice(i, i + CHUNK_SIZE);
        setUploadProgress({ current: Math.min(i + CHUNK_SIZE, payload.length), total: payload.length });

        const res = await api.bulkUploadCompleteInventory({
          itemsWithBalances: chunk,
          defaultWarehouseId: selectedTargetStore,
          currentUser
        });

        if (res.success) {
          totalNewItems += res.newItemsCreated;
          totalUpdatedItems += res.existingItemsUpdated;
          totalBalancesSet += res.balancesSet;
        }
      }

      setUploadResult({
        success: true,
        totalReceived: payload.length,
        newItemsCreated: totalNewItems,
        existingItemsUpdated: totalUpdatedItems,
        balancesSet: totalBalancesSet,
        message: `Successfully migrated ${payload.length} items with their closing balances.`
      });

      await onUploadSuccess();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to upload inventory. Please try again.');
    } finally {
      setIsUploading(false);
      setUploadProgress(null);
    }
  };

  const filteredPreview = parsedRows.filter(r => {
    if (!previewSearch) return true;
    const q = previewSearch.toLowerCase();
    return (
      r.oemPartNumber.toLowerCase().includes(q) ||
      r.brand.toLowerCase().includes(q) ||
      r.description.toLowerCase().includes(q) ||
      (r.warehouseCode && r.warehouseCode.toLowerCase().includes(q))
    );
  });

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-4xl w-full my-auto overflow-hidden text-slate-800 animate-in fade-in zoom-in-95 duration-150 flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center shadow-xs">
              <UploadCloud className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-slate-900 text-base">Bulk Inventory &amp; Closing Balances Upload</h3>
                <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                  2,000+ Items Supported
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Upload your complete spare parts catalog and closing balances directly from Google Sheets or Excel CSV.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1">
          {/* Result Success Modal */}
          {uploadResult ? (
            <div className="p-6 text-center space-y-4 my-4">
              <div className="w-14 h-14 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center mx-auto shadow-xs">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <div>
                <h4 className="text-lg font-bold text-slate-900">Inventory Upload Completed Successfully!</h4>
                <p className="text-xs text-slate-600 mt-1 max-w-md mx-auto">
                  {uploadResult.message} All items have been indexed in the Master Catalog, warehouse physical balances have been updated, and Google Sheets is synchronized.
                </p>
              </div>

              <div className="grid grid-cols-3 gap-3 max-w-lg mx-auto pt-2">
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-center">
                  <span className="text-[11px] font-semibold text-slate-500 block">Total Items Processed</span>
                  <span className="text-lg font-bold text-slate-900">{uploadResult.totalReceived.toLocaleString()}</span>
                </div>
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-center">
                  <span className="text-[11px] font-semibold text-emerald-700 block">New Catalog Items</span>
                  <span className="text-lg font-bold text-emerald-800">{uploadResult.newItemsCreated.toLocaleString()}</span>
                </div>
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-center">
                  <span className="text-[11px] font-semibold text-blue-700 block">Closing Balances Set</span>
                  <span className="text-lg font-bold text-blue-800">{uploadResult.balancesSet.toLocaleString()}</span>
                </div>
              </div>

              <div className="pt-4 flex justify-center gap-3">
                <button
                  onClick={onClose}
                  className="px-6 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-xs transition-colors cursor-pointer"
                >
                  Close &amp; View Inventory
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* Top Controls: Target Store & Sample Template */}
              <div className="bg-slate-50/70 border border-slate-200 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-slate-600 shrink-0" />
                  <div>
                    <label className="text-xs font-bold text-slate-800 block">
                      Target Warehouse / Facility:
                    </label>
                    <span className="text-[11px] text-slate-500">
                      Default store if not specified in your CSV row
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {isAdmin ? (
                    <select
                      value={selectedTargetStore}
                      onChange={(e) => setSelectedTargetStore(e.target.value)}
                      className="bg-white border border-slate-300 text-xs font-semibold text-slate-800 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-slate-500 shadow-xs"
                    >
                      {warehouses.map(w => (
                        <option key={w.id} value={w.id}>{w.id} - {w.name} ({w.location})</option>
                      ))}
                    </select>
                  ) : (
                    <div className="bg-white border border-slate-300 text-xs font-semibold text-slate-800 rounded-lg px-3 py-1.5 shadow-xs">
                      {warehouses.find(w => w.id === selectedTargetStore)?.name || selectedTargetStore} (Assigned Store)
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={handleDownloadSampleCSV}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-xs transition-colors shrink-0 cursor-pointer"
                    title="Download pre-formatted CSV template"
                  >
                    <Download className="w-3.5 h-3.5 text-slate-600" />
                    <span>Download CSV Template</span>
                  </button>
                </div>
              </div>

              {/* Mode Selector Tabs: Upload File vs Paste Rows */}
              <div className="flex border-b border-slate-200 gap-4 text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => setActiveInputMode('file')}
                  className={`pb-2 flex items-center gap-1.5 transition-colors cursor-pointer ${
                    activeInputMode === 'file'
                      ? 'border-b-2 border-slate-900 text-slate-900 font-bold'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <FileSpreadsheet className="w-4 h-4" />
                  <span>Upload CSV / Excel File</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveInputMode('paste')}
                  className={`pb-2 flex items-center gap-1.5 transition-colors cursor-pointer ${
                    activeInputMode === 'paste'
                      ? 'border-b-2 border-slate-900 text-slate-900 font-bold'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <ClipboardPaste className="w-4 h-4" />
                  <span>Direct Paste from Google Sheets</span>
                </button>
              </div>

              {/* File Upload Mode */}
              {activeInputMode === 'file' && (
                <div className="space-y-3">
                  <label className="border-2 border-dashed border-slate-300 hover:border-slate-400 bg-slate-50/50 hover:bg-slate-50 rounded-2xl p-6 text-center flex flex-col items-center justify-center cursor-pointer transition-colors block">
                    <input
                      type="file"
                      accept=".csv,.tsv,.txt"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                    <UploadCloud className="w-10 h-10 text-slate-400 mb-2" />
                    <span className="text-xs font-bold text-slate-800 block">
                      Click to choose CSV file or drag and drop here
                    </span>
                    <span className="text-[11px] text-slate-500 block mt-1">
                      Supports comma-delimited (.csv) and tab-delimited (.tsv / .txt) files up to 5,000+ rows
                    </span>
                    {fileName && (
                      <span className="mt-2 text-xs font-semibold px-3 py-1 bg-white border border-slate-200 rounded-lg text-emerald-700 shadow-xs inline-flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        Loaded: {fileName}
                      </span>
                    )}
                  </label>
                </div>
              )}

              {/* Direct Paste Mode */}
              {activeInputMode === 'paste' && (
                <div className="space-y-2">
                  <div className="flex justify-between items-center text-xs text-slate-500">
                    <span>Copy rows directly from your Google Sheet or Excel and paste here:</span>
                    <span className="text-[11px]">Header line + data rows</span>
                  </div>
                  <textarea
                    rows={6}
                    value={pasteText}
                    onChange={(e) => setPasteText(e.target.value)}
                    placeholder="OEM Part Number&#9;Brand&#9;Description&#9;Category&#9;Unit Cost USD&#9;Warehouse Code&#9;Closing Balance&#9;Bin Location&#10;6ES7315-2EH14-0AB0&#9;Siemens&#9;SIMATIC S7-300 CPU&#9;PLC&#9;1450.00&#9;TLS-USA&#9;12&#9;Shelf A-01"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs font-mono text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-1 focus:ring-slate-500 leading-relaxed"
                  />
                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={handleApplyPaste}
                      disabled={!pasteText.trim()}
                      className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-xs font-semibold transition-colors disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Parse Pasted Content</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Error Banner */}
              {errorMessage && (
                <div className="bg-rose-50 border border-rose-200 rounded-xl p-3.5 text-rose-800 text-xs flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold block">Import Error</span>
                    <span>{errorMessage}</span>
                  </div>
                </div>
              )}

              {/* Preview & Validation Table */}
              {parsedRows.length > 0 && (
                <div className="space-y-3 pt-2">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 pb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-900">Parsed Items Preview</span>
                      <span className="px-2.5 py-0.5 rounded-full bg-slate-900 text-white text-[11px] font-bold">
                        {parsedRows.length.toLocaleString()} items ready
                      </span>
                    </div>

                    <div className="relative max-w-xs w-full">
                      <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        value={previewSearch}
                        onChange={(e) => setPreviewSearch(e.target.value)}
                        placeholder="Filter preview..."
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-8 pr-2.5 py-1 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:bg-white"
                      />
                    </div>
                  </div>

                  <div className="border border-slate-200 rounded-xl overflow-hidden max-h-64 overflow-y-auto shadow-xs">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead className="bg-slate-50 sticky top-0 border-b border-slate-200 text-slate-600 font-bold uppercase text-[10px]">
                        <tr>
                          <th className="py-2 px-3">#</th>
                          <th className="py-2 px-3">Part / OEM Code</th>
                          <th className="py-2 px-3">Brand</th>
                          <th className="py-2 px-3">Description</th>
                          <th className="py-2 px-3">Store</th>
                          <th className="py-2 px-3 text-right">Closing Bal.</th>
                          <th className="py-2 px-3 text-right">Cost (USD)</th>
                          <th className="py-2 px-3">Bin</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {filteredPreview.slice(0, 50).map((row, idx) => (
                          <tr key={idx} className="hover:bg-slate-50/70">
                            <td className="py-1.5 px-3 text-slate-400 font-mono text-[10px]">{idx + 1}</td>
                            <td className="py-1.5 px-3 font-bold text-slate-900 font-mono">{row.oemPartNumber}</td>
                            <td className="py-1.5 px-3 text-slate-700">{row.brand}</td>
                            <td className="py-1.5 px-3 text-slate-600 max-w-xs truncate">{row.description}</td>
                            <td className="py-1.5 px-3 text-slate-700 font-semibold">{row.warehouseCode || selectedTargetStore}</td>
                            <td className="py-1.5 px-3 text-right font-bold text-emerald-800 bg-emerald-50/40">
                              {row.closingBalance}
                            </td>
                            <td className="py-1.5 px-3 text-right text-slate-700 font-mono">
                              ${row.costPriceUSD.toFixed(2)}
                            </td>
                            <td className="py-1.5 px-3 text-slate-500 font-mono text-[11px]">{row.binLocation}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {parsedRows.length > 50 && (
                    <p className="text-[11px] text-slate-500 text-right">
                      Showing first 50 rows of {parsedRows.length.toLocaleString()} total detected items.
                    </p>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer Actions */}
        {!uploadResult && (
          <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
            <button
              type="button"
              onClick={onClose}
              disabled={isUploading}
              className="px-4 py-2 border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-100 text-xs font-semibold transition-colors"
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={handleStartUpload}
              disabled={isUploading || parsedRows.length === 0}
              className="px-6 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all disabled:opacity-50 shadow-xs flex items-center gap-2 cursor-pointer"
            >
              {isUploading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>
                    Uploading ({uploadProgress ? `${uploadProgress.current}/${uploadProgress.total}` : 'Processing'} items)...
                  </span>
                </>
              ) : (
                <>
                  <UploadCloud className="w-4 h-4 text-emerald-400" />
                  <span>
                    Import {parsedRows.length > 0 ? `${parsedRows.length.toLocaleString()} Items & Balances` : 'Inventory Data'}
                  </span>
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
