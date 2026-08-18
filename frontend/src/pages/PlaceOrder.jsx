import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { CheckCircle, Package, ArrowLeft } from "lucide-react";
import { getProduct } from "../services/productService";
import { createOrder } from "../services/orderService";
import { getProductImage } from "../utils/imageUrl";
import { useAuth } from "../context/AuthContext";
import { isProviderRole } from "../utils/roles";
import { useLanguage } from "../context/LanguageContext";
import "../styles/PlaceOrder.css";

/** Returns the minimum order quantity for a given unit */
const getMinQuantity = (unit) => {
  switch ((unit || "kg").toLowerCase()) {
    case "q":  return 1;
    case "dz": return 5;
    case "l":  return 10;
    case "kg":
    default:   return 10;
  }
};

const PlaceOrder = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [quantity, setQuantity] = useState("");
  const [quantityError, setQuantityError] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [phoneError, setPhoneError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [submitError, setSubmitError] = useState("");

  const { isAuthenticated, loading: authLoading, user } = useAuth();
  const isProvider = isProviderRole(user?.role);

  // Wait until auth state is fully resolved before checking authentication
  useEffect(() => {
    if (authLoading) return;
    if (!isAuthenticated) {
      navigate(`/login?redirectTo=/place-order/${id}`);
      return;
    }
  }, [authLoading, isAuthenticated, navigate, id]);

  useEffect(() => {
    const fetchProduct = async () => {
      try {
        setLoading(true);
        const data = await getProduct(id);
        setProduct(data);
      } catch (err) {
        console.error("Failed to fetch product:", err);
        setError("Could not load product details.");
      } finally {
        setLoading(false);
      }
    };

    // Only fetch product once auth is resolved and user is authenticated
    if (id && !authLoading && isAuthenticated) {
      fetchProduct();
    }
  }, [id, authLoading, isAuthenticated]);

  const validateQuantity = (val, stock, unit) => {
    const min = getMinQuantity(unit);
    if (val === "" || isNaN(val)) return t("enterQuantityError");
    if (val < min) return `${t("minOrderErrorPrefix")}${unit || "kg"}${t("minOrderErrorSuffix").replace("{min}", min)}`;
    if (val > stock) return t("onlyAvailableError").replace("{stock}", stock);
    return "";
  };

  const handleQuantityChange = (e) => {
    const raw = e.target.value;
    if (raw === "") {
      setQuantity("");
      setQuantityError(t("enterQuantityError"));
      return;
    }
    const value = parseInt(raw, 10);
    if (isNaN(value)) return;
    const stock = product?.quantity_available ?? product?.quantity ?? product?.stock ?? 0;
    const unit  = product?.unit || "kg";
    setQuantity(value);
    setQuantityError(validateQuantity(value, stock, unit));
  };

  const handleBlur = () => {
    if (quantity === "") {
      const min = getMinQuantity(product?.unit || "kg");
      setQuantity(min);
      setQuantityError("");
    }
  };

  const handleConfirmOrder = async () => {
    if (!isAuthenticated) {
      navigate(`/login?redirectTo=/place-order/${id}`);
      return;
    }

    const stock = product?.quantity_available ?? product?.quantity ?? product?.stock ?? 0;
    const unit  = product?.unit || "kg";
    const qErr  = validateQuantity(quantity, stock, unit);
    if (qErr) { setQuantityError(qErr); return; }

    if (!phoneNumber.trim()) {
      setPhoneError(t("enterPhoneError"));
      return;
    }
    setPhoneError("");
    setSubmitError("");

    setSubmitting(true);
    try {
      await createOrder(id, quantity, { phone: phoneNumber });
      setSuccess(true);
      setTimeout(() => navigate("/my-orders"), 3000);
    } catch (err) {
      console.error("Order placement failed:", err);
      if (err.response) {
        const data = err.response.data;
        const msg =
          typeof data === "string"
            ? data
            : data?.detail ||
              data?.quantity?.join(" ") ||
              data?.non_field_errors?.join(", ") ||
              JSON.stringify(data);
        setSubmitError(msg);
      } else if (err.request) {
        setSubmitError("No response from server. Make sure the backend is running.");
      } else {
        setSubmitError(err.message);
      }
    } finally {
      setSubmitting(false);
    }
  };

  // Show spinner while auth state is being resolved (prevents flash of the order form)
  if (authLoading) {
    return (
      <div className="place-order-container">
        <div className="order-loading">
          <div className="spinner"></div>
          <p>{t("checkingAuth")}</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="place-order-container">
        <div className="order-loading">
          <div className="spinner"></div>
          <p>{t("loading")}</p>
        </div>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="place-order-container">
        <div className="order-error">
          <p className="error-message">{error || t("productNotFound")}</p>
          <button className="btn-back" onClick={() => navigate("/products")}>
            <ArrowLeft size={16} /> {t("backToProducts")}
          </button>
        </div>
      </div>
    );
  }

  const stock    = product.quantity_available ?? product.quantity ?? product.stock ?? 0;
  const unit     = product.unit || "kg";
  const minQty   = getMinQuantity(unit);
  const totalPrice = Number(product.price) * (quantity || 0);
  const canSubmit = !quantityError && quantity !== "" && !submitting && quantity <= stock;

  if (success) {
    return (
      <div className="place-order-container">
        <div className="order-card success-message">
          <div className="success-icon">
            <CheckCircle size={32} />
          </div>
          <h2>{t("orderSuccessMessage")}</h2>
          <p>{t("orderSuccessMessageSub")}</p>
          <button className="btn-confirm-order" onClick={() => navigate("/my-orders")}>
            {t("viewMyOrdersBtn")}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="place-order-container">
      <div className="order-card">
        <div className="order-header">
          <h1>{t("placeYourOrderTitle")}</h1>
          <p>{t("confirmPurchaseSubtitle")}</p>
        </div>

        <div className="product-summary">
          {getProductImage(product) ? (
            <img src={getProductImage(product)} alt={product.name} />
          ) : (
            <div className="placeholder-img">
              <Package size={32} color="#cbd5e1" />
            </div>
          )}
          <div className="summary-details">
            <h3>{product.name}</h3>
            <div className="price">{Number(product.price).toLocaleString()} {t("birrUnit")} / {product.unit || "kg"}</div>
            <div className="stock">{t("availableLabel")}: {stock} {product.unit || "kg"}</div>
          </div>
        </div>

        <div className="order-form">
          <div className="form-group">
            <label>{t("quantity")} ({unit})</label>
            <input
              type="number"
              className={`quantity-input ${quantityError ? "input-error" : ""}`}
              value={quantity}
              onChange={handleQuantityChange}
              onBlur={handleBlur}
              min={minQty}
              max={stock}
            />
            {quantityError && (
              <span className="field-error">{quantityError}</span>
            )}
          </div>

          <div className="form-group">
            <label>{t("phoneLabel")}</label>
            <input
              type="tel"
              className={`phone-input ${phoneError ? "input-error" : ""}`}
              placeholder="e.g. 0911..."
              value={phoneNumber}
              onChange={(e) => { setPhoneNumber(e.target.value); setPhoneError(""); }}
            />
            {phoneError && <span className="field-error">{phoneError}</span>}
          </div>

          <div className="order-total">
            <span>{t("totalPriceLabel")}:</span>
            <span className="total-price">{totalPrice.toLocaleString()} {t("birrUnit")}</span>
          </div>

          {submitError && (
            <div className="submit-error">
              <span>⚠ {submitError}</span>
            </div>
          )}

          <div className="order-actions">
            <button
              className="btn-cancel-order"
              onClick={() => navigate(-1)}
              disabled={submitting}
            >
              {t("cancel")}
            </button>
            <button
              className="btn-confirm-order"
              onClick={handleConfirmOrder}
              disabled={!canSubmit}
            >
              {submitting ? t("orderingBtn") : t("confirmOrder")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PlaceOrder;
