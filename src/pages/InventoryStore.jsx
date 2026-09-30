import { useEffect, useMemo, useRef, useState } from "react";
import {
  AlertCircle,
  ArrowDownUp,
  Loader,
  Package,
  Pencil,
  Plus,
  Search,
  Trash2,
  Warehouse,
  X,
} from "lucide-react";
import Swal from "sweetalert2";
import { apiFetch } from "../utils/api";

const emptyCategoryForm = {
  name: "",
  description: "",
};

const emptyCategoryEditForm = {
  id: null,
  name: "",
  description: "",
};

const emptyItemForm = {
  categoryId: "",
  name: "",
  sku: "",
  unit: "pcs",
  openingStock: "0",
  description: "",
};

const emptyMovementForm = {
  quantity: "",
  vehicleId: "",
  issuedToUserId: "",
  reference: "",
  notes: "",
  movementDate: "",
};

const parseJson = async (response) => response.json().catch(() => ({}));

const requestJson = async (url, options = {}) => {
  const response = await apiFetch(url, options);
  const payload = await parseJson(response);
  if (!response.ok) {
    const message =
      payload?.message ||
      (payload?.errors
        ? Object.values(payload.errors).flat().join("\n")
        : null) ||
      "Request failed.";
    throw new Error(message);
  }
  return payload;
};

const formatDateTime = (value) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString();
};

const formatQty = (value) => Number(value || 0).toLocaleString();

const formatBalanceTransition = (before, after) => {
  const beforeQty = formatQty(before);
  const afterQty = formatQty(after);
  return { beforeQty, afterQty };
};

const getTodayDateInput = () => {
  const now = new Date();
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
};

