import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useLanguage } from "../context/LanguageContext";
import { ArrowRight, ShieldCheck, Zap, Clock, Search, Bell, LayoutGrid } from "lucide-react";
import "../styles/Home.css";

const products = [
  { emoji: "🥕", nameKey: "carrotsMock", qty: "50 kg", tagKey: "newTag" },
  { emoji: "🌾", nameKey: "teffMock",    qty: "100 kg", tagKey: "popularTag" },
  { emoji: "☕", nameKey: "coffeeMock",  qty: "25 kg", tagKey: "" },
  { emoji: "🧅", nameKey: "onionsMock",  qty: "80 kg", tagKey: "newTag" },
  { emoji: "🥬", nameKey: "kaleMock",    qty: "30 kg", tagKey: "" },
  { emoji: "🫘", nameKey: "beansMock",   qty: "60 kg", tagKey: "popularTag" },
];

const Home = () => {
  const { t } = useLanguage();
  const [loaded, setLoaded] = useState(false);
  const [activeNav, setActiveNav] = useState("Browse");

  useEffect(() => {
    const timer = setTimeout(() => setLoaded(true), 100);
    return () => clearTimeout(timer);
  }, []);

  // Scroll reveal
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) =>
        entries.forEach((e) => e.isIntersecting && e.target.classList.add("reveal-visible")),
      { threshold: 0.1 }
    );
    document.querySelectorAll(".reveal").forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  return (
    <div className="home-wrapper">

      {/* ══════════ HERO ══════════ */}
      <section className="hero">
        <div className="orb orb-1" />
        <div className="orb orb-2" />
        <div className="orb orb-3" />

        {/* Left — Text */}
        <div className={`hero-left ${loaded ? "hero-left--visible" : ""}`}>
          <div className="hero-tag">🌿 Digital Agricultural Marketplace</div>

          <h1 className="hero-heading">{t("heroTitle")}</h1>

          <p className="hero-sub">{t("heroSubtitle")}</p>

          <div className="hero-btns">
            <Link to="/products" className="hbtn hbtn-primary">
              {t("browseProductBtn")} <ArrowRight size={18} />
            </Link>
            <Link to="/register?role=provider" className="hbtn hbtn-outline">
              {t("startSellingBtn")}
            </Link>
          </div>

          <div className="trust-row">
            <div className="trust-item">
              <span className="trust-num">5K+</span>
              <span className="trust-label">Providers</span>
            </div>
            <div className="trust-sep" />
            <div className="trust-item">
              <span className="trust-num">12K+</span>
              <span className="trust-label">Products</span>
            </div>
            <div className="trust-sep" />
            <div className="trust-item">
              <span className="trust-num">98%</span>
              <span className="trust-label">Satisfied</span>
            </div>
          </div>
        </div>

        {/* Right — Animated Browser Mockup */}
        <div className={`hero-right ${loaded ? "hero-right--visible" : ""}`}>

          {/* Floating badge 1 */}
          <div className="float-badge badge-tl">
            <span className="badge-icon">📦</span>
            <div>
              <div className="badge-title">{t("orderPlaced")}</div>
              <div className="badge-sub">50kg {t("teffMock")} · {t("justNow")}</div>
            </div>
          </div>

          {/* Browser Mockup */}
          <div className="browser-shell">
            {/* Browser chrome */}
            <div className="browser-chrome">
              <div className="browser-dots">
                <span className="dot-red" />
                <span className="dot-yellow" />
                <span className="dot-green" />
              </div>
              <div className="browser-addressbar">
                <span className="lock-icon">🔒</span>
                agrobridge.com/products
              </div>
              <div style={{ width: 40 }} />
            </div>

            {/* Website content inside browser */}
            <div className="browser-screen">
              {/* Navbar inside browser */}
              <div className="site-navbar">
                <div className="site-logo">🌿 AgroBridge</div>
                <nav className="site-nav">
                  {[
                    { label: t("browseMock"), val: "Browse" },
                    { label: t("sellMock"), val: "Sell" },
                    { label: t("aboutMock"), val: "About" }
                  ].map((item) => (
                    <span
                      key={item.val}
                      className={`site-nav-item ${activeNav === item.val ? "active" : ""}`}
                      onClick={() => setActiveNav(item.val)}
                    >
                      {item.label}
                    </span>
                  ))}
                </nav>
                <div className="site-actions">
                  <Search size={14} className="site-icon" />
                  <Bell size={14} className="site-icon" />
                  <div className="site-avatar">A</div>
                </div>
              </div>

              {/* Search bar */}
              <div className="site-search-bar">
                <Search size={13} />
                <span>{t("searchPlaceholderMock")}</span>
              </div>

              {/* Filter tags */}
              <div className="site-filters">
                {[t("allFilter"), t("grainsFilter"), t("vegetablesFilter"), t("coffeeFilter"), t("spicesFilter")].map((f, i) => (
                  <span key={f} className={`filter-tag ${i === 0 ? "active" : ""}`}>{f}</span>
                ))}
              </div>

              {/* Product Grid */}
              <div className="site-product-grid">
                {products.map((p) => (
                  <div className="site-product-card" key={p.nameKey}>
                    {p.tagKey && <span className="site-product-tag">{t(p.tagKey)}</span>}
                    <div className="site-product-emoji">{p.emoji}</div>
                    <div className="site-product-name">{t(p.nameKey)}</div>
                    <div className="site-product-qty">{p.qty} {t("availableMock")}</div>
                    <button className="site-order-btn">{t("orderNowMock")}</button>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Floating badge 2 */}
          <div className="float-badge badge-br">
            <span className="badge-icon">🌾</span>
            <div>
              <div className="badge-title">{t("newListing")}</div>
              <div className="badge-sub">{t("freshTeffAdded")}</div>
            </div>
          </div>

          {/* Floating badge 3 */}
          <div className="float-badge badge-tr">
            <span className="badge-icon">🌟</span>
            <div>
              <div className="badge-title">{t("farmersActive")}</div>
              <div className="badge-sub">{t("activelySelling")}</div>
            </div>
          </div>

          <div className="ring ring-1" />
          <div className="ring ring-2" />
        </div>
      </section>

      {/* ══════════ FEATURES ══════════ */}
      <section className="features-section reveal">
        <h2 className="section-title">{t("tradeSmarterTitle")}</h2>
        <p className="section-sub">{t("twentyFourSevenDesc")}</p>

        <div className="features-grid">
          <div className="feature-card">
            <div className="feat-icon"><Clock size={28} /></div>
            <h3>{t("twentyFourSeven")}</h3>
            <p>{t("twentyFourSevenDesc")}</p>
          </div>
          <div className="feature-card">
            <div className="feat-icon"><Zap size={28} /></div>
            <h3>{t("fast")}</h3>
            <p>{t("fastDesc")}</p>
          </div>
          <div className="feature-card">
            <div className="feat-icon"><ShieldCheck size={28} /></div>
            <h3>{t("clear")}</h3>
            <p>{t("clearDesc")}</p>
          </div>
          <div className="feature-card">
            <div className="feat-icon"><LayoutGrid size={28} /></div>
            <h3>{t("easyManagement")}</h3>
            <p>{t("easyManagementDesc")}</p>
          </div>
          <div className="feature-card">
            <div className="feat-icon"><Search size={28} /></div>
            <h3>{t("smartSearch")}</h3>
            <p>{t("smartSearchDesc")}</p>
          </div>
        </div>
      </section>

      {/* ══════════ CTA ══════════ */}
      <section className="cta-section reveal">
        <div className="cta-box">
          <h2>{t("readyToJoinTitle")}</h2>
          <p>{t("readyToJoinDesc")}</p>
          <div className="cta-btns">
            <Link to="/products" className="hbtn hbtn-primary">
              {t("browseProductBtn")} <ArrowRight size={16} />
            </Link>
            <Link to="/register?role=provider" className="hbtn hbtn-outline-dark">
              {t("startSellingBtn")}
            </Link>
          </div>
        </div>
      </section>

    </div>
  );
};

export default Home;
