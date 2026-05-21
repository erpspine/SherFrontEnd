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
  Globe,
  Clock,
  KeyRound,
} from "lucide-react";
import { apiFetch } from "../utils/api";
import { getAuthUser, updateAuthSession } from "../utils/auth";
import Swal from "sweetalert2";
import Select from "react-select";

const roleOptions = ["Admin", "Operations", "Finance", "Driver", "Viewer"];
const statusOptions = ["Active", "Inactive"];
const languageOptions = [
  { value: "English", label: "English" },
  { value: "French", label: "French" },
  { value: "Germany", label: "Germany" },
  { value: "Chinese", label: "Chinese" },
  { value: "Spanish", label: "Spanish" },
  { value: "Hindi", label: "Hindi" },
  { value: "Portuguese", label: "Portuguese" },
];

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
  languages_spoken: [],
  driving_started_at: "",
  status: "Active",
  receive_notifications: false,
});

const parseLanguagesInput = (value) =>
  (Array.isArray(value) ? value : String(value || "").split(","))
    .map((item) => item.trim())
    .filter(Boolean);

const driverLanguageSelectStyles = {
  control: (base, state) => ({
    ...base,
    backgroundColor: "#1e293b",
    borderColor: state.isFocused ? "#f59e0b" : "#334155",
    boxShadow: "none",
    minHeight: 42,
    borderRadius: 12,
    ":hover": { borderColor: "#f59e0b" },
  }),
  menu: (base) => ({
    ...base,
    backgroundColor: "#0f172a",
    border: "1px solid #334155",
    zIndex: 9999,
  }),
  menuPortal: (base) => ({ ...base, zIndex: 9999 }),
  option: (base, state) => ({
    ...base,
    backgroundColor: state.isFocused ? "#1e293b" : "#0f172a",
    color: "#e2e8f0",
  }),
  input: (base) => ({ ...base, color: "#e2e8f0" }),
  singleValue: (base) => ({ ...base, color: "#e2e8f0" }),
  multiValue: (base) => ({ ...base, backgroundColor: "#334155" }),
  multiValueLabel: (base) => ({ ...base, color: "#e2e8f0" }),
  multiValueRemove: (base) => ({
    ...base,
    color: "#e2e8f0",
    ":hover": {
      backgroundColor: "#475569",
      color: "#ffffff",
    },
  }),
  placeholder: (base) => ({ ...base, color: "#94a3b8" }),
};

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
  languages_spoken: user.languages_spoken || user.languagesSpoken || "",
  languages_spoken_list: Array.isArray(
    user.languages_spoken_list || user.languagesSpokenList,
  )
    ? user.languages_spoken_list || user.languagesSpokenList
    : parseLanguagesInput(user.languages_spoken || user.languagesSpoken || ""),
  driving_started_at: user.driving_started_at || user.drivingStartedAt || "",
  work_experience: user.work_experience || user.workExperience || "",
  role: roleOptions.includes(toTitleCase(user.role))
    ? toTitleCase(user.role)
    : "Viewer",
  status: normalizeStatus(user.status),
  receive_notifications: Boolean(user.receive_notifications),
  lastLogin: formatLastLogin(user.last_login_at || user.lastLogin),
});

const extractList = (payload) => {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.users)) return payload.users;
  return [];
};

const extractSingle = (payload) => payload?.data || payload?.user || payload;

const experienceBuckets = [
  { label: "All", value: "All" },
  { label: "< 1 year", value: "<1" },
  { label: "1–3 years", value: "1-3" },
  { label: "3–5 years", value: "3-5" },
  { label: "5+ years", value: "5+" },
];

const getExperienceYears = (drivingStartedAt) => {
  if (!drivingStartedAt) return null;
  const started = new Date(drivingStartedAt);
  if (Number.isNaN(started.getTime())) return null;
  return (Date.now() - started.getTime()) / (1000 * 60 * 60 * 24 * 365.25);
};

const sanitizeLegacyExperience = (value) => {
  const text = String(value || "").trim();
  if (!text) return "";

  const decimalMatch = text.match(
    /^(\d+(?:\.\d+)?)\s*years?,\s*(\d+(?:\.\d+)?)\s*months?$/i,
  );
  if (!decimalMatch) return text;

  const years = Math.floor(Number(decimalMatch[1]));
  const months = Math.floor(Number(decimalMatch[2]));
  const normalizedMonths = Math.min(Math.max(months, 0), 11);

  if (years <= 0 && normalizedMonths <= 0) {
    return "Less than 1 month";
  }

  const parts = [];
  if (years > 0) {
    parts.push(years === 1 ? "1 year" : `${years} years`);
  }
  if (normalizedMonths > 0) {
    parts.push(
      normalizedMonths === 1 ? "1 month" : `${normalizedMonths} months`,
    );
  }

  return parts.join(", ");
};

