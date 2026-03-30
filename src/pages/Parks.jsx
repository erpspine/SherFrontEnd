import { useEffect, useMemo, useState } from "react";
import {
  Search,
  Plus,
  Edit,
  Trash2,
  X,
  Trees,
  ShieldCheck,
  Truck,
  MapPin,
  AlertTriangle,
} from "lucide-react";
import { apiFetch } from "../utils/api";
import Swal from "sweetalert2";

const createParkState = () => ({
  name: "",
  region: "",
  status: "Active",
});

const createRateState = (parkId = "") => ({
  park_id: parkId,
  type: "resident",
  category: "adult",
  rate: "",
});

const createConcessionRateState = (parkId = "") => ({
  park_id: parkId,
  type: "resident",
  category: "adult",
  rate: "",
});

const createTransportRateState = () => ({
  particular: "",
  rate: "",
});

const statusStyles = {
  Active: "bg-green-500/20 text-green-400 border-green-500/30",
  Seasonal: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  Restricted: "bg-red-500/20 text-red-400 border-red-500/30",
};

const normalizePark = (park) => ({
  id: park.id,
  name: park.name || "",
  region: park.region || "",
  status: park.status || "Active",
});

const extractList = (payload) => {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.parks)) return payload.parks;
  if (Array.isArray(payload?.parkRates)) return payload.parkRates;
  if (Array.isArray(payload?.concessionRates)) return payload.concessionRates;
  if (Array.isArray(payload?.transportRates)) return payload.transportRates;
  if (Array.isArray(payload?.rates)) return payload.rates;
  return [];
};

const extractSingle = (payload) => payload?.data || payload?.park || payload;

const normalizeParkRate = (rate) => ({
  id: rate.id,
  park_id: Number(rate.park_id ?? rate.parkId ?? 0),
  park_name: rate.park_name || rate.parkName || "",
  type: rate.type || "resident",
  category: rate.category || "adult",
  rate: Number(rate.rate ?? 0),
});

const normalizeConcessionRate = (rate) => ({
  id: rate.id,
  park_id: Number(rate.park_id ?? rate.parkId ?? 0),
  park_name: rate.park_name || rate.parkName || "",
  type: rate.type || "resident",
  category: rate.category || "adult",
  rate: Number(rate.rate ?? 0),
});

const normalizeTransportRate = (rate) => ({
  id: rate.id,
  particular: rate.particular || rate.name || "",
  rate: Number(rate.rate ?? 0),
});

const extractRateSingle = (payload) =>
  payload?.data ||
  payload?.parkRate ||
  payload?.rate ||
  payload?.parkRates?.[0] ||
  payload;

const extractConcessionSingle = (payload) =>
  payload?.data ||
  payload?.concessionRate ||
  payload?.rate ||
  payload?.concessionRates?.[0] ||
  payload;

const extractTransportSingle = (payload) =>
  payload?.data ||
  payload?.transportRate ||
  payload?.rate ||
  payload?.transportRates?.[0] ||
  payload;

