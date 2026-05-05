import { useEffect, useMemo, useState } from "react";
import {
  Search,
  Plus,
  Building2,
  Phone,
  Mail,
  MapPin,
  Edit,
  Trash2,
  X,
  FileText,
  Download,
  Loader2,
} from "lucide-react";
import Swal from "sweetalert2";
import { apiFetch } from "../utils/api";

const avatarColors = [
  "from-amber-400 to-amber-600",
  "from-green-500 to-teal-500",
  "from-purple-500 to-pink-500",
  "from-amber-500 to-orange-500",
  "from-red-500 to-rose-500",
  "from-cyan-500 to-blue-500",
];

const emptyForm = {
  name: "",
  company: "",
  phone: "",
  email: "",
  address: "",
};

const extractList = (payload) => {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.clients)) return payload.clients;
  return [];
};

const extractSingle = (payload) => payload?.data || payload?.client || payload;

const getInitials = (name) => {
  const safe = String(name || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
  return safe || "CL";
};

const formatSince = (value) => {
  if (!value) return "-";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "-";
  return parsed.toLocaleDateString(undefined, {
    month: "short",
    year: "numeric",
  });
};

const normalizeClient = (client) => ({
  id: Number(client.id || 0),
  name: client.name || client.client_name || "",
  company: client.company || client.company_name || "",
  phone: client.phone || client.phone_number || "",
  email: client.email || "",
  address: client.address || client.location || "",
  totalQuotes: Number(
    client.totalQuotations ?? client.totalQuotes ?? client.total_quotes ?? 0,
  ),
  since: formatSince(client.created_at || client.createdAt),
  avatar: getInitials(client.name || client.client_name || ""),
});

export default function Clients() {
  const [clients, setClients] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editClient, setEditClient] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [errorMessage, setErrorMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const loadClients = async () => {
    setErrorMessage("");
    setIsLoading(true);

    try {
      const response = await apiFetch("/clients");
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload?.message || "Unable to fetch clients.");
      }

      setClients(extractList(payload).map(normalizeClient));
    } catch (error) {
      setErrorMessage(error.message || "Failed to load clients.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadClients();
  }, []);

  const stats = useMemo(() => {
    const total = clients.length;
    const totalQuotes = clients.reduce(
      (sum, client) => sum + Number(client.totalQuotes || 0),
      0,
    );
    const avgQuotes = total > 0 ? (totalQuotes / total).toFixed(1) : "0.0";

    return { total, totalQuotes, avgQuotes };
  }, [clients]);

  const filtered = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    if (!query) return clients;

    return clients.filter((client) => {
      return (
        String(client.name).toLowerCase().includes(query) ||
        String(client.company).toLowerCase().includes(query) ||
        String(client.email).toLowerCase().includes(query) ||
        String(client.phone).toLowerCase().includes(query)
      );
    });
  }, [clients, searchTerm]);

  const openAdd = () => {
    setEditClient(null);
    setForm(emptyForm);
    setIsModalOpen(true);
  };

  const openEdit = async (client) => {
    setErrorMessage("");
    setIsSaving(true);
    try {
      const response = await apiFetch(`/clients/${client.id}`);
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload?.message || "Unable to fetch client.");
      }

      const fullClient = normalizeClient(extractSingle(payload));
      setEditClient(fullClient);
      setForm({
        name: fullClient.name,
        company: fullClient.company,
        phone: fullClient.phone,
        email: fullClient.email,
        address: fullClient.address,
      });
      setIsModalOpen(true);
    } catch (error) {
      setErrorMessage(error.message || "Failed to open client.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleSave = async () => {
    if (!form.name.trim() || !form.company.trim() || !form.phone.trim()) {
      await Swal.fire({
        icon: "warning",
        title: "Missing fields",
        text: "Please fill Name, Company, and Phone.",
      });
      return;
    }

    setErrorMessage("");
    setIsSaving(true);

    const payload = {
      name: form.name.trim(),
      company: form.company.trim(),
      phone: form.phone.trim(),
      email: form.email.trim(),
      address: form.address.trim(),
    };

    try {
      const isEdit = Boolean(editClient?.id);
      const response = await apiFetch(
        isEdit ? `/clients/${editClient.id}` : "/clients",
        {
          method: isEdit ? "PUT" : "POST",
          body: payload,
        },
      );

      const body = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(body?.message || "Unable to save client.");
      }

      await loadClients();
      setIsModalOpen(false);
      setEditClient(null);
      setForm(emptyForm);

      await Swal.fire({
        icon: "success",
        title: isEdit ? "Client updated" : "Client created",
        timer: 1400,
        showConfirmButton: false,
      });
    } catch (error) {
      await Swal.fire({
        icon: "error",
        title: "Save failed",
        text: error.message || "Failed to save client.",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (client) => {
    const confirmation = await Swal.fire({
      icon: "warning",
      title: "Delete client?",
      text: `This will remove ${client.name}.`,
      showCancelButton: true,
      confirmButtonText: "Delete",
      confirmButtonColor: "#ef4444",
    });

    if (!confirmation.isConfirmed) return;

    setErrorMessage("");
    setIsSaving(true);
    try {
      const response = await apiFetch(`/clients/${client.id}`, {
        method: "DELETE",
      });

      const body = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(body?.message || "Unable to delete client.");
      }

      setClients((current) => current.filter((item) => item.id !== client.id));

      await Swal.fire({
        icon: "success",
        title: "Client deleted",
        timer: 1400,
        showConfirmButton: false,
      });
    } catch (error) {
      await Swal.fire({
        icon: "error",
        title: "Delete failed",
        text: error.message || "Failed to delete client.",
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Clients</h1>
          <p className="text-slate-500 mt-1">
            Manage your client accounts and contacts
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button className="flex items-center gap-2 px-4 py-2.5 border border-slate-200 bg-white text-slate-700 rounded-xl text-sm hover:bg-slate-50 transition-colors">
            <Download className="w-4 h-4" />
            Export
          </button>
          <button
            onClick={openAdd}
            className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-amber-400 to-amber-600 text-white rounded-xl font-medium text-sm hover:opacity-90 transition-opacity shadow-lg shadow-amber-500/25"
          >
            <Plus className="w-4 h-4" />
            Add Client
          </button>
        </div>
      </div>

      {errorMessage && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {errorMessage}
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        {[
          {
            label: "Total Clients",
            value: stats.total,
            color: "text-slate-900",
            bg: "bg-blue-50",
            iconColor: "text-blue-600",
          },
          {
            label: "Total Quotes",
            value: stats.totalQuotes,
            color: "text-blue-600",
            bg: "bg-blue-50",
            iconColor: "text-blue-600",
          },
          {
            label: "Avg Quotes / Client",
            value: stats.avgQuotes,
            color: "text-purple-600",
            bg: "bg-purple-50",
            iconColor: "text-purple-600",
          },
        ].map((s) => (
          <div
            key={s.label}
            className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-500 text-sm">{s.label}</p>
                <p className={`text-2xl font-bold mt-1 ${s.color}`}>
                  {s.value}
                </p>
              </div>
              <div className={`p-3 ${s.bg} rounded-xl`}>
                <Building2 className={`w-6 h-6 ${s.iconColor}`} />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 flex items-center gap-3 bg-slate-50 rounded-xl px-4 py-2.5 border border-slate-200 focus-within:border-amber-500 transition-colors">
            <Search className="w-5 h-5 text-slate-400" />
            <input
              type="text"
              placeholder="Search by name, company, email, or phone..."
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              className="bg-transparent border-none outline-none text-sm text-slate-900 placeholder-slate-400 w-full"
            />
          </div>
        </div>
      </div>

      <section className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50">
              <tr className="border-b border-slate-200">
                {[
                  "Client",
                  "Contact",
                  "Location",
                  "Total Quotes",
                  "Since",
                  "Actions",
                ].map((h) => (
                  <th
                    key={h}
                    className="text-left py-4 px-6 text-xs font-semibold text-slate-500 uppercase tracking-wide"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoading && (
                <tr>
                  <td colSpan={6} className="py-10 text-center text-slate-500">
                    <div className="inline-flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Loading clients...
                    </div>
                  </td>
                </tr>
              )}

              {!isLoading &&
                filtered.map((c, i) => (
                  <tr
                    key={c.id}
                    className="border-b border-slate-100 hover:bg-slate-50 transition-colors"
                  >
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-10 h-10 rounded-full bg-gradient-to-br ${avatarColors[i % avatarColors.length]} flex items-center justify-center text-white font-semibold text-sm flex-shrink-0`}
                        >
                          {c.avatar}
                        </div>
                        <div>
                          <p className="text-slate-900 font-medium">
                            {c.name || "-"}
                          </p>
                          <p className="text-slate-500 text-sm">
                            {c.company || "-"}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <div className="space-y-1">
                        <div className="flex items-center gap-1.5 text-sm text-slate-700">
                          <Phone className="w-3.5 h-3.5 text-slate-400" />
                          {c.phone || "-"}
                        </div>
                        <div className="flex items-center gap-1.5 text-sm text-slate-500">
                          <Mail className="w-3.5 h-3.5 text-slate-400" />
                          {c.email || "-"}
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-1.5 text-sm text-slate-700">
                        <MapPin className="w-3.5 h-3.5 text-slate-400" />
                        {c.address || "-"}
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-1.5 text-sm text-slate-700">
                        <FileText className="w-3.5 h-3.5 text-slate-400" />
                        {c.totalQuotes}
                      </div>
                    </td>
                    <td className="py-4 px-6 text-sm text-slate-500">
                      {c.since}
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => openEdit(c)}
                          disabled={isSaving}
                          className="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors disabled:opacity-60"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(c)}
                          disabled={isSaving}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors disabled:opacity-60"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>

          {!isLoading && filtered.length === 0 && (
            <div className="py-16 text-center text-slate-500">
              No clients found.
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t border-slate-200">
          <p className="text-sm text-slate-600">
            Showing {filtered.length} of {clients.length} clients
          </p>
        </div>
      </section>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg">
            <div className="flex items-center justify-between p-6 border-b border-slate-800">
              <h2 className="text-xl font-bold text-white">
                {editClient ? "Edit Client" : "Add New Client"}
              </h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {[
                {
                  label: "Full Name",
                  key: "name",
                  placeholder: "Mohamed Hassan",
                },
                {
                  label: "Company / Organization",
                  key: "company",
                  placeholder: "Hassan Trading Co.",
                },
                {
                  label: "Phone Number",
                  key: "phone",
                  placeholder: "+255 712 345 678",
                },
                {
                  label: "Email Address",
                  key: "email",
                  placeholder: "contact@company.co.tz",
                  type: "email",
                },
                {
                  label: "City / Location",
                  key: "address",
                  placeholder: "Dar es Salaam",
                },
              ].map((f) => (
                <div key={f.key}>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    {f.label}
                  </label>
                  <input
                    type={f.type || "text"}
                    value={form[f.key]}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        [f.key]: event.target.value,
                      }))
                    }
                    placeholder={f.placeholder}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 transition-colors"
                  />
                </div>
              ))}
            </div>

            <div className="p-6 pt-0 flex justify-end gap-3">
              <button
                onClick={() => setIsModalOpen(false)}
                className="px-6 py-2.5 bg-slate-800 text-slate-300 rounded-xl hover:bg-slate-700 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="inline-flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-amber-400 to-amber-600 text-white rounded-xl hover:opacity-90 transition-opacity disabled:opacity-60"
              >
                {isSaving && <Loader2 className="w-4 h-4 animate-spin" />}
                {editClient ? "Update Client" : "Add Client"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
