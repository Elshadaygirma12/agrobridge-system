import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ShoppingBag, Package, AlertTriangle } from "lucide-react";
import { getProviderOrders } from "../services/orderService";
import { getUserProducts } from "../services/productService";
import { useAuth } from "../context/AuthContext";
import { useLanguage } from "../context/LanguageContext";
import "../styles/ProviderDashboard.css";

const LOW_STOCK_THRESHOLD = 20;

const ProviderDashboard = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t } = useLanguage();

  const [orders, setOrders] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        // Fetch orders and products in parallel
        const [ordersData, productsData] = await Promise.all([
          getProviderOrders(),
          getUserProducts(user?.id),
        ]);

        const ordersList = Array.isArray(ordersData)
          ? ordersData
          : ordersData.results || [];
        const productsList = Array.isArray(productsData)
          ? productsData
          : productsData.results || [];

        setOrders(ordersList);
        setProducts(productsList);
      } catch (err) {
        console.error("Failed to load dashboard data:", err);
        if (err.response) {
          setError(`Error ${err.response.status}: ${JSON.stringify(err.response.data)}`);
        } else if (err.request) {
          setError(t("noResponseFromServer"));
        } else {
          setError(err.message || t("couldNotLoadOrders"));
        }
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [user?.id]);

  // --- Computed stats from real data ---
  const totalOrders = orders.length;
  const pendingOrders = orders.filter(
    (o) => (o.status || "").toLowerCase() === "pending"
  ).length;

  const totalItemsSold = orders
    .filter((o) => ["confirmed", "delivered"].includes((o.status || "").toLowerCase()))
    .reduce((sum, o) => sum + (Number(o.quantity) || 0), 0);

  const lowStockProducts = products.filter((p) => {
    const stock = p.quantity_available ?? p.quantity ?? p.stock ?? 0;
    return stock > 0 && stock <= LOW_STOCK_THRESHOLD;
  });

  const recentOrders = [...orders]
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    .slice(0, 3);

  const getTranslatedStatus = (status) => {
    const lower = (status || "").toLowerCase();
    if (lower === "pending") return t("pending");
    if (lower === "confirmed") return t("confirmed");
    if (lower === "delivered") return t("delivered");
    if (lower === "cancelled") return t("cancelled");
    return status;
  };

  const stats = [
    {
      label: t("ordersLabelDashboard"),
      value: totalOrders,
      trend: t("pendingOrdersTrend").replace("{count}", pendingOrders),
      icon: <ShoppingBag size={20} />,
      trendClass: pendingOrders > 0 ? "warning" : "neutral",
    },
    {
      label: t("itemsSoldLabel"),
      value: `${totalItemsSold.toLocaleString()} kg`,
      trend: t("acrossProductsTrend").replace("{count}", products.length),
      icon: <Package size={20} />,
      trendClass: "neutral",
    },
    {
      label: t("lowStockLabel"),
      value: lowStockProducts.length,
      trend: lowStockProducts.length > 0 ? t("needsRestockingTrend") : t("allStockedTrend"),
      icon: <AlertTriangle size={20} />,
      trendClass: lowStockProducts.length > 0 ? "warning" : "good",
    },
  ];

  if (loading) {
    return (
      <div className="dashboard-container">
        <header className="dashboard-header">
          <h1>{t("providerDashboardTitle")}</h1>
          <p className="dashboard-subtitle">{t("loading")}</p>
        </header>
        <div style={{ textAlign: "center", padding: "4rem" }}>
          <div className="spinner"></div>
          <p style={{ color: "var(--text-muted)", marginTop: "1rem" }}>
            {t("loading")}
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="dashboard-container">
        <header className="dashboard-header">
          <h1>{t("providerDashboardTitle")}</h1>
        </header>
        <div
          style={{
            padding: "2rem",
            background: "#fef2f2",
            borderRadius: "12px",
            color: "#991b1b",
            wordBreak: "break-all",
          }}
        >
          <strong>{t("couldNotLoadOrders")}</strong>
          <p style={{ marginTop: "0.5rem", fontSize: "0.9rem" }}>{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-container">
      <header className="dashboard-header">
        <h1>{t("providerDashboardTitle")}</h1>
        <p className="dashboard-subtitle">
          {t("providerDashboardSubtitle")}
        </p>
      </header>

      {/* Stats Cards */}
      <div className="stats-grid">
        {stats.map((stat, index) => (
          <div key={index} className="stat-card">
            <span className="stat-label">{stat.label}</span>
            <span className="stat-value">{stat.value}</span>
            <div className={`stat-trend ${stat.trendClass}`}>{stat.trend}</div>
          </div>
        ))}
      </div>

      <div className="dashboard-main">
        {/* Recent Orders */}
        <section className="dashboard-section">
          <div className="section-header">
            <h2>{t("recentOrdersTitle")}</h2>
            <button className="btn-view-all" onClick={() => navigate("/orders")}>
              {t("viewAllBtn")}
            </button>
          </div>
          {recentOrders.length === 0 ? (
            <p style={{ color: "var(--text-muted)", padding: "1rem 0" }}>
              {t("noOrdersYetDashboard")}
            </p>
          ) : (
            <div className="table-container">
              <table className="orders-table">
                <thead>
                  <tr>
                    <th>{t("orderLabel") || t("orderId")}</th>
                    <th>{t("product")}</th>
                    <th>{t("qty")}</th>
                    <th>{t("status")}</th>
                  </tr>
                </thead>
                <tbody>
                  {recentOrders.map((order, index) => (
                    <tr key={order.id}>
                      <td>#{index + 1}</td>
                      <td>{order.product_name || order.product}</td>
                      <td>{order.quantity} {order.unit || "kg"}</td>
                      <td>
                        <span
                          style={{
                            padding: "2px 10px",
                            borderRadius: "9999px",
                            fontSize: "0.78rem",
                            fontWeight: 600,
                            background:
                              order.status?.toLowerCase() === "confirmed" || order.status?.toLowerCase() === "delivered"
                               ? "#f0fdf4"
                                : order.status?.toLowerCase() === "cancelled"
                                ? "#fef2f2"
                                : "#f1f5f9",
                            color:
                              order.status?.toLowerCase() === "confirmed" || order.status?.toLowerCase() === "delivered"
                                ? "#166534"
                                : order.status?.toLowerCase() === "cancelled"
                                ? "#dc2626"
                                : "#475569",
                          }}
                        >
                          {getTranslatedStatus(order.status || "Pending")}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* Low Stock */}
        <section className="dashboard-section">
          <div className="section-header">
            <h2>{t("lowStockLabel")}</h2>
            <button className="btn-update" onClick={() => navigate("/manage-products")}>
              {t("updateInventoryBtn")}
            </button>
          </div>
          {lowStockProducts.length === 0 ? (
            <p style={{ color: "var(--text-muted)", padding: "1rem 0" }}>
              {t("allProductsStockedMsg")}
            </p>
          ) : (
            <div className="low-stock-list">
              {lowStockProducts.map((item) => {
                const stock =
                  item.quantity_available ?? item.quantity ?? item.stock ?? 0;
                return (
                  <div key={item.id} className="low-stock-item">
                    <div className="item-info">
                      <h4>{item.name}</h4>
                      <p className="item-meta">
                        {stock} {item.unit || "kg"} {t("remainingLabel")}
                      </p>
                    </div>
                    <span className="badge-low-stock">{t("lowStockBadge")}</span>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </div>
  );
};

export default ProviderDashboard;
