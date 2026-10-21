import React, { useState } from 'react';
import { User, Warehouse } from '../types/erp';
import {
  Shield,
  Key,
  Mail,
  AlertCircle,
  X,
  UserCheck,
  Lock,
  ShieldAlert,
  LogIn,
  Eye,
  EyeOff
} from 'lucide-react';

interface SimpleLoginModalProps {
  currentUser: User | null;
  users: User[];
  warehouses: Warehouse[];
  onSelectUser: (user: User) => void;
  onLoginWithCredentials: (email: string, password?: string) => Promise<boolean>;
  onClose: () => void;
  isMandatory?: boolean;
}

export const SimpleLoginModal: React.FC<SimpleLoginModalProps> = ({
  currentUser,
  users,
  warehouses,
  onSelectUser,
  onLoginWithCredentials,
  onClose,
  isMandatory = false
}) => {
  const [emailInput, setEmailInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    const cleanEmail = emailInput.trim();
    if (!cleanEmail) {
      setErrorMsg('Please enter your email or Login ID.');
      return;
    }
    if (!passwordInput) {
      setErrorMsg('Password is required to access this ERP system.');
      return;
    }

    setIsSubmitting(true);
    try {
      const ok = await onLoginWithCredentials(cleanEmail, passwordInput);
      if (ok) {
        if (!isMandatory) onClose();
      } else {
        setErrorMsg('Invalid login credentials or incorrect password. Only authorized accounts created by Administrator are permitted.');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Authentication failed. Please check your password.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFillLoginId = (email: string) => {
    setEmailInput(email);
    setPasswordInput('');
    setErrorMsg('');
  };

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto ${
        isMandatory
          ? 'bg-slate-950/95 backdrop-blur-md'
          : 'bg-slate-900/60 backdrop-blur-xs'
      }`}
    >
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-md w-full my-auto overflow-hidden text-slate-800 animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-800 bg-slate-900 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-white/10 text-white border border-white/20 flex items-center justify-center font-bold text-sm tracking-wider shadow-inner">
                RD
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-white text-base leading-tight">
                    Real Deals ERP
                  </h3>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                    Password Protected
                  </span>
                </div>
                <p className="text-xs text-slate-300 mt-0.5">
                  Procurement, Logistics &amp; Warehouse ERP
                </p>
              </div>
            </div>

            {!isMandatory && (
              <button
                onClick={onClose}
                className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-white/10 transition-colors"
                title="Close"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>

        {/* Security Notice */}
        <div className="bg-slate-50 border-b border-slate-200 px-6 py-3 flex items-start gap-2.5 text-xs text-slate-700">
          <ShieldAlert className="w-4 h-4 text-slate-900 mt-0.5 shrink-0" />
          <p className="leading-relaxed">
            <strong>Restricted Access:</strong> Enter your administrator-assigned Login ID and password to access warehouse records, stock, and dispatches.
          </p>
        </div>

        {/* Currently Active Banner (if switching account) */}
        {!isMandatory && currentUser && (
          <div className="px-6 pt-4">
            <div className="bg-slate-50 rounded-xl p-3 border border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-slate-900 text-white font-bold text-xs flex items-center justify-center">
                  {currentUser.name.charAt(0)}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-900">{currentUser.name}</span>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                        currentUser.role === 'Admin'
                          ? 'bg-slate-900 text-white'
                          : 'bg-blue-100 text-blue-800 border border-blue-200'
                      }`}
                    >
                      {currentUser.role}
                    </span>
                  </div>
                  <span className="text-[11px] text-slate-500 block">
                    {currentUser.email}
                  </span>
                </div>
              </div>
              <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-md flex items-center gap-1">
                <UserCheck className="w-3.5 h-3.5" />
                <span>Active</span>
              </span>
            </div>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleLoginSubmit} className="p-6 space-y-4">
          {errorMsg && (
            <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Login ID / Email Address:
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="email"
                required
                value={emailInput}
                onChange={e => setEmailInput(e.target.value)}
                placeholder="dawoodzafar1984@gmail.com or imtiaz.tls@realdeals.com"
                className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-9 pr-3 py-2.5 text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900 transition-all"
                autoFocus
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Account Password:
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={passwordInput}
                onChange={e => setPasswordInput(e.target.value)}
                placeholder="Enter password"
                className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-9 pr-10 py-2.5 text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900 transition-all font-mono"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
                title={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Quick Login ID Helpers (Click to fill Login ID) */}
          <div className="pt-2">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block mb-1.5">
              Select Login ID:
            </span>
            <div className="flex flex-wrap gap-1.5 text-xs">
              <button
                type="button"
                onClick={() => handleFillLoginId('dawoodzafar1984@gmail.com')}
                className="px-2.5 py-1 rounded-md border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-800 text-[11px] font-medium transition-colors cursor-pointer"
              >
                dawoodzafar1984@gmail.com (Admin)
              </button>
              <button
                type="button"
                onClick={() => handleFillLoginId('imtiaz.tls@realdeals.com')}
                className="px-2.5 py-1 rounded-md border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-800 text-[11px] font-medium transition-colors cursor-pointer"
              >
                imtiaz.tls@realdeals.com (TLS Store)
              </button>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
            {!isMandatory && (
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
              >
                Cancel
              </button>
            )}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-2.5 px-6 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-all disabled:opacity-50 cursor-pointer shadow-xs flex items-center justify-center gap-2"
            >
              <LogIn className="w-4 h-4" />
              <span>{isSubmitting ? 'Verifying Password...' : 'Sign In to ERP System'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
