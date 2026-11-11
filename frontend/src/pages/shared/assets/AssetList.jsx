import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Package, Plus } from "lucide-react";
import { listAssets } from "../../../api/assets.js";
import { ASSET_STATUSES, CATEGORIES } from "../../../constants/categories.js";
import Alert from "../../../components/ui/Alert.jsx";
import {
  AssetConditionBadge,
  AssetStatusBadge,
} from "../../../components/ui/Badge.jsx";
import EmptyState from "../../../components/ui/EmptyState.jsx";
import Input from "../../../components/ui/Input.jsx";
import PageHeader from "../../../components/ui/PageHeader.jsx";
import Select from "../../../components/ui/Select.jsx";
import Spinner from "../../../components/ui/Spinner.jsx";
import "./Assets.css";

function formatLocation(asset) {
  const parts = [asset.building, asset.location].filter(Boolean);
  return parts.length > 0 ? parts.join(" · ") : "—";
}

function AssetList({ canManage = false, basePath = "/assets" }) {
  const [searchInput, setSearchInput] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [category, setCategory] = useState("");
  const [status, setStatus] = useState("");

  const [assets, setAssets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch((prev) => {
        if (prev !== searchInput) {
          setLoading(true);
        }
        return searchInput;
      });
    }, 300);

    return () => clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => {
    let active = true;

    listAssets({
      category,
      status,
      search: debouncedSearch.trim(),
    })
      .then((data) => {
        if (active) {
          setAssets(Array.isArray(data) ? data : []);
          setError("");
        }
      })
      .catch((err) => {
        if (active) {
          setError(err.message || "Failed to load assets");
        }
      })
      .finally(() => {
        if (active) {
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [category, status, debouncedSearch]);

  const hasFilters = Boolean(searchInput || category || status);

  const clearFilters = () => {
    setSearchInput("");
    setDebouncedSearch("");
    setCategory("");
    setStatus("");
    setLoading(true);
  };

  return (
    <div>
      <PageHeader
        title="Assets"
        subtitle="Browse campus infrastructure assets and check their current status."
        actions={
          canManage && (
            <Link to={`${basePath}/new`} className="btn btn-primary">
              <Plus size={16} aria-hidden="true" />
              <span>Add asset</span>
            </Link>
          )
        }
      />

      <div className="assets-filters">
        <Input
          label="Search"
          type="search"
          placeholder="Search by ID, name, or building..."
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
        />

        <Select
          label="Category"
          value={category}
          onChange={(e) => {
            setCategory(e.target.value);
            setLoading(true);
          }}
        >
          <option value="">All categories</option>
          {CATEGORIES.map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </Select>

        <Select
          label="Status"
          value={status}
          onChange={(e) => {
            setStatus(e.target.value);
            setLoading(true);
          }}
        >
          <option value="">All statuses</option>
          {ASSET_STATUSES.map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </Select>

        {hasFilters && (
          <button
            type="button"
            className="btn btn-secondary"
            onClick={clearFilters}
          >
            Clear
          </button>
        )}
      </div>

      {error && (
        <div style={{ marginBottom: "var(--space-4)" }}>
          <Alert variant="error">{error}</Alert>
        </div>
      )}

      {loading ? (
        <div className="assets-loading-box">
          <Spinner label="Loading assets..." />
        </div>
      ) : !error && assets.length === 0 ? (
        <EmptyState
          icon={Package}
          title="No assets found"
          description={
            hasFilters
              ? "Try clearing or adjusting your search filters."
              : "No assets have been registered yet."
          }
          action={
            hasFilters ? (
              <button
                type="button"
                className="btn btn-secondary"
                onClick={clearFilters}
              >
                Clear filters
              </button>
            ) : (
              canManage && (
                <Link to={`${basePath}/new`} className="btn btn-primary">
                  Add asset
                </Link>
              )
            )
          }
        />
      ) : !error ? (
        <>
          <div className="assets-table-wrap">
            <table className="assets-table">
              <thead>
                <tr>
                  <th>Asset ID</th>
                  <th>Name</th>
                  <th>Category</th>
                  <th>Building / Location</th>
                  <th>Condition</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {assets.map((asset) => (
                  <tr key={asset._id}>
                    <td>
                      <Link
                        to={`${basePath}/${asset._id}`}
                        className="asset-id-mono"
                      >
                        {asset.assetId}
                      </Link>
                    </td>
                    <td>
                      <Link
                        to={`${basePath}/${asset._id}`}
                        className="asset-row-link"
                      >
                        {asset.name}
                      </Link>
                    </td>
                    <td>{asset.category}</td>
                    <td>{formatLocation(asset)}</td>
                    <td>
                      <AssetConditionBadge condition={asset.condition} />
                    </td>
                    <td>
                      <AssetStatusBadge status={asset.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="assets-mobile-list">
            {assets.map((asset) => (
              <Link
                key={asset._id}
                to={`${basePath}/${asset._id}`}
                className="asset-mobile-card"
              >
                <div className="asset-mobile-top">
                  <span className="asset-id-mono">{asset.assetId}</span>
                  <span>{asset.category}</span>
                </div>
                <div className="asset-mobile-name">{asset.name}</div>
                <div className="asset-mobile-meta">{formatLocation(asset)}</div>
                <div className="asset-mobile-badges">
                  <AssetConditionBadge condition={asset.condition} />
                  <AssetStatusBadge status={asset.status} />
                </div>
              </Link>
            ))}
          </div>
        </>
      ) : null}
    </div>
  );
}

export default AssetList;