export default function InventoryStore() {
  const [loading, setLoading] = useState(true);
  const [savingCategory, setSavingCategory] = useState(false);
  const [savingCategoryEdit, setSavingCategoryEdit] = useState(false);
  const [savingItem, setSavingItem] = useState(false);
  const [savingMovement, setSavingMovement] = useState(false);

  const [categories, setCategories] = useState([]);
  const [items, setItems] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [movements, setMovements] = useState([]);

  const [categorySearch, setCategorySearch] = useState("All");
  const [itemSearch, setItemSearch] = useState("");
  const [movementTypeFilter, setMovementTypeFilter] = useState("All");
  const [movementSearch, setMovementSearch] = useState("");
  const [movementDateFrom, setMovementDateFrom] = useState("");
  const [movementDateTo, setMovementDateTo] = useState("");

  const [categoryForm, setCategoryForm] = useState(emptyCategoryForm);
  const [categoryEditForm, setCategoryEditForm] = useState(
    emptyCategoryEditForm,
  );
  const [itemForm, setItemForm] = useState(emptyItemForm);

  const [movementAction, setMovementAction] = useState("");
  const [selectedItem, setSelectedItem] = useState(null);
  const [movementForm, setMovementForm] = useState(emptyMovementForm);
  const movementFormRef = useRef(null);

  const [errorMessage, setErrorMessage] = useState("");
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [deletingCategoryId, setDeletingCategoryId] = useState(null);

  const loadAll = async () => {
    setLoading(true);
    setErrorMessage("");
    try {
      const [categoriesRes, itemsRes, movementsRes, vehiclesRes] =
        await Promise.all([
          requestJson("/inventory/categories"),
          requestJson("/inventory/items"),
          requestJson("/inventory/movements"),
          apiFetch("/vehicles").then((res) =>
            res.ok ? parseJson(res) : { vehicles: [] },
          ),
        ]);

      setCategories(categoriesRes?.categories || []);
      setItems(itemsRes?.items || []);
      setMovements(movementsRes?.movements || []);
      setVehicles(vehiclesRes?.vehicles || vehiclesRes?.data || []);
    } catch (error) {
      setErrorMessage(error.message || "Failed to load inventory module.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
  }, []);

  const filteredItems = useMemo(() => {
    const query = itemSearch.trim().toLowerCase();

    return items.filter((item) => {
      const inCategory =
        categorySearch === "All" ||
        Number(item.categoryId) === Number(categorySearch);
      if (!inCategory) return false;

      if (!query) return true;

      return [item.name, item.sku, item.categoryName, item.unit]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(query));
    });
  }, [items, categorySearch, itemSearch]);

  const filteredMovements = useMemo(() => {
    const query = movementSearch.trim().toLowerCase();

    return movements.filter((movement) => {
      if (
        movementTypeFilter !== "All" &&
        movement.movementType !== movementTypeFilter
      ) {
        return false;
      }

      const movementDateOnly =
        typeof movement.movementDate === "string"
          ? movement.movementDate.slice(0, 10)
          : "";

      if (
        movementDateFrom &&
        movementDateOnly &&
        movementDateOnly < movementDateFrom
      ) {
        return false;
      }
      if (
        movementDateTo &&
        movementDateOnly &&
        movementDateOnly > movementDateTo
      ) {
        return false;
      }

      if (!query) return true;

      return [
        movement.itemName,
        movement.categoryName,
        movement.reference,
        movement.createdByUserName,
        movement.vehicleNo,
        movement.vehiclePlateNo,
        movement.movementType,
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(query));
    });
  }, [
    movements,
    movementTypeFilter,
    movementSearch,
    movementDateFrom,
    movementDateTo,
  ]);

  const stats = useMemo(() => {
    const lowStock = items.filter((item) => item.isLowStock).length;
    return {
      categories: categories.length,
      items: items.length,
      lowStock,
      movements: movements.length,
    };
  }, [categories, items, movements]);

  const handleCreateCategory = async (event) => {
    event.preventDefault();
    const categoryName = categoryForm.name.trim();

    if (!categoryName) {
      Swal.fire("Validation", "Category name is required.", "warning");
      return;
    }

    setSavingCategory(true);

    try {
      await requestJson("/inventory/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: {
          name: categoryName,
          description: categoryForm.description,
          isActive: true,
        },
      });

      setCategoryForm(emptyCategoryForm);
      await loadAll();

      Swal.fire({
        icon: "success",
        title: "Category created",
        timer: 1200,
        showConfirmButton: false,
      });
    } catch (error) {
      Swal.fire(
        "Create Failed",
        error.message || "Unable to create category.",
        "error",
      );
    } finally {
      setSavingCategory(false);
    }
  };

  const handleCreateItem = async (event) => {
    event.preventDefault();
    setSavingItem(true);

    try {
      await requestJson("/inventory/items", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: {
          categoryId: Number(itemForm.categoryId),
          name: itemForm.name,
          sku: itemForm.sku || null,
          unit: itemForm.unit,
          reorderLevel: 0,
          openingStock: Number(itemForm.openingStock || 0),
          description: itemForm.description || null,
          isActive: true,
        },
      });

      setItemForm(emptyItemForm);
      await loadAll();

      Swal.fire({
        icon: "success",
        title: "Item created",
        timer: 1200,
        showConfirmButton: false,
      });
    } catch (error) {
      Swal.fire(
        "Create Failed",
        error.message || "Unable to create item.",
        "error",
      );
    } finally {
      setSavingItem(false);
    }
  };

  const openCategoryModal = () => {
    setCategoryEditForm(emptyCategoryEditForm);
    setIsCategoryModalOpen(true);
  };

  const closeCategoryModal = () => {
    if (savingCategoryEdit || deletingCategoryId) return;
    setIsCategoryModalOpen(false);
    setCategoryEditForm(emptyCategoryEditForm);
  };

  const startEditCategory = (category) => {
    setCategoryEditForm({
      id: category.id,
      name: category.name || "",
      description: category.description || "",
    });
  };

  const submitCategoryEdit = async (event) => {
    event.preventDefault();
    if (!categoryEditForm.id) return;

    const trimmedName = categoryEditForm.name.trim();
    if (!trimmedName) {
      Swal.fire("Validation", "Category name is required.", "warning");
      return;
    }

    setSavingCategoryEdit(true);
    try {
      await requestJson(`/inventory/categories/${categoryEditForm.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: {
          name: trimmedName,
          description: categoryEditForm.description || null,
        },
      });

      await loadAll();
      setCategoryEditForm(emptyCategoryEditForm);
      Swal.fire({
        icon: "success",
        title: "Category updated",
        timer: 1200,
        showConfirmButton: false,
      });
    } catch (error) {
      Swal.fire(
        "Update Failed",
        error.message || "Unable to update category.",
        "error",
      );
    } finally {
      setSavingCategoryEdit(false);
    }
  };

  const handleDeleteCategory = async (category) => {
    const confirmation = await Swal.fire({
      icon: "warning",
      title: "Delete category?",
      text: `This will delete ${category.name}.`,
      showCancelButton: true,
      confirmButtonText: "Delete",
      confirmButtonColor: "#dc2626",
    });

    if (!confirmation.isConfirmed) return;

    setDeletingCategoryId(category.id);
    try {
      await requestJson(`/inventory/categories/${category.id}`, {
        method: "DELETE",
      });
      await loadAll();
      if (Number(categoryEditForm.id) === Number(category.id)) {
        setCategoryEditForm(emptyCategoryEditForm);
      }
      Swal.fire({
        icon: "success",
        title: "Category deleted",
        timer: 1200,
        showConfirmButton: false,
      });
    } catch (error) {
      Swal.fire(
        "Delete Failed",
        error.message || "Unable to delete category.",
        "error",
      );
    } finally {
      setDeletingCategoryId(null);
    }
  };

  const openMovementForm = (item, action) => {
    setSelectedItem(item);
    setMovementAction(action);
    setMovementForm({
      ...emptyMovementForm,
      movementDate: getTodayDateInput(),
    });
  };

  const closeMovementForm = () => {
    setSelectedItem(null);
    setMovementAction("");
    setMovementForm(emptyMovementForm);
  };

  useEffect(() => {
    if (!selectedItem || !movementAction || !movementFormRef.current) return;
    movementFormRef.current.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  }, [selectedItem, movementAction]);

  const submitMovement = async (event) => {
    event.preventDefault();
    if (!selectedItem || !movementAction) return;

    const quantity = Number(movementForm.quantity || 0);
    const availableStock = Number(selectedItem.currentStock || 0);

    if (!Number.isFinite(quantity) || quantity <= 0) {
      Swal.fire("Validation", "Quantity must be greater than zero.", "warning");
      return;
    }

    if (movementAction === "OUT" && quantity > availableStock) {
      Swal.fire(
        "Insufficient Stock",
        `Cannot issue ${formatQty(quantity)} when only ${formatQty(availableStock)} is available.`,
        "warning",
      );
      return;
    }

    setSavingMovement(true);

    try {
      const endpoint =
        movementAction === "IN"
          ? `/inventory/items/${selectedItem.id}/stock-in`
          : `/inventory/items/${selectedItem.id}/issue`;

      await requestJson(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: {
          quantity,
          vehicleId: movementForm.vehicleId
            ? Number(movementForm.vehicleId)
            : null,
          issuedToUserId: movementForm.issuedToUserId
            ? Number(movementForm.issuedToUserId)
            : null,
          reference: movementForm.reference || null,
          notes: movementForm.notes || null,
          movementDate: movementForm.movementDate || null,
        },
      });

      closeMovementForm();
      await loadAll();

      Swal.fire({
        icon: "success",
        title: movementAction === "IN" ? "Stock added" : "Item issued",
        timer: 1200,
        showConfirmButton: false,
      });
    } catch (error) {
      Swal.fire(
        "Update Failed",
        error.message || "Unable to update stock.",
        "error",
      );
    } finally {
      setSavingMovement(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader className="h-8 w-8 animate-spin text-slate-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Store Inventory</h1>
          <p className="mt-1 text-sm text-slate-600">
            Manage categorized store items, add stock, issue to vehicles, and
            track all movements.
          </p>
        </div>
      </div>

      {errorMessage && (
        <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {errorMessage}
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-4">
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <p className="text-xs text-slate-500">Categories</p>
          <p className="mt-1 text-2xl font-bold text-slate-900">
            {stats.categories}
          </p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <p className="text-xs text-slate-500">Items</p>
          <p className="mt-1 text-2xl font-bold text-slate-900">
            {stats.items}
          </p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <p className="text-xs text-slate-500">Low Stock</p>
          <p className="mt-1 text-2xl font-bold text-rose-700">
            {stats.lowStock}
          </p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <p className="text-xs text-slate-500">Movements</p>
          <p className="mt-1 text-2xl font-bold text-slate-900">
            {stats.movements}
          </p>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <form
          onSubmit={handleCreateCategory}
          className="space-y-3 rounded-xl border border-slate-200 bg-white p-4"
        >
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-lg font-semibold text-slate-900">
              Add Category
            </h2>
            <button
              type="button"
              onClick={openCategoryModal}
              className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
            >
              View Categories
            </button>
          </div>
          <input
            type="text"
            required
            value={categoryForm.name}
            onChange={(event) =>
              setCategoryForm((prev) => ({ ...prev, name: event.target.value }))
            }
            placeholder="Category name"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
          <textarea
            rows={2}
            value={categoryForm.description}
            onChange={(event) =>
              setCategoryForm((prev) => ({
                ...prev,
                description: event.target.value,
              }))
            }
            placeholder="Description (optional)"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
          <button
            type="submit"
            disabled={savingCategory}
            className="mt-1 inline-flex w-full items-center justify-center gap-2 rounded-lg border border-blue-700 bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {savingCategory ? (
              <Loader className="h-4 w-4 animate-spin" />
            ) : (
              <Plus className="h-4 w-4" />
            )}
            Save Category
          </button>
        </form>

        <form
          onSubmit={handleCreateItem}
          className="space-y-3 rounded-xl border border-slate-200 bg-white p-4"
        >
          <h2 className="text-lg font-semibold text-slate-900">Add Item</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <select
              required
              value={itemForm.categoryId}
              onChange={(event) =>
                setItemForm((prev) => ({
                  ...prev,
                  categoryId: event.target.value,
                }))
              }
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
            >
              <option value="">Select category</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
            <input
              type="text"
              required
              value={itemForm.name}
              onChange={(event) =>
                setItemForm((prev) => ({ ...prev, name: event.target.value }))
              }
              placeholder="Item name"
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
            <input
              type="text"
              value={itemForm.sku}
              onChange={(event) =>
                setItemForm((prev) => ({ ...prev, sku: event.target.value }))
              }
              placeholder="SKU (optional)"
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
            <input
              type="text"
              required
              value={itemForm.unit}
              onChange={(event) =>
                setItemForm((prev) => ({ ...prev, unit: event.target.value }))
              }
              placeholder="Unit (pcs, litres, etc.)"
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
            <input
              type="number"
              min="0"
              step="0.01"
              value={itemForm.openingStock}
              onChange={(event) =>
                setItemForm((prev) => ({
                  ...prev,
                  openingStock: event.target.value,
                }))
              }
              placeholder="Opening stock"
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
          <textarea
            rows={2}
            value={itemForm.description}
            onChange={(event) =>
              setItemForm((prev) => ({
                ...prev,
                description: event.target.value,
              }))
            }
            placeholder="Description (optional)"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
          <button
            type="submit"
            disabled={savingItem}
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
          >
            {savingItem ? (
              <Loader className="h-4 w-4 animate-spin" />
            ) : (
              <Package className="h-4 w-4" />
            )}
            Save Item
          </button>
        </form>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <div className="mb-3 flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={itemSearch}
              onChange={(event) => setItemSearch(event.target.value)}
              placeholder="Search item, SKU, category"
              className="w-full rounded-lg border border-slate-300 py-2 pl-9 pr-3 text-sm"
            />
          </div>
          <select
            value={categorySearch}
            onChange={(event) => setCategorySearch(event.target.value)}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
          >
            <option value="All">All Categories</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-slate-500">
                <th className="px-2 py-2">Item</th>
                <th className="px-2 py-2">Category</th>
                <th className="px-2 py-2">Unit</th>
                <th className="px-2 py-2">Reorder</th>
                <th className="px-2 py-2">Current Stock</th>
                <th className="px-2 py-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredItems.map((item) => (
                <tr key={item.id} className="border-b border-slate-100">
                  <td className="px-2 py-2">
                    <p className="font-medium text-slate-800">{item.name}</p>
                    <p className="text-xs text-slate-500">
                      {item.sku || "No SKU"}
                    </p>
                  </td>
                  <td className="px-2 py-2 text-slate-700">
                    {item.categoryName}
                  </td>
                  <td className="px-2 py-2 text-slate-700">{item.unit}</td>
                  <td className="px-2 py-2 text-slate-700">
                    {formatQty(item.reorderLevel)}
                  </td>
                  <td className="px-2 py-2">
                    <span
                      className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${
                        item.isLowStock
                          ? "bg-rose-100 text-rose-700"
                          : "bg-emerald-100 text-emerald-700"
                      }`}
                    >
                      {formatQty(item.currentStock)}
                    </span>
                  </td>
                  <td className="px-2 py-2">
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => openMovementForm(item, "IN")}
                        className="rounded-md border border-emerald-200 bg-emerald-50 px-2 py-1 text-xs text-emerald-700"
                      >
                        Add Stock
                      </button>
                      <button
                        type="button"
                        onClick={() => openMovementForm(item, "OUT")}
                        className="rounded-md border border-amber-200 bg-amber-50 px-2 py-1 text-xs text-amber-700"
                      >
                        Issue
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredItems.length === 0 && (
                <tr>
                  <td
                    colSpan={6}
                    className="px-2 py-8 text-center text-slate-500"
                  >
                    No items found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {selectedItem && (
        <form
          ref={movementFormRef}
          onSubmit={submitMovement}
          className="space-y-3 rounded-xl border border-slate-200 bg-white p-4"
        >
          <h2 className="text-lg font-semibold text-slate-900">
            {movementAction === "IN" ? "Add Stock" : "Issue Item"}:{" "}
            {selectedItem.name}
          </h2>
          {movementAction === "OUT" && (
            <p className="text-sm text-amber-700">
              Available stock:{" "}
              <span className="font-semibold">
                {formatQty(selectedItem.currentStock)}
              </span>
            </p>
          )}
          <div className="grid gap-3 md:grid-cols-2">
            <input
              type="number"
              required
              min="0.01"
              max={
                movementAction === "OUT"
                  ? Number(selectedItem.currentStock || 0)
                  : undefined
              }
              step="0.01"
              value={movementForm.quantity}
              onChange={(event) =>
                setMovementForm((prev) => ({
                  ...prev,
                  quantity: event.target.value,
                }))
              }
              placeholder="Quantity"
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
            <select
              value={movementForm.vehicleId}
              onChange={(event) =>
                setMovementForm((prev) => ({
                  ...prev,
                  vehicleId: event.target.value,
                }))
              }
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
            >
              <option value="">Vehicle (optional)</option>
              {vehicles.map((vehicle) => (
                <option key={vehicle.id} value={vehicle.id}>
                  {vehicle.vehicleNo || vehicle.vehicle_no}{" "}
                  {vehicle.plateNo || vehicle.plate_no}
                </option>
              ))}
            </select>
            <input
              type="text"
              value={movementForm.reference}
              onChange={(event) =>
                setMovementForm((prev) => ({
                  ...prev,
                  reference: event.target.value,
                }))
              }
              placeholder="Reference (optional)"
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
            <input
              type="date"
              value={movementForm.movementDate}
              onChange={(event) =>
                setMovementForm((prev) => ({
                  ...prev,
                  movementDate: event.target.value,
                }))
              }
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
          <textarea
            rows={2}
            value={movementForm.notes}
            onChange={(event) =>
              setMovementForm((prev) => ({
                ...prev,
                notes: event.target.value,
              }))
            }
            placeholder="Notes"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
          <div className="flex flex-wrap gap-2">
            <button
              type="submit"
              disabled={savingMovement}
              className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-blue-700 bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
            >
              {savingMovement ? (
                <Loader className="h-4 w-4 animate-spin" />
              ) : (
                <Warehouse className="h-4 w-4" />
              )}
              Save Movement
            </button>
            <button
              type="button"
              onClick={closeMovementForm}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-700"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-slate-900">
            Movement History
          </h2>
          <div className="flex items-center gap-2">
            <ArrowDownUp className="h-4 w-4 text-slate-500" />
            <select
              value={movementTypeFilter}
              onChange={(event) => setMovementTypeFilter(event.target.value)}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
            >
              <option value="All">All Types</option>
              <option value="IN">Stock In</option>
              <option value="OUT">Issue</option>
              <option value="ADJUSTMENT">Adjustment</option>
            </select>
          </div>
        </div>

        <div className="mb-3 grid gap-3 md:grid-cols-4">
          <div className="relative md:col-span-2">
            <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={movementSearch}
              onChange={(event) => setMovementSearch(event.target.value)}
              placeholder="Search item, vehicle, reference, user"
              className="w-full rounded-lg border border-slate-300 py-2 pl-9 pr-3 text-sm"
            />
          </div>

          <input
            type="date"
            value={movementDateFrom}
            onChange={(event) => setMovementDateFrom(event.target.value)}
            max={movementDateTo || undefined}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
            aria-label="Movement date from"
            title="Movement date from"
          />

          <div className="flex gap-2">
            <input
              type="date"
              value={movementDateTo}
              onChange={(event) => setMovementDateTo(event.target.value)}
              min={movementDateFrom || undefined}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              aria-label="Movement date to"
              title="Movement date to"
            />
            <button
              type="button"
              onClick={() => {
                setMovementSearch("");
                setMovementDateFrom("");
                setMovementDateTo("");
                setMovementTypeFilter("All");
              }}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
            >
              Clear
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-slate-500">
                <th className="px-2 py-2">Date</th>
                <th className="px-2 py-2">Item</th>
                <th className="px-2 py-2">Type</th>
                <th className="px-2 py-2">Qty</th>
                <th className="px-2 py-2">Balance (Before / After)</th>
                <th className="px-2 py-2">Vehicle</th>
                <th className="px-2 py-2">Reference</th>
                <th className="px-2 py-2">By</th>
              </tr>
            </thead>
            <tbody>
              {filteredMovements.map((movement) => {
                const { beforeQty, afterQty } = formatBalanceTransition(
                  movement.balanceBefore,
                  movement.balanceAfter,
                );

                return (
                  <tr key={movement.id} className="border-b border-slate-100">
                    <td className="px-2 py-2 text-slate-700">
                      {formatDateTime(movement.movementDate)}
                    </td>
                    <td className="px-2 py-2">
                      <p className="font-medium text-slate-800">
                        {movement.itemName}
                      </p>
                      <p className="text-xs text-slate-500">
                        {movement.categoryName}
                      </p>
                    </td>
                    <td className="px-2 py-2">
                      <span
                        className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${
                          movement.movementType === "IN"
                            ? "bg-emerald-100 text-emerald-700"
                            : movement.movementType === "OUT"
                              ? "bg-amber-100 text-amber-700"
                              : "bg-slate-100 text-slate-700"
                        }`}
                      >
                        {movement.movementType}
                      </span>
                    </td>
                    <td className="px-2 py-2 text-slate-700">
                      {formatQty(movement.quantity)}
                    </td>
                    <td className="px-2 py-2 text-slate-700">
                      <div className="flex items-center gap-2 text-xs">
                        <span className="rounded bg-slate-100 px-2 py-1 text-slate-700">
                          {beforeQty}
                        </span>
                        <span className="text-slate-400">to</span>
                        <span className="rounded bg-blue-100 px-2 py-1 font-semibold text-blue-700">
                          {afterQty}
                        </span>
                      </div>
                    </td>
                    <td className="px-2 py-2 text-slate-700">
                      {movement.vehicleNo || movement.vehiclePlateNo
                        ? `${movement.vehicleNo || ""} ${movement.vehiclePlateNo || ""}`
                        : "-"}
                    </td>
                    <td className="px-2 py-2 text-slate-700">
                      {movement.reference || "-"}
                    </td>
                    <td className="px-2 py-2 text-slate-700">
                      {movement.createdByUserName || "-"}
                    </td>
                  </tr>
                );
              })}
              {filteredMovements.length === 0 && (
                <tr>
                  <td
                    colSpan={8}
                    className="px-2 py-8 text-center text-slate-500"
                  >
                    No movement history found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="mt-3 flex items-start gap-2 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs text-blue-700">
          <AlertCircle className="mt-0.5 h-4 w-4" />
          Movement history shows stock in/out trail with before and after
          balance for auditing item usage.
        </div>
      </div>

      {isCategoryModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-3xl rounded-xl bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
              <h3 className="text-lg font-semibold text-slate-900">
                Manage Categories
              </h3>
              <button
                type="button"
                onClick={closeCategoryModal}
                className="rounded p-1 text-slate-500 hover:bg-slate-100 hover:text-slate-800"
                disabled={savingCategoryEdit || Boolean(deletingCategoryId)}
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="grid gap-4 p-4 lg:grid-cols-2">
              <div className="space-y-2">
                <p className="text-sm font-medium text-slate-700">
                  Existing Categories
                </p>
                <div className="max-h-[340px] overflow-auto rounded-lg border border-slate-200">
                  <table className="min-w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-200 text-left text-slate-500">
                        <th className="px-3 py-2">Name</th>
                        <th className="px-3 py-2">Items</th>
                        <th className="px-3 py-2">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {categories.map((category) => (
                        <tr
                          key={category.id}
                          className="border-b border-slate-100"
                        >
                          <td className="px-3 py-2">
                            <p className="font-medium text-slate-800">
                              {category.name}
                            </p>
                            <p className="text-xs text-slate-500 line-clamp-1">
                              {category.description || "No description"}
                            </p>
                          </td>
                          <td className="px-3 py-2 text-slate-700">
                            {formatQty(category.itemsCount)}
                          </td>
                          <td className="px-3 py-2">
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => startEditCategory(category)}
                                className="rounded p-1.5 text-slate-500 hover:bg-blue-50 hover:text-blue-700"
                                title="Edit category"
                              >
                                <Pencil className="h-4 w-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteCategory(category)}
                                className="rounded p-1.5 text-slate-500 hover:bg-rose-50 hover:text-rose-700"
                                title="Delete category"
                                disabled={deletingCategoryId === category.id}
                              >
                                {deletingCategoryId === category.id ? (
                                  <Loader className="h-4 w-4 animate-spin" />
                                ) : (
                                  <Trash2 className="h-4 w-4" />
                                )}
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                      {categories.length === 0 && (
                        <tr>
                          <td
                            colSpan={3}
                            className="px-3 py-6 text-center text-slate-500"
                          >
                            No categories found.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              <form
                onSubmit={submitCategoryEdit}
                className="space-y-3 rounded-lg border border-slate-200 p-3"
              >
                <p className="text-sm font-medium text-slate-700">
                  {categoryEditForm.id
                    ? "Edit Category"
                    : "Select a category to edit"}
                </p>
                <input
                  type="text"
                  required
                  disabled={!categoryEditForm.id || savingCategoryEdit}
                  value={categoryEditForm.name}
                  onChange={(event) =>
                    setCategoryEditForm((prev) => ({
                      ...prev,
                      name: event.target.value,
                    }))
                  }
                  placeholder="Category name"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm disabled:bg-slate-100"
                />
                <textarea
                  rows={4}
                  disabled={!categoryEditForm.id || savingCategoryEdit}
                  value={categoryEditForm.description}
                  onChange={(event) =>
                    setCategoryEditForm((prev) => ({
                      ...prev,
                      description: event.target.value,
                    }))
                  }
                  placeholder="Description"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm disabled:bg-slate-100"
                />
                <div className="flex flex-wrap gap-2">
                  <button
                    type="submit"
                    disabled={!categoryEditForm.id || savingCategoryEdit}
                    className="inline-flex items-center gap-2 rounded-lg border border-blue-700 bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {savingCategoryEdit ? (
                      <Loader className="h-4 w-4 animate-spin" />
                    ) : (
                      <Pencil className="h-4 w-4" />
                    )}
                    Save Changes
                  </button>
                  {categoryEditForm.id && (
                    <button
                      type="button"
                      onClick={() => setCategoryEditForm(emptyCategoryEditForm)}
                      className="rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
                    >
                      Clear
                    </button>
                  )}
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
