import React, { useState } from 'react';
import {
  Package,
  Plus,
  X,
  Building2,
  DollarSign,
  Barcode,
  Layers,
  CheckCircle2,
  AlertCircle,
  Truck
} from 'lucide-react';
import { Item, Warehouse, User, ItemCondition } from '../types/erp';
import { api } from '../services/api';

interface CreateItemModalProps {
  warehouses: Warehouse[];
  currentUser: User;
  itemToEdit?: Item | null;
  onClose: () => void;
  onSuccess: (item: Item) => Promise<void>;
}

export const CreateItemModal: React.FC<CreateItemModalProps> = ({
  warehouses,
  currentUser,
  itemToEdit,
  onClose,
  onSuccess
}) => {
  const isEditing = Boolean(itemToEdit);

  const [oemPartNumber, setOemPartNumber] = useState(itemToEdit?.oemPartNumber || '');
  const [brand, setBrand] = useState(itemToEdit?.brand || 'Siemens');
  const [description, setDescription] = useState(itemToEdit?.description || '');
  const [category, setCategory] = useState(itemToEdit?.category || 'PLC Systems');
  const [condition, setCondition] = useState<ItemCondition>(itemToEdit?.condition || 'Factory Sealed New');
  const [unit, setUnit] = useState(itemToEdit?.unit || 'PCS');
  const [costPriceUSD, setCostPriceUSD] = useState<number>(itemToEdit?.costPriceUSD || 0);
  const [sellingPriceUSD, setSellingPriceUSD] = useState<number>(itemToEdit?.sellingPriceUSD || 0);
  const [minSafetyStock, setMinSafetyStock] = useState<number>(itemToEdit?.minSafetyStock || 2);
  const [reorderPoint, setReorderPoint] = useState<number>(itemToEdit?.reorderPoint || 4);
  const [weightKg, setWeightKg] = useState<number>(itemToEdit?.weightKg || 1.0);
  const [hsCode, setHsCode] = useState(itemToEdit?.hsCode || '8537.10.91');
  const [countryOfOrigin, setCountryOfOrigin] = useState(itemToEdit?.countryOfOrigin || 'Germany');

  // Initial closing balance (for new item creation)
  const [initialStoreId, setInitialStoreId] = useState(warehouses[0]?.id || 'WH-001');
  const [initialClosingBalance, setInitialClosingBalance] = useState<number>(0);
  const [initialBinLocation, setInitialBinLocation] = useState('Shelf A-01');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!oemPartNumber.trim()) {
      setErrorMessage('Part Number / OEM Code is required.');
      return;
    }

    if (!description.trim()) {
      setErrorMessage('Description is required.');
      return;
    }

    setIsSubmitting(true);
    try {
      if (isEditing && itemToEdit) {
        const updated = await api.updateItem(itemToEdit.id, {
          oemPartNumber: oemPartNumber.trim().toUpperCase(),
          brand: brand.trim(),
          description: description.trim(),
          category: category.trim(),
          condition,
          unit,
          costPriceUSD: Number(costPriceUSD),
          sellingPriceUSD: Number(sellingPriceUSD) || (Number(costPriceUSD) * 1.35),
          minSafetyStock: Number(minSafetyStock),
          reorderPoint: Number(reorderPoint)
        }, currentUser);

        await onSuccess(updated);
      } else {
        const created = await api.createItem({
          oemPartNumber: oemPartNumber.trim().toUpperCase(),
          brand: brand.trim(),
          description: description.trim(),
          category: category.trim(),
          condition,
          unit,
          costPriceUSD: Number(costPriceUSD),
          sellingPriceUSD: Number(sellingPriceUSD) || (Number(costPriceUSD) * 1.35),
          minSafetyStock: Number(minSafetyStock),
          reorderPoint: Number(reorderPoint),
          weightKg: Number(weightKg),
          hsCode,
          countryOfOrigin
        }, currentUser);

        // If initial closing balance specified, set it immediately
        if (initialClosingBalance > 0) {
          await api.setClosingBalance({
            warehouseId: initialStoreId,
            itemId: created.id,
            closingBalance: Number(initialClosingBalance),
            binLocation: initialBinLocation,
            notes: 'Initial opening balance on item creation',
            currentUser
          }).catch(console.error);
        }

        await onSuccess(created);
      }

      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to save item. Please check the details.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-xl w-full my-auto overflow-hidden text-slate-800 animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center shadow-xs">
              <Package className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-base">
                {isEditing ? 'Edit Spare Part / Item Master' : 'Create New Item (Master Catalog)'}
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                {isEditing ? 'Modify item specifications, pricing and thresholds' : 'Add new spare part or industrial component into master inventory'}
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

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {errorMessage && (
            <div className="bg-rose-50 border border-rose-200 rounded-xl p-3 text-rose-800 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-slate-800 block mb-1">
                OEM Part Number / Code *:
              </label>
              <input
                type="text"
                required
                value={oemPartNumber}
                onChange={(e) => setOemPartNumber(e.target.value.toUpperCase())}
                placeholder="e.g. 6ES7315-2EH14-0AB0"
                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs font-mono font-bold text-slate-900 focus:bg-white focus:outline-none focus:ring-1 focus:ring-slate-500"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-800 block mb-1">
                Brand / Manufacturer *:
              </label>
              <input
                type="text"
                required
                list="brandSuggestions"
                value={brand}
                onChange={(e) => setBrand(e.target.value)}
                placeholder="e.g. Siemens, ABB, Schneider"
                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs font-semibold text-slate-900 focus:bg-white focus:outline-none focus:ring-1 focus:ring-slate-500"
              />
              <datalist id="brandSuggestions">
                <option value="Siemens" />
                <option value="ABB" />
                <option value="Schneider Electric" />
                <option value="Allen-Bradley" />
                <option value="Omron" />
                <option value="Fanuc" />
                <option value="Mitsubishi Electric" />
                <option value="Eaton" />
                <option value="Yokogawa" />
                <option value="Honeywell" />
              </datalist>
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-800 block mb-1">
              Item Description *:
            </label>
            <input
              type="text"
              required
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. SIMATIC S7-300 Compact CPU 315-2 PN/DP 384 KB Work Memory"
              className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-1 focus:ring-slate-500"
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">Category:</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs text-slate-800 focus:bg-white focus:outline-none"
              >
                <option value="PLC Systems">PLC Systems</option>
                <option value="VFD & Inverters">VFD &amp; Inverters</option>
                <option value="HMI Panels">HMI Panels</option>
                <option value="Motors & Drives">Motors &amp; Drives</option>
                <option value="Power & Switching">Power &amp; Switching</option>
                <option value="Sensors & Instrumentation">Sensors &amp; Instrumentation</option>
                <option value="Circuit Breakers">Circuit Breakers</option>
                <option value="Spare Parts">Spare Parts</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">Condition:</label>
              <select
                value={condition}
                onChange={(e) => setCondition(e.target.value as ItemCondition)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs text-slate-800 focus:bg-white focus:outline-none"
              >
                <option value="Factory Sealed New">Factory Sealed New</option>
                <option value="New Open Box">New Open Box</option>
                <option value="Used Tested">Used Tested</option>
                <option value="Refurbished">Refurbished</option>
                <option value="Core / Defective">Core / Defective</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">Unit:</label>
              <input
                type="text"
                value={unit}
                onChange={(e) => setUnit(e.target.value.toUpperCase())}
                placeholder="PCS"
                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs text-slate-800 focus:bg-white focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-slate-800 block mb-1">
                Cost Price (USD) *:
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 font-bold">$</span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  required
                  value={costPriceUSD}
                  onChange={(e) => {
                    const c = parseFloat(e.target.value) || 0;
                    setCostPriceUSD(c);
                    if (!sellingPriceUSD || sellingPriceUSD === 0) {
                      setSellingPriceUSD(parseFloat((c * 1.35).toFixed(2)));
                    }
                  }}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-7 pr-3 py-2 text-xs font-mono font-bold text-slate-900 focus:bg-white focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-800 block mb-1">
                Selling Price (USD):
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 font-bold">$</span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={sellingPriceUSD}
                  onChange={(e) => setSellingPriceUSD(parseFloat(e.target.value) || 0)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-7 pr-3 py-2 text-xs font-mono font-bold text-slate-900 focus:bg-white focus:outline-none"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                Min Safety Stock:
              </label>
              <input
                type="number"
                min="0"
                value={minSafetyStock}
                onChange={(e) => setMinSafetyStock(parseInt(e.target.value, 10) || 0)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs text-slate-900 focus:bg-white focus:outline-none"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                Reorder Point (ROP):
              </label>
              <input
                type="number"
                min="0"
                value={reorderPoint}
                onChange={(e) => setReorderPoint(parseInt(e.target.value, 10) || 0)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs text-slate-900 focus:bg-white focus:outline-none"
              />
            </div>
          </div>

          {/* Optional Opening Balance for New Item */}
          {!isEditing && (
            <div className="bg-slate-50/70 border border-slate-200 rounded-xl p-3.5 space-y-2.5">
              <div className="flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-slate-600" />
                <span className="text-xs font-bold text-slate-800">Initial Opening Balance (Optional)</span>
              </div>
              <p className="text-[11px] text-slate-500">
                You can immediately initialize on-hand closing stock for a warehouse upon creation.
              </p>

              <div className="grid grid-cols-3 gap-2 pt-1">
                <div>
                  <label className="text-[11px] font-semibold text-slate-600 block mb-1">Warehouse:</label>
                  <select
                    value={initialStoreId}
                    onChange={(e) => setInitialStoreId(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-lg p-1.5 text-xs text-slate-800 focus:outline-none"
                  >
                    {warehouses.map(w => (
                      <option key={w.id} value={w.id}>{w.code} ({w.location})</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-slate-600 block mb-1">Opening Stock:</label>
                  <input
                    type="number"
                    min="0"
                    value={initialClosingBalance}
                    onChange={(e) => setInitialClosingBalance(Math.max(0, parseInt(e.target.value, 10) || 0))}
                    className="w-full bg-white border border-slate-200 rounded-lg p-1.5 text-xs font-bold text-slate-900 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-slate-600 block mb-1">Bin Location:</label>
                  <input
                    type="text"
                    value={initialBinLocation}
                    onChange={(e) => setInitialBinLocation(e.target.value)}
                    placeholder="Shelf A-01"
                    className="w-full bg-white border border-slate-200 rounded-lg p-1.5 text-xs text-slate-800 focus:outline-none"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 text-xs font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-colors shadow-xs disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
            >
              <Package className="w-4 h-4 text-emerald-400" />
              <span>{isSubmitting ? 'Saving...' : isEditing ? 'Update Item Details' : 'Create & Register Item'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
