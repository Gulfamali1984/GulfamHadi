import React, { useState } from 'react';
import {
  Users,
  Plus,
  Shield,
  Key,
  CheckCircle2,
  XCircle,
  Building2,
  Mail,
  UserCheck,
  AlertTriangle,
  X,
  Edit2
} from 'lucide-react';
import { User, Warehouse, UserRole } from '../types/erp';

interface SimpleUserManagementProps {
  users: User[];
  warehouses: Warehouse[];
  currentUser: User;
  onCreateUser: (user: Partial<User>) => Promise<void>;
  onUpdateUser: (id: string, data: Partial<User>) => Promise<void>;
  onChangePassword: (id: string, newPass: string) => Promise<void>;
  onToggleStatus: (id: string, active: boolean) => Promise<void>;
}

export const SimpleUserManagement: React.FC<SimpleUserManagementProps> = ({
  users,
  warehouses,
  currentUser,
  onCreateUser,
  onUpdateUser,
  onChangePassword,
  onToggleStatus
}) => {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [passwordModalUser, setPasswordModalUser] = useState<User | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form State for new user
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('password');
  const [role, setRole] = useState<UserRole>('Warehouse Manager');
  const [assignedWarehouseId, setAssignedWarehouseId] = useState(warehouses[0]?.id || 'WH-001');
  const [department, setDepartment] = useState('Warehouse Operations');
  const [formError, setFormError] = useState('');

  const handleOpenCreateModal = () => {
    setName('');
    setEmail('');
    setPassword('password');
    setRole('Warehouse Manager');
    setAssignedWarehouseId(warehouses[0]?.id || 'WH-001');
    setDepartment('Warehouse Operations');
    setFormError('');
    setShowCreateModal(true);
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    if (!name.trim() || !email.trim()) {
      setFormError('Name and email are required.');
      return;
    }

    setIsSubmitting(true);
    try {
      await onCreateUser({
        name: name.trim(),
        email: email.trim(),
        role,
        password: password.trim() || 'password',
        assignedWarehouseId: role === 'Admin' ? undefined : assignedWarehouseId,
        department: department.trim()
      });
      setShowCreateModal(false);
    } catch (err: any) {
      setFormError(err.message || 'Failed to create user');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChangePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!passwordModalUser || !newPassword.trim()) return;

    setIsSubmitting(true);
    try {
      await onChangePassword(passwordModalUser.id, newPassword.trim());
      setPasswordModalUser(null);
      setNewPassword('');
    } catch (err: any) {
      alert(err.message || 'Failed to update password');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header bar */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <Users className="w-5 h-5 text-slate-700" />
            User Accounts &amp; Role-Based Access Control
          </h2>
          <p className="text-xs text-slate-600 mt-0.5">
            Manage user accounts, assign roles (Admin, Warehouse Manager, Staff), restrict store access, and change passwords.
          </p>
        </div>

        <button
          onClick={handleOpenCreateModal}
          className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs transition-colors shadow-xs cursor-pointer self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>+ Create New User</span>
        </button>
      </div>

      {/* Role explanation cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-900">Administrator</span>
            <Shield className="w-4 h-4 text-slate-700" />
          </div>
          <p className="text-[11px] text-slate-600 mt-2 leading-relaxed">
            Full system authority. Manages users, changes passwords, configures Google Sheets, approves negative stock dispatches, and accesses all 9 warehouses.
          </p>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-900">Warehouse Manager</span>
            <Building2 className="w-4 h-4 text-slate-700" />
          </div>
          <p className="text-[11px] text-slate-600 mt-2 leading-relaxed">
            Responsible for assigned store operations. Can receive and dispatch stock within their designated warehouse, manage bin storage, and track shipments.
          </p>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-900">Warehouse Staff</span>
            <UserCheck className="w-4 h-4 text-slate-700" />
          </div>
          <p className="text-[11px] text-slate-600 mt-2 leading-relaxed">
            Performs daily stock movements, scans serial numbers, logs goods receipt notes, and prepares outbound shipments for assigned stores.
          </p>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[11px]">
              <tr>
                <th className="py-3 px-4">User</th>
                <th className="py-3 px-4">Role</th>
                <th className="py-3 px-4">Assigned Warehouse</th>
                <th className="py-3 px-4">Department</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4">Last Login</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {users.map((u) => {
                const wh = warehouses.find(w => w.id === u.assignedWarehouseId);
                const isCurrent = u.id === currentUser.id;

                return (
                  <tr key={u.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-900 flex items-center gap-1.5">
                        <span>{u.name}</span>
                        {isCurrent && (
                          <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-900 text-white font-normal">
                            You
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-500 font-mono">{u.email}</div>
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <span className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full ${
                        u.role === 'Admin'
                          ? 'bg-slate-900 text-white'
                          : u.role === 'Warehouse Manager'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-slate-100 text-slate-700'
                      }`}>
                        {u.role}
                      </span>
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      {u.role === 'Admin' ? (
                        <span className="text-slate-600 font-medium">All 9 Stores (Admin Access)</span>
                      ) : wh ? (
                        <span className="font-medium text-slate-900">
                          {wh.id}: {wh.name} ({wh.location})
                        </span>
                      ) : (
                        <span className="text-slate-400">Unassigned</span>
                      )}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap text-slate-600">
                      {u.department || 'Operations'}
                    </td>
                    <td className="py-3 px-4 text-center whitespace-nowrap">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        u.active
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : 'bg-rose-50 text-rose-700 border border-rose-200'
                      }`}>
                        {u.active ? 'Active' : 'Deactivated'}
                      </span>
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap text-slate-500 font-mono text-[11px]">
                      {u.lastLogin || 'Never'}
                    </td>
                    <td className="py-3 px-4 text-right whitespace-nowrap space-x-1.5">
                      <button
                        onClick={() => {
                          setPasswordModalUser(u);
                          setNewPassword('');
                        }}
                        className="px-2 py-1 text-xs font-semibold rounded border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 transition-colors inline-flex items-center gap-1"
                        title="Change Password"
                      >
                        <Key className="w-3 h-3 text-slate-500" />
                        <span>Password</span>
                      </button>

                      {!isCurrent && (
                        <button
                          onClick={() => onToggleStatus(u.id, !u.active)}
                          className={`px-2 py-1 text-xs font-semibold rounded border transition-colors ${
                            u.active
                              ? 'border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700'
                              : 'border-emerald-200 bg-emerald-50 hover:bg-emerald-100 text-emerald-700'
                          }`}
                        >
                          {u.active ? 'Deactivate' : 'Activate'}
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create User Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl border border-slate-200 shadow-xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-bold text-slate-900 text-sm">Create New User Account</h3>
                <p className="text-xs text-slate-500">Add operational user and assign store permissions</p>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {formError && (
              <div className="bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-lg p-2.5">
                {formError}
              </div>
            )}

            <form onSubmit={handleCreateSubmit} className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Full Name:
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Tariq Al-Mansoor"
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs text-slate-900 focus:bg-white focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Email Address:
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="e.g. tariq@realdeals.com"
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs text-slate-900 focus:bg-white focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Password:
                </label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter initial password"
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs text-slate-900 focus:bg-white focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    Role:
                  </label>
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value as UserRole)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs font-semibold text-slate-900 focus:bg-white focus:outline-none"
                  >
                    <option value="Admin">Admin</option>
                    <option value="Warehouse Manager">Warehouse Manager</option>
                    <option value="Staff">Staff</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    Assigned Store:
                  </label>
                  <select
                    value={assignedWarehouseId}
                    onChange={(e) => setAssignedWarehouseId(e.target.value)}
                    disabled={role === 'Admin'}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs text-slate-900 focus:bg-white focus:outline-none disabled:opacity-50"
                  >
                    {warehouses.map(w => (
                      <option key={w.id} value={w.id}>
                        {w.id} ({w.location})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Department / Team:
                </label>
                <input
                  type="text"
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  placeholder="e.g. Warehouse Operations"
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs text-slate-900 focus:bg-white focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold transition-colors disabled:opacity-50"
                >
                  {isSubmitting ? 'Creating...' : 'Create Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Change Password Modal */}
      {passwordModalUser && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl border border-slate-200 shadow-xl max-w-sm w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-bold text-slate-900 text-sm">Change User Password</h3>
                <span className="text-xs text-slate-500">{passwordModalUser.name} ({passwordModalUser.email})</span>
              </div>
              <button
                onClick={() => setPasswordModalUser(null)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleChangePasswordSubmit} className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  New Password:
                </label>
                <input
                  type="password"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter new secure password"
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs text-slate-900 focus:bg-white focus:outline-none"
                  autoFocus
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setPasswordModalUser(null)}
                  className="px-4 py-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold transition-colors disabled:opacity-50"
                >
                  {isSubmitting ? 'Updating...' : 'Update Password'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
