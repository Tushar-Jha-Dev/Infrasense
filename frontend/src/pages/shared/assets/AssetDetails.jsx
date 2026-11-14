import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, Pencil } from "lucide-react";
import {
  getAsset,
  getAssetHistory,
  updateAssetStatus,
} from "../../../api/assets.js";
import { ASSET_STATUSES, CONDITIONS } from "../../../constants/categories.js";
import { formatCurrency } from "../../../utils/formatCurrency.js";
import Alert from "../../../components/ui/Alert.jsx";
import {
  AssetConditionBadge,
  AssetStatusBadge,
} from "../../../components/ui/Badge.jsx";
import MaintenanceRecordView from "../../../components/ui/MaintenanceRecordView.jsx";
import PageHeader from "../../../components/ui/PageHeader.jsx";
import Select from "../../../components/ui/Select.jsx";
import Spinner from "../../../components/ui/Spinner.jsx";
import "./Assets.css";

function formatDate(value) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString();
}

function AssetDetails({ canManage = false, basePath = "/assets" }) {
  const { id } = useParams();

  const [asset, setAsset] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [statusInput, setStatusInput] = useState("");
  const [conditionInput, setConditionInput] = useState("");
  const [savingStatus, setSavingStatus] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");
  const [statusError, setStatusError] = useState("");

  const [historyData, setHistoryData] = useState(null);
  const [historyLoading, setHistoryLoading] = useState(canManage);
  const [historyError, setHistoryError] = useState("");

  useEffect(() => {
    let active = true;

    const assetPromise = getAsset(id)
      .then((data) => {
        if (active) {
          setAsset(data);
          setStatusInput(data.status || "Operational");
          setConditionInput(data.condition || "Good");
          setError("");
        }
      })
      .catch((err) => {
        if (active) {
          setError(err.message || "Failed to load asset");
        }
      })
      .finally(() => {
        if (active) {
          setLoading(false);
        }
      });

    const historyPromise = canManage
      ? getAssetHistory(id)
          .then((data) => {
            if (active) {
              setHistoryData(data);
              setHistoryError("");
            }
          })
          .catch((err) => {
            if (active) {
              setHistoryError(
                err.message || "Failed to load maintenance history"
              );
            }
          })
          .finally(() => {
            if (active) {
              setHistoryLoading(false);
            }
          })
      : Promise.resolve();

    Promise.all([assetPromise, historyPromise]);

    return () => {
      active = false;
    };
  }, [id, canManage]);

  const handleStatusSave = async (e) => {
    e.preventDefault();
    setStatusMessage("");
    setStatusError("");
    setSavingStatus(true);

    try {
      const updated = await updateAssetStatus(id, {
        status: statusInput,
        condition: conditionInput,
      });
      setAsset(updated);
      setStatusMessage("Asset status and condition updated.");
    } catch (err) {
      setStatusError(err.message || "Failed to update asset status");
    } finally {
      setSavingStatus(false);
    }
  };

  if (loading) {
    return (
      <div className="assets-loading-box">
        <Spinner label="Loading asset details..." />
      </div>
    );
  }

  if (error || !asset) {
    return (
      <div>
        <Link to={basePath} className="asset-back-link">
          <ArrowLeft size={16} aria-hidden="true" />
          <span>Back to assets</span>
        </Link>
        <Alert variant="error">{error || "Asset not found"}</Alert>
      </div>
    );
  }

  return (
    <div>
      <Link to={basePath} className="asset-back-link">
        <ArrowLeft size={16} aria-hidden="true" />
        <span>Back to assets</span>
      </Link>

      <PageHeader
        title={asset.name}
        subtitle={
          <div className="asset-details-badges">
            <span className="asset-id-mono">{asset.assetId}</span>
            <AssetConditionBadge condition={asset.condition} />
            <AssetStatusBadge status={asset.status} />
          </div>
        }
        actions={
          canManage && (
            <Link to={`${basePath}/${asset._id}/edit`} className="btn btn-secondary">
              <Pencil size={15} aria-hidden="true" />
              <span>Edit</span>
            </Link>
          )
        }
      />

      <div className="asset-details-grid">
        <div>
          <section className="asset-panel" aria-labelledby="asset-info-heading">
            <h2 id="asset-info-heading" className="asset-panel-title">
              Asset details
            </h2>
            <dl className="asset-dl">
              <div className="asset-dl-item">
                <dt>Asset ID</dt>
                <dd className="asset-id-mono">{asset.assetId}</dd>
              </div>
              <div className="asset-dl-item">
                <dt>Category</dt>
                <dd>{asset.category}</dd>
              </div>
              <div className="asset-dl-item">
                <dt>Building</dt>
                <dd>{asset.building || "—"}</dd>
              </div>
              <div className="asset-dl-item">
                <dt>Location</dt>
                <dd>{asset.location || "—"}</dd>
              </div>
              <div className="asset-dl-item">
                <dt>Installation date</dt>
                <dd>{formatDate(asset.installationDate)}</dd>
              </div>
              <div className="asset-dl-item">
                <dt>Last updated</dt>
                <dd>{formatDate(asset.updatedAt)}</dd>
              </div>
              <div className="asset-dl-item asset-dl-full">
                <dt>Description</dt>
                <dd>{asset.description || "No description provided."}</dd>
              </div>
            </dl>
          </section>

          <section className="asset-panel" aria-labelledby="asset-history-heading">
            <div className="asset-history-header">
              <h2 id="asset-history-heading" className="asset-panel-title">
                Maintenance history
              </h2>
              {canManage && historyData?.summary ? (
                <div className="asset-history-summary">
                  <span className="asset-history-count">
                    {historyData.summary.recordCount}{" "}
                    {historyData.summary.recordCount === 1
                      ? "record"
                      : "records"}
                  </span>
                  <span className="asset-history-divider" aria-hidden="true">
                    •
                  </span>
                  <span className="asset-history-cost">
                    Total cost:{" "}
                    <span className="asset-cost-mono">
                      {formatCurrency(historyData.summary.totalCost)}
                    </span>
                  </span>
                </div>
              ) : null}
            </div>

            {!canManage ? (
              <p className="asset-muted-text">
                Maintenance records will appear here once complaints are resolved.
              </p>
            ) : historyLoading ? (
              <div className="asset-history-loading">
                <Spinner label="Loading maintenance records..." />
              </div>
            ) : historyError ? (
              <Alert variant="error">{historyError}</Alert>
            ) : !historyData || historyData.records?.length === 0 ? (
              <p className="asset-muted-text">No maintenance records yet.</p>
            ) : (
              <div className="asset-records-list">
                {historyData.records.map((record) => (
                  <div key={record._id} className="asset-record-card">
                    <div className="asset-record-header">
                      <div className="asset-record-meta-item">
                        <span className="asset-record-meta-label">
                          Completed:
                        </span>
                        <span className="asset-record-meta-value">
                          {formatDate(record.completedAt)}
                        </span>
                      </div>
                      {record.complaint ? (
                        <div className="asset-record-meta-item">
                          <span className="asset-record-meta-label">
                            Complaint:
                          </span>
                          <Link
                            to={`/admin/complaints/${record.complaint._id}`}
                            className="asset-id-mono asset-record-complaint-link"
                          >
                            {record.complaint.complaintId}
                          </Link>
                        </div>
                      ) : null}
                      <div className="asset-record-meta-item">
                        <span className="asset-record-meta-label">
                          Technician:
                        </span>
                        <span className="asset-record-meta-value">
                          {record.technician?.name || "—"}
                        </span>
                      </div>
                    </div>
                    <MaintenanceRecordView record={record} />
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>

        {canManage && (
          <aside className="asset-panel" aria-labelledby="asset-status-heading">
            <h2 id="asset-status-heading" className="asset-panel-title">
              Update status
            </h2>

            <form className="asset-status-form" onSubmit={handleStatusSave}>
              <Alert variant="success">{statusMessage}</Alert>
              <Alert variant="error">{statusError}</Alert>

              <Select
                label="Status"
                value={statusInput}
                onChange={(e) => setStatusInput(e.target.value)}
                disabled={savingStatus}
              >
                {ASSET_STATUSES.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </Select>

              <Select
                label="Condition"
                value={conditionInput}
                onChange={(e) => setConditionInput(e.target.value)}
                disabled={savingStatus}
              >
                {CONDITIONS.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </Select>

              <button
                type="submit"
                className="btn btn-primary"
                disabled={savingStatus}
              >
                {savingStatus ? "Saving..." : "Save"}
              </button>
            </form>
          </aside>
        )}
      </div>
    </div>
  );
}

export default AssetDetails;
