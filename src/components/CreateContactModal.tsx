import React, { useState } from 'react';
import {
  Users,
  Building2,
  Mail,
  Phone,
  MapPin,
  FileText,
  DollarSign,
  X,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { Customer, Supplier, User } from '../types/erp';
import { api } from '../services/api';

interface CreateContactModalProps {
  mode: 'customer' | 'supplier';
  contactToEdit?: Customer | Supplier | null;
  currentUser: User;
  onClose: () => void;
  onSuccess: () => Promise<void>;
}

export const CreateContactModal: React.FC<CreateContactModalProps> = ({
  mode,
  contactToEdit,
  currentUser,
  onClose,
  onSuccess
}) => {
  const isCustomer = mode === 'customer';
  const isEditing = Boolean(contactToEdit);

  // Form State
  const [name, setName] = useState(
    isEditing
      ? (isCustomer ? (contactToEdit as Customer).companyName : (contactToEdit as Supplier).name)
      : ''
  );
  const [contactPerson, setContactPerson] = useState(contactToEdit?.contactPerson || '');
  const [email, setEmail] = useState(contactToEdit?.email || '');
  const [phone, setPhone] = useState(contactToEdit?.phone || '');
  const [country, setCountry] = useState(contactToEdit?.country || 'Saudi Arabia');
  const [city, setCity] = useState(contactToEdit?.city || 'Riyadh');
  const [address, setAddress] = useState(
    isCustomer ? (contactToEdit as Customer)?.shippingAddress || '' : ''
  );
  const [paymentTerms, setPaymentTerms] = useState(contactToEdit?.paymentTerms || 'Net 30 Days');
  const [currency, setCurrency] = useState(contactToEdit?.currency || 'USD');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!name.trim()) {
      setErrorMessage(`${isCustomer ? 'Customer / Company' : 'Supplier'} Name is required.`);
      return;
    }

    setIsSubmitting(true);
    try {
      if (isCustomer) {
        if (isEditing && contactToEdit) {
          await api.updateCustomer(contactToEdit.id, {
            companyName: name.trim(),
            contactPerson: contactPerson.trim(),
            email: email.trim(),
            phone: phone.trim(),
            country: country.trim(),
            city: city.trim(),
            shippingAddress: address.trim(),
            paymentTerms,
            currency
          }, currentUser);
        } else {
          await api.createCustomer({
            companyName: name.trim(),
            contactPerson: contactPerson.trim() || 'Procurement In-Charge',
            email: email.trim() || 'purchasing@client.com',
            phone: phone.trim(),
            country: country.trim(),
            city: city.trim(),
            shippingAddress: address.trim() || 'Client Central Receiving Dock',
            paymentTerms,
            currency
          }, currentUser);
        }
      } else {
        if (isEditing && contactToEdit) {
          await api.updateSupplier(contactToEdit.id, {
            name: name.trim(),
            contactPerson: contactPerson.trim(),
            email: email.trim(),
            phone: phone.trim(),
            country: country.trim(),
            city: city.trim(),
            paymentTerms,
            currency
          }, currentUser);
        } else {
          await api.createSupplier({
            name: name.trim(),
            contactPerson: contactPerson.trim() || 'Sales Representative',
            email: email.trim() || 'sales@supplier.com',
            phone: phone.trim(),
            country: country.trim(),
            city: city.trim(),
            paymentTerms,
            currency
          }, currentUser);
        }
      }

      await onSuccess();
      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || `Failed to save ${isCustomer ? 'customer' : 'supplier'}.`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-lg w-full my-auto overflow-hidden text-slate-800 animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center shadow-xs">
              <Building2 className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-base">
                {isEditing
                  ? `Edit ${isCustomer ? 'Customer' : 'Supplier'}`
                  : `Create New ${isCustomer ? 'Customer' : 'Supplier'}`}
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                {isCustomer
                  ? 'Register a client or company for sales dispatches, POs, and deliveries'
                  : 'Register an equipment manufacturer or distributor for incoming shipments'}
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

          <div>
            <label className="text-xs font-bold text-slate-800 block mb-1">
              {isCustomer ? 'Customer / Company Name *:' : 'Supplier / Vendor Name *:'}
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={isCustomer ? 'e.g. Saudi Aramco Refining Company' : 'e.g. Siemens AG Industrial Distribution'}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs font-semibold text-slate-900 focus:bg-white focus:outline-none focus:ring-1 focus:ring-slate-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                Contact Person:
              </label>
              <input
                type="text"
                value={contactPerson}
                onChange={(e) => setContactPerson(e.target.value)}
                placeholder="e.g. Eng. Khalid Al-Otaibi"
                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs text-slate-900 focus:bg-white focus:outline-none"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                Email Address:
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="e.g. procurement@company.com"
                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs text-slate-900 focus:bg-white focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                Phone / WhatsApp:
              </label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="e.g. +966 13 874 0000"
                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs text-slate-900 focus:bg-white focus:outline-none"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                Country:
              </label>
              <input
                type="text"
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                placeholder="e.g. Saudi Arabia, UAE, USA"
                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs text-slate-900 focus:bg-white focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                Payment Terms:
              </label>
              <select
                value={paymentTerms}
                onChange={(e) => setPaymentTerms(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs text-slate-900 focus:bg-white focus:outline-none"
              >
                <option value="Net 30 Days">Net 30 Days</option>
                <option value="Net 60 Days">Net 60 Days</option>
                <option value="Net 90 Days">Net 90 Days</option>
                <option value="100% Advance Payment">100% Advance Payment</option>
                <option value="Cash Against Documents (CAD)">Cash Against Documents (CAD)</option>
                <option value="Letter of Credit (L/C)">Letter of Credit (L/C)</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                Currency:
              </label>
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs text-slate-900 focus:bg-white focus:outline-none"
              >
                <option value="USD">USD ($)</option>
                <option value="EUR">EUR (€)</option>
                <option value="AED">AED (د.إ)</option>
                <option value="SAR">SAR (﷼)</option>
                <option value="GBP">GBP (£)</option>
              </select>
            </div>
          </div>

          {isCustomer && (
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                Shipping / Delivery Address:
              </label>
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="e.g. Dhahran Central Receiving Dock, Building 145"
                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs text-slate-900 focus:bg-white focus:outline-none"
              />
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
              <Building2 className="w-4 h-4 text-emerald-400" />
              <span>
                {isSubmitting ? 'Saving...' : isEditing ? `Save ${isCustomer ? 'Customer' : 'Supplier'}` : `Register ${isCustomer ? 'Customer' : 'Supplier'}`}
              </span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
