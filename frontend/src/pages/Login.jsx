import React, { useState, useEffect } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useLanguage } from "../context/LanguageContext";
import { isProviderRole } from "../utils/roles";
import Button from "../components/Button";
import Input from "../components/Input";
import "../styles/Login.css";
import milkDecorImg from "../assets/milk_decor.png";


const Login = () => {
  const navigate = useNavigate();
  const { login, isAuthenticated, loading: authLoading, user } = useAuth();
  const { t } = useLanguage();
  const [searchParams] = useSearchParams();

  const [formData, setFormData] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const redirectRole = searchParams.get("role");
  const redirectTo = searchParams.get("redirectTo");
  const [isLoading, setIsLoading] = useState(false);

  // If user is already authenticated, redirect them away from login page
  useEffect(() => {
    if (authLoading) return; // wait until auth state is resolved
    if (isAuthenticated) {
      if (redirectTo) {
        navigate(redirectTo, { replace: true });
      } else if (isProviderRole(user?.role)) {
        navigate("/dashboard", { replace: true });
      } else {
        navigate("/products", { replace: true });
      }
    }
  }, [authLoading, isAuthenticated, redirectTo, user, navigate]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.id]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!formData.email || !formData.password) {
      setError(t("enterEmailPass"));
      return;
    }

    // --- Send data to the backend ---
    setIsLoading(true);
    try {
      const data = await login(
        {
          email: formData.email,
          password: formData.password,
        },
        { hintRole: redirectRole },
      );

      // Same merged role we stored on the user (API + JWT + optional ?role= from register link).
      const resolvedRole = data.user?.role || "";

      // Providers land on dashboard; buyers land on browse products (or redirectTo).
      if (redirectTo) {
        navigate(redirectTo);
      } else if (isProviderRole(resolvedRole)) {
        navigate("/dashboard");
      } else {
        navigate("/products");
      }
    } catch (err) {
      // Show the error from the Django backend
      if (err.response && err.response.data) {
        const backendErrors = err.response.data;
        if (typeof backendErrors === "string") {
          setError(backendErrors);
        } else if (backendErrors.detail) {
          setError(backendErrors.detail);
        } else if (backendErrors.non_field_errors) {
          setError(backendErrors.non_field_errors.join(", "));
        } else {
          setError(t("incorrectCredentials"));
        }
      } else if (err.request) {
        setError(t("cannotConnectServer"));
      } else {
        setError(t("unexpectedError"));
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="login-page-bg">
      <div className="login-cards-wrapper">
        {/* Left Green Card */}
        <div className="login-left-card">
          <h1 className="login-title">{t("welcomeBack")}</h1>
          <p className="login-desc">
            {t("loginDesc")}
          </p>
          <div className="login-image-container">
            <img 
              src={milkDecorImg} 
              alt="Dairy Production" 
              className="milk-decor-image" 
            />
          </div>
        </div>


        {/* Right White Form Card */}
        <div className="login-right-card">
          <h2 className="login-form-title">{t("loginFormTitle")}</h2>
          <p className="login-form-subtitle">
            {t("loginFormSubtitle")}
          </p>

          {/* Error message from backend or validation */}
          <div className={`alert-box error${error ? " visible" : ""}`}>
            <strong>{t("errorLabel")}</strong> {error}
          </div>

          <form className="login-form" onSubmit={handleSubmit}>
            <Input
              id="email"
              label={t("emailLabel")}
              type="email"
              placeholder="you@example.com"
              value={formData.email}
              onChange={handleChange}
            />

            <div className="password-group">
              <Input
                id="password"
                label={t("passwordLabel")}
                type="password"
                placeholder="Your password"
                value={formData.password}
                onChange={handleChange}
              />
              <div className="password-hints">
                <span className="hint-left"></span>
                <Link to="/forgot-password" className="hint-right">
                  {t("forgotPasswordLink")}
                </Link>
              </div>
            </div>

            <Button
              type="submit"
              className="login-submit-btn"
              disabled={isLoading}
            >
              {isLoading ? t("loggingIn") : t("loginBtn")}
            </Button>

            <div className="login-footer">
              {t("noAccount")}{" "}
              <Link to={`/register${redirectTo ? `?redirectTo=${redirectTo}` : ""}`} className="auth-link">
                {t("createOne")}
              </Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Login;
