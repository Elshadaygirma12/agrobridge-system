import React, { useState } from "react";
import { useNavigate, Link, useSearchParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useLanguage } from "../context/LanguageContext";
import Button from "../components/Button";
import Input from "../components/Input";
import "../styles/Register.css";
import marketIntentionImg from "../assets/market_intention.png";


const Register = () => {
  const navigate = useNavigate();
  const { register } = useAuth();
  const { t } = useLanguage();
  const [searchParams] = useSearchParams();

  const defaultRole = searchParams.get("role") === "provider" ? "provider" : "buyer";
  const redirectTo = searchParams.get("redirectTo");

  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    phone: "",
    role: defaultRole,
    password: "",
    confirmPassword: "",
  });

  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.id]: e.target.value });
    // Clear error when user starts typing again
    if (error) setError("");
  };

  const handleRoleChange = (e) => {
    setFormData({ ...formData, role: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    // --- Frontend validation ---
    if (!formData.fullName || !formData.email || !formData.password) {
      setError(t("fillRequiredFields"));
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError(t("passwordsDoNotMatch"));
      return;
    }

    // --- Send data to the backend ---
    setIsLoading(true);
    try {
      await register({
        fullName: formData.fullName,
        email: formData.email,
        phone: formData.phone,
        role: formData.role,
        password: formData.password,
      });

      // Success! Redirect to the login page
      navigate(`/login?role=${formData.role}${redirectTo ? `&redirectTo=${redirectTo}` : ""}`);
    } catch (err) {
      // Show the error from the Django backend
      if (err.response && err.response.data) {
        // Django REST Framework often returns errors as an object like:
        // { "email": ["This field must be unique."] }
        const backendErrors = err.response.data;
        if (typeof backendErrors === "string") {
          setError(backendErrors);
        } else if (backendErrors.detail) {
          setError(backendErrors.detail);
        } else {
          // Combine all field errors into one message
          const messages = Object.entries(backendErrors)
            .map(
              ([field, msgs]) =>
                `${field}: ${Array.isArray(msgs) ? msgs.join(", ") : msgs}`,
            )
            .join(" | ");
          setError(messages || "Registration failed. Please try again.");
        }
      } else if (err.request) {
        // Request was sent but no response — backend is probably not running
        setError(
          "Cannot connect to the server. Make sure the backend is running.",
        );
      } else {
        setError("An unexpected error occurred. Please try again.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="register-layout">
      {/* Left Design Section */}
      <div className="register-left">
        <div className="left-content">
          <h1 className="left-title">{t("createAccountTitle")}</h1>
          <p className="left-description">
            {t("registerDesc")}
          </p>
          <div className="left-image-container">
            <img 
              src={marketIntentionImg} 
              alt="Agricultural Commerce" 
              className="market-intention-image" 
            />
          </div>
        </div>
      </div>

      {/* Right Form Section */}
      <div className="register-right">
        <div className="right-form-container">
          <h2 className="right-title">{t("registerFormTitle")}</h2>
          <p className="right-subtitle">
            {t("registerFormSubtitle")}
          </p>

          {/* Error message from backend or validation */}
          {error && (
            <div className="alert-box error">
              <strong>Error</strong> {error}
            </div>
          )}

          <form className="split-form" onSubmit={handleSubmit}>
            <Input
              id="fullName"
              label={t("fullNameLabel")}
              placeholder=" Amina Yusuf"
              value={formData.fullName}
              onChange={handleChange}
            />

            <Input
              id="email"
              label={t("emailLabel")}
              type="email"
              placeholder="you@example.com"
              value={formData.email}
              onChange={handleChange}
            />

            <Input
              id="phone"
              label={t("phoneLabel")}
              placeholder="+234 000 000 0000"
              value={formData.phone}
              onChange={handleChange}
            />

            <div className="input-wrapper">
              <label className="input-label" htmlFor="role">
                {t("roleLabel")}
              </label>
              <div className="input-container">
                <select
                  id="role"
                  className="input-field"
                  value={formData.role}
                  onChange={handleRoleChange}
                >
                  <option value="provider">{t("providerRole")}</option>
                  <option value="buyer">{t("buyerRole")}</option>
                </select>
              </div>
            </div>

            <div className="form-row">
              <Input
                id="password"
                label={t("passwordLabel")}
                type="password"
                placeholder="Create a password"
                value={formData.password}
                onChange={handleChange}
              />
              <Input
                id="confirmPassword"
                label={t("confirmPasswordLabel")}
                type="password"
                placeholder="Repeat password"
                value={formData.confirmPassword}
                onChange={handleChange}
              />
            </div>

            <Button
              type="submit"
              className="submit-action-btn"
              disabled={isLoading}
            >
              {isLoading ? t("creatingAccount") : t("createAccountBtn")}
            </Button>
          </form>

          <div
            className="register-footer"
            style={{ textAlign: "center", marginTop: "1rem" }}
          >
            {t("alreadyHaveAccount")}{" "}
            <Link to={`/login${redirectTo ? `?redirectTo=${redirectTo}` : ""}`} className="auth-link">
              {t("logInLink")}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Register;
