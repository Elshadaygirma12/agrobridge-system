import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { getUserProducts, deleteProduct } from "../services/productService";
import { getProductImage } from "../utils/imageUrl";
import { useLanguage } from "../context/LanguageContext";
import "../styles/ProductManagement.css";

const ProductManagement = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t } = useLanguage();

  // --- State ---
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [deletingId, setDeletingId] = useState(null); // tracks which product is being deleted

  // --- Fetch products on mount ---
  useEffect(() => {
    if (user && user.id) {
      fetchProducts(user.id);
    }
  }, [user]);

  const fetchProducts = async (providerId) => {
    setLoading(true);
    setError("");
    try {
      const data = await getUserProducts(providerId);
      console.log("Fetched Products for Management:", data);
      // The backend may return an array directly, or { results: [...] }
      const list = Array.isArray(data) ? data : data.results || [];
      setProducts(list);
    } catch (err) {
      console.error("Failed to fetch products:", err);
      const msg =
        err.response?.data?.detail ||
        err.response?.data?.message ||
        t("loadProductsError");
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  // --- Delete a product ---
  const handleDelete = async (id, name) => {
    const confirmed = window.confirm(
      t("deleteProductConfirm").replace("{name}", name)
    );
    if (!confirmed) return;

    setDeletingId(id);
    try {
      await deleteProduct(id);
      // Remove from local state after successful API delete
      setProducts((prev) => prev.filter((p) => p.id !== id));
    } catch (err) {
      console.error("Failed to delete product:", err);
      const msg =
        err.response?.data?.detail ||
        err.response?.data?.message ||
        t("deleteProductError");
      alert(msg);
    } finally {
      setDeletingId(null);
    }
  };

  // --- Status badge based on stock ---
  const getStatusBadge = (stock) => {
    if (stock > 20) {
      return <span className="status-badge in-stock">{t("inStock")}</span>;
    } else if (stock > 0) {
      return <span className="status-badge low-stock">{t("lowStockBadge")}</span>;
    } else {
      return <span className="status-badge out-stock">{t("outOfStock")}</span>;
    }
  };

  // --- Render ---
  return (
    <div className="products-page">
      <div className="products-header">
        <div>
          <h1>{t("productManagementTitle")}</h1>
          <p className="subtitle">
            {t("productManagementSubtitle")}
          </p>
        </div>
        <button
          className="btn btn-add"
          onClick={() => navigate("/add-product")}
        >
          {t("addProductBtn")}
        </button>
      </div>

      {/* Error state */}
      {error && (
        <div className="products-error">
          <p>{error}</p>
          <button className="btn btn-retry" onClick={() => user && fetchProducts(user.id)}>
            {t("retryBtn")}
          </button>
        </div>
      )}

      {/* Loading state */}
      {loading && (
        <div className="products-loading">
          <div className="spinner"></div>
          <p>{t("loading")}...</p>
        </div>
      )}

      {/* Empty state */}
      {!loading && !error && products.length === 0 && (
        <div className="products-empty">
          <p>{t("noProductsYet")}</p>
          <p className="subtitle">
            {t("noProductsYetSubtitle")}
          </p>
        </div>
      )}

      {/* Products table */}
      {!loading && !error && products.length > 0 && (
        <div className="products-card">
          <table className="products-table">
            <thead>
              <tr>
                <th>{t("productHeader")}</th>
                <th>{t("priceHeader")}</th>
                <th>{t("stockHeader")}</th>
                <th>{t("statusHeader")}</th>
                <th>{t("actionsHeader")}</th>
              </tr>
            </thead>
            <tbody>
              {products.map((product) => (
                <tr key={product.id}>
                  <td>
                    <div className="product-info-wrapper">
                      <div className="product-thumbnail">
                        {getProductImage(product) ? (
                          <img src={getProductImage(product)} alt={product.name} />
                        ) : (
                          <div className="thumbnail-placeholder"></div>
                        )}
                      </div>
                      <div className="product-info">
                        <span className="product-name">{product.name}</span>
                        <span className="product-meta">
                          {product.category && `${product.category} • `}
                          {product.updated_at
                            ? t("updatedAt").replace("{date}", new Date(product.updated_at).toLocaleDateString())
                            : t("updatedToday")}
                        </span>
                      </div>
                    </div>
                  </td>
                  <td>
                    {Number(product.price).toLocaleString()} {t("birrUnit")} /{" "}
                    {product.unit || "kg"}
                  </td>
                  <td>
                    {(product.quantity_available ||
                      product.quantity ||
                      product.stock ||
                      0) > 0
                      ? `${product.quantity_available || product.quantity || product.stock} ${product.unit || "kg"}`
                      : "0"}
                  </td>
                  <td>
                    {getStatusBadge(
                      product.quantity_available ??
                        product.quantity ??
                        product.stock ??
                        0,
                    )}
                  </td>
                  <td className="actions-cell">
                    <button
                      className="btn-action edit"
                      onClick={() => navigate(`/add-product/${product.id}`)}
                    >
                      {t("editBtn")}
                    </button>
                    <button
                      className="btn-action delete"
                      onClick={() => handleDelete(product.id, product.name)}
                      disabled={deletingId === product.id}
                    >
                      {deletingId === product.id ? t("deleting") : t("deleteBtn")}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default ProductManagement;
