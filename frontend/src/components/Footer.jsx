import React from "react";
import { Link, useLocation } from "react-router-dom";
import { useLanguage } from "../context/LanguageContext";
import logo from "../assets/logo.png";
import "../styles/Footer.css";

const Footer = () => {
  const { t } = useLanguage();
  const location = useLocation();

  // Optionally hide on login/register if we want, but "all pages" means all pages.
  // Let's render it on all pages as requested.
  return (
    <footer className="main-footer">
      <div className="footer-container">
        
        <div className="footer-top">
          <div className="footer-brand">
            <span className="footer-logo-text">
              <img src={logo} alt="AgroBridge Logo" className="footer-logo-img" />
              AgroBridge
            </span>
            <p className="footer-description">
              Connecting local farmers and buyers in a modern digital marketplace.
            </p>
          </div>

          <div className="footer-links-group">
            <div className="footer-links-col">
              <h4>Marketplace</h4>
              <Link to="/products">{t("products")}</Link>
              <Link to="/register?role=provider">{t("startSellingBtn")}</Link>
            </div>
            
            <div className="footer-links-col">
              <h4>System</h4>
              <Link to="/login">{t("loginBtn")}</Link>
              <Link to="/register">{t("createAccountBtn")}</Link>
            </div>
          </div>
        </div>

        <div className="footer-divider" />

        <div className="footer-bottom">
          <p className="footer-copy">{t("copyrightText")}</p>
        </div>

      </div>
    </footer>
  );
};

export default Footer;
