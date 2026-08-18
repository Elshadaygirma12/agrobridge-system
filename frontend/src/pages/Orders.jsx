import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Package } from "lucide-react";
import { getProviderOrders, updateOrderStatus } from "../services/orderService";
import { useLanguage } from "../context/LanguageContext";
import "../styles/Orders.css";

const Orders = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Delivery info modal state
  const [deliveryModal, setDeliveryModal] = useState({ open: false, orderId: null });
  const [deliveryForm, setDeliveryForm] = useState({
    driver_name: "",
    driver_phone: "",
    driver_plate_number: "",
  });
  const [deliveryError, setDeliveryError] = useState("");
  const [deliverySending, setDeliverySending] = useState(false);

  // Rejection modal state
  const [rejectionModal, setRejectionModal] = useState({ open: false, orderId: null });
  const [rejectionReason, setRejectionReason] = useState("");
  const [rejectionError, setRejectionError] = useState("");
  const [rejectionSending, setRejectionSending] = useState(false);

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        setLoading(true);
        const data = await getProviderOrders();
        const list = Array.isArray(data) ? data : data.results || [];
        setOrders(list);
      } catch (err) {
        console.error("Failed to fetch provider orders:", err);
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

    fetchOrders();
  }, []);

  const getStatusClass = (status) => {
    switch ((status || "").toLowerCase()) {
      case "confirmed":
        return "status-confirmed";
      case "pending":
        return "status-pending";
      case "delivered":
        return "status-delivered";
      case "cancelled":
        return "status-cancelled";
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

  const handleStatusChange = async (orderId, newStatus, rejectionReason) => {
    const orderToUpdate = orders.find((o) => o.id === orderId);
    
    // Safely get the product ID (supports both nested object product and primary key product ID)
    const productId = orderToUpdate && typeof orderToUpdate.product === "object"
      ? orderToUpdate.product.id
      : orderToUpdate?.product;
    
    const extraFields = {};
    if (productId) {
      extraFields.product = productId;
    }
    if (orderToUpdate?.quantity) {
      extraFields.quantity = orderToUpdate.quantity;
    }
    // Include rejection_reason if provided (used when cancelling/rejecting order)
    if (rejectionReason) {
      extraFields.rejection_reason = rejectionReason;
    }
    
    try {
      await updateOrderStatus(orderId, newStatus, extraFields);
      setOrders((prev) =>
        prev.map((o) => (o.id === orderId ? { ...o, status: newStatus, ...(rejectionReason && { rejection_reason: rejectionReason }) } : o))
      );
    } catch (err) {
      console.error("Failed to update order status:", err);
      if (err.response) {
        const data = err.response.data;
        const msg =
          typeof data === "string"
            ? data
            : data?.detail ||
              data?.non_field_errors?.join(", ") ||
              data?.status?.join(", ") ||
              data?.product?.join(", ") ||
              JSON.stringify(data);
        alert(`${t("orderUpdateFail")} (${err.response.status}): ${msg}`);
      } else if (err.request) {
        alert(t("noResponseFromServer"));
      } else {
        alert(`${t("orderUpdateFail")}: ${err.message}`);
      }
      throw err;
    }
  };

  const handleOpenRejectionModal = (orderId) => {
    setRejectionReason("");
    setRejectionError("");
    setRejectionModal({ open: true, orderId });
  };

  const handleSendRejection = async () => {
    if (!rejectionReason.trim()) {
      setRejectionError(t("enterRejectionReasonError"));
      return;
    }
    const { orderId } = rejectionModal;
    setRejectionSending(true);
    setRejectionError("");
    try {
      await handleStatusChange(orderId, "cancelled", rejectionReason);
      setRejectionModal({ open: false, orderId: null });
    } catch (err) {
      console.error("Failed to reject order:", err);
      setRejectionError(t("rejectOrderError"));
    } finally {
      setRejectionSending(false);
    }
  };

  const handleOpenDeliveryModal = (orderId) => {
    const order = orders.find((o) => o.id === orderId);
    setDeliveryForm({
      driver_name: order?.driver_name || "",
      driver_phone: order?.driver_phone || "",
      driver_plate_number: order?.driver_plate_number || "",
    });
    setDeliveryError("");
    setDeliveryModal({ open: true, orderId });
  };

  const handleSendDeliveryInfo = async () => {
    if (!deliveryForm.driver_name.trim() || !deliveryForm.driver_phone.trim() || !deliveryForm.driver_plate_number.trim()) {
      setDeliveryError(t("fillDeliveryInfoError"));
      return;
    }
    const { orderId } = deliveryModal;
    const orderToUpdate = orders.find((o) => o.id === orderId);
    const productId = orderToUpdate && typeof orderToUpdate.product === "object"
      ? orderToUpdate.product.id
      : orderToUpdate?.product;

    const extraFields = { ...deliveryForm };
    if (productId) extraFields.product = productId;
    if (orderToUpdate?.quantity) extraFields.quantity = orderToUpdate.quantity;

    setDeliverySending(true);
    try {
      await updateOrderStatus(orderId, orderToUpdate.status, extraFields);
      setOrders((prev) =>
        prev.map((o) => o.id === orderId ? { ...o, ...deliveryForm } : o)
      );
      setDeliveryModal({ open: false, orderId: null });
    } catch (err) {
      console.error("Failed to send delivery info:", err);
      if (err.response) {
        const data = err.response.data;
        setDeliveryError(
          typeof data === "string" ? data : data?.detail || JSON.stringify(data)
        );
      } else {
        setDeliveryError(t("sendDeliveryInfoError"));
      }
    } finally {
      setDeliverySending(false);
    }
  };
  if (loading) {
    return (
      <div className="orders-page">
        <div className="orders-header">
          <h1>{t("orderManagementTitle")}</h1>
          <p className="subtitle">{t("orderManagementSubtitle")}</p>
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
          <button className="btn-back" onClick={() => navigate("/dashboard")}>
            <ArrowLeft size={18} />
            {t("backToDashboard")}
          </button>
          <h1>{t("orderManagementTitle")}</h1>
        </div>
        <div style={{ textAlign: "center", padding: "3rem", color: "#991b1b", background: "#fef2f2", borderRadius: "12px" }}>
          <p>{error}</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="orders-page">
        <div className="orders-header">
        <button className="btn-back" onClick={() => navigate("/dashboard")}>
          <ArrowLeft size={18} />
          {t("backToDashboard")}
        </button>
        <h1>{t("orderManagementTitle")}</h1>
        <p className="subtitle">{t("orderManagementSubtitle")}</p>
      </div>

      <div className="orders-content">
        {orders.length === 0 ? (
          <div className="card empty-card">
            <div className="empty-content">
              <Package size={48} className="empty-icon" />
              <h3>{t("noOrdersTitle")}</h3>
              <p>{t("noOrdersYetProvider")}</p>
            </div>
          </div>
        ) : (
          <div className="card orders-card">
            <div className="table-container">
              <table className="orders-table-full">
                <thead>
                  <tr>
                    <th>{t("orderId")}</th>
                    <th>{t("product")}</th>
                    <th>{t("buyer")}</th>
                    <th>{t("phoneLabel")}</th>
                    <th>{t("qty")}</th>
                    <th>{t("status")}</th>
                    <th>{t("rejectionReason")}</th>
                    <th>{t("deliveryInfo")}</th>
                    <th>{t("date")}</th>
                    <th>{t("action")}</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map((order, index) => (
                    <tr key={order.id}>
                      <td className="order-id-cell">#{index + 1}</td>
                      <td>{order.product_name || order.product}</td>
                      <td>{order.buyer_name || order.buyer || "—"}</td>
                      <td>{order.phone || order.buyer_phone || order.phone_number || order.buyer?.phone || order.buyer?.phone_number || "—"}</td>
                      <td>{order.quantity} {order.unit || ""}</td>
                      <td>
                        <span className={`status-badge ${getStatusClass(order.status)}`}>
                          {getTranslatedStatus(order.status || "Pending")}
                        </span>
                      </td>
                      <td>{order.rejection_reason || "—"}</td>
                      <td>
                        {order.driver_name ? (
                          <div style={{ fontSize: '0.85rem', lineHeight: '1.25' }}>
                            <div style={{ fontWeight: '600' }}>{order.driver_name}</div>
                            <div>{order.driver_phone}</div>
                            <div style={{ color: '#64748b' }}>{t("plateLabel")}: {order.driver_plate_number}</div>
                          </div>
                        ) : (
                          <span style={{ color: '#9ca3af' }}>—</span>
                        )}
                      </td>
                      <td className="date-cell">
                        {order.created_at ? new Date(order.created_at).toLocaleDateString() : "—"}
                      </td>
                      <td>
                        <div className="order-actions-btns">
                          {/* Confirm: only if still pending */}
                          {order.status?.toLowerCase() === "pending" && (
                            <button
                              className="action-btn action-btn-confirm"
                              onClick={() => handleStatusChange(order.id, "confirmed")}
                            >
                              {t("confirmOrderBtn")}
                            </button>
                          )}

                          {/* Send Delivery Info: only for confirmed orders */}
                          {order.status?.toLowerCase() === "confirmed" && (
                            <button
                              className="action-btn action-btn-deliver"
                              onClick={() => handleOpenDeliveryModal(order.id)}
                            >
                              {order.driver_name ? t("updateDeliveryInfoBtn") : t("sendDeliveryInfoBtn")}
                            </button>
                          )}
                           {/* Cancel: only if pending */}
                           {order.status?.toLowerCase() === "pending" && (
                             <button
                               className="action-btn action-btn-cancel"
                               onClick={() => handleOpenRejectionModal(order.id)}
                             >
                               {t("cancelOrderBtn")}
                             </button>
                           )}

                          {/* Completed states — no actions available */}
                          {["delivered", "cancelled"].includes(order.status?.toLowerCase()) && (
                            <span className="no-actions">—</span>
                          )}
                        </div>
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

    {/* Delivery Info Modal */}
    {deliveryModal.open && (
      <div style={{
        position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
        background: "rgba(0,0,0,0.45)", zIndex: 1000,
        display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        <div style={{
          background: "#fff", borderRadius: "16px", padding: "2rem",
          width: "100%", maxWidth: "460px", boxShadow: "0 20px 60px rgba(0,0,0,0.2)",
        }}>
          <h2 style={{ fontSize: "1.25rem", fontWeight: 700, color: "#1a1a1a", marginBottom: "0.5rem" }}>
            {t("deliveryInformationHeader")}
          </h2>
          <p style={{ color: "#64748b", fontSize: "0.9rem", marginBottom: "1.5rem" }}>
            {t("deliveryInformationSubtitle")}
          </p>

          {deliveryError && (
            <div style={{
              background: "#fef2f2", border: "1px solid #fecaca", color: "#991b1b",
              padding: "0.75rem 1rem", borderRadius: "8px", marginBottom: "1rem", fontSize: "0.875rem",
            }}>
              {deliveryError}
            </div>
          )}

          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            <div>
              <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, color: "#374151", marginBottom: "0.4rem" }}>
                {t("driverNameLabel")}
              </label>
              <input
                type="text"
                placeholder="e.g. Abebe Girma"
                value={deliveryForm.driver_name}
                onChange={(e) => setDeliveryForm((f) => ({ ...f, driver_name: e.target.value }))}
                style={{
                  width: "100%", padding: "0.65rem 1rem", border: "1.5px solid #e2e8f0",
                  borderRadius: "8px", fontSize: "0.95rem", outline: "none", boxSizing: "border-box",
                }}
              />
            </div>
            <div>
              <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, color: "#374151", marginBottom: "0.4rem" }}>
                {t("driverPhoneLabel")}
              </label>
              <input
                type="tel"
                placeholder="e.g. 0911000000"
                value={deliveryForm.driver_phone}
                onChange={(e) => setDeliveryForm((f) => ({ ...f, driver_phone: e.target.value }))}
                style={{
                  width: "100%", padding: "0.65rem 1rem", border: "1.5px solid #e2e8f0",
                  borderRadius: "8px", fontSize: "0.95rem", outline: "none", boxSizing: "border-box",
                }}
              />
            </div>
            <div>
              <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, color: "#374151", marginBottom: "0.4rem" }}>
                {t("plateNumberLabel")}
              </label>
              <input
                type="text"
                placeholder="e.g. AA 12345"
                value={deliveryForm.driver_plate_number}
                onChange={(e) => setDeliveryForm((f) => ({ ...f, driver_plate_number: e.target.value }))}
                style={{
                  width: "100%", padding: "0.65rem 1rem", border: "1.5px solid #e2e8f0",
                  borderRadius: "8px", fontSize: "0.95rem", outline: "none", boxSizing: "border-box",
                }}
              />
            </div>
          </div>

          <div style={{ display: "flex", gap: "0.75rem", marginTop: "1.75rem", justifyContent: "flex-end" }}>
            <button
              onClick={() => setDeliveryModal({ open: false, orderId: null })}
              disabled={deliverySending}
              style={{
                padding: "0.6rem 1.25rem", border: "1.5px solid #e2e8f0", borderRadius: "8px",
                background: "#fff", color: "#374151", fontWeight: 600, cursor: "pointer", fontSize: "0.9rem",
              }}
            >
              {t("cancel")}
            </button>
            <button
              onClick={handleSendDeliveryInfo}
              disabled={deliverySending}
              style={{
                padding: "0.6rem 1.5rem", border: "none", borderRadius: "8px",
                background: "#2d6a4f", color: "#fff", fontWeight: 600, cursor: "pointer", fontSize: "0.9rem",
                opacity: deliverySending ? 0.7 : 1,
              }}
            >
              {deliverySending ? t("sending") : t("sendToBuyerBtn")}
            </button>
          </div>
        </div>
      </div>
    )}

    {/* Rejection Reason Modal */}
    {rejectionModal.open && (
      <div style={{
        position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
        background: "rgba(0,0,0,0.45)", zIndex: 1000,
        display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        <div style={{
          background: "#fff", borderRadius: "16px", padding: "2rem",
          width: "100%", maxWidth: "460px", boxShadow: "0 20px 60px rgba(0,0,0,0.2)",
        }}>
          <h2 style={{ fontSize: "1.25rem", fontWeight: 700, color: "#1a1a1a", marginBottom: "0.5rem" }}>
            {t("rejectOrderHeader")}
          </h2>
          <p style={{ color: "#64748b", fontSize: "0.9rem", marginBottom: "1.5rem" }}>
            {t("rejectionModalSubtitle")}
          </p>

          {rejectionError && (
            <div style={{
              background: "#fef2f2", border: "1px solid #fecaca", color: "#991b1b",
              padding: "0.75rem 1rem", borderRadius: "8px", marginBottom: "1rem", fontSize: "0.875rem",
            }}>
              {rejectionError}
            </div>
          )}

          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            <div>
              <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, color: "#374151", marginBottom: "0.4rem" }}>
                {t("rejectionReasonLabel")}
              </label>
              <textarea
                placeholder="e.g. Out of stock or already pre-ordered by another client."
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                rows={3}
                style={{
                  width: "100%", padding: "0.65rem 1rem", border: "1.5px solid #e2e8f0",
                  borderRadius: "8px", fontSize: "0.95rem", outline: "none", boxSizing: "border-box",
                  fontFamily: "inherit", resize: "none"
                }}
              />
            </div>
          </div>

          <div style={{ display: "flex", gap: "0.75rem", marginTop: "1.75rem", justifyContent: "flex-end" }}>
            <button
              onClick={() => setRejectionModal({ open: false, orderId: null })}
              disabled={rejectionSending}
              style={{
                padding: "0.6rem 1.25rem", border: "1.5px solid #e2e8f0", borderRadius: "8px",
                background: "#fff", color: "#374151", fontWeight: 600, cursor: "pointer", fontSize: "0.9rem",
              }}
            >
              {t("cancel")}
            </button>
            <button
              onClick={handleSendRejection}
              disabled={rejectionSending}
              style={{
                padding: "0.6rem 1.5rem", border: "none", borderRadius: "8px",
                background: "#dc2626", color: "#fff", fontWeight: 600, cursor: "pointer", fontSize: "0.9rem",
                opacity: rejectionSending ? 0.7 : 1,
              }}
            >
              {rejectionSending ? t("submitting") : t("rejectOrderHeader")}
            </button>
          </div>
        </div>
      </div>
    )}
    </>
  );
};

export default Orders;
