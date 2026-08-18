import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Search, Filter, ArrowUpDown, Eye, ShoppingCart, Package } from "lucide-react";
import { getPublicProducts } from "../services/productService";
import { getProductImage } from "../utils/imageUrl";
import { useAuth } from "../context/AuthContext";
import { useLanguage } from "../context/LanguageContext";
import "../styles/BrowseProducts.css";

const BrowseProducts = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [searchTerm, setSearchTerm] = useState("");
  const [category, setCategory] = useState("All");
  const [sortBy, setSortBy] = useState("Recommended");

  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  
  const { isAuthenticated, user } = useAuth();

  const handleQuickOrder = (e, productId) => {
    e.stopPropagation(); // prevent card click if any
    if (!isAuthenticated) {
      navigate(`/login?redirectTo=/place-order/${productId}`);
      return;
    }
    navigate(`/place-order/${productId}`);
  };

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const data = await getPublicProducts();
        console.log("[Browse Debug] Product Data:", data);
        const list = Array.isArray(data) ? data : data.results || [];
        setProducts(list);
      } catch (err) {
        console.error("Failed to fetch products:", err);
        setError("Failed to load products. Showing mock data instead.");
        // Fallback to empty or mock if needed, but for now we'll just show the error
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, []);

  const getStatusClass = (stock) => {
    if (stock > 20) return "status-in-stock";
    if (stock > 0) return "status-low-stock";
    return "status-out";
  };

  const getStockLabel = (stock) => {
    if (stock > 20) return t("inStockStatus");
    if (stock > 0) return t("lowStockStatus");
    return t("outOfStockStatus");
  };

  const filteredProducts = products
    .filter((product) => {
      const stock = product.quantity_available ?? product.quantity ?? product.stock ?? 0;
      const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory =
        category === "All" ||
        (product.category && product.category.toLowerCase() === category.toLowerCase());
      return matchesSearch && matchesCategory && stock > 0;
    })
    .sort((a, b) => {
      if (sortBy === "Price: Low to High") {
        return Number(a.price) - Number(b.price);
      }
      if (sortBy === "Price: High to Low") {
        return Number(b.price) - Number(a.price);
      }
      return 0; // "Recommended" or default
    });

  return (
    <div className="browse-container">
      <header className="browse-header">
        <div className="header-content">
          <h1>{t("browseProductsTitle")}</h1>
          <p>{t("browseProductsSubtitle")}</p>
        </div>
      </header>

      <section className="filter-bar">
        <div className="filter-group">
          <label>{t("searchLabel")}</label>
          <div className="input-with-icon">
            <Search size={18} className="icon" />
            <input
              type="text"
              placeholder={t("searchPlaceholder")}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <div className="filter-group">
          <label>{t("categoryLabel")}</label>
          <div className="select-wrapper">
            <select value={category} onChange={(e) => setCategory(e.target.value)}>
              <option value="All">{t("allCategories")}</option>
              <option value="Vegetables">{t("vegetables")}</option>
              <option value="Fruits">{t("fruits")}</option>
              <option value="Grains">{t("grains")}</option>
              <option value="Tubers">{t("tubers")}</option>
              <option value="Meat & Poultry">{t("meatPoultry")}</option>
              <option value="Dairy">{t("dairy")}</option>
              <option value="Others">{t("others")}</option>
            </select>
          </div>
        </div>

        <div className="filter-group">
          <label>{t("sortLabel")}</label>
          <div className="select-wrapper">
            <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
              <option value="Recommended">{t("recommended")}</option>
              <option value="Price: Low to High">{t("priceLowHigh")}</option>
              <option value="Price: High to Low">{t("priceHighLow")}</option>
            </select>
          </div>
        </div>

        <div className="filter-actions">
          <button className="btn-reset" onClick={() => { setSearchTerm(""); setCategory("All"); setSortBy("Recommended"); }}>
            {t("resetBtn")}
          </button>
        </div>
      </section>

      {loading ? (
        <div className="products-loading" style={{ textAlign: 'center', padding: '3rem' }}>
          <div className="spinner"></div>
          <p>{t("loadingProducts")}</p>
        </div>
      ) : error && products.length === 0 ? (
        <div className="error-state" style={{ textAlign: 'center', padding: '3rem', background: '#fef2f2', borderRadius: '12px' }}>
          <p style={{ color: '#991b1b' }}>{error}</p>
        </div>
      ) : (
        <div className="product-grid">
          {filteredProducts.map((product) => {
            const stock = product.quantity_available ?? product.quantity ?? product.stock ?? 0;
            return (
              <div key={product.id} className="product-card">
                <div className="product-image">
                  {getProductImage(product) ? (
                    <img src={getProductImage(product)} alt={product.name} />
                  ) : (
                    <div className="image-placeholder">
                      <Package size={32} color="#cbd5e1" />
                    </div>
                  )}
                </div>
                <div className="product-details">
                  <div className="product-main">
                    <h3 className="product-name">{product.name}</h3>
                    <div className="product-price-row">
                      <span className="product-price">
                        {Number(product.price).toLocaleString()} {t("birrUnit")} / {product.unit || "kg"}
                      </span>
                      <span className={`status-badge ${getStatusClass(stock)}`}>
                        {getStockLabel(stock)}
                      </span>
                    </div>
                  </div>
                  <div className="product-actions">
                    <button className="btn-view" onClick={() => navigate(`/products/${product.id}`)}>
                      <Eye size={16} />
                      {t("viewBtn")}
                    </button>
                    <button
                      className={`btn-order ${stock <= 0 ? "disabled" : ""}`}
                      disabled={stock <= 0}
                      onClick={(e) => handleQuickOrder(e, product.id)}
                    >
                      <ShoppingCart size={16} />
                      {t("quickOrderBtn")}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {!loading && filteredProducts.length === 0 && (
        <div className="empty-state">
          <h3>{t("noProductsTitle")}</h3>
          <p>{t("noProductsSubtitle")}</p>
        </div>
      )}
    </div>
  );
};

export default BrowseProducts;
