import React, { useState } from 'react';
import {
  Truck,
  Search,
  Filter,
  Download,
  CheckCircle2,
  Clock,
  ArrowDownToLine,
  ArrowUpFromLine,
  Building2,
  ExternalLink,
  Edit2,
  X
} from 'lucide-react';
import { ShipmentRecord, ShipmentType, SimpleShipmentStatus, Warehouse, User } from '../types/erp';

interface SimpleShipmentTrackerProps {
  shipments: ShipmentRecord[];
  warehouses: Warehouse[];
  currentUser: User;
  onUpdateShipmentStatus: (id: string, status: string, notes?: string, updatedBy?: string) => Promise<void>;
}

export const SimpleShipmentTracker: React.FC<SimpleShipmentTrackerProps> = ({
  shipments,
  warehouses,
  currentUser,
  onUpdateShipmentStatus
}) => {
  const [activeTypeTab, setActiveTypeTab] = useState<'ALL' | 'Incoming' | 'Outgoing'>('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [storeFilter, setStoreFilter] = useState('ALL');

  // Edit status modal state
  const [editingShipment, setEditingShipment] = useState<ShipmentRecord | null>(null);
  const [newStatus, setNewStatus] = useState<SimpleShipmentStatus>('In Transit');
  const [statusNotes, setStatusNotes] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);

  const filteredShipments = shipments.filter(s => {
    const matchesType = activeTypeTab === 'ALL' || s.type === activeTypeTab;
    const matchesStore = storeFilter === 'ALL' || s.warehouseId === storeFilter;
    const matchesStatus = statusFilter === 'ALL' || s.status === statusFilter;

    // Search by Tracking No., Item Code, Serial Number, PO, supplier, customer, or date
    const q = searchTerm.toLowerCase();
    const matchesSearch =
      s.trackingNumber.toLowerCase().includes(q) ||
      s.itemCode.toLowerCase().includes(q) ||
      s.itemName.toLowerCase().includes(q) ||
      s.serialNumber.toLowerCase().includes(q) ||
      s.poOrRef.toLowerCase().includes(q) ||
      s.party.toLowerCase().includes(q) ||
      s.date.includes(q) ||
      s.carrier.toLowerCase().includes(q);

    return matchesType && matchesStore && matchesStatus && matchesSearch;
  });

  const handleStartUpdate = (s: ShipmentRecord) => {
    setEditingShipment(s);
    setNewStatus(s.status);
    setStatusNotes(s.notes || '');
  };

  const handleSaveStatus = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingShipment) return;

    setIsUpdating(true);
    try {
      await onUpdateShipmentStatus(editingShipment.id, newStatus, statusNotes, currentUser.name);
      setEditingShipment(null);
    } catch (err: any) {
      alert(err.message || 'Failed to update shipment status');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleExportCSV = () => {
    const headers = [
      'Tracking Number',
      'Type',
      'Warehouse',
      'Item Code',
      'Item Description',
      'Quantity',
      'Serial Number',
      'Supplier / Customer',
      'PO / Reference',
      'Date',
      'Carrier',
      'Status',
      'Recorded By',
      'Notes'
    ];
    const rows = filteredShipments.map(s => [
      `"${s.trackingNumber}"`,
      s.type,
      `"${s.warehouseCode}"`,
      `"${s.itemCode}"`,
      `"${s.itemName.replace(/"/g, '""')}"`,
      s.quantity,
      `"${s.serialNumber}"`,
      `"${s.party}"`,
      `"${s.poOrRef}"`,
      s.date,
      `"${s.carrier}"`,
      s.status,
      `"${s.recordedBy}"`,
      `"${(s.notes || '').replace(/"/g, '""')}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `RealDeals_Shipments_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Header bar */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <Truck className="w-5 h-5 text-slate-700" />
            Shipment Tracker (Incoming &amp; Outgoing Cargo)
          </h2>
          <p className="text-xs text-slate-600 mt-0.5">
            Real-time track and trace across carrier logistics, air waybills, customs status, and delivery milestones.
          </p>
        </div>

        <button
          onClick={handleExportCSV}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold transition-colors cursor-pointer self-start sm:self-auto"
        >
          <Download className="w-4 h-4 text-slate-500" />
          <span>Export Shipments CSV</span>
        </button>
      </div>

      {/* Tabs: All / Incoming / Outgoing */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
        <button
          onClick={() => setActiveTypeTab('ALL')}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
            activeTypeTab === 'ALL'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          All Shipments ({shipments.length})
        </button>

        <button
          onClick={() => setActiveTypeTab('Incoming')}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 ${
            activeTypeTab === 'Incoming'
              ? 'bg-emerald-700 text-white shadow-xs'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <ArrowDownToLine className="w-3.5 h-3.5" />
          <span>Incoming Shipments ({shipments.filter(s => s.type === 'Incoming').length})</span>
        </button>

        <button
          onClick={() => setActiveTypeTab('Outgoing')}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 ${
            activeTypeTab === 'Outgoing'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <ArrowUpFromLine className="w-3.5 h-3.5" />
          <span>Outgoing Shipments ({shipments.filter(s => s.type === 'Outgoing').length})</span>
        </button>
      </div>

      {/* Search & Filters */}
      <div className="bg-white rounded-xl border border-slate-200 p-3 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="w-full sm:w-96 relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search Tracking #, Item, Serial, PO, Supplier, Customer, Date..."
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-slate-400"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-slate-50 border border-slate-200 text-xs font-medium text-slate-700 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-slate-400"
          >
            <option value="ALL">All Statuses</option>
            <option value="Booked">Booked</option>
            <option value="In Transit">In Transit</option>
            <option value="Customs Clearance">Customs Clearance</option>
            <option value="Out for Delivery">Out for Delivery</option>
            <option value="Delivered">Delivered</option>
          </select>

          {/* Store Filter */}
          <select
            value={storeFilter}
            onChange={(e) => setStoreFilter(e.target.value)}
            className="bg-slate-50 border border-slate-200 text-xs font-medium text-slate-700 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-slate-400"
          >
            <option value="ALL">All Warehouses</option>
            {warehouses.map(w => (
              <option key={w.id} value={w.id}>
                {w.id} ({w.code})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Shipments List Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[11px]">
              <tr>
                <th className="py-3 px-4">Tracking No. &amp; Carrier</th>
                <th className="py-3 px-4">Type</th>
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">Warehouse</th>
                <th className="py-3 px-4">Item &amp; Description</th>
                <th className="py-3 px-4 text-center">Qty</th>
                <th className="py-3 px-4">Party (Supplier / Customer)</th>
                <th className="py-3 px-4">PO / Ref</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredShipments.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-10 text-center text-slate-400 text-xs">
                    No shipments found matching your search.
                  </td>
                </tr>
              ) : (
                filteredShipments.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 px-4 whitespace-nowrap">
                      <div className="font-mono font-bold text-slate-900">{s.trackingNumber}</div>
                      <div className="text-[11px] text-slate-500">{s.carrier}</div>
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full inline-flex items-center gap-1 ${
                        s.type === 'Incoming'
                          ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                          : 'bg-slate-100 text-slate-800 border border-slate-200'
                      }`}>
                        {s.type === 'Incoming' ? <ArrowDownToLine className="w-3 h-3" /> : <ArrowUpFromLine className="w-3 h-3" />}
                        {s.type}
                      </span>
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap text-slate-700">
                      {s.date}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap font-medium text-slate-800">
                      {s.warehouseCode}
                    </td>
                    <td className="py-3 px-4 max-w-xs">
                      <div className="font-bold text-slate-900">{s.itemCode}</div>
                      <div className="text-[11px] text-slate-500 line-clamp-1">{s.itemName}</div>
                      {s.serialNumber && (
                        <div className="text-[10px] text-slate-400 font-mono mt-0.5">S/N: {s.serialNumber}</div>
                      )}
                    </td>
                    <td className="py-3 px-4 text-center font-bold text-slate-900">
                      {s.quantity}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap text-slate-800 font-medium">
                      {s.party}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap font-mono text-[11px] text-slate-600">
                      {s.poOrRef}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                        s.status === 'Delivered'
                          ? 'bg-emerald-100 text-emerald-800'
                          : s.status === 'In Transit'
                          ? 'bg-blue-100 text-blue-800'
                          : s.status === 'Customs Clearance'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-slate-100 text-slate-700'
                      }`}>
                        {s.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      <button
                        onClick={() => handleStartUpdate(s)}
                        className="px-2.5 py-1 text-xs font-semibold rounded bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors inline-flex items-center gap-1"
                        title="Update Shipment Status"
                      >
                        <Edit2 className="w-3 h-3" />
                        <span>Update</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Update Shipment Modal */}
      {editingShipment && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl border border-slate-200 shadow-xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-bold text-slate-900 text-sm">Update Shipment Status</h3>
                <span className="text-xs text-slate-500 font-mono">{editingShipment.trackingNumber}</span>
              </div>
              <button
                onClick={() => setEditingShipment(null)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveStatus} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Shipment Status:
                </label>
                <select
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value as SimpleShipmentStatus)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs font-semibold text-slate-900 focus:bg-white focus:outline-none"
                >
                  <option value="Booked">Booked</option>
                  <option value="In Transit">In Transit</option>
                  <option value="Customs Clearance">Customs Clearance</option>
                  <option value="Out for Delivery">Out for Delivery</option>
                  <option value="Delivered">Delivered</option>
                  <option value="Exception">Exception</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Milestone Notes / Location Update:
                </label>
                <textarea
                  rows={3}
                  value={statusNotes}
                  onChange={(e) => setStatusNotes(e.target.value)}
                  placeholder="e.g. Cleared customs at Dubai Logistics City. Handed over to last-mile courier."
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs text-slate-900 focus:bg-white focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingShipment(null)}
                  className="px-4 py-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isUpdating}
                  className="px-5 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold transition-colors disabled:opacity-50"
                >
                  {isUpdating ? 'Saving...' : 'Update Status'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
