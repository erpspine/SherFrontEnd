import { useEffect, useState } from "react";
import {
  Search,
  Plus,
  Edit,
  Trash2,
  X,
  Users as UsersIcon,
  Shield,
  UserCheck,
  UserX,
  Mail,
  Phone,
} from "lucide-react";
import { apiFetch } from "../utils/api";
import Swal from "sweetalert2";

const roleOptions = ["Admin", "Operations", "Finance", "Driver", "Viewer"];
const statusOptions = ["Active", "Inactive"];

const statusStyles = {
  Active: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  Inactive: "bg-slate-500/20 text-slate-400 border-slate-500/30",
};

const roleStyles = {
  Admin: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  Operations: "bg-purple-500/20 text-purple-400 border-purple-500/30",
  Finance: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  Driver: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  Viewer: "bg-cyan-500/20 text-cyan-400 border-cyan-500/30",
};

const createFormState = () => ({
  name: "",
  email: "",
  phone: "",
  role: "Viewer",
  status: "Active",
});

const toTitleCase = (value) => {
  if (!value || typeof value !== "string") return "Viewer";
  return value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();
};

const normalizeStatus = (value) => {
  if (typeof value === "boolean") return value ? "Active" : "Inactive";
  if (typeof value === "number") return value === 1 ? "Active" : "Inactive";
  if (typeof value === "string") {
    const normalized = value.toLowerCase();
    if (normalized === "active" || normalized === "1") return "Active";
  }
  return "Inactive";
};

const formatLastLogin = (value) => {
  if (!value) return "Never";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleString();
};

const normalizeUser = (user) => ({
  id: user.id,
  name: user.name || "",
  email: user.email || "",
  phone: user.phone || "",
  role: roleOptions.includes(toTitleCase(user.role))
    ? toTitleCase(user.role)
    : "Viewer",
  status: normalizeStatus(user.status),
  lastLogin: formatLastLogin(user.last_login_at || user.lastLogin),
});

const extractList = (payload) => {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.users)) return payload.users;
  return [];
};

const extractSingle = (payload) => payload?.data || payload?.user || payload;

