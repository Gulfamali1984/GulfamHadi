import React, { useState } from 'react';
import { User, Warehouse } from '../types/erp';
import {
  Shield,
  Key,
  Mail,
  CheckCircle2,
  AlertCircle,
  X,
  UserCheck,
  Building2,
  Lock,
  ArrowRight,
  Sparkles
} from 'lucide-react';

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
  const [activeTab, setActiveTab] = useState<'warehouses' | 'manual'>('warehouses');
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

  // Admin user
  const adminUser = users.find(u => u.role === 'Admin') || {
    id: 'USR-001',
    name: 'Dawood Zafar',
    email: 'dawoodzafar1984@gmail.com',
    role: 'Admin' as const,
    password: 'admin',
    active: true
  };

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-2xl w-full my-8 overflow-hidden text-slate-800 animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-slate-900 text-white flex items-center justify-center">
              <Shield className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-sm">Real Deals ERP Authentication</h3>
              <p className="text-[11px] text-slate-500">
                Sign in as Administrator or Warehouse Responsible (All 9 Facilities)
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

        {/* Currently Active Banner */}
        <div className="px-6 pt-4">
          <div className="bg-slate-50 rounded-xl p-3 border border-slate-200 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-full bg-slate-200 text-slate-800 font-bold text-xs flex items-center justify-center">
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
                  {currentUser.role === 'Admin'
                    ? 'Global Administrator (All 9 Warehouses)'
                    : `Store Isolated: ${currentUser.assignedWarehouseId || 'Assigned Store'}`}
                </span>
              </div>
            </div>
            <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-md flex items-center gap-1">
              <UserCheck className="w-3.5 h-3.5" />
              <span>Active</span>
            </span>
          </div>
        </div>

        {/* Tab Toggle */}
        <div className="px-6 pt-4">
          <div className="flex border-b border-slate-200 gap-4 text-xs font-semibold">
            <button
              onClick={() => setActiveTab('warehouses')}
              className={`pb-2.5 transition-colors cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'warehouses'
                  ? 'border-b-2 border-slate-900 text-slate-900 font-bold'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <Building2 className="w-3.5 h-3.5" />
              <span>Warehouse Logins (9 Stores)</span>
            </button>
            <button
              onClick={() => setActiveTab('manual')}
              className={`pb-2.5 transition-colors cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'manual'
                  ? 'border-b-2 border-slate-900 text-slate-900 font-bold'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <Key className="w-3.5 h-3.5" />
              <span>Email &amp; Password Sign In</span>
            </button>
          </div>
        </div>

        {/* Tab 1: 9 Warehouse Logins */}
        {activeTab === 'warehouses' && (
          <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
            {/* Administrator Quick Login Card */}
            <div className="p-3.5 rounded-xl bg-slate-900 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded bg-white/20 text-white text-[10px] font-bold uppercase tracking-wider">
                    Super Admin
                  </span>
                  <span className="text-xs font-bold">{adminUser.name}</span>
                </div>
                <p className="text-[11px] text-slate-300 mt-0.5">
                  Full system control • All 9 stores • User creation • Google Sheets configuration
                </p>
                <p className="text-[10px] text-slate-400 font-mono mt-0.5">
                  Email: {adminUser.email} • Password: admin
                </p>
              </div>
              <button
                onClick={() => handleQuickSwitch(adminUser)}
                className="px-3.5 py-1.5 rounded-lg bg-white text-slate-900 hover:bg-slate-100 font-bold text-xs transition-colors shrink-0 cursor-pointer self-start sm:self-auto flex items-center gap-1.5"
              >
                <span>Sign In as Admin</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Warehouse Responsible Logins (Grid of 9) */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                  Store Responsible Persons (All 9 Facilities)
                </span>
                <span className="text-[11px] text-slate-500 font-medium">Password for all: <strong>password</strong></span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                {warehouses.map(wh => {
                  const managerUser = users.find(u => u.assignedWarehouseId === wh.id) || {
                    id: `USR-${wh.id}`,
                    name: wh.managerName,
                    email: `${wh.code.toLowerCase()}@realdeals.com`,
                    role: 'Warehouse Manager' as const,
                    assignedWarehouseId: wh.id,
                    active: true
                  };

                  const isCurrent = currentUser.id === managerUser.id;

                  return (
                    <div
                      key={wh.id}
                      className={`p-3 rounded-xl border text-xs flex flex-col justify-between transition-all ${
                        isCurrent
                          ? 'border-blue-500 bg-blue-50/50 ring-1 ring-blue-500'
                          : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/50'
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-mono text-[10px] font-bold text-slate-500">{wh.id}</span>
                          <span className="font-bold text-[11px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-800">
                            {wh.code}
                          </span>
                        </div>
                        <p className="font-bold text-slate-900 text-xs truncate" title={wh.name}>
                          {wh.name}
                        </p>
                        <p className="text-[11px] text-slate-500 truncate" title={wh.location}>
                          {wh.location}
                        </p>
                        <div className="mt-2 pt-2 border-t border-slate-100">
                          <span className="text-[10px] font-semibold text-slate-600 block">Responsible:</span>
                          <span className="text-xs font-bold text-slate-900 block truncate">
                            {wh.managerName || managerUser.name}
                          </span>
                          <span className="text-[10px] text-slate-500 font-mono block truncate mt-0.5">
                            {managerUser.email}
                          </span>
                        </div>
                      </div>

                      <button
                        onClick={() => handleQuickSwitch(managerUser)}
                        className={`w-full mt-3 py-1.5 px-2 rounded-lg font-bold text-[11px] transition-colors cursor-pointer flex items-center justify-center gap-1 ${
                          isCurrent
                            ? 'bg-blue-600 text-white'
                            : 'bg-slate-100 hover:bg-slate-200 text-slate-800'
                        }`}
                      >
                        {isCurrent ? (
                          <>
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Logged In</span>
                          </>
                        ) : (
                          <>
                            <span>Log In</span>
                            <ArrowRight className="w-3 h-3" />
                          </>
                        )}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="p-3 rounded-xl bg-blue-50 border border-blue-200 text-[11px] text-blue-900 flex items-start gap-2">
              <Lock className="w-3.5 h-3.5 text-blue-700 shrink-0 mt-0.5" />
              <div>
                <strong>Store Isolated Mode Notice:</strong> Each warehouse manager can only perform transactions (incoming, outgoing, closing balance) in their assigned facility and cannot operate or alter other stores.
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Manual Email & Password Login Form */}
        {activeTab === 'manual' && (
          <form onSubmit={handleManualLogin} className="p-6 space-y-4">
            {errorMsg && (
              <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Email Address:
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  required
                  value={emailInput}
                  onChange={e => setEmailInput(e.target.value)}
                  placeholder="e.g. dawoodzafar1984@gmail.com or imtiaz.tls@realdeals.com"
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-9 pr-3 py-2 text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-1 focus:ring-slate-900"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Password:
              </label>
              <div className="relative">
                <Key className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  value={passwordInput}
                  onChange={e => setPasswordInput(e.target.value)}
                  placeholder="Enter password ('admin' or 'password')"
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-9 pr-3 py-2 text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-1 focus:ring-slate-900"
                />
              </div>
            </div>

            <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 text-[11px] text-slate-600 space-y-1">
              <p className="font-semibold text-slate-800">Quick Test Credentials:</p>
              <p>• <strong>Administrator:</strong> dawoodzafar1984@gmail.com / <span className="font-mono">admin</span></p>
              <p>• <strong>TLS Warehouse (USA):</strong> imtiaz.tls@realdeals.com / <span className="font-mono">password</span></p>
              <p>• <strong>TOLL Warehouse (UAE):</strong> anoop.toll@realdeals.com / <span className="font-mono">password</span></p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-5 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-colors disabled:opacity-50 cursor-pointer"
              >
                {isSubmitting ? 'Authenticating...' : 'Sign In'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
