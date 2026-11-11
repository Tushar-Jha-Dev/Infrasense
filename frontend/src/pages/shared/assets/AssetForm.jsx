import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { createAsset, getAsset, updateAsset } from "../../../api/assets.js";
import {
  ASSET_STATUSES,
  CATEGORIES,
  CONDITIONS,
} from "../../../constants/categories.js";
import Alert from "../../../components/ui/Alert.jsx";
import Input from "../../../components/ui/Input.jsx";
import PageHeader from "../../../components/ui/PageHeader.jsx";
import Select from "../../../components/ui/Select.jsx";
import Spinner from "../../../components/ui/Spinner.jsx";
import Textarea from "../../../components/ui/Textarea.jsx";
import "./Assets.css";

function validateAssetForm({ assetId, name, category }) {
  const errors = {};
  if (!assetId.trim()) {
    errors.assetId = "Asset ID is required";
  }
  if (!name.trim()) {
    errors.name = "Asset name is required";
  }
  if (!category) {
    errors.category = "Category is required";
  }
  return errors;
}

function AssetForm({ basePath = "/admin/assets" }) {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();

  const [form, setForm] = useState({
    assetId: "",
    name: "",
    category: "",
    building: "",
    location: "",
    description: "",
    installationDate: "",
    condition: "Good",
    status: "Operational",
  });

  const [loadingAsset, setLoadingAsset] = useState(isEdit);
  const [loadError, setLoadError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});
  const [serverError, setServerError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!isEdit) {
      return;
    }

    let active = true;

    getAsset(id)
      .then((asset) => {
        if (active) {
          setForm({
            assetId: asset.assetId || "",
            name: asset.name || "",
            category: asset.category || "",
            building: asset.building || "",
            location: asset.location || "",
            description: asset.description || "",
            installationDate: asset.installationDate
              ? asset.installationDate.slice(0, 10)
              : "",
            condition: asset.condition || "Good",
            status: asset.status || "Operational",
          });
          setLoadError("");
        }
      })
      .catch((err) => {
        if (active) {
          setLoadError(err.message || "Failed to load asset");
        }
      })
      .finally(() => {
        if (active) {
          setLoadingAsset(false);
        }
      });

    return () => {
      active = false;
    };
  }, [id, isEdit]);

  const updateField = (field) => (e) => {
    const value = e.target.value;
    setForm((prev) => ({ ...prev, [field]: value }));
    if (fieldErrors[field]) {
      setFieldErrors((prev) => ({ ...prev, [field]: "" }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setServerError("");

    const errors = validateAssetForm(form);
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    setFieldErrors({});
    setSubmitting(true);

    const payload = {
      assetId: form.assetId.trim(),
      name: form.name.trim(),
      category: form.category,
      building: form.building.trim(),
      location: form.location.trim(),
      description: form.description.trim(),
      condition: form.condition,
      status: form.status,
    };

    if (form.installationDate) {
      payload.installationDate = form.installationDate;
    } else if (isEdit) {
      payload.installationDate = null;
    }

    try {
      const saved = isEdit
        ? await updateAsset(id, payload)
        : await createAsset(payload);
      navigate(`${basePath}/${saved._id}`, { replace: true });
    } catch (err) {
      setServerError(err.message || "Failed to save asset");
    } finally {
      setSubmitting(false);
    }
  };

  const cancelTarget = isEdit ? `${basePath}/${id}` : basePath;

  if (loadingAsset) {
    return (
      <div className="assets-loading-box">
        <Spinner label="Loading asset..." />
      </div>
    );
  }

  if (loadError) {
    return (
      <div>
        <Link to={basePath} className="asset-back-link">
          <ArrowLeft size={16} aria-hidden="true" />
          <span>Back to assets</span>
        </Link>
        <Alert variant="error">{loadError}</Alert>
      </div>
    );
  }

  return (
    <div>
      <Link to={cancelTarget} className="asset-back-link">
        <ArrowLeft size={16} aria-hidden="true" />
        <span>{isEdit ? "Back to asset details" : "Back to assets"}</span>
      </Link>

      <PageHeader
        title={isEdit ? "Edit asset" : "Add asset"}
        subtitle={
          isEdit
            ? "Update asset details, location, or operational status."
            : "Register a new campus asset so complaints can be linked to it."
        }
      />

      <div className="asset-form-card">
        <form className="asset-form" onSubmit={handleSubmit} noValidate>
          <Alert variant="error">{serverError}</Alert>

          <div className="asset-form-row">
            <div>
              <Input
                label="Asset ID"
                name="assetId"
                placeholder="AST-0001"
                value={form.assetId}
                onChange={updateField("assetId")}
                error={fieldErrors.assetId}
                disabled={submitting}
                required
              />
              <p className="asset-field-hint">e.g. AST-0001</p>
            </div>

            <Input
              label="Asset name"
              name="name"
              placeholder="Main Hall AC Unit 1"
              value={form.name}
              onChange={updateField("name")}
              error={fieldErrors.name}
              disabled={submitting}
              required
            />
          </div>

          <div className="asset-form-row">
            <Select
              label="Category"
              name="category"
              value={form.category}
              onChange={updateField("category")}
              error={fieldErrors.category}
              disabled={submitting}
              required
            >
              <option value="">Select category</option>
              {CATEGORIES.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </Select>

            <Input
              label="Installation date"
              type="date"
              name="installationDate"
              value={form.installationDate}
              onChange={updateField("installationDate")}
              disabled={submitting}
            />
          </div>

          <div className="asset-form-row">
            <Input
              label="Building"
              name="building"
              placeholder="Block A"
              value={form.building}
              onChange={updateField("building")}
              disabled={submitting}
            />

            <Input
              label="Location"
              name="location"
              placeholder="Room 101"
              value={form.location}
              onChange={updateField("location")}
              disabled={submitting}
            />
          </div>

          <Textarea
            label="Description"
            name="description"
            placeholder="Model, capacity, or notes about this asset"
            value={form.description}
            onChange={updateField("description")}
            disabled={submitting}
          />

          <div className="asset-form-row">
            <Select
              label="Condition"
              name="condition"
              value={form.condition}
              onChange={updateField("condition")}
              disabled={submitting}
            >
              {CONDITIONS.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </Select>

            <Select
              label="Status"
              name="status"
              value={form.status}
              onChange={updateField("status")}
              disabled={submitting}
            >
              {ASSET_STATUSES.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </Select>
          </div>

          <div className="asset-form-actions">
            <button
              type="submit"
              className="btn btn-primary"
              disabled={submitting}
            >
              {submitting
                ? "Saving..."
                : isEdit
                ? "Save changes"
                : "Create asset"}
            </button>
            <Link to={cancelTarget} className="btn btn-secondary">
              Cancel
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}

export default AssetForm;
