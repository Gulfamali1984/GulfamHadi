import React, { useState } from 'react';
import {
  Users,
  Shield,
  Key,
  Mail,
  Building2,
  CheckCircle2,
  XCircle,
  Plus,
  Edit2,
  X,
  UserCheck,
  Search,
  Lock,
  AlertCircle
} from 'lucide-react';
import { User, Warehouse, UserRole } from '../types/erp';
import { api } from '../services/api';

interface SimpleUserManagementProps {
  users: User[];
  warehouses: Warehouse[];
  currentUser: User;
  onRefreshUsers: () => Promise<void>;
  onCreateUser: (data: {
    name: string;
    email: string;
    role: UserRole;
    password?: string;
    assignedWarehouseId?: string;
    department?: string;
  }) => Promise<void>;
  onToggleStatus: (userId: string, active: boolean) => Promise<void>;
  onChangePassword: (userId: string, newPass: string) => Promise<void>;
}

export const SimpleUserManagement: React.FC<SimpleUserManagementProps> = ({
  users,
  warehouses,
  currentUser,
  onRefreshUsers,
  onCreateUser,
  onToggleStatus,
  onChangePassword
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [passwordModalUser, setPasswordModalUser] = useState<User | null>(null);
  const [editingUser, setEditingUser] = useState<User | null>(null);

  // Create Form State
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<UserRole>('Staff');
  const [assignedWarehouseId, setAssignedWarehouseId] = useState(warehouses[0]?.id || 'WH-001');
  const [department, setDepartment] = useState('Warehouse Operations');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState('');

  // Edit Form State
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editRole, setEditRole] = useState<UserRole>('Staff');
  const [editAssignedWhId, setEditAssignedWhId] = useState('');
  const [editDept, setEditDept] = useState('');
  const [isUpdatingUser, setIsUpdatingUser] = useState(false);

  const filteredUsers = users.filter(u => {
    const matchesRole = roleFilter === 'ALL' || u.role === roleFilter;
    const q = searchTerm.toLowerCase();
    const matchesSearch =
      u.name.toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q) ||
      (u.department && u.department.toLowerCase().includes(q)) ||
      (u.assignedWarehouseId && u.assignedWarehouseId.toLowerCase().includes(q));
    return matchesRole && matchesSearch;
  });

  const handleOpenCreateModal = () => {
    setName('');
    setEmail('');
    setPassword('');
    setRole('Staff');
    setAssignedWarehouseId(warehouses[0]?.id || 'WH-001');
    setDepartment('Warehouse Operations');
    setFormError(null);
    setShowCreateModal(true);
  };

  const handleOpenEditModal = (u: User) => {
    setEditingUser(u);
    setEditName(u.name);
    setEditEmail(u.email);
    setEditRole(u.role);
    setEditAssignedWhId(u.assignedWarehouseId || warehouses[0]?.id || 'WH-001');
    setEditDept(u.department || 'Warehouse Operations');
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!name.trim() || !email.trim() || !password.trim()) {
      setFormError('Please fill in all required fields.');
      return;
    }

    setIsSubmitting(true);
    try {
      await onCreateUser({
        name: name.trim(),
        email: email.trim().toLowerCase(),
        password: password.trim(),
        role,
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

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;

    setIsUpdatingUser(true);
    try {
      await api.updateUser(editingUser.id, {
        name: editName.trim(),
        email: editEmail.trim().toLowerCase(),
        role: editRole,
        assignedWarehouseId: editRole === 'Admin' ? undefined : editAssignedWhId,
        department: editDept.trim(),
        currentUser
      });
      setEditingUser(null);
      await onRefreshUsers();
    } catch (err: any) {
      alert(err.message || 'Failed to update user');
    } finally {
      setIsUpdatingUser(false);
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
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <Users className="w-5 h-5 text-slate-700" />
            User Management &amp; Store Operator Roles
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Assign store operators to specific warehouses so they only see their store and cannot access other stores.
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
            Full system authority. Manages all users, adds stores, configures Google Sheets, approves negative stock, and accesses all warehouses.
          </p>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-900">Warehouse Manager</span>
            <Building2 className="w-4 h-4 text-slate-700" />
          </div>
          <p className="text-[11px] text-slate-600 mt-2 leading-relaxed">
            Responsible for assigned store operations. Manages stock, incoming receipts, dispatches, and counts for their assigned warehouse.
          </p>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs border-l-4 border-l-blue-600">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-900">Store Operator / Staff</span>
            <Lock className="w-4 h-4 text-blue-600" />
          </div>
          <p className="text-[11px] text-slate-600 mt-2 leading-relaxed">
            <strong className="text-slate-800">Strictly Isolated:</strong> Cannot switch stores or view other warehouse stock, transactions, or activities. Locked exclusively to their assigned store.
          </p>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
        <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search user name, email, department..."
              className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-9 pr-3 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:bg-white"
            />
          </div>

          <div className="flex items-center gap-2">
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-700 font-medium focus:outline-none"
            >
              <option value="ALL">All Roles</option>
              <option value="Admin">Admin (All Stores)</option>
              <option value="Store Operator">Store Operator (Isolated)</option>
              <option value="Warehouse Manager">Warehouse Manager</option>
              <option value="Staff">Staff</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                <th className="py-3 px-3.5">User Details</th>
                <th className="py-3 px-3.5">Role</th>
                <th className="py-3 px-3.5">Assigned Warehouse (Scope)</th>
                <th className="py-3 px-3.5">Department</th>
                <th className="py-3 px-3.5">Status</th>
                <th className="py-3 px-3.5">Last Login</th>
                <th className="py-3 px-3.5 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {filteredUsers.map((u) => {
                const assignedWh = warehouses.find(w => w.id === u.assignedWarehouseId);

                return (
                  <tr key={u.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-3.5">
                      <div className="font-bold text-slate-900">{u.name}</div>
                      <div className="text-[11px] text-slate-500 font-mono flex items-center gap-1 mt-0.5">
                        <Mail className="w-3 h-3 text-slate-400" />
                        {u.email}
                      </div>
                    </td>
                    <td className="py-3 px-3.5 whitespace-nowrap">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                        u.role === 'Admin'
                          ? 'bg-purple-50 text-purple-800 border border-purple-200'
                          : u.role === 'Store Operator'
                          ? 'bg-blue-100 text-blue-800 border border-blue-300'
                          : u.role === 'Warehouse Manager'
                          ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                          : 'bg-slate-100 text-slate-800 border border-slate-200'
                      }`}>
                        {u.role === 'Store Operator' && <Lock className="w-2.5 h-2.5" />}
                        {u.role}
                      </span>
                    </td>
                    <td className="py-3 px-3.5 whitespace-nowrap">
                      {u.role === 'Admin' ? (
                        <span className="text-slate-500 font-medium">All Warehouses (Global)</span>
                      ) : assignedWh ? (
                        <div className="flex items-center gap-1 font-semibold text-slate-800">
                          <Building2 className="w-3 h-3 text-blue-600" />
                          <span>{assignedWh.name} ({assignedWh.code})</span>
                          <span className="text-[10px] text-slate-400 ml-1 font-normal">[{assignedWh.location}]</span>
                        </div>
                      ) : (
                        <span className="text-amber-600 font-medium">Not Assigned</span>
                      )}
                    </td>
                    <td className="py-3 px-3.5 text-slate-600 whitespace-nowrap">
                      {u.department || '—'}
                    </td>
                    <td className="py-3 px-3.5 whitespace-nowrap">
                      <button
                        onClick={() => onToggleStatus(u.id, !u.active)}
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold transition-colors cursor-pointer ${
                          u.active
                            ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                            : 'bg-rose-50 text-rose-700 hover:bg-rose-100'
                        }`}
                        title="Click to toggle account activation"
                      >
                        {u.active ? (
                          <>
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            <span>Active</span>
                          </>
                        ) : (
                          <>
                            <XCircle className="w-3 h-3 text-rose-600" />
                            <span>Deactivated</span>
                          </>
                        )}
                      </button>
                    </td>
                    <td className="py-3 px-3.5 text-slate-500 whitespace-nowrap text-[11px] font-mono">
                      {u.lastLogin || 'Never'}
                    </td>
                    <td className="py-3 px-3.5 text-center whitespace-nowrap">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => handleOpenEditModal(u)}
                          className="p-1 rounded hover:bg-slate-100 text-slate-600 hover:text-slate-900 transition-colors"
                          title="Edit user details and store assignment"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setPasswordModalUser(u)}
                          className="p-1 rounded hover:bg-slate-100 text-slate-600 hover:text-slate-900 transition-colors"
                          title="Change password"
                        >
                          <Key className="w-3.5 h-3.5" />
                        </button>
                      </div>
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
                <p className="text-xs text-slate-500">Configure role and store assignment</p>
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
                  Full Name *:
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
                  Email Address *:
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
                  Password *:
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
                    Role *:
                  </label>
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value as UserRole)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs font-semibold text-slate-900 focus:bg-white focus:outline-none"
                  >
                    <option value="Admin">Admin (All Stores & System Control)</option>
                    <option value="Store Operator">Store Operator (Strictly Isolated to Assigned Store)</option>
                    <option value="Warehouse Manager">Warehouse Manager</option>
                    <option value="Staff">Staff</option>
                  </select>
                </div>

                {role === 'Store Operator' && (
                  <div className="col-span-2 bg-blue-50 border border-blue-200 rounded-lg p-2.5 text-[11px] text-blue-800 flex items-start gap-2">
                    <Lock className="w-3.5 h-3.5 text-blue-600 mt-0.5 shrink-0" />
                    <span>
                      <strong>Strict Store Isolation:</strong> This operator will only be able to view and manage their assigned store. All other stores' inventory, incoming shipments, and outgoing dispatches will be completely hidden from their view.
                    </span>
                  </div>
                )}

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
                        {w.code} - {w.name} ({w.location})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {role !== 'Admin' && (
                <div className="p-2.5 rounded-lg bg-blue-50 border border-blue-200 text-[11px] text-blue-900">
                  <strong>Store Isolation Active:</strong> This user will only be able to view and manage inventory, incoming stock, and dispatches for this assigned store.
                </div>
              )}

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Department / Team:
                </label>
                <input
                  type="text"
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  placeholder="e.g. Store Operations"
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

      {/* Edit User Modal */}
      {editingUser && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl border border-slate-200 shadow-xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-bold text-slate-900 text-sm">Edit User Account</h3>
                <p className="text-xs text-slate-500">{editingUser.email}</p>
              </div>
              <button
                onClick={() => setEditingUser(null)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Full Name:
                </label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
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
                  value={editEmail}
                  onChange={(e) => setEditEmail(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs text-slate-900 focus:bg-white focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    Role:
                  </label>
                  <select
                    value={editRole}
                    onChange={(e) => setEditRole(e.target.value as UserRole)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs font-semibold text-slate-900 focus:bg-white focus:outline-none"
                  >
                    <option value="Admin">Admin (All Stores)</option>
                    <option value="Store Operator">Store Operator (Strictly Isolated to Assigned Store)</option>
                    <option value="Warehouse Manager">Warehouse Manager</option>
                    <option value="Staff">Staff</option>
                  </select>
                </div>

                {editRole === 'Store Operator' && (
                  <div className="col-span-2 bg-blue-50 border border-blue-200 rounded-lg p-2.5 text-[11px] text-blue-800 flex items-start gap-2">
                    <Lock className="w-3.5 h-3.5 text-blue-600 mt-0.5 shrink-0" />
                    <span>
                      <strong>Strict Store Isolation:</strong> This operator can only view, manage and operate their assigned store.
                    </span>
                  </div>
                )}

                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    Assigned Store:
                  </label>
                  <select
                    value={editAssignedWhId}
                    onChange={(e) => setEditAssignedWhId(e.target.value)}
                    disabled={editRole === 'Admin'}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs text-slate-900 focus:bg-white focus:outline-none disabled:opacity-50"
                  >
                    {warehouses.map(w => (
                      <option key={w.id} value={w.id}>
                        {w.code} - {w.name} ({w.location})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Department:
                </label>
                <input
                  type="text"
                  value={editDept}
                  onChange={(e) => setEditDept(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs text-slate-900 focus:bg-white focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
                  className="px-4 py-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isUpdatingUser}
                  className="px-5 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold transition-colors disabled:opacity-50"
                >
                  {isUpdatingUser ? 'Saving...' : 'Save User Details'}
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