const formatExperienceLabel = (user) => {
  if (!user.driving_started_at) return "";

  const started = new Date(user.driving_started_at);
  if (Number.isNaN(started.getTime())) {
    return sanitizeLegacyExperience(user.work_experience);
  }

  const today = new Date();
  if (started > today) {
    return sanitizeLegacyExperience(user.work_experience);
  }

  let years = today.getFullYear() - started.getFullYear();
  let months = today.getMonth() - started.getMonth();

  if (today.getDate() < started.getDate()) {
    months -= 1;
  }

  if (months < 0) {
    years -= 1;
    months += 12;
  }

  if (years <= 0 && months <= 0) {
    return "Less than 1 month";
  }

  const parts = [];
  if (years > 0) {
    parts.push(years === 1 ? "1 year" : `${years} years`);
  }
  if (months > 0) {
    parts.push(months === 1 ? "1 month" : `${months} months`);
  }

  return parts.join(", ");
};

const hasDriverProfileData = (user) =>
  (Array.isArray(user.languages_spoken_list) &&
    user.languages_spoken_list.length > 0) ||
  Boolean(user.driving_started_at) ||
  Boolean(user.work_experience);

export default function Users() {
  const [users, setUsers] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");
  const [languageFilter, setLanguageFilter] = useState("All");
  const [experienceFilter, setExperienceFilter] = useState("All");
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
    const matchLanguage =
      languageFilter === "All" ||
      (Array.isArray(user.languages_spoken_list)
        ? user.languages_spoken_list.some(
            (l) => l.toLowerCase() === languageFilter.toLowerCase(),
          )
        : false);
    const expYears = getExperienceYears(user.driving_started_at);
    const matchExperience =
      experienceFilter === "All" ||
      (experienceFilter === "<1" && expYears !== null && expYears < 1) ||
      (experienceFilter === "1-3" &&
        expYears !== null &&
        expYears >= 1 &&
        expYears < 3) ||
      (experienceFilter === "3-5" &&
        expYears !== null &&
        expYears >= 3 &&
        expYears < 5) ||
      (experienceFilter === "5+" && expYears !== null && expYears >= 5);
    return (
      matchSearch &&
      matchRole &&
      matchStatus &&
      matchLanguage &&
      matchExperience
    );
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
        languages_spoken: parseLanguagesInput(
          selectedUser.languages_spoken_list,
        ),
        driving_started_at: selectedUser.driving_started_at || "",
        status: selectedUser.status,
        receive_notifications: selectedUser.receive_notifications,
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

    if (form.role === "Driver") {
      const languages = parseLanguagesInput(form.languages_spoken);
      const hasDrivingStartedAt =
        String(form.driving_started_at || "").trim() !== "";

      if (languages.length === 0 || !hasDrivingStartedAt) {
        setErrorMessage(
          "Drivers must have at least one language and a driving start date.",
        );
        await Swal.fire({
          title: "Driver Details Required",
          text: "Please enter at least one language and driving start date for a Driver.",
          icon: "warning",
          background: "#0f172a",
          color: "#e2e8f0",
        });
        return;
      }
    }

    setIsSaving(true);
    setErrorMessage("");

    try {
      const payload = {
        name: form.name,
        email: form.email,
        phone: form.phone,
        role: form.role,
        languages_spoken:
          form.role === "Driver"
            ? parseLanguagesInput(form.languages_spoken)
            : null,
        driving_started_at:
          form.role === "Driver"
            ? String(form.driving_started_at || "").trim() || null
            : null,
        status: form.status,
        receive_notifications: form.receive_notifications,
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

      // If the logged-in user edited their own account, refresh the cached
      // session so new roles/permissions take effect immediately (no re-login).
      if (editingId && data?.user) {
        const me = getAuthUser();
        if (me && String(me.id) === String(editingId)) {
          updateAuthSession({
            user: data.user,
            roles: Array.isArray(data.user.roles) ? data.user.roles : [],
            permissions: Array.isArray(data.user.permissions)
              ? data.user.permissions
              : [],
          });
        }
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

  const handleResetPassword = async (user) => {
    setErrorMessage("");

    const confirmation = await Swal.fire({
      title: "Reset password?",
      text: `A new temporary password will be emailed to ${user.email}.`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Yes, reset",
      cancelButtonText: "Cancel",
      background: "#0f172a",
      color: "#e2e8f0",
      confirmButtonColor: "#d97706",
    });

    if (!confirmation.isConfirmed) return;

    try {
      const response = await apiFetch(`/users/${user.id}/reset-password`, {
        method: "POST",
      });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(
          payload?.message || "Unable to reset password for this user.",
        );
      }

      await Swal.fire({
        title: "Password Reset",
        text:
          payload?.message ||
          "Password reset successfully. New credentials were sent by email.",
        icon: "success",
        timer: 2200,
        showConfirmButton: false,
        background: "#0f172a",
        color: "#e2e8f0",
      });
    } catch (error) {
      setErrorMessage(error.message || "Failed to reset password.");
      await Swal.fire({
        title: "Reset Failed",
        text: error.message || "Failed to reset password.",
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
          <h1 className="text-2xl font-bold text-slate-900">Users</h1>
          <p className="text-slate-500 mt-1">
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
        <div className="bg-rose-50 border border-rose-200 text-rose-700 rounded-xl px-4 py-3 text-sm">
          {errorMessage}
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 shadow-sm rounded-xl p-4 text-center">
          <p className="text-slate-500 text-sm">Total Users</p>
          <p className="text-2xl font-bold mt-1 text-slate-900">
            {stats.total}
          </p>
        </div>
        <div className="bg-white border border-slate-200 shadow-sm rounded-xl p-4 text-center">
          <p className="text-slate-500 text-sm">Active</p>
          <p className="text-2xl font-bold mt-1 text-emerald-600">
            {stats.active}
          </p>
        </div>
        <div className="bg-white border border-slate-200 shadow-sm rounded-xl p-4 text-center">
          <p className="text-slate-500 text-sm">Inactive</p>
          <p className="text-2xl font-bold mt-1 text-slate-400">
            {stats.inactive}
          </p>
        </div>
        <div className="bg-white border border-slate-200 shadow-sm rounded-xl p-4 text-center">
          <p className="text-slate-500 text-sm">Admins</p>
          <p className="text-2xl font-bold mt-1 text-blue-600">
            {stats.admins}
          </p>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm p-4">
        <div className="flex flex-col lg:flex-row gap-3">
          <div className="flex-1 flex items-center gap-3 bg-slate-50 rounded-xl px-4 py-2.5 border border-slate-200 focus-within:border-amber-500 transition-colors">
            <Search className="w-5 h-5 text-slate-400" />
            <input
              type="text"
              placeholder="Search by name, email, or phone..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-transparent border-none outline-none text-sm text-slate-900 placeholder-slate-400 w-full"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-700 focus:outline-none focus:border-amber-500"
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
              className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-700 focus:outline-none focus:border-amber-500"
            >
              <option value="All">All Status</option>
              {statusOptions.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
            <select
              value={languageFilter}
              onChange={(e) => setLanguageFilter(e.target.value)}
              className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-700 focus:outline-none focus:border-amber-500"
            >
              <option value="All">All Languages</option>
              {languageOptions.map((lang) => (
                <option key={lang.value} value={lang.value}>
                  {lang.label}
                </option>
              ))}
            </select>
            <select
              value={experienceFilter}
              onChange={(e) => setExperienceFilter(e.target.value)}
              className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-700 focus:outline-none focus:border-amber-500"
            >
              {experienceBuckets.map((b) => (
                <option key={b.value} value={b.value}>
                  {b.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1400px]">
            <thead className="table-head-gradient">
              <tr className="border-b border-slate-200">
                {[
                  "Actions",
                  "Name",
                  "Email",
                  "Phone",
                  "Role",
                  "Languages",
                  "Experience",
                  "Status",
                  "Notifications",
                  "Last Login",
                ].map((header) => (
                  <th
                    key={header}
                    className={`text-left py-4 px-6 text-xs font-semibold text-slate-500 uppercase tracking-wide ${
                      header === "Actions"
                        ? "w-[124px]"
                        : header === "Phone"
                          ? "min-w-[220px]"
                          : ""
                    }`}
                  >
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map((user, index) => (
                <tr
                  key={user.id}
                  className={`border-b border-slate-100 transition-colors ${
                    index % 2 === 0
                      ? "hover:bg-amber-50/60"
                      : "hover:bg-sky-50/60"
                  }`}
                >
                  <td className="py-4 px-6 w-[124px]">
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleResetPassword(user)}
                        className="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                        title="Reset password and email new credentials"
                      >
                        <KeyRound className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => openEdit(user)}
                        className="p-1.5 text-slate-400 hover:text-amber-500 hover:bg-amber-50 rounded-lg transition-colors"
                        title="Edit user"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(user.id)}
                        className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                        title="Delete user"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                  <td className="py-4 px-6">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center">
                        <UsersIcon className="w-4 h-4 text-blue-500" />
                      </div>
                      <div>
                        <div className="text-slate-900 font-medium text-sm">
                          {user.name}
                        </div>
                        {hasDriverProfileData(user) && (
                          <div className="mt-1 space-y-1 text-xs text-slate-500">
                            {Array.isArray(user.languages_spoken_list) &&
                              user.languages_spoken_list.length > 0 && (
                                <div>
                                  Languages:{" "}
                                  {user.languages_spoken_list.join(", ")}
                                </div>
                              )}
                            {formatExperienceLabel(user) && (
                              <div>
                                Experience: {formatExperienceLabel(user)}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="py-4 px-6 text-sm text-slate-600">
                    {user.email}
                  </td>
                  <td className="py-4 px-6 text-sm text-slate-600 min-w-[220px] whitespace-nowrap">
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
                    {Array.isArray(user.languages_spoken_list) &&
                    user.languages_spoken_list.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {user.languages_spoken_list.map((lang) => (
                          <span
                            key={lang}
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-200 text-xs font-medium"
                          >
                            <Globe className="w-3 h-3" />
                            {lang}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span className="text-slate-400 text-sm">—</span>
                    )}
                  </td>
                  <td className="py-4 px-6">
                    {formatExperienceLabel(user) ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200">
                        <Clock className="w-3 h-3" />
                        {formatExperienceLabel(user)}
                      </span>
                    ) : (
                      <span className="text-slate-400 text-sm">—</span>
                    )}
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
                  <td className="py-4 px-6">
                    <span
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border ${user.receive_notifications ? "bg-emerald-500/20 text-emerald-600 border-emerald-500/30" : "bg-slate-100 text-slate-500 border-slate-200"}`}
                    >
                      {user.receive_notifications ? "Enabled" : "Disabled"}
                    </span>
                  </td>
                  <td className="py-4 px-6 text-sm text-slate-500">
                    {user.lastLogin}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {isLoading && (
            <div className="py-16 text-center text-slate-400">
              Loading users...
            </div>
          )}

          {!isLoading && filteredUsers.length === 0 && (
            <div className="py-16 text-center text-slate-400">
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

              {form.role === "Driver" && (
                <>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      Languages Spoken
                    </label>
                    <Select
                      isMulti
                      options={languageOptions}
                      value={form.languages_spoken.map((language) => {
                        const matched = languageOptions.find(
                          (option) => option.value === language,
                        );
                        return matched || { value: language, label: language };
                      })}
                      onChange={(selected) =>
                        setForm({
                          ...form,
                          languages_spoken: Array.isArray(selected)
                            ? selected.map((option) => option.value)
                            : [],
                        })
                      }
                      placeholder="Select one or more languages"
                      menuPortalTarget={
                        typeof document !== "undefined" ? document.body : null
                      }
                      styles={driverLanguageSelectStyles}
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      Driving Start Date
                    </label>
                    <input
                      type="date"
                      value={form.driving_started_at}
                      max={new Date().toISOString().split("T")[0]}
                      onChange={(e) =>
                        setForm({ ...form, driving_started_at: e.target.value })
                      }
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-amber-500"
                    />
                  </div>
                </>
              )}

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

              <div className="md:col-span-2">
                <label className="inline-flex items-center gap-3 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={form.receive_notifications}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        receive_notifications: e.target.checked,
                      })
                    }
                    className="h-4 w-4 rounded border-slate-600 bg-slate-800 text-amber-500 focus:ring-amber-500 focus:ring-offset-slate-900"
                  />
                  <span className="text-sm text-slate-300">
                    Receive notifications
                  </span>
                </label>
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
