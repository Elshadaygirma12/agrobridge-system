import React, { useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useLanguage } from "../context/LanguageContext";
import Button from "../components/Button";
import Input from "../components/Input";
import "../styles/ForgotPassword.css";

const ForgotPassword = () => {
  const { forgotPassword } = useAuth();
  const { t } = useLanguage();
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState({ type: "", message: "" });
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email) {
      setStatus({ type: "error", message: t("enterEmailError") });
      return;
    }

    setIsLoading(true);
    setStatus({ type: "", message: "" });

    try {
      await forgotPassword(email);
      setStatus({
        type: "success",
        message: t("resetInstructionsSent"),
      });
    } catch (err) {
      // Handle errors similar to Register.jsx
      if (err.response && err.response.data) {
        const backendErrors = err.response.data;
        if (typeof backendErrors === "string") {
          setStatus({ type: "error", message: backendErrors });
        } else if (backendErrors.detail) {
          setStatus({ type: "error", message: backendErrors.detail });
        } else {
          const messages = Object.entries(backendErrors)
            .map(
              ([field, msgs]) =>
                `${field}: ${Array.isArray(msgs) ? msgs.join(", ") : msgs}`,
            )
            .join(" | ");
          setStatus({
            type: "error",
            message:
              messages || "Failed to send reset email. Please try again.",
          });
        }
      } else if (err.request) {
        setStatus({
          type: "error",
          message:
            "Cannot connect to the server. Make sure the backend is running.",
        });
      } else {
        setStatus({
          type: "error",
          message: "An unexpected error occurred. Please try again.",
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="forgot-password-bg">
      <div className="forgot-password-card">
        <h2 className="forgot-password-title">{t("resetPasswordTitle")}</h2>
        <p className="forgot-password-subtitle">
          {t("resetPasswordSubtitle")}
        </p>

        {status.message && (
          <div className={`alert-box ${status.type}`}>
            <strong>{status.type === "error" ? t("errorLabel") : t("successLabel")}</strong>{" "}
            {status.message}
          </div>
        )}

        <form className="forgot-password-form" onSubmit={handleSubmit}>
          <Input
            id="email"
            label={t("emailLabel")}
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              if (status.type === "error") setStatus({ type: "", message: "" });
            }}
          />

          <Button type="submit" className="btn-reset" disabled={isLoading}>
            {isLoading ? t("sendingLink") : t("sendResetLinkBtn")}
          </Button>

          <div className="back-to-login">
            <Link to="/login" className="auth-link">
              {t("backToLoginLink")}
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ForgotPassword;
