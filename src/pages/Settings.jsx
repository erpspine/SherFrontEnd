import { useState, useEffect } from "react";
import { apiFetch } from "../utils/api";
import Swal from "sweetalert2";
import {
  User,
  Mail,
  Phone,
  MapPin,
  Lock,
  Bell,
  Palette,
  Globe,
  Shield,
  Save,
  Camera,
  Eye,
  EyeOff,
  Building2,
  Car,
  FileText,
} from "lucide-react";

const tabs = [
  { id: "profile", label: "Profile", icon: User },
  { id: "company", label: "Company", icon: Building2 },
  { id: "notifications", label: "Notifications", icon: Bell },
  { id: "appearance", label: "Appearance", icon: Palette },
  { id: "security", label: "Security", icon: Shield },
];

const defaultCompanyForm = {
  company_name: "",
  company_email: "",
  company_phone: "",
  company_address: "",
  tax_registration_number: "",
  default_currency: "TZS",
  default_vat: "18",
};

const BACKEND_ORIGIN =
  import.meta.env.VITE_BACKEND_ORIGIN || window.location.origin;

const normalizeCurrencyCode = (value) => {
  const code = String(value || "")
    .trim()
    .toUpperCase();

  if (code === "TZ") return "TZS";
  if (code === "US") return "USD";
  if (code === "TZS" || code === "USD") return code;
  return "TZS";
};

const normalizeCompanySettings = (settings = {}) => ({
  company_name: settings.company_name || settings.companyName || "",
  company_email: settings.company_email || settings.companyEmail || "",
  company_phone: settings.company_phone || settings.companyPhone || "",
  company_address: settings.company_address || settings.companyAddress || "",
  tax_registration_number:
    settings.tax_registration_number || settings.taxRegistrationNumber || "",
  default_currency: normalizeCurrencyCode(
    settings.default_currency || settings.defaultCurrency || "TZS",
  ),
  default_vat: String(settings.default_vat || settings.defaultVat || "18"),
});

const resolveLogoUrl = (settings = {}) => {
  const candidate = settings.logo_url || settings.logoUrl || "";
  if (!candidate) return null;
  if (candidate.startsWith("http://") || candidate.startsWith("https://")) {
    return candidate;
  }
  return `${BACKEND_ORIGIN}${candidate.startsWith("/") ? "" : "/"}${candidate}`;
};

