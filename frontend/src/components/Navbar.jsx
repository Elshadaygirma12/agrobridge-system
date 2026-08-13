import React, { useState } from "react";
import { NavLink, useNavigate, useLocation } from "react-router-dom";
import { Leaf, ChevronDown, LogOut, Menu, X } from "lucide-react";

import { useAuth } from "../context/AuthContext";
import { useLanguage } from "../context/LanguageContext";
import { isProviderRole } from "../utils/roles";
import logo from "../assets/logo.png";
import "../styles/Navbar.css";

const Navbar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, isAuthenticated, logout } = useAuth();
  const { language, toggleLanguage, t } = useLanguage();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const isProvider = isProviderRole(user?.role);
  const isLandingPage = location.pathname === "/";
  const isBrowseProductsPage = location.pathname === "/products";
  const isRegisterPage = location.pathname === "/register";
  const isLoginPage = location.pathname === "/login";
  const isMyOrdersPage = location.pathname === "/my-orders";
  const isProfilePage = location.pathname === "/profile";
  const isPlaceOrderPage = location.pathname.startsWith("/place-order") || isMyOrdersPage || isProfilePage;
  const isCenteredNavbarPage = isBrowseProductsPage || isRegisterPage || isLoginPage;

  const handleLogout = async () => {
    await logout();
    navigate("/", { replace: true });
  };

  const renderProfileLink = () => (
    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
      {user?.photo ? (
        <img
          src={user.photo}
          alt="Profile"
          style={{
            width: "36px",
            height: "36px",
            borderRadius: "50%",
            objectFit: "cover",
            border: "2px solid #2d6a4f",
          }}
        />
      ) : (
        <div
          style={{
            width: "36px",
            height: "36px",
            borderRadius: "50%",
            backgroundColor: "#2d6a4f",
            color: "white",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "0.95rem",
            fontWeight: "600",
          }}
        >
          {user?.full_name ? user.full_name.charAt(0).toUpperCase() : "U"}
        </div>
      )}
      <span>{t("profile")}</span>
    </div>
  );

  return (
    <header className="navbar">
      <div className="navbar-logo" onClick={() => { setIsMenuOpen(false); navigate("/"); }} style={{ cursor: 'pointer' }}>
        <img src={logo} alt="AgroBridge Logo" className="system-logo" />
      </div>

      <button 
        className="navbar-toggle" 
        onClick={() => setIsMenuOpen(!isMenuOpen)}
        aria-label="Toggle navigation menu"
      >
        {isMenuOpen ? <X size={28} /> : <Menu size={28} />}
      </button>

      <nav className={`navbar-links ${isMenuOpen ? "open" : ""}`} onClick={() => setIsMenuOpen(false)}>
        {/* If user is authenticated */}
        {isAuthenticated ? (
          isProvider ? (
            /* Provider Navigation */
            <>
              <NavLink to="/" className={({ isActive }) => isActive ? "nav-item toggle-btn active" : "nav-item toggle-btn"}>
                {t("home")}
              </NavLink>
              <NavLink to="/dashboard" className={({ isActive }) => isActive ? "nav-item toggle-btn active" : "nav-item toggle-btn"}>
                {t("dashboard")}
              </NavLink>
              <NavLink to="/manage-products" className={({ isActive }) => isActive ? "nav-item toggle-btn active" : "nav-item toggle-btn"}>
                {t("products")}
              </NavLink>
              <NavLink to="/orders" className={({ isActive }) => isActive ? "nav-item toggle-btn active" : "nav-item toggle-btn"}>
                {t("orders")}
              </NavLink>
              <NavLink to="/reports" className={({ isActive }) => isActive ? "nav-item toggle-btn active" : "nav-item toggle-btn"}>
                {t("reports")}
              </NavLink>
              <NavLink to="/profile" className={({ isActive }) => isActive ? "nav-item toggle-btn active" : "nav-item toggle-btn"}>
                {renderProfileLink()}
              </NavLink>
              <button className="logout-nav nav-item" onClick={handleLogout} style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', background: 'none', border: 'none' }}>
                <LogOut size={16} style={{ marginRight: '4px' }} />
                {t("logout")}
              </button>
            </>
          ) : (
            /* Buyer Navigation */
            <>
              <NavLink to="/" className={({ isActive }) => isActive ? "nav-item toggle-btn active" : "nav-item toggle-btn"}>
                {t("home")}
              </NavLink>
              <NavLink to="/products" className={({ isActive }) => isActive ? "nav-item toggle-btn active" : "nav-item toggle-btn"}>
                {t("products")}
              </NavLink>
              <NavLink to="/my-orders" className={({ isActive }) => isActive ? "nav-item toggle-btn active" : "nav-item toggle-btn"}>
                {t("myOrders")}
              </NavLink>
              <NavLink to="/profile" className={({ isActive }) => isActive ? "nav-item toggle-btn active" : "nav-item toggle-btn"}>
                {renderProfileLink()}
              </NavLink>
              <button className="logout-nav nav-item" onClick={handleLogout} style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', background: 'none', border: 'none' }}>
                <LogOut size={16} style={{ marginRight: '4px' }} />
                {t("logout")}
              </button>
            </>
          )
        ) : (
          /* Unauthenticated (Guest) Navigation */
          <>
            <NavLink to="/" className={({ isActive }) => isActive ? "nav-item toggle-btn active" : "nav-item toggle-btn"}>
              {t("home")}
            </NavLink>
            <NavLink to="/products" className={({ isActive }) => isActive ? "nav-item toggle-btn active" : "nav-item toggle-btn"}>
              {t("products")}
            </NavLink>
            <NavLink to="/login" className={({ isActive }) => isActive ? "nav-item toggle-btn active" : "nav-item toggle-btn"}>
              {t("loginBtn")}
            </NavLink>
          </>
        )}

        {/* Language Switcher */}
        <button
          onClick={toggleLanguage}
          className="nav-item toggle-btn"
          style={{
            display: "flex",
            alignItems: "center",
            gap: "4px",
            cursor: "pointer",
            background: "none",
            border: "1.5px solid #2d6a4f",
            borderRadius: "20px",
            padding: "4px 12px",
            fontWeight: "600",
            color: "#2d6a4f",
            marginLeft: "10px",
            fontSize: "0.85rem",
            transition: "all 0.2s ease",
          }}
        >
          {language === "en" ? "አማርኛ" : "English"}
        </button>
      </nav>
    </header>
  );
};

export default Navbar;

