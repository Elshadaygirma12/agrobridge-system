import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  getProduct,
  createProduct,
  updateProduct,
} from "../services/productService";
import { useAuth } from "../context/AuthContext";
import { useLanguage } from "../context/LanguageContext";
import { isProviderRole } from "../utils/roles";
import { getImageUrl } from "../utils/imageUrl";
import "../styles/AddProduct.css";

const AddProduct = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t } = useLanguage();
  const { id } = useParams(); // If present, we're in EDIT mode
  const productsHome = isProviderRole(user?.role)
    ? "/manage-products"
    : "/products";
  const fileInputRef = useRef(null);

  const isEditMode = Boolean(id);

  // --- State ---
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    price: "",
    unit: "kg",
    stock: "",
    category: "Vegetables",
  });
  const [imageFile, setImageFile] = useState(null); // File object for upload
  const [imagePreview, setImagePreview] = useState(null); // URL string for preview
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false); // true while fetching product for edit
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState("");

  // --- If edit mode, fetch the existing product ---
  useEffect(() => {
    if (!isEditMode) return;

    const fetchProduct = async () => {
      setLoading(true);
      setError("");
      try {
        const data = await getProduct(id);
        setFormData({
          name: data.name || "",
          description: data.description || "",
          price: data.price || "",
          unit: data.unit || "kg",
          stock: data.quantity_available ?? data.quantity ?? data.stock ?? "",
          category: data.category || "Vegetables",
        });
        // If backend returns an image URL, show it as preview
        if (data.image) {
          setImagePreview(getImageUrl(data.image));
        }
      } catch (err) {
        console.error("Failed to fetch product:", err);
        const msg =
          err.response?.data?.detail ||
          err.response?.data?.message ||
          t("loadProductDetailsError");
        setError(msg);
      } finally {
        setLoading(false);
      }
    };

    fetchProduct();
  }, [id, isEditMode]);

  // --- Handlers ---
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleImageSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setImageFile(file);
    // Create a local preview URL
    setImagePreview(URL.createObjectURL(file));
  };

  const handleRemoveImage = () => {
    setImageFile(null);
    setImagePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();

    // --- Client-side validation ---
    if (!formData.name || !formData.price || !formData.stock) {
      setError(t("fillProductFormError"));
      setSuccess("");
      return;
    }

    if (Number(formData.price) <= 0) {
      setError(t("pricePositiveError"));
      setSuccess("");
      return;
    }

    setError("");
    setSuccess("");
    setSubmitting(true);

    try {
      // Build the payload — use FormData if there's an image, plain object otherwise
      let payload;

      if (imageFile) {
        payload = new FormData();
        payload.append("name", formData.name);
        payload.append("description", formData.description);
        payload.append("price", formData.price);
        payload.append("unit", formData.unit);
        payload.append("quantity_available", formData.stock);
        payload.append("category", formData.category);
        payload.append("image", imageFile);
      } else {
        payload = {
          name: formData.name,
          description: formData.description,
          price: formData.price,
          unit: formData.unit,
          quantity_available: formData.stock,
          category: formData.category,
        };
      }

      if (isEditMode) {
        await updateProduct(id, payload);
        setSuccess(t("productUpdatedSuccess"));
      } else {
        await createProduct(payload);
        setSuccess(t("productCreatedSuccess"));
      }

      // Navigate back to management page after a brief delay so user sees the success message
      setTimeout(() => navigate("/manage-products"), 1200);
    } catch (err) {
      console.error("Failed to save product:", err);
      // Try to extract meaningful error from backend response
      const responseData = err.response?.data;
      let msg = t("saveProductError");

      if (responseData) {
        if (typeof responseData === "string") {
          msg = responseData;
        } else if (responseData.detail) {
          msg = responseData.detail;
        } else if (responseData.message) {
          msg = responseData.message;
        } else {
          // Django REST may return field-level errors like { name: ["This field is required."] }
          const fieldErrors = Object.entries(responseData)
            .map(
              ([field, errors]) =>
                `${field}: ${Array.isArray(errors) ? errors.join(", ") : errors}`,
            )
            .join(" | ");
          if (fieldErrors) msg = fieldErrors;
        }
      }

      setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  // --- Render ---
  if (loading) {
    return (
      <div className="add-product-page">
        <div className="products-loading">
          <div className="spinner"></div>
          <p>{t("loadingProductDetails")}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="add-product-page">
      <div className="header-actions">
        <div>
          <h1>{isEditMode ? t("editProductTitle") : t("addProductTitle")}</h1>
          <p className="subtitle">
            {isEditMode ? t("editProductSubtitle") : t("addProductSubtitle")}
          </p>
        </div>
        <button
          className="btn btn-outline"
          onClick={() => navigate(productsHome)}
        >
          {t("backToProductsBtn")}
        </button>
      </div>

      {/* Success message */}
      {success && (
        <div className="success-card visible">
          <span className="success-badge">{t("successAlertTitle")}</span>
          <p className="success-text">{success}</p>
        </div>
      )}

      <div className="add-product-content">
        {/* Left Column: Form Details */}
        <div className="form-column">
          <div className="card">
            <h2>{t("productDetailsHeader")}</h2>
            <form id="productForm" onSubmit={handleSave}>
              <div className="form-group">
                <label>{t("productNameLabel")}</label>
                <input
                  type="text"
                  name="name"
                  placeholder="e.g., Fresh Tomatoes"
                  value={formData.name}
                  onChange={handleChange}
                />
              </div>

              <div className="form-group">
                <label>{t("descriptionLabel")}</label>
                <textarea
                  name="description"
                  placeholder={t("descriptionPlaceholder")}
                  rows="4"
                  value={formData.description}
                  onChange={handleChange}
                ></textarea>
              </div>

              <div className="form-row">
                <div className="form-group half">
                  <label>{t("priceLabel")}</label>
                  <input
                    type="number"
                    name="price"
                    placeholder="2500"
                    min="0"
                    value={formData.price}
                    onChange={handleChange}
                  />
                </div>
                <div className="form-group half">
                  <label>{t("unitLabel")}</label>
                  <select
                    name="unit"
                    value={formData.unit}
                    onChange={handleChange}
                  >
                    <option value="kg">{t("kilogramUnit")}</option>
                    <option value="quintal">{t("quintalUnit")}</option>
                    <option value="l">{t("literUnit")}</option>
                    <option value="dz">{t("dozenUnit")}</option>
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label>{t("qtyAvailableLabel")}</label>
                <input
                  type="number"
                  name="stock"
                  placeholder="120"
                  min="0"
                  value={formData.stock}
                  onChange={handleChange}
                />
              </div>

              <div className="form-group">
                <label>{t("categoryLabel")}</label>
                <select
                  name="category"
                  value={formData.category}
                  onChange={handleChange}
                >
                  <option value="Vegetables">{t("categoryVegetables")}</option>
                  <option value="Fruits">{t("categoryFruits")}</option>
                  <option value="Grains">{t("categoryGrains")}</option>
                  <option value="Tubers">{t("categoryTubers")}</option>
                  <option value="Meat & Poultry">{t("categoryMeat")}</option>
                  <option value="Dairy">{t("categoryDairy")}</option>
                  <option value="Others">{t("categoryOthers")}</option>
                </select>
              </div>

              <div className="form-actions">
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() => navigate(productsHome)}
                >
                  {t("cancelBtn")}
                </button>
                <button
                  type="submit"
                  className="btn btn-save"
                  disabled={submitting}
                >
                  {submitting
                    ? t("saving")
                    : isEditMode
                      ? t("updateProductBtn")
                      : t("saveProductBtn")}
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Right Column: Image and Error Handling */}
        <div className="media-column">
          <div className="card">
            <h2>{t("productImageHeader")}</h2>
            <div className="upload-area">
              <p>
                <strong>{t("uploadBold")}</strong> {t("uploadInstructions")}
              </p>
              {/* Image preview or placeholder */}
              {imagePreview ? (
                <img
                  src={imagePreview}
                  alt="Product preview"
                  className="image-preview"
                />
              ) : (
                <div className="image-placeholder"></div>
              )}
              {/* Hidden file input */}
              <input
                type="file"
                ref={fileInputRef}
                accept="image/*"
                onChange={handleImageSelect}
                style={{ display: "none" }}
              />
              <div className="upload-actions">
                <button
                  type="button"
                  className="btn-action"
                  onClick={() => fileInputRef.current?.click()}
                >
                  {t("chooseFileBtn")}
                </button>
                <button
                  type="button"
                  className="btn-action delete"
                  onClick={handleRemoveImage}
                >
                  {t("removeBtn")}
                </button>
              </div>
            </div>
          </div>

          <div className={`error-card ${error ? "visible" : ""}`}>
            <span className="error-badge">{t("invalidDataBadge")}</span>
            <p className="error-text">{error}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AddProduct;
