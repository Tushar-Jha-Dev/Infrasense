import { useEffect, useState, useMemo, useRef, useCallback } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  IndianRupee,
  Download,
  TrendingUp,
  TrendingDown,
  Minus,
  Filter,
  X,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
} from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";
import { getCostDetails, downloadCostsCsv } from "../../api/analytics.js";
import { listUsers } from "../../api/users.js";
import { listAssets } from "../../api/assets.js";
import { CATEGORIES } from "../../constants/categories.js";
import { SEVERITIES } from "../../constants/complaints.js";
import { formatCurrency } from "../../utils/formatCurrency.js";
import { formatDate } from "../../utils/formatDate.js";
import Alert from "../../components/ui/Alert.jsx";
import { SeverityBadge } from "../../components/ui/Badge.jsx";
import EmptyState from "../../components/ui/EmptyState.jsx";
import PageHeader from "../../components/ui/PageHeader.jsx";
import Spinner from "../../components/ui/Spinner.jsx";
import StatCard from "../../components/ui/StatCard.jsx";
import "./AdminCosts.css";

const PRIMARY_COLOR = "#0F5E5C";

const PRESET_OPTIONS = [
  { id: "all", label: "All time" },
  { id: "30d", label: "Last 30 days" },
  { id: "3m", label: "Last 3 months" },
  { id: "6m", label: "Last 6 months" },
  { id: "thisYear", label: "This year" },
  { id: "custom", label: "Custom" },
];

const getPresetDates = (presetKey) => {
  const now = new Date();
  const todayIST = new Date(now.getTime() + 5.5 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10);

  if (presetKey === "30d") {
    const d = new Date(
      now.getTime() + 5.5 * 60 * 60 * 1000 - 30 * 24 * 60 * 60 * 1000
    );
    return { from: d.toISOString().slice(0, 10), to: todayIST };
  }
  if (presetKey === "3m") {
    const d = new Date(
      now.getTime() + 5.5 * 60 * 60 * 1000 - 90 * 24 * 60 * 60 * 1000
    );
    return { from: d.toISOString().slice(0, 10), to: todayIST };
  }
  if (presetKey === "6m") {
    const d = new Date(
      now.getTime() + 5.5 * 60 * 60 * 1000 - 180 * 24 * 60 * 60 * 1000
    );
    return { from: d.toISOString().slice(0, 10), to: todayIST };
  }
  if (presetKey === "thisYear") {
    const year = todayIST.slice(0, 4);
    return { from: `${year}-01-01`, to: todayIST };
  }
  return { from: "", to: "" };
};

const detectPreset = (from, to) => {
  if (!from && !to) return "all";
  for (const preset of ["30d", "3m", "6m", "thisYear"]) {
    const dates = getPresetDates(preset);
    if (dates.from === from && dates.to === to) {
      return preset;
    }
  }
  return "custom";
};

const formatPeriodLabel = (period, groupBy) => {
  if (!period) return "";
  if (groupBy === "month") {
    const [y, m] = period.split("-").map(Number);
    const date = new Date(Date.UTC(y, m - 1, 1));
    return date.toLocaleDateString("en-IN", {
      month: "short",
      year: "numeric",
      timeZone: "UTC",
    });
  }
  const [y, m, d] = period.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  return date.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });
};

