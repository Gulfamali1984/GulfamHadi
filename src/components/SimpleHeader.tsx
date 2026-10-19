import React from 'react';
import {
  ArrowDownToLine,
  ArrowUpFromLine,
  Layers,
  Building2,
  Package,
  Search,
  RefreshCw,
  LayoutGrid,
  Truck,
  Users,
  Database,
  Shield,
  UserCheck,
  UploadCloud,
  Plus
} from 'lucide-react';
import { Warehouse, User } from '../types/erp';

export type SimpleTab =
  | 'overview'
  | 'incoming'
  | 'outgoing'
  | 'consolidated'
  | 'store_by_store'
  | 'shipments'
  | 'items'
  | 'contacts'
  | 'users';

interface SimpleHeaderProps {
  activeTab: SimpleTab;
  onSelectTab: (tab: SimpleTab) => void;
  warehouses: Warehouse[];
  selectedStoreId: string;
  onSelectStore: (storeId: string) => void;
  searchTerm: string;
  onSearchChange: (term: string) => void;
  googleSheetsConnected?: boolean;
  onSync?: () => void;
  isSyncing?: boolean;
  onQuickReceive: () => void;
  onQuickDispatch: () => void;
  onOpenBulkUpload?: () => void;
  onOpenCreateItem?: () => void;
  onOpenCreateCustomer?: () => void;
  currentUser: User;
  onOpenLoginModal: () => void;
}

