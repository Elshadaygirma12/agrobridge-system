import React, { useState, useEffect } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { FileText } from "lucide-react";
import { getProviderOrders } from "../services/orderService";
import { useLanguage } from "../context/LanguageContext";
import "../styles/Reports.css";

const Reports = () => {
  const { t } = useLanguage();

  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [dateRange, setDateRange] = useState("last30");
  const [productFilter, setProductFilter] = useState("all");
  const [metricFilter, setMetricFilter] = useState("revenue");

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        setLoading(true);
        const data = await getProviderOrders();
        const list = Array.isArray(data) ? data : data.results || [];
        setOrders(list);
      } catch (err) {
        console.error("Failed to fetch reports data:", err);
        if (err.response) {
          setError(`Error ${err.response.status}: ${JSON.stringify(err.response.data)}`);
        } else if (err.request) {
          setError(t("reportNoServerResponse"));
        } else {
          setError(err.message || t("reportLoadError"));
        }
      } finally {
        setLoading(false);
      }
    };

    fetchOrders();
  }, []);

  const isDateInRange = (dateStr, range) => {
    if (!dateStr) return false;
    const orderDate = new Date(dateStr);
    const now = new Date();

    const orderDateClean = new Date(orderDate.getFullYear(), orderDate.getMonth(), orderDate.getDate());
    const nowClean = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    if (range === "last7") {
      const diffDays = Math.ceil(Math.abs(nowClean - orderDateClean) / (1000 * 60 * 60 * 24));
      return diffDays <= 7;
    }
    if (range === "last30") {
      const diffDays = Math.ceil(Math.abs(nowClean - orderDateClean) / (1000 * 60 * 60 * 24));
      return diffDays <= 30;
    }
    if (range === "thisYear") {
      return orderDate.getFullYear() === now.getFullYear();
    }
    return true; // "all" — All time
  };

  const activeOrders = orders.filter((o) => (o.status || "").toLowerCase() !== "cancelled");

  const uniqueProducts = Array.from(
    new Set(activeOrders.map((o) => o.product_name || o.product))
  ).filter(Boolean);

  const filteredOrders = activeOrders.filter((o) => {
    if (!isDateInRange(o.created_at, dateRange)) return false;
    if (productFilter !== "all") {
      const pName = o.product_name || o.product;
      if (pName !== productFilter) return false;
    }
    return true;
  });

  const productStats = {};
  filteredOrders.forEach((o) => {
    const pName = o.product_name || o.product || t("unknownProduct");
    if (!productStats[pName]) {
      productStats[pName] = {
        name: pName,
        product: pName,
        orders: 0,
        qty: 0,
        revenue: 0,
        unit: o.unit || "kg",
      };
    }
    productStats[pName].orders += 1;
    productStats[pName].qty += Number(o.quantity) || 0;
    productStats[pName].revenue += Number(o.total_price) || 0;
  });

  const summaryList = Object.values(productStats);

  const getMetricKey = () => {
    if (metricFilter === "qty") return "qty";
    if (metricFilter === "orders") return "orders";
    return "revenue";
  };

  const metricKey = getMetricKey();

  const getMetricLabel = () => {
    if (metricFilter === "qty") return t("reportMetricQty");
    if (metricFilter === "orders") return t("reportMetricOrders");
    return t("reportMetricRevenue");
  };

  const formatYAxis = (value) => {
    if (metricFilter === "revenue") {
      if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
      if (value >= 1000) return `${(value / 1000).toFixed(0)}k`;
      return `${value}`;
    }
    return value;
  };

  if (loading) {
    return (
      <div className="reports-container">
        <header className="reports-header">
          <h1>{t("salesReportsTitle")}</h1>
          <p className="reports-subtitle">{t("reportLoadingData")}</p>
        </header>
        <div style={{ textAlign: "center", padding: "4rem" }}>
          <div className="spinner"></div>
          <p style={{ color: "var(--text-muted)", marginTop: "1rem" }}>
            {t("reportFetchingHistory")}
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="reports-container">
        <header className="reports-header">
          <h1>{t("salesReportsTitle")}</h1>
        </header>
        <div
          style={{
            padding: "2rem",
            background: "#fef2f2",
            borderRadius: "12px",
            color: "#991b1b",
            margin: "2rem auto",
            maxWidth: "600px",
          }}
        >
          <strong>{t("reportCouldNotLoad")}</strong>
          <p style={{ marginTop: "0.5rem" }}>{error}</p>
        </div>
      </div>
    );
  }

  const handleExportPDF = () => {
    window.print();
  };

  return (
    <div className="reports-container">
      {/* Printable-only Report Header */}
      <div className="print-only-header">
        <div className="print-logo">AgroBridge</div>
        <div className="print-report-title">{t("salesReportsTitle")}</div>
        <div className="print-report-meta">
          <span><strong>{t("reportDateRange")}:</strong> {t(dateRange === "last30" ? "reportLast30Days" : dateRange === "last7" ? "reportLast7Days" : dateRange === "thisYear" ? "reportThisYear" : "reportAllTime")}</span>
          <span><strong>{t("product")}:</strong> {productFilter === "all" ? t("reportAllProducts") : productFilter}</span>
          <span><strong>{t("reportMetric")}:</strong> {getMetricLabel()}</span>
        </div>
      </div>

      <header className="reports-header">
        <h1>{t("salesReportsTitle")}</h1>
        <p className="reports-subtitle">{t("salesReportsSubtitle")}</p>
      </header>

      <section className="reports-filters card">
        <div className="filter-group">
          <label>{t("reportDateRange")}</label>
          <select value={dateRange} onChange={(e) => setDateRange(e.target.value)}>
            <option value="last30">{t("reportLast30Days")}</option>
            <option value="last7">{t("reportLast7Days")}</option>
            <option value="thisYear">{t("reportThisYear")}</option>
            <option value="all">{t("reportAllTime")}</option>
          </select>
        </div>
        <div className="filter-group">
          <label>{t("product")}</label>
          <select value={productFilter} onChange={(e) => setProductFilter(e.target.value)}>
            <option value="all">{t("reportAllProducts")}</option>
            {uniqueProducts.map((pName) => (
              <option key={pName} value={pName}>
                {pName}
              </option>
            ))}
          </select>
        </div>
        <div className="filter-group">
          <label>{t("reportMetric")}</label>
          <select value={metricFilter} onChange={(e) => setMetricFilter(e.target.value)}>
            <option value="revenue">{t("reportMetricRevenue")}</option>
            <option value="qty">{t("reportMetricQty")}</option>
            <option value="orders">{t("reportMetricOrders")}</option>
          </select>
        </div>
      </section>

      {summaryList.length > 0 ? (
        <>
          <section className="reports-charts">
            <div className="chart-card card full-width">
              <div className="chart-header">
                <h2>{t("reportTopProducts")} {getMetricLabel()}</h2>
              </div>
              <p className="chart-description">{t("reportChartDescription")}</p>
              <div className="chart-wrapper">
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={summaryList} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eee" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#666' }} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fill: '#666' }} tickFormatter={formatYAxis} />
                    <Tooltip
                      cursor={{ fill: '#f5f5f5' }}
                      contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                      formatter={(value) => [
                        metricFilter === "revenue" ? `${Number(value).toLocaleString()} ${t("birrUnit")}` : value,
                        getMetricLabel()
                      ]}
                    />
                    <Bar dataKey={metricKey} fill="#16a34a" radius={[4, 4, 0, 0]} barSize={40} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </section>

          <section className="reports-summary card">
            <div className="summary-header">
              <h2>{t("reportSummary")}</h2>
              <div className="summary-actions">
                <button className="btn-export" onClick={handleExportPDF}>
                  <FileText size={16} />
                  {t("exportPDF")}
                </button>
              </div>
            </div>
            <div className="table-responsive">
              <table className="summary-table">
                <thead>
                  <tr>
                    <th>{t("product")}</th>
                    <th>{t("reportMetricOrders")}</th>
                    <th>{t("reportQtySold")}</th>
                    <th>{t("reportMetricRevenue")}</th>
                  </tr>
                </thead>
                <tbody>
                  {summaryList.map((row, idx) => (
                    <tr key={idx}>
                      <td>{row.product}</td>
                      <td>{row.orders}</td>
                      <td>{row.qty} {row.unit}</td>
                      <td>{Number(row.revenue).toLocaleString()} {t("birrUnit")}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </>
      ) : (
        <section className="reports-empty card" style={{ textAlign: "center", padding: "3rem" }}>
          <p style={{ color: "var(--text-muted)", fontSize: "1.1rem" }}>
            {t("reportNoData")}
          </p>
        </section>
      )}
    </div>
  );
};

export default Reports;