function AdminCosts() {
  const [searchParams, setSearchParams] = useSearchParams();

  // URL query params
  const from = searchParams.get("from") || "";
  const to = searchParams.get("to") || "";
  const category = searchParams.get("category") || "";
  const severity = searchParams.get("severity") || "";
  const status = searchParams.get("status") || "";
  const technician = searchParams.get("technician") || "";
  const building = searchParams.get("building") || "";
  const asset = searchParams.get("asset") || "";
  const minCost = searchParams.get("minCost") || "";
  const maxCost = searchParams.get("maxCost") || "";
  const search = searchParams.get("search") || "";
  const groupBy = searchParams.get("groupBy") || "month";
  const sort = searchParams.get("sort") || "date";
  const page = parseInt(searchParams.get("page") || "1", 10) || 1;

  // Local state for debounced search box
  const [searchInput, setSearchInput] = useState(search);
  const [prevSearch, setPrevSearch] = useState(search);
  const searchDebounceTimer = useRef(null);

  if (search !== prevSearch) {
    setPrevSearch(search);
    setSearchInput(search);
  }

  // Filter options state
  const [techniciansList, setTechniciansList] = useState([]);
  const [assetsList, setAssetsList] = useState([]);
  const [optionsLoaded, setOptionsLoaded] = useState(false);

  // Mobile filters collapsible
  const [isMobileFiltersOpen, setIsMobileFiltersOpen] = useState(false);

  // Main data state
  const [costData, setCostData] = useState(null);
  const [initialLoading, setInitialLoading] = useState(true);
  const [isFetching, setIsFetching] = useState(false);
  const [fetchError, setFetchError] = useState("");
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState("");

  // Load technicians and assets once
  useEffect(() => {
    let active = true;
    Promise.all([listUsers({ role: "technician" }), listAssets()])
      .then(([techs, assets]) => {
        if (!active) return;
        setTechniciansList(Array.isArray(techs) ? techs : []);
        setAssetsList(Array.isArray(assets) ? assets : []);
        setOptionsLoaded(true);
      })
      .catch((err) => {
        console.error("Failed to load technician or asset options:", err);
        if (active) setOptionsLoaded(true);
      });
    return () => {
      active = false;
    };
  }, []);

  // Compute distinct buildings from assets
  const buildingOptions = useMemo(() => {
    const set = new Set();
    for (const a of assetsList) {
      if (a.building && a.building.trim()) {
        set.add(a.building.trim());
      }
    }
    return Array.from(set).sort();
  }, [assetsList]);

  // Inline validation checks
  const validationErrors = useMemo(() => {
    const errors = {};
    if (from && to && from > to) {
      errors.dateRange = "'From' date cannot be after 'To' date";
    }
    const minNum = minCost ? Number(minCost) : null;
    const maxNum = maxCost ? Number(maxCost) : null;
    if (minNum !== null && (Number.isNaN(minNum) || minNum < 0)) {
      errors.minCost = "Minimum cost cannot be negative";
    }
    if (maxNum !== null && (Number.isNaN(maxNum) || maxNum < 0)) {
      errors.maxCost = "Maximum cost cannot be negative";
    }
    if (
      minNum !== null &&
      maxNum !== null &&
      !Number.isNaN(minNum) &&
      !Number.isNaN(maxNum) &&
      minNum > maxNum
    ) {
      errors.costRange = "Minimum cost cannot exceed maximum cost";
    }
    return errors;
  }, [from, to, minCost, maxCost]);

  const hasValidationErrors = Object.keys(validationErrors).length > 0;

  // Update query params helper
  const updateQueryParam = useCallback(
    (key, val, resetPage = true) => {
      setIsFetching(true);
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        if (val === "" || val === null || val === undefined) {
          next.delete(key);
        } else {
          next.set(key, String(val));
        }
        if (resetPage && key !== "page") {
          next.delete("page");
        }
        return next;
      });
    },
    [setSearchParams]
  );

  // Debounce search input to URL query
  const handleSearchChange = (e) => {
    const val = e.target.value;
    setSearchInput(val);
    if (searchDebounceTimer.current) {
      clearTimeout(searchDebounceTimer.current);
    }
    searchDebounceTimer.current = setTimeout(() => {
      updateQueryParam("search", val.trim());
    }, 400);
  };

  // Presets handling
  const activePreset = useMemo(() => detectPreset(from, to), [from, to]);

  const handlePresetSelect = (presetId) => {
    if (presetId === "custom") {
      return;
    }
    setIsFetching(true);
    const dates = getPresetDates(presetId);
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (dates.from) next.set("from", dates.from);
      else next.delete("from");
      if (dates.to) next.set("to", dates.to);
      else next.delete("to");
      next.delete("page");
      return next;
    });
  };

  // Reset all filters
  const handleResetAll = () => {
    setIsFetching(true);
    setSearchInput("");
    setSearchParams(new URLSearchParams());
  };

  // Fetch cost details
  useEffect(() => {
    if (hasValidationErrors) {
      return;
    }

    let active = true;

    const params = {
      from: from || undefined,
      to: to || undefined,
      category: category || undefined,
      severity: severity || undefined,
      status: status || undefined,
      technician: technician || undefined,
      building: building || undefined,
      asset: asset || undefined,
      minCost: minCost || undefined,
      maxCost: maxCost || undefined,
      search: search || undefined,
      groupBy: groupBy || undefined,
      sort: sort || undefined,
      page: page || undefined,
    };

    getCostDetails(params)
      .then((data) => {
        if (!active) return;
        setCostData(data);
        setFetchError("");
      })
      .catch((err) => {
        if (!active) return;
        setFetchError(err.message || "Failed to load cost details");
      })
      .finally(() => {
        if (!active) return;
        setInitialLoading(false);
        setIsFetching(false);
      });

    return () => {
      active = false;
    };
  }, [
    from,
    to,
    category,
    severity,
    status,
    technician,
    building,
    asset,
    minCost,
    maxCost,
    search,
    groupBy,
    sort,
    page,
    hasValidationErrors,
  ]);

  // CSV export handler
  const handleExportCsv = async () => {
    if (hasValidationErrors) return;
    try {
      setExporting(true);
      setExportError("");
      const params = {
        from: from || undefined,
        to: to || undefined,
        category: category || undefined,
        severity: severity || undefined,
        status: status || undefined,
        technician: technician || undefined,
        building: building || undefined,
        asset: asset || undefined,
        minCost: minCost || undefined,
        maxCost: maxCost || undefined,
        search: search || undefined,
        sort: sort || undefined,
      };
      await downloadCostsCsv(params);
    } catch (err) {
      setExportError(err.message || "Failed to export costs CSV");
    } finally {
      setExporting(false);
    }
  };

  // Compute active chips
  const activeChips = useMemo(() => {
    const chips = [];
    if (from || to) {
      chips.push({
        id: "date",
        label:
          from && to
            ? `${from} to ${to}`
            : from
            ? `From ${from}`
            : `To ${to}`,
        onRemove: () => {
          setSearchParams((prev) => {
            const next = new URLSearchParams(prev);
            next.delete("from");
            next.delete("to");
            next.delete("page");
            return next;
          });
        },
      });
    }
    if (category) {
      chips.push({
        id: "category",
        label: `Category: ${category}`,
        onRemove: () => updateQueryParam("category", ""),
      });
    }
    if (severity) {
      chips.push({
        id: "severity",
        label: `Severity: ${severity}`,
        onRemove: () => updateQueryParam("severity", ""),
      });
    }
    if (status) {
      chips.push({
        id: "status",
        label: `Status: ${status}`,
        onRemove: () => updateQueryParam("status", ""),
      });
    }
    if (technician) {
      const tech = techniciansList.find((t) => t._id === technician);
      chips.push({
        id: "technician",
        label: `Tech: ${tech ? tech.name : "Selected"}`,
        onRemove: () => updateQueryParam("technician", ""),
      });
    }
    if (building) {
      chips.push({
        id: "building",
        label: `Building: ${building}`,
        onRemove: () => updateQueryParam("building", ""),
      });
    }
    if (asset) {
      const ast = assetsList.find((a) => a._id === asset);
      chips.push({
        id: "asset",
        label: `Asset: ${ast ? ast.assetId : "Selected"}`,
        onRemove: () => updateQueryParam("asset", ""),
      });
    }
    if (minCost || maxCost) {
      chips.push({
        id: "cost",
        label:
          minCost && maxCost
            ? `₹${minCost} - ₹${maxCost}`
            : minCost
            ? `>= ₹${minCost}`
            : `<= ₹${maxCost}`,
        onRemove: () => {
          setSearchParams((prev) => {
            const next = new URLSearchParams(prev);
            next.delete("minCost");
            next.delete("maxCost");
            next.delete("page");
            return next;
          });
        },
      });
    }
    if (search) {
      chips.push({
        id: "search",
        label: `Search: "${search}"`,
        onRemove: () => {
          setSearchInput("");
          updateQueryParam("search", "");
        },
      });
    }
    return chips;
  }, [
    from,
    to,
    category,
    severity,
    status,
    technician,
    building,
    asset,
    minCost,
    maxCost,
    search,
    techniciansList,
    assetsList,
    setSearchParams,
    updateQueryParam,
  ]);

  const summary = costData?.summary;
  const previous = summary?.previous;
  const byPeriod = costData?.byPeriod || [];
  const byCategory = costData?.byCategory || [];
  const byTechnician = costData?.byTechnician || [];
  const byBuilding = costData?.byBuilding || [];
  const byAsset = costData?.byAsset || [];
  const records = costData?.records;

  return (
    <div className="admin-costs-page">
      <PageHeader
        title="Maintenance costs"
        subtitle="How much was spent, and how it changes over time"
      />

      {exportError && (
        <div className="admin-costs-alert-box">
          <Alert variant="error">{exportError}</Alert>
        </div>
      )}

      {fetchError && (
        <div className="admin-costs-alert-box">
          <Alert variant="error">{fetchError}</Alert>
        </div>
      )}

      {/* FILTER BAR */}
      <section className="admin-costs-filter-card" aria-label="Filters">
        <div className="admin-costs-filter-header">
          <div className="admin-costs-filter-title-group">
            <h2 className="admin-costs-filter-title">Filters</h2>
            <button
              type="button"
              className="admin-costs-mobile-toggle-btn"
              onClick={() => setIsMobileFiltersOpen((open) => !open)}
              aria-expanded={isMobileFiltersOpen}
              aria-controls="admin-costs-filter-body"
            >
              <Filter size={16} aria-hidden="true" />
              <span>{isMobileFiltersOpen ? "Hide filters" : "Show filters"}</span>
              {activeChips.length > 0 && (
                <span className="admin-costs-filter-count-pill">
                  {activeChips.length}
                </span>
              )}
            </button>
          </div>

          {activeChips.length > 0 && (
            <button
              type="button"
              className="btn btn-secondary btn-sm admin-costs-reset-btn"
              onClick={handleResetAll}
            >
              <RotateCcw size={14} aria-hidden="true" />
              <span>Reset all</span>
            </button>
          )}
        </div>

        <div
          id="admin-costs-filter-body"
          className={`admin-costs-filter-body ${
            isMobileFiltersOpen ? "admin-costs-filter-body-open" : ""
          }`}
        >
          {/* Group 1: Time */}
          <fieldset className="admin-costs-filter-group">
            <legend className="admin-costs-group-legend">Time</legend>
            <div className="admin-costs-presets-row">
              {PRESET_OPTIONS.map((p) => {
                const isActive = activePreset === p.id;
                return (
                  <button
                    key={p.id}
                    type="button"
                    className={`admin-costs-preset-btn ${
                      isActive ? "admin-costs-preset-btn-active" : ""
                    }`}
                    onClick={() => handlePresetSelect(p.id)}
                  >
                    {p.label}
                  </button>
                );
              })}
            </div>

            <div className="admin-costs-fields-row">
              <div className="admin-costs-field">
                <label htmlFor="cost-filter-from" className="ui-label">
                  From date
                </label>
                <input
                  id="cost-filter-from"
                  type="date"
                  className={`ui-input ${
                    validationErrors.dateRange ? "ui-input-invalid" : ""
                  }`}
                  value={from}
                  onChange={(e) => updateQueryParam("from", e.target.value)}
                  aria-invalid={Boolean(validationErrors.dateRange)}
                  aria-describedby={
                    validationErrors.dateRange
                      ? "cost-date-range-error"
                      : undefined
                  }
                />
              </div>

              <div className="admin-costs-field">
                <label htmlFor="cost-filter-to" className="ui-label">
                  To date
                </label>
                <input
                  id="cost-filter-to"
                  type="date"
                  className={`ui-input ${
                    validationErrors.dateRange ? "ui-input-invalid" : ""
                  }`}
                  value={to}
                  onChange={(e) => updateQueryParam("to", e.target.value)}
                  aria-invalid={Boolean(validationErrors.dateRange)}
                  aria-describedby={
                    validationErrors.dateRange
                      ? "cost-date-range-error"
                      : undefined
                  }
                />
              </div>

              <div className="admin-costs-field">
                <label htmlFor="cost-filter-groupby" className="ui-label">
                  Group by
                </label>
                <select
                  id="cost-filter-groupby"
                  className="ui-select"
                  value={groupBy}
                  onChange={(e) => updateQueryParam("groupBy", e.target.value)}
                >
                  <option value="month">Month</option>
                  <option value="week">Week (Monday)</option>
                </select>
              </div>
            </div>

            {validationErrors.dateRange && (
              <p
                id="cost-date-range-error"
                className="admin-costs-inline-error"
                role="alert"
              >
                {validationErrors.dateRange}
              </p>
            )}
          </fieldset>

          {/* Group 2: What */}
          <fieldset className="admin-costs-filter-group">
            <legend className="admin-costs-group-legend">What</legend>
            <div className="admin-costs-fields-row">
              <div className="admin-costs-field">
                <label htmlFor="cost-filter-category" className="ui-label">
                  Category
                </label>
                <select
                  id="cost-filter-category"
                  className="ui-select"
                  value={category}
                  onChange={(e) => updateQueryParam("category", e.target.value)}
                >
                  <option value="">All categories</option>
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              <div className="admin-costs-field">
                <label htmlFor="cost-filter-severity" className="ui-label">
                  Severity
                </label>
                <select
                  id="cost-filter-severity"
                  className="ui-select"
                  value={severity}
                  onChange={(e) => updateQueryParam("severity", e.target.value)}
                >
                  <option value="">All severities</option>
                  {SEVERITIES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>

              <div className="admin-costs-field">
                <label htmlFor="cost-filter-status" className="ui-label">
                  Status
                </label>
                <select
                  id="cost-filter-status"
                  className="ui-select"
                  value={status}
                  onChange={(e) => updateQueryParam("status", e.target.value)}
                >
                  <option value="">All statuses</option>
                  <option value="Resolved">Resolved</option>
                  <option value="Closed">Closed</option>
                </select>
              </div>
            </div>
          </fieldset>

          {/* Group 3: Who and where */}
          <fieldset className="admin-costs-filter-group">
            <legend className="admin-costs-group-legend">Who and where</legend>
            <div className="admin-costs-fields-row">
              <div className="admin-costs-field">
                <label htmlFor="cost-filter-tech" className="ui-label">
                  Technician
                </label>
                <select
                  id="cost-filter-tech"
                  className="ui-select"
                  value={technician}
                  disabled={!optionsLoaded}
                  onChange={(e) =>
                    updateQueryParam("technician", e.target.value)
                  }
                >
                  <option value="">All technicians</option>
                  {techniciansList.map((t) => (
                    <option key={t._id} value={t._id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="admin-costs-field">
                <label htmlFor="cost-filter-building" className="ui-label">
                  Building
                </label>
                <select
                  id="cost-filter-building"
                  className="ui-select"
                  value={building}
                  disabled={!optionsLoaded}
                  onChange={(e) => updateQueryParam("building", e.target.value)}
                >
                  <option value="">All buildings</option>
                  {buildingOptions.map((b) => (
                    <option key={b} value={b}>
                      {b}
                    </option>
                  ))}
                </select>
              </div>

              <div className="admin-costs-field">
                <label htmlFor="cost-filter-asset" className="ui-label">
                  Asset
                </label>
                <select
                  id="cost-filter-asset"
                  className="ui-select"
                  value={asset}
                  disabled={!optionsLoaded}
                  onChange={(e) => updateQueryParam("asset", e.target.value)}
                >
                  <option value="">All assets</option>
                  {assetsList.map((a) => (
                    <option key={a._id} value={a._id}>
                      {a.assetId} - {a.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </fieldset>

          {/* Group 4: Cost & Search */}
          <fieldset className="admin-costs-filter-group">
            <legend className="admin-costs-group-legend">Cost and search</legend>
            <div className="admin-costs-fields-row">
              <div className="admin-costs-field">
                <label htmlFor="cost-filter-min" className="ui-label">
                  Min cost (₹)
                </label>
                <input
                  id="cost-filter-min"
                  type="number"
                  min="0"
                  step="any"
                  placeholder="Min ₹"
                  className={`ui-input ${
                    validationErrors.minCost || validationErrors.costRange
                      ? "ui-input-invalid"
                      : ""
                  }`}
                  value={minCost}
                  onChange={(e) => updateQueryParam("minCost", e.target.value)}
                  aria-invalid={Boolean(
                    validationErrors.minCost || validationErrors.costRange
                  )}
                  aria-describedby={
                    validationErrors.minCost
                      ? "cost-min-error"
                      : validationErrors.costRange
                      ? "cost-range-error"
                      : undefined
                  }
                />
              </div>

              <div className="admin-costs-field">
                <label htmlFor="cost-filter-max" className="ui-label">
                  Max cost (₹)
                </label>
                <input
                  id="cost-filter-max"
                  type="number"
                  min="0"
                  step="any"
                  placeholder="Max ₹"
                  className={`ui-input ${
                    validationErrors.maxCost || validationErrors.costRange
                      ? "ui-input-invalid"
                      : ""
                  }`}
                  value={maxCost}
                  onChange={(e) => updateQueryParam("maxCost", e.target.value)}
                  aria-invalid={Boolean(
                    validationErrors.maxCost || validationErrors.costRange
                  )}
                  aria-describedby={
                    validationErrors.maxCost
                      ? "cost-max-error"
                      : validationErrors.costRange
                      ? "cost-range-error"
                      : undefined
                  }
                />
              </div>

              <div className="admin-costs-field admin-costs-field-search">
                <label htmlFor="cost-filter-search" className="ui-label">
                  Search
                </label>
                <input
                  id="cost-filter-search"
                  type="text"
                  placeholder="Search complaint ID, title, parts or asset"
                  className="ui-input"
                  value={searchInput}
                  onChange={handleSearchChange}
                />
              </div>
            </div>

            {validationErrors.minCost && (
              <p
                id="cost-min-error"
                className="admin-costs-inline-error"
                role="alert"
              >
                {validationErrors.minCost}
              </p>
            )}
            {validationErrors.maxCost && (
              <p
                id="cost-max-error"
                className="admin-costs-inline-error"
                role="alert"
              >
                {validationErrors.maxCost}
              </p>
            )}
            {validationErrors.costRange && (
              <p
                id="cost-range-error"
                className="admin-costs-inline-error"
                role="alert"
              >
                {validationErrors.costRange}
              </p>
            )}
          </fieldset>
        </div>

        {/* ACTIVE FILTER CHIPS */}
        {activeChips.length > 0 && (
          <div className="admin-costs-chips-wrap">
            <span className="admin-costs-chips-label">Active filters:</span>
            <div className="admin-costs-chips-list">
              {activeChips.map((chip) => (
                <span key={chip.id} className="admin-costs-chip">
                  <span>{chip.label}</span>
                  <button
                    type="button"
                    className="admin-costs-chip-remove"
                    onClick={chip.onRemove}
                    aria-label={`Remove filter ${chip.label}`}
                  >
                    <X size={13} aria-hidden="true" />
                  </button>
                </span>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* CONTENT AREA */}
      {initialLoading ? (
        <div className="admin-costs-loading-box">
          <Spinner label="Loading maintenance costs..." />
        </div>
      ) : summary?.recordCount === 0 ? (
        <div className="admin-costs-empty-box">
          <EmptyState
            icon={IndianRupee}
            title="No maintenance costs match these filters"
            description="Try adjusting your date range, broadening categories or clearing specific filters."
            action={
              <button
                type="button"
                className="btn btn-secondary"
                onClick={handleResetAll}
              >
                Reset all
              </button>
            }
          />
        </div>
      ) : (
        <div
          className={`admin-costs-content ${
            isFetching ? "admin-costs-content-fetching" : ""
          }`}
        >
          {/* STAT CARDS */}
          <section className="admin-costs-stats-grid" aria-label="Cost metrics">
            <StatCard
              label="Total spent"
              value={formatCurrency(summary?.totalCost ?? 0)}
              isMono={true}
              helper={
                previous ? (
                  <div className="admin-costs-previous-helper">
                    {previous.changePercent !== null ? (
                      <span
                        className={`admin-costs-trend-badge ${
                          previous.change > 0
                            ? "admin-costs-trend-up"
                            : previous.change < 0
                            ? "admin-costs-trend-down"
                            : "admin-costs-trend-flat"
                        }`}
                      >
                        {previous.change > 0 ? (
                          <>
                            <TrendingUp size={13} aria-hidden="true" />
                            <span>Up {previous.changePercent}%</span>
                          </>
                        ) : previous.change < 0 ? (
                          <>
                            <TrendingDown size={13} aria-hidden="true" />
                            <span>
                              Down {Math.abs(previous.changePercent)}%
                            </span>
                          </>
                        ) : (
                          <>
                            <Minus size={13} aria-hidden="true" />
                            <span>No change</span>
                          </>
                        )}
                      </span>
                    ) : (
                      <span>No spend in previous window</span>
                    )}
                    <span className="admin-costs-previous-dates">
                      vs {previous.from} to {previous.to}
                    </span>
                  </div>
                ) : (
                  <span>All completed maintenance repairs</span>
                )
              }
            />

            <StatCard
              label="Records"
              value={summary?.recordCount ?? 0}
              helper="Completed maintenance tasks"
            />

            <StatCard
              label="Average per record"
              value={
                summary?.averageCost !== null
                  ? formatCurrency(summary.averageCost)
                  : "No records yet"
              }
              isMono={summary?.averageCost !== null}
              helper="Mean cost across filtered records"
            />

            <StatCard
              label="Highest single repair"
              value={
                summary?.highestCost !== null
                  ? formatCurrency(summary.highestCost)
                  : "No records yet"
              }
              isMono={summary?.highestCost !== null}
              helper="Largest individual repair bill"
            />
          </section>

          {/* CHARTS ROW 1: Cost over time */}
          <section className="admin-costs-chart-card">
            <div className="admin-costs-chart-header">
              <div>
                <h3 className="admin-costs-chart-title">Cost over time</h3>
                <p className="admin-costs-chart-sub">
                  Total maintenance expenditure grouped by {groupBy}.
                </p>
              </div>
            </div>
            <div
              className="admin-costs-chart-container"
              role="region"
              aria-label="Bar chart showing maintenance costs over time"
            >
              <ResponsiveContainer width="100%" height={260}>
                <BarChart
                  data={byPeriod}
                  margin={{ top: 15, right: 20, left: 10, bottom: 5 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    vertical={false}
                    stroke="#E2DDD5"
                  />
                  <XAxis
                    dataKey="period"
                    tickFormatter={(val) => formatPeriodLabel(val, groupBy)}
                    tick={{ fill: "#5E6B6C", fontSize: 12 }}
                  />
                  <YAxis
                    tickFormatter={(val) => `₹${val}`}
                    tick={{ fill: "#5E6B6C", fontSize: 12 }}
                  />
                  <Tooltip
                    labelFormatter={(val) => formatPeriodLabel(val, groupBy)}
                    formatter={(val, name, item) => [
                      formatCurrency(val),
                      `Total cost (${item.payload.count} repairs)`,
                    ]}
                    contentStyle={{
                      backgroundColor: "#FFFFFF",
                      border: "1px solid #DDD6CA",
                      borderRadius: "6px",
                    }}
                  />
                  <Bar
                    dataKey="cost"
                    fill={PRIMARY_COLOR}
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </section>

          {/* CHARTS ROW 2: Category & Building */}
          <div className="admin-costs-two-charts-grid">
            <section className="admin-costs-chart-card">
              <div className="admin-costs-chart-header">
                <div>
                  <h3 className="admin-costs-chart-title">Cost by category</h3>
                  <p className="admin-costs-chart-sub">
                    Expenses across effective infrastructure categories.
                  </p>
                </div>
              </div>
              <div
                className="admin-costs-chart-container"
                role="region"
                aria-label="Horizontal bar chart of costs by category"
              >
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart
                    layout="vertical"
                    data={byCategory}
                    margin={{ top: 10, right: 30, left: 30, bottom: 10 }}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      horizontal={false}
                      stroke="#E2DDD5"
                    />
                    <XAxis
                      type="number"
                      tickFormatter={(val) => `₹${val}`}
                      tick={{ fill: "#5E6B6C", fontSize: 11 }}
                    />
                    <YAxis
                      type="category"
                      dataKey="category"
                      width={110}
                      tick={{ fill: "#5E6B6C", fontSize: 11 }}
                    />
                    <Tooltip
                      formatter={(val, name, item) => [
                        formatCurrency(val),
                        `Cost (${item.payload.count} repairs)`,
                      ]}
                      contentStyle={{
                        backgroundColor: "#FFFFFF",
                        border: "1px solid #DDD6CA",
                        borderRadius: "6px",
                      }}
                    />
                    <Bar
                      dataKey="cost"
                      fill={PRIMARY_COLOR}
                      radius={[0, 4, 4, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </section>

            <section className="admin-costs-chart-card">
              <div className="admin-costs-chart-header">
                <div>
                  <h3 className="admin-costs-chart-title">Cost by building</h3>
                  <p className="admin-costs-chart-sub">
                    Top 8 infrastructure buildings by total repair spend.
                  </p>
                </div>
              </div>
              <div
                className="admin-costs-chart-container"
                role="region"
                aria-label="Horizontal bar chart of costs by building"
              >
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart
                    layout="vertical"
                    data={byBuilding}
                    margin={{ top: 10, right: 30, left: 30, bottom: 10 }}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      horizontal={false}
                      stroke="#E2DDD5"
                    />
                    <XAxis
                      type="number"
                      tickFormatter={(val) => `₹${val}`}
                      tick={{ fill: "#5E6B6C", fontSize: 11 }}
                    />
                    <YAxis
                      type="category"
                      dataKey="building"
                      width={120}
                      tick={{ fill: "#5E6B6C", fontSize: 11 }}
                    />
                    <Tooltip
                      formatter={(val, name, item) => [
                        formatCurrency(val),
                        `Cost (${item.payload.count} repairs)`,
                      ]}
                      contentStyle={{
                        backgroundColor: "#FFFFFF",
                        border: "1px solid #DDD6CA",
                        borderRadius: "6px",
                      }}
                    />
                    <Bar
                      dataKey="cost"
                      fill="#2B6A8F"
                      radius={[0, 4, 4, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </section>
          </div>

          {/* CHARTS ROW 3: Technician & Most Expensive Assets */}
          <div className="admin-costs-two-charts-grid">
            <section className="admin-costs-chart-card">
              <div className="admin-costs-chart-header">
                <div>
                  <h3 className="admin-costs-chart-title">
                    Cost by technician
                  </h3>
                  <p className="admin-costs-chart-sub">
                    Maintenance spend attributed to assigned technicians.
                  </p>
                </div>
              </div>
              <div className="admin-costs-tech-list">
                {byTechnician.length === 0 ? (
                  <p className="admin-costs-muted-text">
                    No technician data available.
                  </p>
                ) : (
                  byTechnician.map((t, idx) => (
                    <div key={t._id || idx} className="admin-costs-tech-row">
                      <div className="admin-costs-tech-rank">{idx + 1}</div>
                      <div className="admin-costs-tech-info">
                        <span className="admin-costs-tech-name">{t.name}</span>
                        <span className="admin-costs-tech-count">
                          {t.count} completed {t.count === 1 ? "task" : "tasks"}
                        </span>
                      </div>
                      <div className="admin-costs-tech-cost">
                        {formatCurrency(t.cost)}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </section>

            <section className="admin-costs-chart-card">
              <div className="admin-costs-chart-header">
                <div>
                  <h3 className="admin-costs-chart-title">
                    Most expensive assets
                  </h3>
                  <p className="admin-costs-chart-sub">
                    Top 10 assets incurring highest maintenance costs.
                  </p>
                </div>
              </div>
              <div className="admin-costs-asset-table-wrap">
                {byAsset.length === 0 ? (
                  <p className="admin-costs-muted-text">
                    No asset maintenance records match.
                  </p>
                ) : (
                  <table className="admin-costs-table">
                    <thead>
                      <tr>
                        <th>Asset ID</th>
                        <th>Name</th>
                        <th>Building</th>
                        <th>Repairs</th>
                        <th>Total cost</th>
                      </tr>
                    </thead>
                    <tbody>
                      {byAsset.map((a) => (
                        <tr key={a._id}>
                          <td>
                            <Link
                              to={`/admin/assets/${a._id}`}
                              className="admin-costs-mono-link"
                            >
                              {a.assetId}
                            </Link>
                          </td>
                          <td>{a.name}</td>
                          <td>{a.building || "—"}</td>
                          <td>{a.count}</td>
                          <td className="admin-costs-cost-cell">
                            {formatCurrency(a.cost)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </section>
          </div>

          {/* RECORDS TABLE & CSV EXPORT */}
          <section className="admin-costs-records-section">
            <div className="admin-costs-records-header">
              <div>
                <h3 className="admin-costs-section-title">
                  Maintenance records
                </h3>
                <p className="admin-costs-section-sub">
                  Detailed repair records matching selected filters.
                </p>
              </div>

              <div className="admin-costs-records-actions">
                <div className="admin-costs-sort-wrap">
                  <label htmlFor="cost-sort-select" className="ui-label">
                    Sort by:
                  </label>
                  <select
                    id="cost-sort-select"
                    className="ui-select"
                    value={sort}
                    onChange={(e) => updateQueryParam("sort", e.target.value)}
                  >
                    <option value="date">Date (newest first)</option>
                    <option value="cost">Cost (highest first)</option>
                  </select>
                </div>

                <button
                  type="button"
                  className="btn btn-secondary btn-sm admin-costs-export-btn"
                  disabled={exporting}
                  onClick={handleExportCsv}
                >
                  <Download size={14} aria-hidden="true" />
                  <span>{exporting ? "Exporting..." : "Download CSV"}</span>
                </button>
              </div>
            </div>

            {/* Desktop Table View */}
            <div className="admin-costs-table-wrap">
              <table className="admin-costs-table">
                <thead>
                  <tr>
                    <th>Completed date</th>
                    <th>Complaint ID</th>
                    <th>Title</th>
                    <th>Asset</th>
                    <th>Category</th>
                    <th>Severity</th>
                    <th>Technician</th>
                    <th>Cost</th>
                  </tr>
                </thead>
                <tbody>
                  {(records?.items || []).map((item) => (
                    <tr key={item._id}>
                      <td>{formatDate(item.completedAt)}</td>
                      <td>
                        <Link
                          to={`/admin/complaints/${item.complaint?._id}`}
                          className="admin-costs-mono-link"
                        >
                          {item.complaint?.complaintId}
                        </Link>
                      </td>
                      <td className="admin-costs-title-cell">
                        {item.complaint?.title}
                      </td>
                      <td>
                        {item.asset ? (
                          <Link
                            to={`/admin/assets/${item.asset._id}`}
                            className="admin-costs-asset-link"
                          >
                            <span className="admin-costs-mono-text">
                              {item.asset.assetId}
                            </span>
                            <span> - {item.asset.name}</span>
                          </Link>
                        ) : (
                          <span className="admin-costs-muted-text">—</span>
                        )}
                      </td>
                      <td>{item.category || "—"}</td>
                      <td>
                        {item.severity ? (
                          <SeverityBadge severity={item.severity} />
                        ) : (
                          <span className="admin-costs-muted-text">
                            Not analysed
                          </span>
                        )}
                      </td>
                      <td>{item.technician?.name || "—"}</td>
                      <td className="admin-costs-cost-cell">
                        {formatCurrency(item.cost)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Stacked Cards View */}
            <div className="admin-costs-cards-list">
              {(records?.items || []).map((item) => (
                <div key={item._id} className="admin-costs-card-item">
                  <div className="admin-costs-card-top">
                    <Link
                      to={`/admin/complaints/${item.complaint?._id}`}
                      className="admin-costs-mono-link"
                    >
                      {item.complaint?.complaintId}
                    </Link>
                    <span className="admin-costs-cost-cell">
                      {formatCurrency(item.cost)}
                    </span>
                  </div>

                  <div className="admin-costs-card-title">
                    {item.complaint?.title}
                  </div>

                  <div className="admin-costs-card-badges">
                    {item.severity && (
                      <SeverityBadge severity={item.severity} />
                    )}
                    {item.category && (
                      <span className="admin-costs-chip-category">
                        {item.category}
                      </span>
                    )}
                  </div>

                  <div className="admin-costs-card-meta">
                    <div>
                      <strong>Completed:</strong>{" "}
                      {formatDate(item.completedAt)}
                    </div>
                    {item.asset && (
                      <div>
                        <strong>Asset:</strong>{" "}
                        <Link
                          to={`/admin/assets/${item.asset._id}`}
                          className="admin-costs-asset-link"
                        >
                          {item.asset.assetId} - {item.asset.name}
                        </Link>
                      </div>
                    )}
                    <div>
                      <strong>Tech:</strong>{" "}
                      {item.technician?.name || "Not assigned"}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination */}
            {records && records.totalPages > 1 && (
              <div className="admin-costs-pagination">
                <div className="admin-costs-pagination-info">
                  Showing page {records.page} of {records.totalPages} (
                  {records.total} total records)
                </div>

                <div className="admin-costs-pagination-controls">
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    disabled={records.page <= 1}
                    onClick={() =>
                      updateQueryParam("page", records.page - 1, false)
                    }
                  >
                    <ChevronLeft size={15} aria-hidden="true" />
                    <span>Previous</span>
                  </button>

                  <span className="admin-costs-pagination-current">
                    Page {records.page} / {records.totalPages}
                  </span>

                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    disabled={records.page >= records.totalPages}
                    onClick={() =>
                      updateQueryParam("page", records.page + 1, false)
                    }
                  >
                    <span>Next</span>
                    <ChevronRight size={15} aria-hidden="true" />
                  </button>
                </div>
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  );
}

export default AdminCosts;