export const SimpleHeader: React.FC<SimpleHeaderProps> = ({
  activeTab,
  onSelectTab,
  warehouses,
  selectedStoreId,
  onSelectStore,
  searchTerm,
  onSearchChange,
  googleSheetsConnected,
  onSync,
  isSyncing,
  onQuickReceive,
  onQuickDispatch,
  onOpenBulkUpload,
  onOpenCreateItem,
  onOpenCreateCustomer,
  currentUser,
  onOpenLoginModal
}) => {
  const isAdmin = currentUser.role === 'Admin';
  const assignedWh = warehouses.find(w => w.id === currentUser.assignedWarehouseId);

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-xs">
      {/* Top Bar: Brand, Warehouse Filter, Search, Quick Actions, User Profile */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-2.5 flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Brand & Warehouse Selector */}
        <div className="flex items-center gap-3">
          <div
            className="flex items-center gap-2.5 cursor-pointer"
            onClick={() => onSelectTab('overview')}
            title="Real Deals ERP"
          >
            <div className="w-8 h-8 rounded-lg bg-slate-900 text-white flex items-center justify-center font-bold text-xs tracking-wider">
              RD
            </div>
            <div>
              <div className="font-bold text-slate-900 text-sm tracking-tight leading-none">
                Real Deals
              </div>
              <span className="text-[11px] text-slate-500 font-medium leading-none block mt-0.5">
                Procurement &amp; Logistics ERP
              </span>
            </div>
          </div>

          {/* Warehouse Selector (with Role Protection) */}
          <div className="hidden sm:flex items-center gap-1.5 ml-2 pl-3 border-l border-slate-200">
            <Building2 className="w-3.5 h-3.5 text-slate-400" />
            {isAdmin ? (
              <select
                value={selectedStoreId}
                onChange={(e) => onSelectStore(e.target.value)}
                className="bg-slate-50 hover:bg-slate-100 border border-slate-200 text-xs font-semibold text-slate-800 rounded-md px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-slate-400 cursor-pointer"
                title="Select store to view or filter"
              >
                <option value="ALL">All 9 Warehouses (Consolidated)</option>
                {warehouses.map((wh) => (
                  <option key={wh.id} value={wh.id}>
                    {wh.id}: {wh.name} ({wh.location})
                  </option>
                ))}
              </select>
            ) : (
              <div className="bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-800 rounded-md px-2.5 py-1.5 flex items-center gap-1">
                <span className="text-slate-500 font-normal">Assigned:</span>
                <span>{assignedWh ? `${assignedWh.id}: ${assignedWh.name} (${assignedWh.location})` : 'Assigned Store'}</span>
              </div>
            )}
          </div>
        </div>

        {/* Global Search Bar */}
        <div className="flex-1 max-w-sm">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Search part #, tracking #, serial..."
              className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-slate-400 transition-all"
            />
          </div>
        </div>

        {/* Action Buttons & User Profile */}
        <div className="flex items-center gap-2">
          {/* Quick Receive */}
          <button
            onClick={onQuickReceive}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white font-semibold text-xs transition-colors shadow-xs cursor-pointer"
            title="Receive incoming stock"
          >
            <ArrowDownToLine className="w-3.5 h-3.5" />
            <span>+ Receive Stock</span>
          </button>

          {/* Quick Dispatch */}
          <button
            onClick={onQuickDispatch}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs transition-colors shadow-xs cursor-pointer"
            title="Dispatch outgoing stock"
          >
            <ArrowUpFromLine className="w-3.5 h-3.5" />
            <span>− Dispatch Stock</span>
          </button>

          {/* Quick Bulk Upload (2,000+ Items & Balances) */}
          {onOpenBulkUpload && (
            <button
              onClick={onOpenBulkUpload}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-emerald-300 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold text-xs transition-colors shadow-xs cursor-pointer"
              title="Bulk upload 2,000+ items with closing balances from CSV or Excel"
            >
              <UploadCloud className="w-3.5 h-3.5 text-emerald-700" />
              <span className="hidden lg:inline">+ Bulk Upload</span>
            </button>
          )}

          {/* User Account / Role Switcher */}
          <button
            onClick={onOpenLoginModal}
            className="flex items-center gap-1.5 pl-2 pr-2.5 py-1 rounded-lg border border-slate-200 hover:border-slate-300 hover:bg-slate-50 transition-colors text-left"
            title="Switch User Account or Login"
          >
            <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-slate-700 text-[10px] font-bold">
              {currentUser.name.charAt(0)}
            </div>
            <div className="hidden sm:block">
              <span className="text-xs font-bold text-slate-900 leading-none block">
                {currentUser.name}
              </span>
              <span className="text-[10px] text-slate-500 font-medium leading-none block">
                {currentUser.role}
              </span>
            </div>
          </button>
        </div>
      </div>

      {/* Navigation Tabs (8 Core Simple Modules) */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <nav className="flex items-center gap-1 overflow-x-auto scrollbar-none py-1 border-t border-slate-100 text-xs font-medium">
          <button
            onClick={() => onSelectTab('overview')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-colors shrink-0 ${
              activeTab === 'overview'
                ? 'bg-slate-100 text-slate-900 font-bold'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            <LayoutGrid className="w-3.5 h-3.5 text-slate-500" />
            <span>Dashboard</span>
          </button>

          <button
            onClick={() => onSelectTab('incoming')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-colors shrink-0 ${
              activeTab === 'incoming'
                ? 'bg-slate-100 text-slate-900 font-bold'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            <ArrowDownToLine className="w-3.5 h-3.5 text-emerald-700" />
            <span>Incoming Stock</span>
          </button>

          <button
            onClick={() => onSelectTab('outgoing')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-colors shrink-0 ${
              activeTab === 'outgoing'
                ? 'bg-slate-100 text-slate-900 font-bold'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            <ArrowUpFromLine className="w-3.5 h-3.5 text-slate-700" />
            <span>Outgoing Stock</span>
          </button>

          {isAdmin && (
            <button
              onClick={() => onSelectTab('consolidated')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-colors shrink-0 ${
                activeTab === 'consolidated'
                  ? 'bg-slate-100 text-slate-900 font-bold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <Layers className="w-3.5 h-3.5 text-slate-600" />
              <span>Consolidated Stock</span>
            </button>
          )}

          <button
            onClick={() => onSelectTab('store_by_store')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-colors shrink-0 ${
              activeTab === 'store_by_store'
                ? 'bg-slate-100 text-slate-900 font-bold'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            <Building2 className="w-3.5 h-3.5 text-slate-600" />
            <span>{isAdmin ? 'Store by Store' : 'My Store Inventory'}</span>
          </button>

          <button
            onClick={() => onSelectTab('shipments')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-colors shrink-0 ${
              activeTab === 'shipments'
                ? 'bg-slate-100 text-slate-900 font-bold'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            <Truck className="w-3.5 h-3.5 text-slate-600" />
            <span>Shipment Tracker</span>
          </button>

          {/* Items Master Catalog */}
          <button
            onClick={() => onSelectTab('items')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-colors shrink-0 ${
              activeTab === 'items'
                ? 'bg-slate-100 text-slate-900 font-bold'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            <Package className="w-3.5 h-3.5 text-slate-600" />
            <span>Items Master</span>
          </button>

          {/* Customers & Suppliers */}
          <button
            onClick={() => onSelectTab('contacts')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-colors shrink-0 ${
              activeTab === 'contacts'
                ? 'bg-slate-100 text-slate-900 font-bold'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            <Users className="w-3.5 h-3.5 text-slate-600" />
            <span>Customers &amp; Suppliers</span>
          </button>

          {isAdmin && (
            <button
              onClick={() => onSelectTab('users')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-colors shrink-0 ${
                activeTab === 'users'
                  ? 'bg-slate-100 text-slate-900 font-bold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <Users className="w-3.5 h-3.5 text-slate-600" />
              <span>Users &amp; Roles</span>
            </button>
          )}
        </nav>
      </div>
    </header>
  );
};
