import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { 
   ArrowLeft, 
   Package, 
   ShoppingCart, 
   User, 
   Phone, 
   Tag, 
   Info, 
   ChevronRight 
} from "lucide-react";
import { getProduct } from "../services/productService";
import { getProductImage } from "../utils/imageUrl";
import { useAuth } from "../context/AuthContext";
import { useLanguage } from "../context/LanguageContext";
import "../styles/ProductDetails.css";

const ProductDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuth();
  const { t } = useLanguage();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchProductDetails = async () => {
      try {
        setLoading(true);
        const data = await getProduct(id);
        setProduct(data);
      } catch (err) {
        console.error("Failed to fetch product details:", err);
        setError("Could not load product details. Please try again later.");
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchProductDetails();
    }
  }, [id]);

  if (loading) {
    return (
      <div className="details-loading">
        <div className="spinner"></div>
        <p>{t("loading")}</p>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="details-error-container">
        <div className="error-card">
          <h2>{t("oopsTitle")}</h2>
          <p>{error || t("productNotFound")}</p>
          <button className="btn-back-home" onClick={() => navigate("/products")}>
            <ArrowLeft size={18} />
            {t("backToProducts")}
          </button>
        </div>
      </div>
    );
  }

  const stock = product.quantity_available ?? product.quantity ?? product.stock ?? 0;

  const getStatusInfo = (stock) => {
    if (stock > 20) return { label: t("inStockStatus"), class: "status-in-stock" };
    if (stock > 0) return { label: t("lowStockStatus"), class: "status-low-stock" };
    return { label: t("outOfStockStatus"), class: "status-out" };
  };

  const statusInfo = getStatusInfo(stock);

  const handlePlaceOrder = () => {
    if (!isAuthenticated) {
      // Redirect to login with return path
      navigate(`/login?redirectTo=/place-order/${id}`);
      return;
    }
    navigate(`/place-order/${id}`);
  };

  return (
    <div className="product-details-container">
      <nav className="breadcrumb">
        <span onClick={() => navigate("/")}>{t("home")}</span>
        <ChevronRight size={14} />
        <span onClick={() => navigate("/products")}>{t("products")}</span>
        <ChevronRight size={14} />
        <span className="current">{product.name}</span>
      </nav>

      <button className="btn-back-link" onClick={() => navigate("/products")}>
        <ArrowLeft size={18} />
        {t("backToProducts")}
      </button>

      <div className="product-details-grid">
        <div className="product-visuals">
          <div className="main-image-container">
            {getProductImage(product) ? (
              <img src={getProductImage(product)} alt={product.name} className="main-image" />
            ) : (
              <div className="details-image-placeholder">
                <Package size={64} color="#cbd5e1" />
              </div>
            )}
          </div>
        </div>

        <div className="product-info-panel">
          <div className="product-header-section">
            <span className={`details-status-badge ${statusInfo.class}`}>
              {statusInfo.label}
            </span>
            <h1 className="details-title">{product.name}</h1>
            <div className="details-price-tag">
              <span className="price-value">{Number(product.price).toLocaleString()} {t("birrUnit")}</span>
              <span className="price-unit">/ {product.unit || "kg"}</span>
            </div>
          </div>

          <div className="details-section">
            <h3><Info size={18} /> {t("productDescription")}</h3>
            <p className="description-text">
              {product.description || t("noDescription")}
            </p>
          </div>

          <div className="details-meta-grid">
            <div className="meta-item">
              <Tag size={18} />
              <div className="meta-content">
                <label>{t("categoryLabel")}</label>
                <span>{product.category || "General"}</span>
              </div>
            </div>
            <div className="meta-item">
              <Package size={18} />
              <div className="meta-content">
                <label>{t("availableQuantityLabel")}</label>
                <span>{stock} {product.unit || "kg"}</span>
              </div>
            </div>
          </div>

          <div className="provider-info-card">
            <h3>{t("sellerInformation")}</h3>
            <div className="provider-row">
              <User size={18} />
              <span>{product.provider_name || product.full_name || product.provider || t("unknownProvider")}</span>
            </div>
            {(product.provider_phone || product.phone) && (
              <div className="provider-row">
                <Phone size={18} />
                <a href={`tel:${product.provider_phone || product.phone}`}>
                  {product.provider_phone || product.phone}
                </a>
              </div>
            )}
          </div>

          <div className="details-actions">
            <button
              className={`btn-primary-order ${stock <= 0 ? "disabled" : ""}`}
              disabled={stock <= 0}
              onClick={handlePlaceOrder}
            >
              <ShoppingCart size={20} />
              {t("orderNowBtn")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductDetails;
