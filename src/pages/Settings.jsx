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
  KeyRound,
  RefreshCw,
  Trash2,
  Power,
} from "lucide-react";

const tabs = [
  { id: "profile", label: "Profile", icon: User },
  { id: "company", label: "Company", icon: Building2 },
  { id: "apiTokens", label: "API Tokens", icon: KeyRound },
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

const defaultProfileForm = {
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  address: "",
};

const defaultApiTokenForm = {
  name: "",
  website_url: "",
};

const getApiKeyDisplayName = (key = {}) => {
  const explicitName = String(
    key?.name || key?.token_name || key?.tokenName || "",
  ).trim();
  if (explicitName) return explicitName;

  const rawUrl = String(key?.website_url || key?.websiteUrl || "").trim();
  if (!rawUrl) return "Unnamed key";

  try {
    const normalizedUrl = /^https?:\/\//i.test(rawUrl)
      ? rawUrl
      : `https://${rawUrl}`;
    return new URL(normalizedUrl).hostname || rawUrl;
  } catch {
    return rawUrl;
  }
};

const normalizeApiKey = (key) => ({
  id: key?.id,
  name: getApiKeyDisplayName(key),
  website_url: key?.website_url || key?.websiteUrl || "",
  active: Boolean(key?.active),
  last_used_at: key?.last_used_at || key?.lastUsedAt || null,
  created_at: key?.created_at || key?.createdAt || null,
  updated_at: key?.updated_at || key?.updatedAt || null,
});

const formatDateTime = (value) => {
  if (!value) return "Never";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return String(value);
  return parsed.toLocaleString();
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
  const [profileForm, setProfileForm] = useState(defaultProfileForm);
  const [profileMeta, setProfileMeta] = useState({
    id: null,
    name: "",
    role: "",
    status: "Active",
    receiveNotifications: false,
    roles: [],
  });
  const [isLoadingProfile, setIsLoadingProfile] = useState(false);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
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
  const [apiKeys, setApiKeys] = useState([]);
  const [apiTokenForm, setApiTokenForm] = useState(defaultApiTokenForm);
  const [editingApiKeyId, setEditingApiKeyId] = useState(null);
  const [isLoadingApiKeys, setIsLoadingApiKeys] = useState(false);
  const [isSavingApiKey, setIsSavingApiKey] = useState(false);
  const [apiKeyActionId, setApiKeyActionId] = useState(null);
  const [apiKeyError, setApiKeyError] = useState("");
  const [apiKeySuccess, setApiKeySuccess] = useState("");

  const setProfileField = (field, value) => {
    setProfileForm((current) => ({ ...current, [field]: value }));
  };

  const loadProfile = async () => {
    setIsLoadingProfile(true);

    try {
      const response = await apiFetch("/me");
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data?.message || "Failed to load profile.");
      }

      const user = data?.user || data?.data?.user || data?.data || {};
      const fullName = String(user.name || "").trim();
      const nameParts = fullName.split(/\s+/).filter(Boolean);
      const firstName = nameParts.shift() || "";
      const lastName = nameParts.join(" ");

      setProfileForm({
        firstName,
        lastName,
        email: user.email || "",
        phone: user.phone || "",
        address: companyForm.company_address || "",
      });

      setProfileMeta({
        id: user.id || null,
        name: fullName,
        role: user.role || "",
        status: user.status || "Active",
        receiveNotifications: Boolean(
          user.receive_notifications ?? user.receiveNotifications,
        ),
        roles: Array.isArray(user.roles) ? user.roles : [],
      });
    } catch (err) {
      setCompanyError(err.message || "Failed to load profile.");
    } finally {
      setIsLoadingProfile(false);
    }
  };

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
      let response;

      if (companyLogoFile) {
        const body = new FormData();
        Object.entries(companyForm).forEach(([k, v]) =>
          body.append(k, v ?? ""),
        );
        body.append("logo", companyLogoFile);
        body.append("_method", "PUT");

        response = await apiFetch("/settings/company", {
          method: "POST",
          body,
        });
      } else {
        response = await apiFetch("/settings/company", {
          method: "PUT",
          body: companyForm,
        });
      }

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
    if (!profileMeta.id) {
      await Swal.fire({
        title: "Save Failed",
        text: "Profile details are not loaded yet.",
        icon: "error",
        background: "#0f172a",
        color: "#e2e8f0",
      });
      return;
    }

    setIsSavingProfile(true);

    try {
      const fullName =
        `${profileForm.firstName} ${profileForm.lastName}`.trim();

      const response = await apiFetch(`/users/${profileMeta.id}`, {
        method: "PUT",
        body: {
          name: fullName,
          email: profileForm.email,
          phone: profileForm.phone,
          role: profileMeta.role,
          roles: profileMeta.roles,
          status: profileMeta.status,
          receive_notifications: profileMeta.receiveNotifications,
        },
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data?.message || "Failed to save profile settings.");
      }

      await loadProfile();

      await Swal.fire({
        title: "Saved",
        text: "Profile settings saved successfully.",
        icon: "success",
        timer: 1800,
        showConfirmButton: false,
        background: "#0f172a",
        color: "#e2e8f0",
      });
    } catch (err) {
      await Swal.fire({
        title: "Save Failed",
        text: err.message || "Failed to save profile settings.",
        icon: "error",
        background: "#0f172a",
        color: "#e2e8f0",
      });
    } finally {
      setIsSavingProfile(false);
    }
  };

  const loadApiKeys = async () => {
    setIsLoadingApiKeys(true);
    setApiKeyError("");

    try {
      const response = await apiFetch("/lead-api-keys");
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data?.message || "Failed to load API keys.");
      }

      const list = Array.isArray(data?.apiKeys)
        ? data.apiKeys
        : Array.isArray(data?.data)
          ? data.data
          : [];
      setApiKeys(list.map(normalizeApiKey));
    } catch (error) {
      setApiKeyError(error.message || "Failed to load API keys.");
    } finally {
      setIsLoadingApiKeys(false);
    }
  };

  const resetApiTokenForm = () => {
    setEditingApiKeyId(null);
    setApiTokenForm(defaultApiTokenForm);
  };

  const copyTokenToClipboard = async (token) => {
    try {
      await navigator.clipboard.writeText(token);
      setApiKeySuccess("Token copied to clipboard.");
      setTimeout(() => setApiKeySuccess(""), 2500);
    } catch {
      setApiKeyError(
        "Could not copy token automatically. Please copy it manually.",
      );
    }
  };

  const showPlainKeyModal = async (plainKey, title) => {
    const result = await Swal.fire({
      title,
      html: `<div style=\"text-align:left\"><p style=\"margin-bottom:8px\">Store this key now. It will not be shown again.</p><div style=\"word-break:break-all;background:#0b1220;border:1px solid #334155;border-radius:8px;padding:10px;color:#e2e8f0;font-family:monospace\">${plainKey}</div></div>`,
      icon: "success",
      showCancelButton: true,
      confirmButtonText: "Copy Key",
      cancelButtonText: "Close",
      background: "#0f172a",
      color: "#e2e8f0",
    });

    if (result.isConfirmed) {
      await copyTokenToClipboard(plainKey);
    }
  };

  const handleSaveApiToken = async () => {
    if (!apiTokenForm.name.trim() || !apiTokenForm.website_url.trim()) {
      setApiKeyError("Name and website URL are required.");
      return;
    }

    setIsSavingApiKey(true);
    setApiKeyError("");
    setApiKeySuccess("");

    try {
      const isEditing = Boolean(editingApiKeyId);
      const path = isEditing
        ? `/lead-api-keys/${editingApiKeyId}`
        : "/lead-api-keys";
      const method = isEditing ? "PUT" : "POST";

      const response = await apiFetch(path, {
        method,
        body: {
          name: apiTokenForm.name.trim(),
          website_url: apiTokenForm.website_url.trim(),
        },
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data?.message || "Failed to save API token.");
      }

      resetApiTokenForm();
      await loadApiKeys();
      setApiKeySuccess(data?.message || "API token saved successfully.");

      const plainKey = data?.apiKey?.plainKey;
      if (plainKey) {
        await showPlainKeyModal(plainKey, "API Key Created");
      }
    } catch (error) {
      setApiKeyError(error.message || "Failed to save API token.");
    } finally {
      setIsSavingApiKey(false);
    }
  };

  const startEditApiKey = (key) => {
    setEditingApiKeyId(key.id);
    setApiTokenForm({
      name: key.name,
      website_url: key.website_url,
    });
    setApiKeyError("");
    setApiKeySuccess("");
  };

  const handleToggleApiKey = async (key) => {
    setApiKeyActionId(key.id);
    setApiKeyError("");

    try {
      const response = await apiFetch(`/lead-api-keys/${key.id}`, {
        method: "PUT",
        body: { active: !key.active },
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data?.message || "Failed to update API token status.");
      }

      setApiKeys((current) =>
        current.map((item) =>
          item.id === key.id ? { ...item, active: !item.active } : item,
        ),
      );
      setApiKeySuccess(data?.message || "API token status updated.");
      setTimeout(() => setApiKeySuccess(""), 2500);
    } catch (error) {
      setApiKeyError(error.message || "Failed to update API token status.");
    } finally {
      setApiKeyActionId(null);
    }
  };

  const handleRegenerateApiKey = async (key) => {
    const confirmation = await Swal.fire({
      title: "Regenerate API key?",
      text: "The old key will stop working immediately.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Regenerate",
      cancelButtonText: "Cancel",
      background: "#0f172a",
      color: "#e2e8f0",
      confirmButtonColor: "#d97706",
    });

    if (!confirmation.isConfirmed) return;

    setApiKeyActionId(key.id);
    setApiKeyError("");

    try {
      const response = await apiFetch(`/lead-api-keys/${key.id}/regenerate`, {
        method: "POST",
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data?.message || "Failed to regenerate API token.");
      }

      await loadApiKeys();
      setApiKeySuccess(data?.message || "API token regenerated.");

      const plainKey = data?.apiKey?.plainKey;
      if (plainKey) {
        await showPlainKeyModal(plainKey, "API Key Regenerated");
      }
    } catch (error) {
      setApiKeyError(error.message || "Failed to regenerate API token.");
    } finally {
      setApiKeyActionId(null);
    }
  };

  const handleDeleteApiKey = async (key) => {
    const confirmation = await Swal.fire({
      title: "Delete API key?",
      text: "This action cannot be undone.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Delete",
      cancelButtonText: "Cancel",
      background: "#0f172a",
      color: "#e2e8f0",
      confirmButtonColor: "#dc2626",
    });

    if (!confirmation.isConfirmed) return;

    setApiKeyActionId(key.id);
    setApiKeyError("");

    try {
      const response = await apiFetch(`/lead-api-keys/${key.id}`, {
        method: "DELETE",
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data?.message || "Failed to delete API token.");
      }

      setApiKeys((current) => current.filter((item) => item.id !== key.id));
      if (editingApiKeyId === key.id) {
        resetApiTokenForm();
      }
      setApiKeySuccess(data?.message || "API token deleted.");
      setTimeout(() => setApiKeySuccess(""), 2500);
    } catch (error) {
      setApiKeyError(error.message || "Failed to delete API token.");
    } finally {
      setApiKeyActionId(null);
    }
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
    if (activeTab === "profile") loadProfile();
    if (activeTab === "company") loadCompanySettings();
    if (activeTab === "apiTokens") loadApiKeys();
  }, [activeTab]);

  const renderTabContent = () => {
    switch (activeTab) {
      case "profile":
        return (
          <div className="space-y-6">
            {isLoadingProfile ? (
              <div className="py-16 text-center text-slate-500">
                Loading profile...
              </div>
            ) : (
              <>
                <div className="flex items-center gap-6">
                  <div className="relative">
                    <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center text-white font-bold text-3xl">
                      {(profileForm.firstName?.[0] || "S") +
                        (profileForm.lastName?.[0] || "A")}
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
                      value={profileForm.firstName}
                      onChange={(event) =>
                        setProfileField("firstName", event.target.value)
                      }
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-amber-500 transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-400 mb-2">
                      Last Name
                    </label>
                    <input
                      type="text"
                      value={profileForm.lastName}
                      onChange={(event) =>
                        setProfileField("lastName", event.target.value)
                      }
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
                        value={profileForm.email}
                        onChange={(event) =>
                          setProfileField("email", event.target.value)
                        }
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
                        value={profileForm.phone}
                        onChange={(event) =>
                          setProfileField("phone", event.target.value)
                        }
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
                        value={profileForm.address}
                        onChange={(event) =>
                          setProfileField("address", event.target.value)
                        }
                        className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-12 pr-4 py-3 text-white focus:outline-none focus:border-amber-500 transition-colors resize-none"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex justify-end">
                  <button
                    onClick={handleProfileSave}
                    disabled={isSavingProfile}
                    className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-amber-400 to-amber-600 text-white rounded-xl font-medium hover:opacity-90 transition-opacity shadow-lg shadow-amber-500/25"
                  >
                    <Save className="w-5 h-5" />
                    {isSavingProfile ? "Saving..." : "Save Changes"}
                  </button>
                </div>
              </>
            )}
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

      case "apiTokens":
        return (
          <div className="space-y-6">
            <div className="bg-slate-800/40 border border-slate-700/50 rounded-2xl p-5">
              <h4 className="text-white font-medium mb-1">Lead API Keys</h4>
              <p className="text-sm text-slate-400 mb-5">
                Create keys for external websites. Public lead capture endpoint:
                <span className="ml-1 font-mono text-amber-300">
                  POST /api/leads/capture-from-website
                </span>
                with
                <span className="ml-1 font-mono text-amber-300">
                  X-Lead-API-Key
                </span>
                header.
              </p>

              {apiKeyError && (
                <div className="mb-4 bg-red-500/10 border border-red-500/30 text-red-300 rounded-xl px-4 py-3 text-sm">
                  {apiKeyError}
                </div>
              )}
              {apiKeySuccess && (
                <div className="mb-4 bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 rounded-xl px-4 py-3 text-sm">
                  {apiKeySuccess}
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-2">
                    Key Name
                  </label>
                  <input
                    type="text"
                    value={apiTokenForm.name}
                    onChange={(event) =>
                      setApiTokenForm((current) => ({
                        ...current,
                        name: event.target.value,
                      }))
                    }
                    placeholder="My Travel Website"
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-amber-500 transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-2">
                    Website URL
                  </label>
                  <input
                    type="url"
                    value={apiTokenForm.website_url}
                    onChange={(event) =>
                      setApiTokenForm((current) => ({
                        ...current,
                        website_url: event.target.value,
                      }))
                    }
                    placeholder="https://mysite.com"
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-amber-500 transition-colors"
                  />
                </div>
              </div>

              <div className="mt-4 flex flex-wrap gap-3">
                <button
                  onClick={handleSaveApiToken}
                  disabled={isSavingApiKey}
                  className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-amber-400 to-amber-600 text-white rounded-xl font-medium hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Save className="w-4 h-4" />
                  {isSavingApiKey
                    ? "Saving..."
                    : editingApiKeyId
                      ? "Update API Key"
                      : "Create API Key"}
                </button>
                {editingApiKeyId && (
                  <button
                    onClick={resetApiTokenForm}
                    className="px-5 py-2.5 bg-slate-700 text-white rounded-xl font-medium hover:bg-slate-600 transition-colors"
                  >
                    Cancel Edit
                  </button>
                )}
              </div>
            </div>

            <div className="bg-slate-800/30 border border-slate-700/50 rounded-2xl overflow-hidden">
              {isLoadingApiKeys ? (
                <div className="py-14 text-center text-slate-500">
                  Loading API keys...
                </div>
              ) : apiKeys.length === 0 ? (
                <div className="py-14 text-center text-slate-500">
                  No API keys created yet.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-900/70 border-b border-slate-800 text-slate-400">
                      <tr>
                        <th className="text-left px-4 py-3 font-medium">
                          Name
                        </th>
                        <th className="text-left px-4 py-3 font-medium">
                          Website
                        </th>
                        <th className="text-left px-4 py-3 font-medium">
                          Status
                        </th>
                        <th className="text-left px-4 py-3 font-medium">
                          Last Used
                        </th>
                        <th className="text-right px-4 py-3 font-medium">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {apiKeys.map((key) => (
                        <tr
                          key={key.id}
                          className="border-b border-slate-800/60 text-slate-200"
                        >
                          <td className="px-4 py-3 font-medium text-white whitespace-nowrap">
                            {key.name}
                          </td>
                          <td className="px-4 py-3 text-slate-300">
                            <a
                              href={key.website_url}
                              target="_blank"
                              rel="noreferrer"
                              className="hover:text-amber-300 transition-colors"
                            >
                              {key.website_url}
                            </a>
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium border ${
                                key.active
                                  ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/30"
                                  : "bg-slate-500/20 text-slate-300 border-slate-500/30"
                              }`}
                            >
                              <Power className="w-3.5 h-3.5" />
                              {key.active ? "Active" : "Disabled"}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-slate-400">
                            {formatDateTime(key.last_used_at)}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex justify-end items-center gap-2">
                              <button
                                onClick={() => startEditApiKey(key)}
                                className="px-2.5 py-1.5 text-xs rounded-lg bg-blue-500/15 text-blue-300 hover:bg-blue-500/25 transition-colors"
                              >
                                Edit
                              </button>
                              <button
                                onClick={() => handleToggleApiKey(key)}
                                disabled={apiKeyActionId === key.id}
                                className="px-2.5 py-1.5 text-xs rounded-lg bg-slate-600/30 text-slate-200 hover:bg-slate-600/50 transition-colors disabled:opacity-60"
                              >
                                {key.active ? "Disable" : "Enable"}
                              </button>
                              <button
                                onClick={() => handleRegenerateApiKey(key)}
                                disabled={apiKeyActionId === key.id}
                                className="p-1.5 rounded-lg text-amber-300 hover:bg-amber-500/15 transition-colors disabled:opacity-60"
                                title="Regenerate key"
                              >
                                <RefreshCw className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleDeleteApiKey(key)}
                                disabled={apiKeyActionId === key.id}
                                className="p-1.5 rounded-lg text-red-300 hover:bg-red-500/15 transition-colors disabled:opacity-60"
                                title="Delete key"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
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