export default function Parks() {
  const [parks, setParks] = useState([]);
  const [parkFeeRates, setParkFeeRates] = useState([]);
  const [concessionRates, setConcessionRates] = useState([]);
  const [transportRates, setTransportRates] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [selectedRateParkId, setSelectedRateParkId] = useState("all");
  const [selectedConcessionParkId, setSelectedConcessionParkId] =
    useState("all");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingParkId, setEditingParkId] = useState(null);
  const [isRateModalOpen, setIsRateModalOpen] = useState(false);
  const [isConcessionModalOpen, setIsConcessionModalOpen] = useState(false);
  const [isTransportModalOpen, setIsTransportModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isRatesLoading, setIsRatesLoading] = useState(true);
  const [isConcessionLoading, setIsConcessionLoading] = useState(true);
  const [isTransportLoading, setIsTransportLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isRateSaving, setIsRateSaving] = useState(false);
  const [isConcessionSaving, setIsConcessionSaving] = useState(false);
  const [isTransportSaving, setIsTransportSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [formError, setFormError] = useState("");
  const [rateError, setRateError] = useState("");
  const [concessionError, setConcessionError] = useState("");
  const [transportError, setTransportError] = useState("");
  const [newPark, setNewPark] = useState(createParkState());
  const [editingRateId, setEditingRateId] = useState(null);
  const [newRate, setNewRate] = useState(createRateState());
  const [editingConcessionId, setEditingConcessionId] = useState(null);
  const [newConcessionRate, setNewConcessionRate] = useState(
    createConcessionRateState(),
  );
  const [editingTransportId, setEditingTransportId] = useState(null);
  const [newTransportRate, setNewTransportRate] = useState(
    createTransportRateState(),
  );

  const filteredParks = useMemo(() => {
    return parks.filter((park) => {
      const query = searchTerm.toLowerCase();
      const matchesSearch =
        park.name.toLowerCase().includes(query) ||
        park.region.toLowerCase().includes(query);
      const matchesStatus =
        statusFilter === "All" || park.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [parks, searchTerm, statusFilter]);

  const totals = useMemo(() => {
    const active = parks.filter((park) => park.status === "Active").length;
    const seasonal = parks.filter((park) => park.status === "Seasonal").length;
    const restricted = parks.filter(
      (park) => park.status === "Restricted",
    ).length;

    return {
      all: parks.length,
      active,
      seasonal,
      restricted,
    };
  }, [parks]);

  const parkNameById = useMemo(() => {
    return parks.reduce((accumulator, park) => {
      accumulator[park.id] = park.name;
      return accumulator;
    }, {});
  }, [parks]);

  const loadParks = async () => {
    setErrorMessage("");
    setIsLoading(true);

    try {
      const response = await apiFetch("/parks");
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload?.message || "Unable to fetch parks.");
      }

      setParks(extractList(payload).map(normalizePark));
    } catch (error) {
      setErrorMessage(error.message || "Failed to load parks.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadParks();
  }, []);

  const loadParkRates = async (parkId = "all") => {
    setRateError("");
    setIsRatesLoading(true);

    try {
      const endpoint =
        parkId === "all" ? "/park-rates" : `/parks/${parkId}/rates`;
      const response = await apiFetch(endpoint);
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload?.message || "Unable to fetch park rates.");
      }

      setParkFeeRates(extractList(payload).map(normalizeParkRate));
    } catch (error) {
      setRateError(error.message || "Failed to load park rates.");
    } finally {
      setIsRatesLoading(false);
    }
  };

  useEffect(() => {
    loadParkRates(selectedRateParkId);
  }, [selectedRateParkId]);

  const loadConcessionRates = async (parkId = "all") => {
    setConcessionError("");
    setIsConcessionLoading(true);

    try {
      const endpoint =
        parkId === "all"
          ? "/concession-rates"
          : `/parks/${parkId}/concession-rates`;
      const response = await apiFetch(endpoint);
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(
          payload?.message || "Unable to fetch concession rates.",
        );
      }

      setConcessionRates(extractList(payload).map(normalizeConcessionRate));
    } catch (error) {
      setConcessionError(error.message || "Failed to load concession rates.");
    } finally {
      setIsConcessionLoading(false);
    }
  };

  useEffect(() => {
    loadConcessionRates(selectedConcessionParkId);
  }, [selectedConcessionParkId]);

  const loadTransportRates = async () => {
    setTransportError("");
    setIsTransportLoading(true);

    try {
      const response = await apiFetch("/transport-rates");
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload?.message || "Unable to fetch transport rates.");
      }

      setTransportRates(extractList(payload).map(normalizeTransportRate));
    } catch (error) {
      setTransportError(error.message || "Failed to load transport rates.");
    } finally {
      setIsTransportLoading(false);
    }
  };

  useEffect(() => {
    loadTransportRates();
  }, []);

  const openAddModal = () => {
    setErrorMessage("");
    setFormError("");
    setEditingParkId(null);
    setNewPark(createParkState());
    setIsModalOpen(true);
  };

  const openEditPark = async (park) => {
    setErrorMessage("");
    setFormError("");

    try {
      const response = await apiFetch(`/parks/${park.id}`);
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload?.message || "Unable to fetch selected park.");
      }

      const selectedPark = normalizePark(extractSingle(payload));
      setEditingParkId(selectedPark.id);
      setNewPark({
        name: selectedPark.name,
        region: selectedPark.region,
        status: selectedPark.status,
      });
      setIsModalOpen(true);
    } catch (error) {
      setErrorMessage(error.message || "Unable to open park details.");
    }
  };

  const handleSavePark = async (event) => {
    event.preventDefault();

    if (!newPark.name || !newPark.region) {
      setFormError("Please fill Park and Region.");
      return;
    }

    setIsSaving(true);
    setFormError("");
    setErrorMessage("");

    try {
      const body = {
        name: newPark.name.trim(),
        region: newPark.region.trim(),
        status: newPark.status,
      };

      const response = editingParkId
        ? await apiFetch(`/parks/${editingParkId}`, {
            method: "PUT",
            body,
          })
        : await apiFetch("/parks", {
            method: "POST",
            body,
          });

      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload?.message || "Unable to save park.");
      }

      const savedPark = normalizePark(extractSingle(payload));

      if (editingParkId) {
        setParks((current) =>
          current.map((park) => (park.id === editingParkId ? savedPark : park)),
        );
      } else {
        setParks((current) => [savedPark, ...current]);
      }

      setIsModalOpen(false);
      await Swal.fire({
        title: editingParkId ? "Updated" : "Created",
        text: editingParkId
          ? "Park updated successfully."
          : "Park created successfully.",
        icon: "success",
        timer: 1800,
        showConfirmButton: false,
        background: "#0f172a",
        color: "#e2e8f0",
      });
    } catch (error) {
      setFormError(error.message || "Failed to save park.");
      await Swal.fire({
        title: "Save Failed",
        text: error.message || "Failed to save park.",
        icon: "error",
        background: "#0f172a",
        color: "#e2e8f0",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeletePark = async (id) => {
    setErrorMessage("");
    const confirmation = await Swal.fire({
      title: "Delete park?",
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
      const response = await apiFetch(`/parks/${id}`, { method: "DELETE" });

      if (!response.ok) {
        const payload = await response.json();
        throw new Error(payload?.message || "Unable to delete park.");
      }

      setParks((current) => current.filter((park) => park.id !== id));
      await Swal.fire({
        title: "Deleted",
        text: "Park deleted successfully.",
        icon: "success",
        timer: 1800,
        showConfirmButton: false,
        background: "#0f172a",
        color: "#e2e8f0",
      });
    } catch (error) {
      setErrorMessage(error.message || "Failed to delete park.");
      await Swal.fire({
        title: "Delete Failed",
        text: error.message || "Failed to delete park.",
        icon: "error",
        background: "#0f172a",
        color: "#e2e8f0",
      });
    }
  };

  const openAddRateModal = () => {
    setRateError("");
    setEditingRateId(null);
    setNewRate(createRateState(parks[0]?.id ? String(parks[0].id) : ""));
    setIsRateModalOpen(true);
  };

  const openEditRate = async (row) => {
    setRateError("");

    try {
      const response = await apiFetch(`/park-rates/${row.id}`);
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload?.message || "Unable to fetch selected rate.");
      }

      const selectedRate = normalizeParkRate(extractRateSingle(payload));
      setEditingRateId(selectedRate.id);
      setNewRate({
        park_id: String(selectedRate.park_id),
        type: selectedRate.type,
        category: selectedRate.category,
        rate: String(selectedRate.rate),
      });
      setIsRateModalOpen(true);
    } catch (error) {
      setRateError(error.message || "Unable to open rate details.");
    }
  };

  const handleSaveRate = async (event) => {
    event.preventDefault();

    if (
      !newRate.park_id ||
      !newRate.type ||
      !newRate.category ||
      !newRate.rate
    ) {
      setRateError("Please fill park_id, type, category, and rate.");
      return;
    }

    const rateValue = Number(newRate.rate);
    if (Number.isNaN(rateValue) || rateValue < 0) {
      setRateError("Rate must be a valid positive number.");
      return;
    }

    setIsRateSaving(true);
    setRateError("");

    try {
      const body = {
        park_id: Number(newRate.park_id),
        type: newRate.type,
        category: newRate.category,
        rate: rateValue,
      };

      const response = editingRateId
        ? await apiFetch(`/park-rates/${editingRateId}`, {
            method: "PUT",
            body,
          })
        : await apiFetch("/park-rates", {
            method: "POST",
            body,
          });

      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload?.message || "Unable to save park rate.");
      }

      setIsRateModalOpen(false);
      await loadParkRates(selectedRateParkId);
      await Swal.fire({
        title: editingRateId ? "Updated" : "Created",
        text: editingRateId
          ? "Park rate updated successfully."
          : "Park rate created successfully.",
        icon: "success",
        timer: 1800,
        showConfirmButton: false,
        background: "#0f172a",
        color: "#e2e8f0",
      });
    } catch (error) {
      setRateError(error.message || "Failed to save park rate.");
      await Swal.fire({
        title: "Save Failed",
        text: error.message || "Failed to save park rate.",
        icon: "error",
        background: "#0f172a",
        color: "#e2e8f0",
      });
    } finally {
      setIsRateSaving(false);
    }
  };

  const handleDeleteRate = async (id) => {
    setRateError("");
    const confirmation = await Swal.fire({
      title: "Delete rate?",
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
      const response = await apiFetch(`/park-rates/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const payload = await response.json();
        throw new Error(payload?.message || "Unable to delete park rate.");
      }

      await loadParkRates(selectedRateParkId);
      await Swal.fire({
        title: "Deleted",
        text: "Park rate deleted successfully.",
        icon: "success",
        timer: 1800,
        showConfirmButton: false,
        background: "#0f172a",
        color: "#e2e8f0",
      });
    } catch (error) {
      setRateError(error.message || "Failed to delete park rate.");
      await Swal.fire({
        title: "Delete Failed",
        text: error.message || "Failed to delete park rate.",
        icon: "error",
        background: "#0f172a",
        color: "#e2e8f0",
      });
    }
  };

  const openAddConcessionModal = () => {
    setConcessionError("");
    setEditingConcessionId(null);
    setNewConcessionRate(
      createConcessionRateState(parks[0]?.id ? String(parks[0].id) : ""),
    );
    setIsConcessionModalOpen(true);
  };

  const openEditConcessionRate = async (row) => {
    setConcessionError("");

    try {
      const response = await apiFetch(`/concession-rates/${row.id}`);
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(
          payload?.message || "Unable to fetch selected concession rate.",
        );
      }

      const selectedRate = normalizeConcessionRate(
        extractConcessionSingle(payload),
      );
      setEditingConcessionId(selectedRate.id);
      setNewConcessionRate({
        park_id: String(selectedRate.park_id),
        type: selectedRate.type,
        category: selectedRate.category,
        rate: String(selectedRate.rate),
      });
      setIsConcessionModalOpen(true);
    } catch (error) {
      setConcessionError(error.message || "Unable to open concession details.");
    }
  };

  const handleSaveConcessionRate = async (event) => {
    event.preventDefault();

    if (
      !newConcessionRate.park_id ||
      !newConcessionRate.type ||
      !newConcessionRate.category ||
      !newConcessionRate.rate
    ) {
      setConcessionError("Please fill park_id, type, category, and rate.");
      return;
    }

    const rateValue = Number(newConcessionRate.rate);
    if (Number.isNaN(rateValue) || rateValue < 0) {
      setConcessionError("Rate must be a valid positive number.");
      return;
    }

    setIsConcessionSaving(true);
    setConcessionError("");

    try {
      const body = {
        park_id: Number(newConcessionRate.park_id),
        type: newConcessionRate.type,
        category: newConcessionRate.category,
        rate: rateValue,
      };

      const response = editingConcessionId
        ? await apiFetch(`/concession-rates/${editingConcessionId}`, {
            method: "PUT",
            body,
          })
        : await apiFetch("/concession-rates", {
            method: "POST",
            body,
          });

      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload?.message || "Unable to save concession rate.");
      }

      setIsConcessionModalOpen(false);
      await loadConcessionRates(selectedConcessionParkId);
      await Swal.fire({
        title: editingConcessionId ? "Updated" : "Created",
        text: editingConcessionId
          ? "Concession rate updated successfully."
          : "Concession rate created successfully.",
        icon: "success",
        timer: 1800,
        showConfirmButton: false,
        background: "#0f172a",
        color: "#e2e8f0",
      });
    } catch (error) {
      setConcessionError(error.message || "Failed to save concession rate.");
      await Swal.fire({
        title: "Save Failed",
        text: error.message || "Failed to save concession rate.",
        icon: "error",
        background: "#0f172a",
        color: "#e2e8f0",
      });
    } finally {
      setIsConcessionSaving(false);
    }
  };

  const handleDeleteConcessionRate = async (id) => {
    setConcessionError("");
    const confirmation = await Swal.fire({
      title: "Delete concession rate?",
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
      const response = await apiFetch(`/concession-rates/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const payload = await response.json();
        throw new Error(
          payload?.message || "Unable to delete concession rate.",
        );
      }

      await loadConcessionRates(selectedConcessionParkId);
      await Swal.fire({
        title: "Deleted",
        text: "Concession rate deleted successfully.",
        icon: "success",
        timer: 1800,
        showConfirmButton: false,
        background: "#0f172a",
        color: "#e2e8f0",
      });
    } catch (error) {
      setConcessionError(error.message || "Failed to delete concession rate.");
      await Swal.fire({
        title: "Delete Failed",
        text: error.message || "Failed to delete concession rate.",
        icon: "error",
        background: "#0f172a",
        color: "#e2e8f0",
      });
    }
  };

  const openAddTransportModal = () => {
    setTransportError("");
    setEditingTransportId(null);
    setNewTransportRate(createTransportRateState());
    setIsTransportModalOpen(true);
  };

  const openEditTransportRate = async (row) => {
    setTransportError("");

    try {
      const response = await apiFetch(`/transport-rates/${row.id}`);
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(
          payload?.message || "Unable to fetch selected transport rate.",
        );
      }

      const selectedRate = normalizeTransportRate(
        extractTransportSingle(payload),
      );
      setEditingTransportId(selectedRate.id);
      setNewTransportRate({
        particular: selectedRate.particular,
        rate: String(selectedRate.rate),
      });
      setIsTransportModalOpen(true);
    } catch (error) {
      setTransportError(error.message || "Unable to open transport details.");
    }
  };

  const handleSaveTransportRate = async (event) => {
    event.preventDefault();

    if (!newTransportRate.particular || !newTransportRate.rate) {
      setTransportError("Please fill Particular and Rate.");
      return;
    }

    const rateValue = Number(newTransportRate.rate);
    if (Number.isNaN(rateValue) || rateValue < 0) {
      setTransportError("Rate must be a valid positive number.");
      return;
    }

    setIsTransportSaving(true);
    setTransportError("");

    try {
      const body = {
        particular: newTransportRate.particular.trim(),
        rate: rateValue,
      };

      const response = editingTransportId
        ? await apiFetch(`/transport-rates/${editingTransportId}`, {
            method: "PUT",
            body,
          })
        : await apiFetch("/transport-rates", {
            method: "POST",
            body,
          });

      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload?.message || "Unable to save transport rate.");
      }

      setIsTransportModalOpen(false);
      await loadTransportRates();
      await Swal.fire({
        title: editingTransportId ? "Updated" : "Created",
        text: editingTransportId
          ? "Transport rate updated successfully."
          : "Transport rate created successfully.",
        icon: "success",
        timer: 1800,
        showConfirmButton: false,
        background: "#0f172a",
        color: "#e2e8f0",
      });
    } catch (error) {
      setTransportError(error.message || "Failed to save transport rate.");
      await Swal.fire({
        title: "Save Failed",
        text: error.message || "Failed to save transport rate.",
        icon: "error",
        background: "#0f172a",
        color: "#e2e8f0",
      });
    } finally {
      setIsTransportSaving(false);
    }
  };

  const handleDeleteTransportRate = async (id) => {
    setTransportError("");
    const confirmation = await Swal.fire({
      title: "Delete transport rate?",
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
      const response = await apiFetch(`/transport-rates/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const payload = await response.json();
        throw new Error(payload?.message || "Unable to delete transport rate.");
      }

      await loadTransportRates();
      await Swal.fire({
        title: "Deleted",
        text: "Transport rate deleted successfully.",
        icon: "success",
        timer: 1800,
        showConfirmButton: false,
        background: "#0f172a",
        color: "#e2e8f0",
      });
    } catch (error) {
      setTransportError(error.message || "Failed to delete transport rate.");
      await Swal.fire({
        title: "Delete Failed",
        text: error.message || "Failed to delete transport rate.",
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
          <h1 className="text-2xl font-bold text-white">Parks</h1>
          <p className="text-slate-400 mt-1">
            Manage park destinations, access status, and concession rates.
          </p>
        </div>
        <button
          onClick={openAddModal}
          className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-amber-400 to-amber-600 text-white rounded-xl font-medium text-sm hover:opacity-90 transition-opacity shadow-lg shadow-amber-500/25"
        >
          <Plus className="w-4 h-4" />
          Add Park
        </button>
      </div>

      {errorMessage && (
        <div className="bg-red-500/10 border border-red-500/30 text-red-300 rounded-xl px-4 py-3 text-sm">
          {errorMessage}
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-900/50 backdrop-blur border border-slate-800/50 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-400 text-sm">Total Parks</p>
              <p className="text-2xl font-bold text-white mt-1">{totals.all}</p>
            </div>
            <div className="p-3 bg-blue-500/10 rounded-xl">
              <Trees className="w-6 h-6 text-blue-400" />
            </div>
          </div>
        </div>

        <div className="bg-slate-900/50 backdrop-blur border border-slate-800/50 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-400 text-sm">Active</p>
              <p className="text-2xl font-bold text-green-400 mt-1">
                {totals.active}
              </p>
            </div>
            <div className="p-3 bg-green-500/10 rounded-xl">
              <ShieldCheck className="w-6 h-6 text-green-400" />
            </div>
          </div>
        </div>

        <div className="bg-slate-900/50 backdrop-blur border border-slate-800/50 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-400 text-sm">Seasonal</p>
              <p className="text-2xl font-bold text-amber-400 mt-1">
                {totals.seasonal}
              </p>
            </div>
            <div className="p-3 bg-amber-500/10 rounded-xl">
              <Truck className="w-6 h-6 text-amber-400" />
            </div>
          </div>
        </div>

        <div className="bg-slate-900/50 backdrop-blur border border-slate-800/50 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-400 text-sm">Restricted</p>
              <p className="text-2xl font-bold text-red-400 mt-1">
                {totals.restricted}
              </p>
            </div>
            <div className="p-3 bg-red-500/10 rounded-xl">
              <AlertTriangle className="w-6 h-6 text-red-400" />
            </div>
          </div>
        </div>
      </div>

      <div className="bg-slate-900/50 backdrop-blur border border-slate-800/50 rounded-2xl p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 flex items-center gap-3 bg-slate-800/50 rounded-xl px-4 py-2.5 border border-slate-700/50 focus-within:border-amber-500/50 transition-colors">
            <Search className="w-5 h-5 text-slate-500" />
            <input
              type="text"
              placeholder="Search by park or region..."
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              className="bg-transparent border-none outline-none text-sm text-slate-300 placeholder-slate-500 w-full"
            />
          </div>

          <div className="flex flex-wrap gap-2">
            {["All", "Active", "Seasonal", "Restricted"].map((status) => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`px-3 py-2 rounded-xl text-sm font-medium transition-all ${
                  statusFilter === status
                    ? "bg-amber-500 text-white"
                    : "bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700"
                }`}
              >
                {status}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-slate-900/50 backdrop-blur border border-slate-800/50 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-800">
                {["Park", "Region", "Status", "Actions"].map((header) => (
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
              {filteredParks.map((park) => (
                <tr
                  key={park.id}
                  className="border-b border-slate-800/50 hover:bg-slate-800/20 transition-colors"
                >
                  <td className="py-4 px-6">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
                        <MapPin className="w-4 h-4 text-blue-400" />
                      </div>
                      <span className="text-white font-medium text-sm">
                        {park.name}
                      </span>
                    </div>
                  </td>
                  <td className="py-4 px-6 text-sm text-slate-300">
                    {park.region}
                  </td>
                  <td className="py-4 px-6">
                    <span
                      className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium border ${statusStyles[park.status] || "bg-slate-500/20 text-slate-300 border-slate-500/30"}`}
                    >
                      {park.status}
                    </span>
                  </td>
                  <td className="py-4 px-6">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => openEditPark(park)}
                        className="p-2 rounded-lg bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 transition-colors"
                        title="Edit park"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeletePark(park.id)}
                        className="p-2 rounded-lg bg-red-500/10 text-red-300 hover:text-red-200 hover:bg-red-500/20 transition-colors"
                        title="Delete park"
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
              Loading parks...
            </div>
          )}

          {!isLoading && filteredParks.length === 0 && (
            <div className="py-16 text-center text-slate-500">
              No parks found.
            </div>
          )}
        </div>
      </div>

      <div className="bg-slate-900/50 backdrop-blur border border-slate-800/50 rounded-2xl overflow-hidden">
        <div className="p-4 sm:p-6 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-white">Rates</h2>
            <p className="text-sm text-slate-400 mt-1">Park Fee Rates</p>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
            <select
              value={selectedRateParkId}
              onChange={(event) => setSelectedRateParkId(event.target.value)}
              className="bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
            >
              <option value="all">All Parks Rates</option>
              {parks.map((park) => (
                <option key={park.id} value={String(park.id)}>
                  {park.name}
                </option>
              ))}
            </select>

            <button
              onClick={openAddRateModal}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-xl font-medium text-sm hover:opacity-90 transition-opacity"
            >
              <Plus className="w-4 h-4" />
              Add Rate
            </button>
          </div>
        </div>

        {rateError && (
          <div className="mx-4 sm:mx-6 mt-4 bg-red-500/10 border border-red-500/30 text-red-300 rounded-xl px-4 py-3 text-sm">
            {rateError}
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-800">
                {["Park", "type", "category", "rate", "Actions"].map(
                  (header) => (
                    <th
                      key={header}
                      className="text-left py-4 px-6 text-sm font-semibold text-slate-400"
                    >
                      {header}
                    </th>
                  ),
                )}
              </tr>
            </thead>
            <tbody>
              {parkFeeRates.map((row) => (
                <tr
                  key={row.id}
                  className="border-b border-slate-800/50 hover:bg-slate-800/20 transition-colors"
                >
                  <td className="py-4 px-6 text-sm text-white font-medium">
                    {parkNameById[row.park_id] ||
                      row.park_name ||
                      "Unknown Park"}
                  </td>
                  <td className="py-4 px-6 text-sm text-slate-300">
                    {row.type}
                  </td>
                  <td className="py-4 px-6 text-sm text-slate-300">
                    {row.category}
                  </td>
                  <td className="py-4 px-6 text-sm text-slate-300">
                    USD {row.rate.toLocaleString()}
                  </td>
                  <td className="py-4 px-6">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => openEditRate(row)}
                        className="p-2 rounded-lg bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 transition-colors"
                        title="Edit rate"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteRate(row.id)}
                        className="p-2 rounded-lg bg-red-500/10 text-red-300 hover:text-red-200 hover:bg-red-500/20 transition-colors"
                        title="Delete rate"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {isRatesLoading && (
            <div className="py-10 text-center text-slate-500">
              Loading park rates...
            </div>
          )}

          {!isRatesLoading && parkFeeRates.length === 0 && (
            <div className="py-10 text-center text-slate-500">
              No park fee rates found.
            </div>
          )}
        </div>
      </div>

      <div className="bg-slate-900/50 backdrop-blur border border-slate-800/50 rounded-2xl overflow-hidden">
        <div className="p-4 sm:p-6 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-white">
              Concession Rates
            </h2>
            <p className="text-sm text-slate-400 mt-1">
              Rates for resident and non-resident categories.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
            <select
              value={selectedConcessionParkId}
              onChange={(event) =>
                setSelectedConcessionParkId(event.target.value)
              }
              className="bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500"
            >
              <option value="all">All Concession Rates</option>
              {parks.map((park) => (
                <option key={park.id} value={String(park.id)}>
                  {park.name}
                </option>
              ))}
            </select>

            <button
              onClick={openAddConcessionModal}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-cyan-600 to-sky-600 text-white rounded-xl font-medium text-sm hover:opacity-90 transition-opacity"
            >
              <Plus className="w-4 h-4" />
              Add Concession Rate
            </button>
          </div>
        </div>

        {concessionError && (
          <div className="mx-4 sm:mx-6 mt-4 bg-red-500/10 border border-red-500/30 text-red-300 rounded-xl px-4 py-3 text-sm">
            {concessionError}
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-800">
                {["Park", "type", "category", "rate", "Actions"].map(
                  (header) => (
                    <th
                      key={header}
                      className="text-left py-4 px-6 text-sm font-semibold text-slate-400"
                    >
                      {header}
                    </th>
                  ),
                )}
              </tr>
            </thead>
            <tbody>
              {concessionRates.map((row) => (
                <tr
                  key={row.id}
                  className="border-b border-slate-800/50 hover:bg-slate-800/20 transition-colors"
                >
                  <td className="py-4 px-6 text-sm text-white font-medium">
                    {parkNameById[row.park_id] ||
                      row.park_name ||
                      "Unknown Park"}
                  </td>
                  <td className="py-4 px-6 text-sm text-slate-300">
                    {row.type}
                  </td>
                  <td className="py-4 px-6 text-sm text-slate-300">
                    {row.category}
                  </td>
                  <td className="py-4 px-6 text-sm text-slate-300">
                    USD {row.rate.toLocaleString()}
                  </td>
                  <td className="py-4 px-6">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => openEditConcessionRate(row)}
                        className="p-2 rounded-lg bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 transition-colors"
                        title="Edit concession rate"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteConcessionRate(row.id)}
                        className="p-2 rounded-lg bg-red-500/10 text-red-300 hover:text-red-200 hover:bg-red-500/20 transition-colors"
                        title="Delete concession rate"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {isConcessionLoading && (
            <div className="py-10 text-center text-slate-500">
              Loading concession rates...
            </div>
          )}

          {!isConcessionLoading && concessionRates.length === 0 && (
            <div className="py-10 text-center text-slate-500">
              No concession rates found.
            </div>
          )}
        </div>
      </div>

      <div className="bg-slate-900/50 backdrop-blur border border-slate-800/50 rounded-2xl overflow-hidden">
        <div className="p-4 sm:p-6 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-white">
              Transport Rates
            </h2>
            <p className="text-sm text-slate-400 mt-1">
              Standard transport pricing by service particular.
            </p>
          </div>
          <button
            onClick={openAddTransportModal}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-violet-600 to-indigo-600 text-white rounded-xl font-medium text-sm hover:opacity-90 transition-opacity"
          >
            <Plus className="w-4 h-4" />
            Add Transport Rate
          </button>
        </div>

        {transportError && (
          <div className="mx-4 sm:mx-6 mt-4 bg-red-500/10 border border-red-500/30 text-red-300 rounded-xl px-4 py-3 text-sm">
            {transportError}
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-800">
                {["Particular", "Rate", "Actions"].map((header) => (
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
              {transportRates.map((row) => (
                <tr
                  key={row.id}
                  className="border-b border-slate-800/50 hover:bg-slate-800/20 transition-colors"
                >
                  <td className="py-4 px-6 text-sm text-white font-medium">
                    {row.particular}
                  </td>
                  <td className="py-4 px-6 text-sm text-slate-300">
                    USD {row.rate.toLocaleString()}
                  </td>
                  <td className="py-4 px-6">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => openEditTransportRate(row)}
                        className="p-2 rounded-lg bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 transition-colors"
                        title="Edit transport rate"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteTransportRate(row.id)}
                        className="p-2 rounded-lg bg-red-500/10 text-red-300 hover:text-red-200 hover:bg-red-500/20 transition-colors"
                        title="Delete transport rate"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {isTransportLoading && (
            <div className="py-10 text-center text-slate-500">
              Loading transport rates...
            </div>
          )}

          {!isTransportLoading && transportRates.length === 0 && (
            <div className="py-10 text-center text-slate-500">
              No transport rates found.
            </div>
          )}
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl">
            <div className="flex items-center justify-between p-6 border-b border-slate-800">
              <div>
                <h2 className="text-xl font-bold text-white">
                  {editingParkId ? "Edit Park" : "Add Park"}
                </h2>
                <p className="text-sm text-slate-400 mt-1">
                  {editingParkId
                    ? "Update park destination details."
                    : "Create a new park destination."}
                </p>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSavePark} className="p-6 space-y-4">
              {formError && (
                <div className="bg-red-500/10 border border-red-500/30 text-red-300 rounded-xl px-4 py-3 text-sm">
                  {formError}
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Park Name
                  </label>
                  <input
                    type="text"
                    value={newPark.name}
                    onChange={(event) =>
                      setNewPark((current) => ({
                        ...current,
                        name: event.target.value,
                      }))
                    }
                    placeholder="Serengeti National Park"
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Region
                  </label>
                  <input
                    type="text"
                    value={newPark.region}
                    onChange={(event) =>
                      setNewPark((current) => ({
                        ...current,
                        region: event.target.value,
                      }))
                    }
                    placeholder="Arusha"
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Status
                  </label>
                  <select
                    value={newPark.status}
                    onChange={(event) =>
                      setNewPark((current) => ({
                        ...current,
                        status: event.target.value,
                      }))
                    }
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-amber-500"
                  >
                    <option value="Active">Active</option>
                    <option value="Seasonal">Seasonal</option>
                    <option value="Restricted">Restricted</option>
                  </select>
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-6 py-2.5 bg-slate-800 text-slate-300 rounded-xl hover:bg-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-6 py-2.5 bg-gradient-to-r from-amber-400 to-amber-600 text-white rounded-xl hover:opacity-90"
                >
                  {isSaving
                    ? "Saving..."
                    : editingParkId
                      ? "Update Park"
                      : "Save Park"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isRateModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-xl">
            <div className="flex items-center justify-between p-6 border-b border-slate-800">
              <div>
                <h2 className="text-xl font-bold text-white">
                  {editingRateId ? "Edit Park Fee Rate" : "Add Park Fee Rate"}
                </h2>
                <p className="text-sm text-slate-400 mt-1">
                  {editingRateId
                    ? "Update a Park Fee Rates record."
                    : "Create a Park Fee Rates record."}
                </p>
              </div>
              <button
                onClick={() => setIsRateModalOpen(false)}
                className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveRate} className="p-6 space-y-4">
              {rateError && (
                <div className="bg-red-500/10 border border-red-500/30 text-red-300 rounded-xl px-4 py-3 text-sm">
                  {rateError}
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    park_id
                  </label>
                  <select
                    value={newRate.park_id}
                    onChange={(event) =>
                      setNewRate((current) => ({
                        ...current,
                        park_id: event.target.value,
                      }))
                    }
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-amber-500"
                  >
                    {parks.length === 0 && (
                      <option value="">No parks available</option>
                    )}
                    {parks.map((park) => (
                      <option key={park.id} value={String(park.id)}>
                        {park.id} - {park.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    type
                  </label>
                  <select
                    value={newRate.type}
                    onChange={(event) =>
                      setNewRate((current) => ({
                        ...current,
                        type: event.target.value,
                      }))
                    }
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-amber-500"
                  >
                    <option value="resident">resident</option>
                    <option value="non-resident">non-resident</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    category
                  </label>
                  <select
                    value={newRate.category}
                    onChange={(event) =>
                      setNewRate((current) => ({
                        ...current,
                        category: event.target.value,
                      }))
                    }
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-amber-500"
                  >
                    <option value="adult">adult</option>
                    <option value="child">child</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    rate
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={newRate.rate}
                    onChange={(event) =>
                      setNewRate((current) => ({
                        ...current,
                        rate: event.target.value,
                      }))
                    }
                    placeholder="Enter rate"
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsRateModalOpen(false)}
                  className="px-6 py-2.5 bg-slate-800 text-slate-300 rounded-xl hover:bg-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isRateSaving}
                  className="px-6 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-xl hover:opacity-90"
                >
                  {isRateSaving
                    ? "Saving..."
                    : editingRateId
                      ? "Update Rate"
                      : "Save Rate"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isConcessionModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-xl">
            <div className="flex items-center justify-between p-6 border-b border-slate-800">
              <div>
                <h2 className="text-xl font-bold text-white">
                  {editingConcessionId
                    ? "Edit Concession Rate"
                    : "Add Concession Rate"}
                </h2>
                <p className="text-sm text-slate-400 mt-1">
                  {editingConcessionId
                    ? "Update a Concession Rates record."
                    : "Create a Concession Rates record."}
                </p>
              </div>
              <button
                onClick={() => setIsConcessionModalOpen(false)}
                className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveConcessionRate} className="p-6 space-y-4">
              {concessionError && (
                <div className="bg-red-500/10 border border-red-500/30 text-red-300 rounded-xl px-4 py-3 text-sm">
                  {concessionError}
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    park_id
                  </label>
                  <select
                    value={newConcessionRate.park_id}
                    onChange={(event) =>
                      setNewConcessionRate((current) => ({
                        ...current,
                        park_id: event.target.value,
                      }))
                    }
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-amber-500"
                  >
                    {parks.length === 0 && (
                      <option value="">No parks available</option>
                    )}
                    {parks.map((park) => (
                      <option key={park.id} value={String(park.id)}>
                        {park.id} - {park.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    type
                  </label>
                  <select
                    value={newConcessionRate.type}
                    onChange={(event) =>
                      setNewConcessionRate((current) => ({
                        ...current,
                        type: event.target.value,
                      }))
                    }
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-amber-500"
                  >
                    <option value="resident">resident</option>
                    <option value="non-resident">non-resident</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    category
                  </label>
                  <select
                    value={newConcessionRate.category}
                    onChange={(event) =>
                      setNewConcessionRate((current) => ({
                        ...current,
                        category: event.target.value,
                      }))
                    }
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-amber-500"
                  >
                    <option value="adult">adult</option>
                    <option value="child">child</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    rate
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={newConcessionRate.rate}
                    onChange={(event) =>
                      setNewConcessionRate((current) => ({
                        ...current,
                        rate: event.target.value,
                      }))
                    }
                    placeholder="Enter rate"
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsConcessionModalOpen(false)}
                  className="px-6 py-2.5 bg-slate-800 text-slate-300 rounded-xl hover:bg-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isConcessionSaving}
                  className="px-6 py-2.5 bg-gradient-to-r from-cyan-600 to-sky-600 text-white rounded-xl hover:opacity-90"
                >
                  {isConcessionSaving
                    ? "Saving..."
                    : editingConcessionId
                      ? "Update Concession Rate"
                      : "Save Concession Rate"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isTransportModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-xl">
            <div className="flex items-center justify-between p-6 border-b border-slate-800">
              <div>
                <h2 className="text-xl font-bold text-white">
                  {editingTransportId
                    ? "Edit Transport Rate"
                    : "Add Transport Rate"}
                </h2>
                <p className="text-sm text-slate-400 mt-1">
                  {editingTransportId
                    ? "Update a Transport Rates record."
                    : "Create a Transport Rates record."}
                </p>
              </div>
              <button
                onClick={() => setIsTransportModalOpen(false)}
                className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveTransportRate} className="p-6 space-y-4">
              {transportError && (
                <div className="bg-red-500/10 border border-red-500/30 text-red-300 rounded-xl px-4 py-3 text-sm">
                  {transportError}
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Particular
                  </label>
                  <input
                    type="text"
                    value={newTransportRate.particular}
                    onChange={(event) =>
                      setNewTransportRate((current) => ({
                        ...current,
                        particular: event.target.value,
                      }))
                    }
                    placeholder="e.g. Land Cruiser Day Trip"
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Rate
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={newTransportRate.rate}
                    onChange={(event) =>
                      setNewTransportRate((current) => ({
                        ...current,
                        rate: event.target.value,
                      }))
                    }
                    placeholder="Enter rate"
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsTransportModalOpen(false)}
                  className="px-6 py-2.5 bg-slate-800 text-slate-300 rounded-xl hover:bg-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isTransportSaving}
                  className="px-6 py-2.5 bg-gradient-to-r from-violet-600 to-indigo-600 text-white rounded-xl hover:opacity-90"
                >
                  {isTransportSaving
                    ? "Saving..."
                    : editingTransportId
                      ? "Update Transport Rate"
                      : "Save Transport Rate"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
