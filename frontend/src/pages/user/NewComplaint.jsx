import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { listAssets } from "../../api/assets.js";
import { createComplaint } from "../../api/complaints.js";
import Alert from "../../components/ui/Alert.jsx";
import Input from "../../components/ui/Input.jsx";
import PageHeader from "../../components/ui/PageHeader.jsx";
import Select from "../../components/ui/Select.jsx";
import Textarea from "../../components/ui/Textarea.jsx";
import "./UserComplaints.css";

const MAX_TITLE_LENGTH = 120;
const MAX_DESCRIPTION_LENGTH = 2000;

function validateComplaintForm({ title, description, asset, location }) {
  const errors = {};
  const cleanTitle = title.trim();
  const cleanDescription = description.trim();
  const cleanLocation = location.trim();

  if (!cleanTitle) {
    errors.title = "Title is required";
  } else if (cleanTitle.length > MAX_TITLE_LENGTH) {
    errors.title = `Title must be ${MAX_TITLE_LENGTH} characters or fewer`;
  }

  if (!cleanDescription) {
    errors.description = "Description is required";
  } else if (cleanDescription.length > MAX_DESCRIPTION_LENGTH) {
    errors.description = `Description must be ${MAX_DESCRIPTION_LENGTH} characters or fewer`;
  }

  if (!asset && !cleanLocation) {
    errors.location = "Choose an asset or enter a location";
  }

  return errors;
}

function NewComplaint() {
  const navigate = useNavigate();

  const [assets, setAssets] = useState([]);
  const [loadingAssets, setLoadingAssets] = useState(true);
  const [form, setForm] = useState({
    title: "",
    description: "",
    asset: "",
    location: "",
  });
  const [fieldErrors, setFieldErrors] = useState({});
  const [serverError, setServerError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let active = true;

    listAssets()
      .then((data) => {
        if (active) {
          setAssets(Array.isArray(data) ? data : []);
        }
      })
      .catch(() => {
        // Users can still submit a complaint by entering a location
      })
      .finally(() => {
        if (active) {
          setLoadingAssets(false);
        }
      });

    return () => {
      active = false;
    };
  }, []);

  const updateField = (field) => (e) => {
    const value = e.target.value;
    setForm((prev) => ({ ...prev, [field]: value }));
    setFieldErrors((prev) => {
      const next = { ...prev };
      if (next[field]) {
        next[field] = "";
      }
      if ((field === "asset" || field === "location") && next.location) {
        next.location = "";
      }
      return next;
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setServerError("");

    const errors = validateComplaintForm(form);
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    setFieldErrors({});
    setSubmitting(true);

    const payload = {
      title: form.title.trim(),
      description: form.description.trim(),
    };
    if (form.asset) {
      payload.asset = form.asset;
    }
    if (form.location.trim()) {
      payload.location = form.location.trim();
    }

    try {
      const created = await createComplaint(payload);
      navigate(`/complaints/${created._id}`, { replace: true });
    } catch (err) {
      setServerError(err.message || "Unable to submit complaint");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <Link to="/dashboard" className="complaint-back-link">
        <ArrowLeft size={16} aria-hidden="true" />
        <span>Back to my complaints</span>
      </Link>

      <PageHeader
        title="Report a problem"
        subtitle="Describe the infrastructure issue and link the affected asset or location."
      />

      <div className="complaint-form-card">
        <form className="complaint-form" onSubmit={handleSubmit} noValidate>
          <Alert variant="error">{serverError}</Alert>

          <Input
            label="Title"
            name="title"
            maxLength={MAX_TITLE_LENGTH}
            placeholder="e.g. Flickering tube light in Room 204"
            value={form.title}
            onChange={updateField("title")}
            error={fieldErrors.title}
            disabled={submitting}
            required
          />

          <div>
            <Textarea
              label="Description"
              name="description"
              rows={5}
              maxLength={MAX_DESCRIPTION_LENGTH}
              placeholder="Explain what is wrong, how severe it looks, and when you noticed it"
              value={form.description}
              onChange={updateField("description")}
              error={fieldErrors.description}
              disabled={submitting}
              required
            />
            <div className="complaint-field-meta">
              {form.description.length} / {MAX_DESCRIPTION_LENGTH}
            </div>
          </div>

          <Select
            label="Asset (optional)"
            name="asset"
            value={form.asset}
            onChange={updateField("asset")}
            disabled={submitting || loadingAssets}
          >
            <option value="">
              {loadingAssets ? "Loading assets..." : "Not listed / other"}
            </option>
            {assets.map((item) => (
              <option key={item._id} value={item._id}>
                {item.assetId} – {item.name}
              </option>
            ))}
          </Select>

          <div>
            <Input
              label="Location"
              name="location"
              placeholder="e.g. Block B, Second Floor, Room 204"
              value={form.location}
              onChange={updateField("location")}
              error={fieldErrors.location}
              disabled={submitting}
            />
            <p className="complaint-field-hint">
              Required if no asset is selected above.
            </p>
          </div>

          <div className="complaint-form-actions">
            <button
              type="submit"
              className="btn btn-primary"
              disabled={submitting}
            >
              {submitting ? "Submitting..." : "Submit complaint"}
            </button>
            <Link to="/dashboard" className="btn btn-secondary">
              Cancel
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}

export default NewComplaint;
