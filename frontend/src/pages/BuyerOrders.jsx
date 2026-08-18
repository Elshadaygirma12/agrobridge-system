import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Package } from "lucide-react";
import { getBuyerOrders, updateOrderStatus, deliverOrder } from "../services/orderService";
import { useLanguage } from "../context/LanguageContext";
import "../styles/Orders.css";

const BuyerOrders = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionError, setActionError] = useState("");

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        setLoading(true);
        const data = await getBuyerOrders();
        const list = Array.isArray(data) ? data : data.results || [];
        setOrders(list);
      } catch (err) {
        console.error("Failed to fetch buyer orders:", err);
        setError(t("buyerOrdersError"));
      } finally {
        setLoading(false);
      }
    };

    fetchOrders();
  }, []);

  const handleMarkDelivered = async (orderId) => {
    setActionError("");
    try {
      await deliverOrder(orderId);
      setOrders((prev) =>
        prev.map((o) => (o.id === orderId ? { ...o, status: "delivered" } : o))
      );
    } catch (err) {
      console.error("Failed to mark order as delivered:", err);
      if (err.response && err.response.data) {
        const data = err.response.data;
        const msg =
          typeof data === "string"
            ? data
            : data?.error ||
              data?.detail ||
              data?.non_field_errors?.join(", ") ||
              data?.status?.join(", ") ||
              data?.product?.join(", ") ||
              JSON.stringify(data);
        setActionError(msg);
      } else {
        setActionError(t("orderUpdateFail"));
      }
    }
  };

  const getStatusClass = (status) => {
    switch ((status || "").toLowerCase()) {
      case "confirmed":
        return "status-confirmed";
      case "pending":
        return "status-pending";
      case "cancelled":
        return "status-cancelled";
      case "delivered":
        return "status-delivered";
      default:
        return "";
    }
  };

  const getTranslatedStatus = (status) => {
    const lower = (status || "").toLowerCase();
    if (lower === "pending") return t("pending");
    if (lower === "confirmed") return t("confirmed");
    if (lower === "delivered") return t("delivered");
    if (lower === "cancelled") return t("cancelled");
    return status;
  };

  if (loading) {
    return (
      <div className="orders-page">
        <div className="orders-header">
          <h1>{t("buyerOrdersTitle")}</h1>
          <p className="subtitle">{t("trackStatusHistorySubtitle")}</p>
        </div>
        <div style={{ textAlign: "center", padding: "3rem" }}>
          <div className="spinner"></div>
          <p>{t("loading")}</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="orders-page">
        <div className="orders-header">
          <h1>{t("buyerOrdersTitle")}</h1>
        </div>
        <div style={{ textAlign: "center", padding: "3rem", color: "#991b1b", background: "#fef2f2", borderRadius: "12px" }}>
          <p>{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="orders-page">
      <div className="orders-header">
        <h1>{t("buyerOrdersTitle")}</h1>
        <p className="subtitle">{t("trackStatusHistorySubtitle")}</p>
      </div>

      {actionError && (
        <div style={{
          display: "flex",
          alignItems: "flex-start",
          gap: "0.75rem",
          background: "#fef2f2",
          border: "1px solid #fca5a5",
          borderRadius: "10px",
          padding: "0.85rem 1.1rem",
          marginBottom: "1.25rem",
          color: "#991b1b",
          fontSize: "0.9rem",
          lineHeight: "1.4",
        }}>
          <span style={{ flex: 1 }}>
            <strong>{t("errorLabel")}</strong> {actionError}
          </span>
          <button
            onClick={() => setActionError("")}
            style={{ background: "none", border: "none", cursor: "pointer", color: "#991b1b", fontSize: "1.1rem", lineHeight: 1, padding: 0 }}
            aria-label="Dismiss error"
          >
            ✕
          </button>
        </div>
      )}

      <div className="orders-content">
        {orders.length === 0 ? (
          <div className="card empty-card">
            <div className="empty-content">
              <Package size={48} className="empty-icon" />
              <h3>{t("noOrdersTitle")}</h3>
              <p>{t("noOrdersSubtitle")}</p>
              <button className="btn-back" onClick={() => navigate("/products")} style={{ marginTop: "1rem" }}>
                {t("browseProductBtn")}
              </button>
            </div>
          </div>
        ) : (
          <div className="card orders-card">
            <div className="table-container">
              <table className="orders-table-full">
                <thead>
                  <tr>
                    <th>{t("orderId").toUpperCase()}</th>
                    <th>{t("product").toUpperCase()}</th>
                    <th>{t("farmer").toUpperCase()}</th>
                    <th>{t("qty").toUpperCase()}</th>
                    <th>{t("total").toUpperCase()}</th>
                    <th>{t("status").toUpperCase()}</th>
                    <th>{t("date").toUpperCase()}</th>
                    <th>{t("rejectionReason").toUpperCase()}</th>
                    <th>{t("deliveryInfo").toUpperCase()}</th>
                    <th>{t("action").toUpperCase()}</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map((order, index) => (
                    <tr key={order.id}>
                      <td className="order-id-cell">#{index + 1}</td>
                      <td>{order.product_name || order.product}</td>
                      <td>{order.provider_name || order.farmer || "—"}</td>
                      <td>{order.quantity} {order.unit || ""}</td>
                      <td>{order.total_price ? `${Number(order.total_price).toLocaleString()} ${t("birrUnit")}` : "—"}</td>
                      <td>
                        <span className={`status-badge ${getStatusClass(order.status)}`}>
                          {getTranslatedStatus(order.status || "Pending")}
                        </span>
                      </td>
                      <td className="date-cell">{order.created_at ? new Date(order.created_at).toLocaleDateString() : "—"}</td>
                      <td>
                        {order.status?.toLowerCase() === "cancelled" && order.rejection_reason
                          ? <span style={{ color: '#991b1b', fontSize: '0.85rem' }}>{order.rejection_reason}</span>
                          : <span style={{ color: '#9ca3af' }}>—</span>}
                      </td>
                      <td>
                        {order.driver_name ? (
                          <div style={{ fontSize: '0.85rem', lineHeight: '1.25' }}>
                            <div style={{ fontWeight: '600', color: '#1e293b' }}>{order.driver_name}</div>
                            <div style={{ color: '#64748b' }}>{order.driver_phone}</div>
                            <div style={{ color: '#64748b', fontSize: '0.8rem' }}>{t("plateLabel")}: {order.driver_plate_number}</div>
                          </div>
                        ) : (
                          <span style={{ color: '#9ca3af' }}>—</span>
                        )}
                      </td>
                      <td className="action-cell">
                        {order.status?.toLowerCase() === "delivered" || order.status?.toLowerCase() === "cancelled" ? (
                          <span className="no-actions">—</span>
                        ) : (
                          <button className="action-btn action-btn-deliver" onClick={() => handleMarkDelivered(order.id)}>
                            {t("markAsDelivered")}
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default BuyerOrders;