export default function Users() {
  const [users, setUsers] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(createFormState());
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const loadUsers = async () => {
    setErrorMessage("");
    setIsLoading(true);

    try {
      const response = await apiFetch("/users");
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload?.message || "Unable to fetch users.");
      }

      const normalizedUsers = extractList(payload).map(normalizeUser);
      setUsers(normalizedUsers);
    } catch (error) {
      setErrorMessage(error.message || "Failed to load users.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const stats = {
    total: users.length,
    active: users.filter((u) => u.status === "Active").length,
    inactive: users.filter((u) => u.status === "Inactive").length,
    admins: users.filter((u) => u.role === "Admin").length,
  };

  const filteredUsers = users.filter((user) => {
    const q = searchTerm.toLowerCase();
    const matchSearch =
      user.name.toLowerCase().includes(q) ||
      user.email.toLowerCase().includes(q) ||
      user.phone.toLowerCase().includes(q);
    const matchRole = roleFilter === "All" || user.role === roleFilter;
    const matchStatus = statusFilter === "All" || user.status === statusFilter;
    return matchSearch && matchRole && matchStatus;
  });

  const openCreate = () => {
    setErrorMessage("");
    setEditingId(null);
    setForm(createFormState());
    setIsModalOpen(true);
  };

  const openEdit = async (user) => {
    setErrorMessage("");

    try {
      const response = await apiFetch(`/users/${user.id}`);
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload?.message || "Unable to fetch selected user.");
      }

      const selectedUser = normalizeUser(extractSingle(payload));
      setEditingId(selectedUser.id);
      setForm({
        name: selectedUser.name,
        email: selectedUser.email,
        phone: selectedUser.phone,
        role: selectedUser.role,
        status: selectedUser.status,
      });
      setIsModalOpen(true);
    } catch (error) {
      setErrorMessage(error.message || "Unable to open user details.");
    }
  };

  const handleSave = async () => {
    if (!form.name || !form.email) {
      setErrorMessage("Please fill name and email before saving.");
      await Swal.fire({
        title: "Missing Required Fields",
        text: "Please provide Name and Email.",
        icon: "warning",
        background: "#0f172a",
        color: "#e2e8f0",
      });
      return;
    }

    setIsSaving(true);
    setErrorMessage("");

    try {
      const payload = {
        name: form.name,
        email: form.email,
        phone: form.phone,
        role: form.role,
        status: form.status,
      };

      const response = editingId
        ? await apiFetch(`/users/${editingId}`, {
            method: "PUT",
            body: payload,
          })
        : await apiFetch("/users", {
            method: "POST",
            body: payload,
          });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.message || "Unable to save user.");
      }

      setIsModalOpen(false);
      await loadUsers();
      await Swal.fire({
        title: editingId ? "Updated" : "Created",
        text: editingId
          ? "User updated successfully."
          : "User created successfully.",
        icon: "success",
        timer: 1800,
        showConfirmButton: false,
        background: "#0f172a",
        color: "#e2e8f0",
      });
    } catch (error) {
      setErrorMessage(error.message || "Failed to save user.");
      await Swal.fire({
        title: "Save Failed",
        text: error.message || "Failed to save user.",
        icon: "error",
        background: "#0f172a",
        color: "#e2e8f0",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id) => {
    setErrorMessage("");
    const confirmation = await Swal.fire({
      title: "Delete user?",
      text: "This action cannot be undone.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Yes, delete",
      cancelButtonText: "Cancel",
      background: "#0f172a",
      color: "#e2e8f0",
      confirmButtonColor: "#dc2626",
    });

    if (!confirmation.isConfirmed) return;

    try {
      const response = await apiFetch(`/users/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const payload = await response.json();
        throw new Error(payload?.message || "Unable to delete user.");
      }

      setUsers((current) => current.filter((user) => user.id !== id));
      await Swal.fire({
        title: "Deleted",
        text: "User deleted successfully.",
        icon: "success",
        timer: 1800,
        showConfirmButton: false,
        background: "#0f172a",
        color: "#e2e8f0",
      });
    } catch (error) {
      setErrorMessage(error.message || "Failed to delete user.");
      await Swal.fire({
        title: "Delete Failed",
        text: error.message || "Failed to delete user.",
        icon: "error",
        background: "#0f172a",
        color: "#e2e8f0",
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Users</h1>
          <p className="text-slate-400 mt-1">
            Manage system users, permissions, and account status.
          </p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-amber-400 to-amber-600 text-white rounded-xl font-medium text-sm hover:opacity-90 transition-opacity shadow-lg shadow-amber-500/25"
        >
          <Plus className="w-4 h-4" />
          New User
        </button>
      </div>

      {errorMessage && (
        <div className="bg-red-500/10 border border-red-500/30 text-red-300 rounded-xl px-4 py-3 text-sm">
          {errorMessage}
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-900/50 backdrop-blur border border-slate-800/50 rounded-xl p-4 text-center">
          <p className="text-slate-400 text-sm">Total Users</p>
          <p className="text-2xl font-bold mt-1 text-white">{stats.total}</p>
        </div>
        <div className="bg-slate-900/50 backdrop-blur border border-slate-800/50 rounded-xl p-4 text-center">
          <p className="text-slate-400 text-sm">Active</p>
          <p className="text-2xl font-bold mt-1 text-emerald-400">
            {stats.active}
          </p>
        </div>
        <div className="bg-slate-900/50 backdrop-blur border border-slate-800/50 rounded-xl p-4 text-center">
          <p className="text-slate-400 text-sm">Inactive</p>
          <p className="text-2xl font-bold mt-1 text-slate-400">
            {stats.inactive}
          </p>
        </div>
        <div className="bg-slate-900/50 backdrop-blur border border-slate-800/50 rounded-xl p-4 text-center">
          <p className="text-slate-400 text-sm">Admins</p>
          <p className="text-2xl font-bold mt-1 text-blue-400">
            {stats.admins}
          </p>
        </div>
      </div>

      <div className="bg-slate-900/50 backdrop-blur border border-slate-800/50 rounded-2xl p-4">
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="flex-1 flex items-center gap-3 bg-slate-800/50 rounded-xl px-4 py-2.5 border border-slate-700/50 focus-within:border-amber-500/50 transition-colors">
            <Search className="w-5 h-5 text-slate-500" />
            <input
              type="text"
              placeholder="Search by name, email, or phone..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-transparent border-none outline-none text-sm text-slate-300 placeholder-slate-500 w-full"
            />
          </div>
          <div className="flex gap-2">
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500"
            >
              <option value="All">All Roles</option>
              {roleOptions.map((role) => (
                <option key={role} value={role}>
                  {role}
                </option>
              ))}
            </select>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500"
            >
              <option value="All">All Status</option>
              {statusOptions.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="bg-slate-900/50 backdrop-blur border border-slate-800/50 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[980px]">
            <thead>
              <tr className="border-b border-slate-800">
                {[
                  "Name",
                  "Email",
                  "Phone",
                  "Role",
                  "Status",
                  "Last Login",
                  "Actions",
                ].map((header) => (
                  <th
                    key={header}
                    className="text-left py-4 px-6 text-sm font-semibold text-slate-400"
                  >
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map((user) => (
                <tr
                  key={user.id}
                  className="border-b border-slate-800/50 hover:bg-slate-800/20 transition-colors"
                >
                  <td className="py-4 px-6">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-blue-500/10 flex items-center justify-center">
                        <UsersIcon className="w-4 h-4 text-blue-400" />
                      </div>
                      <span className="text-white font-medium text-sm">
                        {user.name}
                      </span>
                    </div>
                  </td>
                  <td className="py-4 px-6 text-sm text-slate-300">
                    {user.email}
                  </td>
                  <td className="py-4 px-6 text-sm text-slate-300">
                    {user.phone}
                  </td>
                  <td className="py-4 px-6">
                    <span
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border ${roleStyles[user.role]}`}
                    >
                      <Shield className="w-3 h-3" />
                      {user.role}
                    </span>
                  </td>
                  <td className="py-4 px-6">
                    <span
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border ${statusStyles[user.status]}`}
                    >
                      {user.status === "Active" ? (
                        <UserCheck className="w-3 h-3" />
                      ) : (
                        <UserX className="w-3 h-3" />
                      )}
                      {user.status}
                    </span>
                  </td>
                  <td className="py-4 px-6 text-sm text-slate-400">
                    {user.lastLogin}
                  </td>
                  <td className="py-4 px-6">
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => openEdit(user)}
                        className="p-1.5 text-slate-400 hover:text-amber-400 hover:bg-amber-500/10 rounded-lg transition-colors"
                        title="Edit user"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(user.id)}
                        className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                        title="Delete user"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {isLoading && (
            <div className="py-16 text-center text-slate-500">
              Loading users...
            </div>
          )}

          {!isLoading && filteredUsers.length === 0 && (
            <div className="py-16 text-center text-slate-500">
              No users found.
            </div>
          )}
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-slate-800">
              <div>
                <h2 className="text-xl font-bold text-white">
                  {editingId !== null ? "Edit User" : "New User"}
                </h2>
                <p className="text-sm text-slate-400 mt-1">
                  {editingId !== null
                    ? "Update account details and permissions."
                    : "Create a new system user account."}
                </p>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Full Name
                </label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Email
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) =>
                      setForm({ ...form, email: e.target.value })
                    }
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-10 pr-4 py-2.5 text-white focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Phone
                </label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input
                    type="text"
                    value={form.phone}
                    onChange={(e) =>
                      setForm({ ...form, phone: e.target.value })
                    }
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-10 pr-4 py-2.5 text-white focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Role
                </label>
                <select
                  value={form.role}
                  onChange={(e) => setForm({ ...form, role: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-amber-500"
                >
                  {roleOptions.map((role) => (
                    <option key={role} value={role}>
                      {role}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Status
                </label>
                <select
                  value={form.status}
                  onChange={(e) => setForm({ ...form, status: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-amber-500"
                >
                  {statusOptions.map((status) => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  ))}
                </select>
              </div>

              <div className="md:col-span-2 flex items-center justify-end gap-3 pt-2">
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2.5 text-sm font-medium text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={!form.name || !form.email || isSaving}
                  className="px-5 py-2.5 text-sm font-medium bg-gradient-to-r from-amber-400 to-amber-600 text-white rounded-xl hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {isSaving
                    ? "Saving..."
                    : editingId !== null
                      ? "Save Changes"
                      : "Create User"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