export default function Settings() {
  const [activeTab, setActiveTab] = useState("profile");
  const [showPassword, setShowPassword] = useState(false);
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmNewPassword: "",
  });
  const [passwordError, setPasswordError] = useState("");
  const [passwordSuccess, setPasswordSuccess] = useState("");
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);

  // Company tab state
  const [companyForm, setCompanyForm] = useState(defaultCompanyForm);
  const [companyLogoPreview, setCompanyLogoPreview] = useState(null);
  const [companyLogoFile, setCompanyLogoFile] = useState(null);
  const [isLoadingCompany, setIsLoadingCompany] = useState(false);
  const [isSavingCompany, setIsSavingCompany] = useState(false);
  const [companyError, setCompanyError] = useState("");
  const [companySuccess, setCompanySuccess] = useState("");

  const loadCompanySettings = async () => {
    setIsLoadingCompany(true);
    setCompanyError("");
    try {
      const response = await apiFetch("/settings/company");
      const data = await response.json();
      if (!response.ok)
        throw new Error(data?.message || "Failed to load company settings.");
      const s = data.settings || data.data || {};
      setCompanyForm(normalizeCompanySettings(s));
      setCompanyLogoPreview(resolveLogoUrl(s));
    } catch (err) {
      setCompanyError(err.message || "Failed to load company settings.");
    } finally {
      setIsLoadingCompany(false);
    }
  };

  const handleCompanyLogoChange = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setCompanyLogoFile(file);
    const reader = new FileReader();
    reader.onloadend = () => setCompanyLogoPreview(reader.result);
    reader.readAsDataURL(file);
  };

  const handleCompanySave = async () => {
    setIsSavingCompany(true);
    setCompanyError("");
    setCompanySuccess("");
    try {
      const body = new FormData();
      Object.entries(companyForm).forEach(([k, v]) => body.append(k, v ?? ""));
      if (companyLogoFile) body.append("logo", companyLogoFile);
      body.append("_method", "PUT");

      const response = await apiFetch("/settings/company", {
        method: "POST",
        body,
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data?.message || "Failed to save.");

      const saved = data.settings || data.data || null;
      if (saved) {
        setCompanyForm(normalizeCompanySettings(saved));
        setCompanyLogoPreview(resolveLogoUrl(saved));
      } else {
        await loadCompanySettings();
      }

      setCompanyLogoFile(null);
      setCompanySuccess("Company settings saved successfully.");
      await Swal.fire({
        title: "Saved",
        text: "Company settings saved successfully.",
        icon: "success",
        timer: 1800,
        showConfirmButton: false,
        background: "#0f172a",
        color: "#e2e8f0",
      });
      setTimeout(() => setCompanySuccess(""), 4000);
    } catch (err) {
      setCompanyError(err.message || "Failed to save company settings.");
      await Swal.fire({
        title: "Save Failed",
        text: err.message || "Failed to save company settings.",
        icon: "error",
        background: "#0f172a",
        color: "#e2e8f0",
      });
    } finally {
      setIsSavingCompany(false);
    }
  };

  const handleProfileSave = async () => {
    await Swal.fire({
      title: "Saved",
      text: "Profile settings saved successfully.",
      icon: "success",
      timer: 1800,
      showConfirmButton: false,
      background: "#0f172a",
      color: "#e2e8f0",
    });
  };

  const handlePasswordUpdate = async () => {
    setPasswordError("");
    setPasswordSuccess("");

    if (
      !passwordForm.currentPassword ||
      !passwordForm.newPassword ||
      !passwordForm.confirmNewPassword
    ) {
      setPasswordError("Please fill in all password fields.");
      return;
    }

    if (passwordForm.newPassword !== passwordForm.confirmNewPassword) {
      setPasswordError("New password confirmation does not match.");
      return;
    }

    setIsUpdatingPassword(true);

    try {
      const response = await apiFetch("/change-password", {
        method: "POST",
        body: {
          current_password: passwordForm.currentPassword,
          password: passwordForm.newPassword,
          password_confirmation: passwordForm.confirmNewPassword,
        },
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data?.message || "Failed to update password.");
      }

      setPasswordForm({
        currentPassword: "",
        newPassword: "",
        confirmNewPassword: "",
      });
      setPasswordSuccess(data?.message || "Password updated successfully.");

      await Swal.fire({
        title: "Updated",
        text: data?.message || "Password updated successfully.",
        icon: "success",
        timer: 1800,
        showConfirmButton: false,
        background: "#0f172a",
        color: "#e2e8f0",
      });
    } catch (err) {
      const message = err.message || "Failed to update password.";
      setPasswordError(message);
      await Swal.fire({
        title: "Update Failed",
        text: message,
        icon: "error",
        background: "#0f172a",
        color: "#e2e8f0",
      });
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  useEffect(() => {
    if (activeTab === "company") loadCompanySettings();
  }, [activeTab]);

  const renderTabContent = () => {
    switch (activeTab) {
      case "profile":
        return (
          <div className="space-y-6">
            <div className="flex items-center gap-6">
              <div className="relative">
                <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center text-white font-bold text-3xl">
                  SA
                </div>
                <button className="absolute -bottom-2 -right-2 p-2 bg-slate-800 border border-slate-700 rounded-xl text-slate-400 hover:text-white hover:bg-slate-700 transition-colors">
                  <Camera className="w-4 h-4" />
                </button>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white">
                  Administrator Profile
                </h3>
                <p className="text-sm text-slate-400 mt-1">
                  Manage the main Sher ERP account details.
                </p>
                <button className="mt-3 px-4 py-2 bg-slate-800 text-white rounded-xl text-sm font-medium hover:bg-slate-700 transition-colors">
                  Upload New Photo
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-2">
                  First Name
                </label>
                <input
                  type="text"
                  defaultValue="Sherif"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-amber-500 transition-colors"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-2">
                  Last Name
                </label>
                <input
                  type="text"
                  defaultValue="Admin"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-amber-500 transition-colors"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-2">
                  Email
                </label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                  <input
                    type="email"
                    defaultValue="admin@sher-leasing.co.tz"
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-12 pr-4 py-3 text-white focus:outline-none focus:border-amber-500 transition-colors"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-2">
                  Phone
                </label>
                <div className="relative">
                  <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                  <input
                    type="tel"
                    defaultValue="+255 754 123 456"
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-12 pr-4 py-3 text-white focus:outline-none focus:border-amber-500 transition-colors"
                  />
                </div>
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-slate-400 mb-2">
                  Address
                </label>
                <div className="relative">
                  <MapPin className="absolute left-4 top-4 w-5 h-5 text-slate-500" />
                  <textarea
                    rows={3}
                    defaultValue="Sher Leasing HQ, Nyerere Road, Dar es Salaam, Tanzania"
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-12 pr-4 py-3 text-white focus:outline-none focus:border-amber-500 transition-colors resize-none"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end">
              <button
                onClick={handleProfileSave}
                className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-amber-400 to-amber-600 text-white rounded-xl font-medium hover:opacity-90 transition-opacity shadow-lg shadow-amber-500/25"
              >
                <Save className="w-5 h-5" />
                Save Changes
              </button>
            </div>
          </div>
        );

      case "company":
        return (
          <div className="space-y-6">
            {companyError && (
              <div className="bg-red-500/10 border border-red-500/30 text-red-300 rounded-xl px-4 py-3 text-sm">
                {companyError}
              </div>
            )}
            {companySuccess && (
              <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 rounded-xl px-4 py-3 text-sm">
                {companySuccess}
              </div>
            )}
            {isLoadingCompany ? (
              <div className="py-16 text-center text-slate-500">
                Loading company settings...
              </div>
            ) : (
              <>
                <div className="bg-slate-800/40 border border-slate-700/50 rounded-2xl p-5">
                  <h4 className="text-white font-medium mb-4">
                    Company Information
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-slate-400 mb-2">
                        Company Logo
                      </label>
                      <div className="flex items-center gap-4">
                        <div className="w-20 h-20 rounded-2xl bg-slate-900 border border-slate-700 flex items-center justify-center overflow-hidden">
                          {companyLogoPreview ? (
                            <img
                              src={companyLogoPreview}
                              alt="Company logo preview"
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <Building2 className="w-8 h-8 text-slate-500" />
                          )}
                        </div>
                        <label className="inline-flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-xl text-sm font-medium cursor-pointer transition-colors">
                          <Camera className="w-4 h-4" />
                          Upload Logo
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={handleCompanyLogoChange}
                          />
                        </label>
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-400 mb-2">
                        Company Email
                      </label>
                      <div className="relative">
                        <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                        <input
                          type="email"
                          value={companyForm.company_email}
                          onChange={(e) =>
                            setCompanyForm({
                              ...companyForm,
                              company_email: e.target.value,
                            })
                          }
                          className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-12 pr-4 py-3 text-white focus:outline-none focus:border-amber-500 transition-colors"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-400 mb-2">
                        Company Phone
                      </label>
                      <div className="relative">
                        <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                        <input
                          type="tel"
                          value={companyForm.company_phone}
                          onChange={(e) =>
                            setCompanyForm({
                              ...companyForm,
                              company_phone: e.target.value,
                            })
                          }
                          className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-12 pr-4 py-3 text-white focus:outline-none focus:border-amber-500 transition-colors"
                        />
                      </div>
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-slate-400 mb-2">
                        Company Address
                      </label>
                      <div className="relative">
                        <MapPin className="absolute left-4 top-4 w-5 h-5 text-slate-500" />
                        <textarea
                          rows={3}
                          value={companyForm.company_address}
                          onChange={(e) =>
                            setCompanyForm({
                              ...companyForm,
                              company_address: e.target.value,
                            })
                          }
                          className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-12 pr-4 py-3 text-white focus:outline-none focus:border-amber-500 transition-colors resize-none"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-slate-400 mb-2">
                      Company Name
                    </label>
                    <input
                      type="text"
                      value={companyForm.company_name}
                      onChange={(e) =>
                        setCompanyForm({
                          ...companyForm,
                          company_name: e.target.value,
                        })
                      }
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-amber-500 transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-400 mb-2">
                      Tax Registration Number
                    </label>
                    <input
                      type="text"
                      value={companyForm.tax_registration_number}
                      onChange={(e) =>
                        setCompanyForm({
                          ...companyForm,
                          tax_registration_number: e.target.value,
                        })
                      }
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-amber-500 transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-400 mb-2">
                      Default Currency
                    </label>
                    <select
                      value={companyForm.default_currency}
                      onChange={(e) =>
                        setCompanyForm({
                          ...companyForm,
                          default_currency: e.target.value,
                        })
                      }
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-amber-500 transition-colors"
                    >
                      <option value="TZS">Tanzanian Shilling (Tsh)</option>
                      <option value="USD">US Dollar (USD)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-400 mb-2">
                      Default VAT (%)
                    </label>
                    <input
                      type="text"
                      value={companyForm.default_vat}
                      onChange={(e) =>
                        setCompanyForm({
                          ...companyForm,
                          default_vat: e.target.value,
                        })
                      }
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-amber-500 transition-colors"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-5 bg-slate-800/50 rounded-2xl border border-slate-700/50">
                    <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center mb-3">
                      <Car className="w-5 h-5 text-blue-400" />
                    </div>
                    <h4 className="text-white font-medium">Fleet Defaults</h4>
                    <p className="text-sm text-slate-400 mt-1">
                      Set default rate cards and vehicle categories.
                    </p>
                  </div>
                  <div className="p-5 bg-slate-800/50 rounded-2xl border border-slate-700/50">
                    <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center mb-3">
                      <FileText className="w-5 h-5 text-indigo-400" />
                    </div>
                    <h4 className="text-white font-medium">
                      Document Settings
                    </h4>
                    <p className="text-sm text-slate-400 mt-1">
                      Control quotation and PI numbering formats.
                    </p>
                  </div>
                  <div className="p-5 bg-slate-800/50 rounded-2xl border border-slate-700/50">
                    <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center mb-3">
                      <Globe className="w-5 h-5 text-emerald-400" />
                    </div>
                    <h4 className="text-white font-medium">Regional Setup</h4>
                    <p className="text-sm text-slate-400 mt-1">
                      Tanzania tax, timezone, and date formatting.
                    </p>
                  </div>
                </div>

                <div className="flex justify-end">
                  <button
                    onClick={handleCompanySave}
                    disabled={isSavingCompany}
                    className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-amber-400 to-amber-600 text-white rounded-xl font-medium hover:opacity-90 transition-opacity shadow-lg shadow-amber-500/25 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Save className="w-5 h-5" />
                    {isSavingCompany ? "Saving..." : "Save Company Settings"}
                  </button>
                </div>
              </>
            )}
          </div>
        );

      case "notifications":
        return (
          <div className="space-y-4">
            {[
              {
                title: "New Quotation Alerts",
                desc: "Notify admins when a new quotation is created.",
              },
              {
                title: "Proforma Invoice Reminders",
                desc: "Get reminded when PIs are nearing due dates.",
              },
              {
                title: "Payment Confirmation",
                desc: "Send alerts when client payments are recorded.",
              },
              {
                title: "Vehicle Maintenance Notices",
                desc: "Receive maintenance and service due alerts.",
              },
              {
                title: "Contract Expiry Alerts",
                desc: "Notify operations before lease contracts expire.",
              },
              {
                title: "Weekly Performance Report",
                desc: "Email a fleet and revenue summary every week.",
              },
            ].map((item, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-4 bg-slate-800/50 rounded-xl border border-slate-700/50"
              >
                <div>
                  <h4 className="text-white font-medium">{item.title}</h4>
                  <p className="text-sm text-slate-400">{item.desc}</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    defaultChecked={index < 4}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-700 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-500"></div>
                </label>
              </div>
            ))}
          </div>
        );

      case "appearance":
        return (
          <div className="space-y-6">
            <div>
              <h4 className="text-white font-medium mb-4">Theme</h4>
              <div className="grid grid-cols-3 gap-4">
                {[
                  {
                    name: "Dark",
                    active: true,
                    colors: ["#020617", "#0f172a", "#2563eb"],
                  },
                  {
                    name: "Light",
                    active: false,
                    colors: ["#f8fafc", "#e2e8f0", "#2563eb"],
                  },
                  {
                    name: "System",
                    active: false,
                    colors: ["#020617", "#f8fafc", "#4f46e5"],
                  },
                ].map((theme) => (
                  <button
                    key={theme.name}
                    className={`p-4 rounded-xl border-2 transition-all ${
                      theme.active
                        ? "border-blue-500 bg-blue-500/10"
                        : "border-slate-700 hover:border-slate-600"
                    }`}
                  >
                    <div className="flex gap-2 mb-3">
                      {theme.colors.map((color, index) => (
                        <div
                          key={index}
                          className="w-6 h-6 rounded-full"
                          style={{ backgroundColor: color }}
                        />
                      ))}
                    </div>
                    <p className="text-sm text-white font-medium">
                      {theme.name}
                    </p>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <h4 className="text-white font-medium mb-4">Accent Color</h4>
              <div className="flex gap-3">
                {["#2563eb", "#4f46e5", "#0891b2", "#16a34a", "#d97706"].map(
                  (color) => (
                    <button
                      key={color}
                      className={`w-10 h-10 rounded-xl border-2 transition-all ${
                        color === "#2563eb"
                          ? "border-white scale-110"
                          : "border-transparent hover:scale-105"
                      }`}
                      style={{ backgroundColor: color }}
                    />
                  ),
                )}
              </div>
            </div>

            <div>
              <h4 className="text-white font-medium mb-4">Language</h4>
              <div className="relative max-w-xs">
                <Globe className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                <select className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-12 pr-4 py-3 text-white focus:outline-none focus:border-amber-500 transition-colors appearance-none">
                  <option>English (Tanzania)</option>
                  <option>Swahili</option>
                  <option>English (UK)</option>
                </select>
              </div>
            </div>
          </div>
        );

      case "security":
        return (
          <div className="space-y-6">
            <div>
              <h4 className="text-white font-medium mb-4">Change Password</h4>
              {passwordError && (
                <div className="mb-4 bg-red-500/10 border border-red-500/30 text-red-300 rounded-xl px-4 py-3 text-sm max-w-md">
                  {passwordError}
                </div>
              )}
              {passwordSuccess && (
                <div className="mb-4 bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 rounded-xl px-4 py-3 text-sm max-w-md">
                  {passwordSuccess}
                </div>
              )}
              <div className="space-y-4 max-w-md">
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-2">
                    Current Password
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                    <input
                      type={showPassword ? "text" : "password"}
                      value={passwordForm.currentPassword}
                      onChange={(e) =>
                        setPasswordForm({
                          ...passwordForm,
                          currentPassword: e.target.value,
                        })
                      }
                      placeholder="Enter current password"
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-12 pr-12 py-3 text-white focus:outline-none focus:border-amber-500 transition-colors"
                    />
                    <button
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white"
                    >
                      {showPassword ? (
                        <EyeOff className="w-5 h-5" />
                      ) : (
                        <Eye className="w-5 h-5" />
                      )}
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-2">
                    New Password
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                    <input
                      type="password"
                      value={passwordForm.newPassword}
                      onChange={(e) =>
                        setPasswordForm({
                          ...passwordForm,
                          newPassword: e.target.value,
                        })
                      }
                      placeholder="Enter new password"
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-12 pr-4 py-3 text-white focus:outline-none focus:border-amber-500 transition-colors"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-2">
                    Confirm New Password
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                    <input
                      type="password"
                      value={passwordForm.confirmNewPassword}
                      onChange={(e) =>
                        setPasswordForm({
                          ...passwordForm,
                          confirmNewPassword: e.target.value,
                        })
                      }
                      placeholder="Confirm new password"
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-12 pr-4 py-3 text-white focus:outline-none focus:border-amber-500 transition-colors"
                    />
                  </div>
                </div>
                <button
                  onClick={handlePasswordUpdate}
                  disabled={isUpdatingPassword}
                  className="px-6 py-3 bg-gradient-to-r from-amber-400 to-amber-600 text-white rounded-xl font-medium hover:opacity-90 transition-opacity disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {isUpdatingPassword ? "Updating..." : "Update Password"}
                </button>
              </div>
            </div>

            <div className="pt-6 border-t border-slate-800">
              <h4 className="text-white font-medium mb-4">
                Two-Factor Authentication
              </h4>
              <div className="flex items-center justify-between p-4 bg-slate-800/50 rounded-xl border border-slate-700/50">
                <div>
                  <p className="text-white">Enable 2FA</p>
                  <p className="text-sm text-slate-400">
                    Add an extra layer of security to the admin account.
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" className="sr-only peer" />
                  <div className="w-11 h-6 bg-slate-700 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-500"></div>
                </label>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Settings</h1>
        <p className="text-slate-400 mt-1">
          Manage administrator, company, and system preferences.
        </p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[280px_1fr] gap-6">
        <div className="bg-slate-900/50 backdrop-blur border border-slate-800/50 rounded-2xl p-4 h-fit">
          <div className="space-y-2">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-all ${
                  activeTab === tab.id
                    ? "bg-gradient-to-r from-blue-600/20 to-indigo-600/20 text-white border border-blue-500/30"
                    : "text-slate-400 hover:text-white hover:bg-slate-800"
                }`}
              >
                <tab.icon className="w-5 h-5" />
                <span className="font-medium">{tab.label}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="bg-slate-900/50 backdrop-blur border border-slate-800/50 rounded-2xl p-6">
          {renderTabContent()}
        </div>
      </div>
    </div>
  );
}
