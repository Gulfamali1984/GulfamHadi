import React, { useState } from 'react';
import { User, Warehouse } from '../types/erp';
import { Shield, Key, Mail, CheckCircle2, AlertCircle, X, UserCheck } from 'lucide-react';

interface SimpleLoginModalProps {
  currentUser: User;
  users: User[];
  warehouses: Warehouse[];
  onSelectUser: (user: User) => void;
  onLoginWithCredentials: (email: string, password?: string) => Promise<boolean>;
  onClose: () => void;
}

export const SimpleLoginModal: React.FC<SimpleLoginModalProps> = ({
  currentUser,
  users,
  warehouses,
  onSelectUser,
  onLoginWithCredentials,
  onClose
}) => {
  const [emailInput, setEmailInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleManualLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    if (!emailInput.trim()) {
      setErrorMsg('Please enter your email address.');
      return;
    }

    setIsSubmitting(true);
    try {
      const ok = await onLoginWithCredentials(emailInput.trim(), passwordInput);
      if (ok) {
        onClose();
      } else {
        setErrorMsg('Invalid email or password. Please verify your credentials.');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Login failed.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleQuickSwitch = (u: User) => {
    onSelectUser(u);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl border border-slate-200 shadow-xl max-w-lg w-full overflow-hidden text-slate-800">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-slate-700" />
            <div>
              <h3 className="font-bold text-slate-900 text-sm">User Authentication &amp; Access</h3>
              <p className="text-xs text-slate-500">Sign in or switch authorized operational role</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1 rounded-md transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* Currently Logged In Card */}
          <div className="bg-slate-50 rounded-lg p-3 border border-slate-200 flex items-center justify-between">
            <div>
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">Currently Active User</span>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-sm font-bold text-slate-900">{currentUser.name}</span>
                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                  currentUser.role === 'Admin'
                    ? 'bg-slate-900 text-white'
                    : currentUser.role === 'Warehouse Manager'
                    ? 'bg-blue-100 text-blue-800'
                    : 'bg-slate-200 text-slate-700'
                }`}>
                  {currentUser.role}
                </span>
              </div>
              <span className="text-xs text-slate-500">
                {currentUser.role === 'Admin' ? 'Full Access (All 9 Warehouses)' : `Assigned Store: ${currentUser.assignedWarehouseId || 'None'}`}
              </span>
            </div>
            <UserCheck className="w-5 h-5 text-emerald-600" />
          </div>

          {/* Quick Profile Switcher */}
          <div>
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-2">
              Quick Role Switch (Demo Profiles)
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {users.map((u) => {
                const wh = warehouses.find(w => w.id === u.assignedWarehouseId);
                const isSelected = u.id === currentUser.id;
                return (
                  <button
                    key={u.id}
                    onClick={() => handleQuickSwitch(u)}
                    type="button"
                    className={`text-left p-2.5 rounded-lg border text-xs transition-colors flex flex-col justify-between cursor-pointer ${
                      isSelected
                        ? 'border-slate-900 bg-slate-900 text-white shadow-xs'
                        : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-800'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold">{u.name}</span>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded ${
                        isSelected ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-600 font-medium'
                      }`}>
                        {u.role === 'Warehouse Manager' ? 'Manager' : u.role}
                      </span>
                    </div>
                    <span className={`text-[11px] mt-1 ${isSelected ? 'text-slate-300' : 'text-slate-500'}`}>
                      {u.role === 'Admin' ? 'All Stores (Admin)' : (wh ? `${wh.code} (${wh.city})` : 'Store Staff')}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Divider */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-200" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="bg-white px-2 text-slate-400 font-medium">Or Sign In with Email &amp; Password</span>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleManualLogin} className="space-y-3">
            {errorMsg && (
              <div className="bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-lg p-2.5 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                Account Email:
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  placeholder="e.g. imtiaz.tls@realdeals.com"
                  className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:bg-white focus:outline-none focus:ring-1 focus:ring-slate-400"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                Password:
              </label>
              <div className="relative">
                <Key className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  value={passwordInput}
                  onChange={(e) => setPasswordInput(e.target.value)}
                  placeholder="Enter account password"
                  className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:bg-white focus:outline-none focus:ring-1 focus:ring-slate-400"
                />
              </div>
            </div>

            <div className="pt-2 flex justify-end gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-5 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold transition-colors disabled:opacity-50"
              >
                {isSubmitting ? 'Verifying...' : 'Log In'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
