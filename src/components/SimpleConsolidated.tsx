import React, { useState } from 'react';
import {
  Layers,
  Search,
  Filter,
  Download,
  Building2,
  Package,
  Boxes,
  AlertTriangle,
  CheckCircle2
} from 'lucide-react';
import { ConsolidatedInventoryItem, Warehouse } from '../types/erp';

interface SimpleConsolidatedProps {
  consolidatedInventory: ConsolidatedInventoryItem[];
  warehouses: Warehouse[];
  onQuickReceivePart?: (itemId: string) => void;
}

export const SimpleConsolidated: React.FC<SimpleConsolidatedProps> = ({
  consolidatedInventory,
  warehouses,
  onQuickReceivePart
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [brandFilter, setBrandFilter] = useState('ALL');

  const brands = Array.from(new Set(consolidatedInventory.map(ci => ci.item.brand)));

  const filtered = consolidatedInventory.filter(ci => {
    const q = searchTerm.toLowerCase();
    const matchesSearch =
      ci.item.oemPartNumber.toLowerCase().includes(q) ||
      ci.item.brand.toLowerCase().includes(q) ||
      ci.item.sku.toLowerCase().includes(q) ||
      ci.item.description.toLowerCase().includes(q);

    const matchesBrand = brandFilter === 'ALL' || ci.item.brand === brandFilter;
    return matchesSearch && matchesBrand;
  });

  const totalPhysical = filtered.reduce((acc, c) => acc + c.totalPhysical, 0);
  const totalValuationUSD = filtered.reduce((acc, c) => acc + c.totalValuationUSD, 0);

  const handleExportCSV = () => {
    const headers = [
      'OEM Part Number',
      'Brand',
      'Description',
      'Category',
      'Total Stock On Hand',
      ...warehouses.map(w => `${w.id} (${w.code})`),
      'Unit Cost (USD)',
      'Total Value (USD)',
      'Low Stock Status'
    ];

    const rows = filtered.map(ci => [
      `"${ci.item.oemPartNumber}"`,
      `"${ci.item.brand}"`,
      `"${ci.item.description.replace(/"/g, '""')}"`,
      `"${ci.item.category}"`,
      ci.totalPhysical,
      ...warehouses.map(w => {
        const b = ci.warehouseBreakdown.find(wb => wb.warehouseId === w.id);
        return b?.physical ?? 0;
      }),
      ci.item.costPriceUSD,
      ci.totalValuationUSD,
      ci.isLowStock ? 'Low Stock' : 'Adequate'
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `RealDeals_Consolidated_Stock_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <Layers className="w-5 h-5 text-slate-700" />
            Consolidated Inventory (All 9 Stores Combined)
          </h2>
          <p className="text-xs text-slate-600 mt-0.5">
            Single unified overview of spare parts inventory across all worldwide Real Deals stores and transit buffers.
          </p>
        </div>

        <button
          onClick={handleExportCSV}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold transition-colors cursor-pointer self-start sm:self-auto"
        >
          <Download className="w-4 h-4 text-slate-500" />
          <span>Export Consolidated CSV</span>
        </button>
      </div>

      {/* KPI Stats Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
          <div className="text-xs text-slate-500 font-semibold">Total Filtered Parts</div>
          <div className="text-xl font-bold text-slate-900 mt-1">{filtered.length} Items</div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
          <div className="text-xs text-slate-500 font-semibold">Total On-Hand Stock</div>
          <div className="text-xl font-bold text-slate-900 mt-1">{totalPhysical} Units</div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
          <div className="text-xs text-slate-500 font-semibold">Consolidated Stock Valuation</div>
          <div className="text-xl font-bold text-slate-900 mt-1">
            ${totalValuationUSD.toLocaleString(undefined, { minimumFractionDigits: 2 })} USD
          </div>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="bg-white rounded-xl border border-slate-200 p-3 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="w-full sm:w-80 relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search part #, brand, description..."
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-slate-400"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Filter className="w-4 h-4 text-slate-400" />
          <select
            value={brandFilter}
            onChange={(e) => setBrandFilter(e.target.value)}
            className="bg-slate-50 border border-slate-200 text-xs font-medium text-slate-700 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-slate-400"
          >
            <option value="ALL">All Brands</option>
            {brands.map(b => (
              <option key={b} value={b}>{b}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Consolidated Master Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[11px]">
              <tr>
                <th className="py-3 px-4">OEM Part Number &amp; Brand</th>
                <th className="py-3 px-4">Description</th>
                <th className="py-3 px-4 text-center font-bold text-slate-900 bg-slate-100/60">Total Stock</th>
                {warehouses.map(w => (
                  <th key={w.id} className="py-3 px-2 text-center text-[10px]" title={`${w.id}: ${w.name} (${w.location})`}>
                    <div>{w.id}</div>
                    <div className="font-normal text-slate-400 lowercase">{w.code.split('-')[0]}</div>
                  </th>
                ))}
                <th className="py-3 px-4 text-right">Unit Cost</th>
                <th className="py-3 px-4 text-right">Total Valuation</th>
                <th className="py-3 px-4 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6 + warehouses.length} className="py-10 text-center text-slate-400 text-xs">
                    No items found matching the selected filters.
                  </td>
                </tr>
              ) : (
                filtered.map((ci) => (
                  <tr key={ci.item.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 px-4 whitespace-nowrap">
                      <div className="font-bold text-slate-900">{ci.item.oemPartNumber}</div>
                      <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-100 text-slate-600 font-medium">
                        {ci.item.brand}
                      </span>
                    </td>
                    <td className="py-3 px-4 max-w-xs">
                      <div className="text-[11px] text-slate-600 line-clamp-1">{ci.item.description}</div>
                      <div className="text-[10px] text-slate-400">{ci.item.category} • {ci.item.condition}</div>
                    </td>
                    <td className="py-3 px-4 text-center font-bold text-slate-900 bg-slate-50/50 text-sm">
                      {ci.totalPhysical}
                    </td>
                    {/* Warehouse Breakdown Columns */}
                    {warehouses.map(w => {
                      const wb = ci.warehouseBreakdown.find(b => b.warehouseId === w.id);
                      const qty = wb?.physical ?? 0;
                      return (
                        <td key={w.id} className="py-3 px-2 text-center">
                          {qty > 0 ? (
                            <span className="font-semibold text-slate-900 text-xs">{qty}</span>
                          ) : (
                            <span className="text-slate-300 font-mono text-[11px]">0</span>
                          )}
                        </td>
                      );
                    })}
                    <td className="py-3 px-4 text-right text-slate-700 whitespace-nowrap">
                      ${ci.item.costPriceUSD.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-3 px-4 text-right font-bold text-slate-900 whitespace-nowrap">
                      ${ci.totalValuationUSD.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-3 px-4 text-center whitespace-nowrap">
                      {ci.isLowStock ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">
                          <AlertTriangle className="w-3 h-3 text-amber-600" />
                          Low Stock
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          In Stock
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
