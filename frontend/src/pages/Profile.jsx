import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useLanguage } from "../context/LanguageContext";
import { updateProfile } from "../services/authService";
import Input from "../components/Input";
import { CheckCircle, AlertCircle, LogOut, Clock } from "lucide-react";
import "../styles/Profile.css";

const Profile = () => {
  const navigate = useNavigate();
  const { user, logout, updateUser } = useAuth();
  const { t } = useLanguage();
  const [formData, setFormData] = useState({
    fullName: "",
    phone: "",
    email: "",
    role: "",
  });
  const [isSaving, setIsSaving] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [error, setError] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [photoFile, setPhotoFile] = useState(null);

  useEffect(() => {
    if (user) {
      setFormData({
        fullName: user.full_name || "",
        phone: user.phone || "",
        email: user.email || "",
        role: user.role || "Buyer",
      });
      setPhotoPreview(user.photo || null);
    } else {
      // Mock data if user is not logged in for development
      setFormData({
        fullName: "Amina Yusuf",
        phone: "+234 000 000 0000",
        email: "amina@example.com",
        role: "Buyer",
      });
      const mockPhoto = localStorage.getItem("profile_photo_amina@example.com");
      setPhotoPreview(mockPhoto || null);
    }
  }, [user]);

  const handlePhotoChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        setError(t("imageSizeError"));
        return;
      }
      setPhotoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoPreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemovePhoto = () => {
    setPhotoFile(null);
    setPhotoPreview(null);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    setError(null);
    setShowSuccess(false);

    try {
      if (user) {
        await updateProfile(formData);
        const userEmailOrId = user.email || user.id;
        if (photoPreview) {
          localStorage.setItem(`profile_photo_${userEmailOrId}`, photoPreview);
        } else {
          localStorage.removeItem(`profile_photo_${userEmailOrId}`);
        }
        updateUser({
          full_name: formData.fullName,
          phone: formData.phone,
          email: formData.email,
          photo: photoPreview,
        });
      } else {
        await new Promise((resolve) => setTimeout(resolve, 800));
        localStorage.setItem("profile_photo_amina@example.com", photoPreview || "");
        updateUser({
          full_name: formData.fullName,
          phone: formData.phone,
          email: formData.email,
          photo: photoPreview,
        });
      }
      
      setSuccessMessage(t("profileUpdateSuccess"));
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 5000);
    } catch (err) {
      setError(err.response?.data?.message || t("profileUpdateFail"));
    } finally {
      setIsSaving(false);
    }
  };

  const getTranslatedRole = (role) => {
    if (!role) return "";
    const lowerRole = role.toLowerCase();
    if (lowerRole === "provider") return t("providerRole");
    if (lowerRole === "buyer") return t("buyerRole");
    return role;
  };

  return (
    <div className="profile-page">
      <div className="profile-header">
        <h1>{t("profileTitle")}</h1>
        <p className="profile-subtitle">{t("profileSubtitle")}</p>
      </div>

      <div className="profile-card">


        {showSuccess && (
          <div className="success-alert">
            <CheckCircle size={20} />
            <span>{successMessage}</span>
          </div>
        )}

        {error && (
          <div className="error-alert" style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#991b1b', padding: '1rem 1.5rem', borderRadius: '12px', marginBottom: '2rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <AlertCircle size={20} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="profile-form">
          <div className="form-group full-width profile-photo-section">
            <label className="photo-label">{t("profilePhoto")}</label>
            <div className="photo-uploader-container">
              <div className="photo-preview-wrapper">
                {photoPreview ? (
                  <img src={photoPreview} alt="Profile Preview" className="photo-preview" />
                ) : (
                  <div className="photo-initials">
                    {formData.fullName ? formData.fullName.charAt(0).toUpperCase() : "U"}
                  </div>
                )}
              </div>
              <div className="photo-upload-actions">
                <input
                  type="file"
                  id="profile-photo-input"
                  accept="image/*"
                  onChange={handlePhotoChange}
                  style={{ display: "none" }}
                />
                <button
                  type="button"
                  className="btn-upload-photo"
                  onClick={() => document.getElementById("profile-photo-input").click()}
                >
                  {t("choosePhotoBtn")}
                </button>
                {photoPreview && (
                  <button type="button" className="btn-remove-photo" onClick={handleRemovePhoto}>
                    {t("removePhotoBtn")}
                  </button>
                )}
                <p className="photo-instructions">{t("photoInstructionsText")}</p>
              </div>
            </div>
          </div>

          <div className="form-group">
            <Input
              label={t("fullNameLabelProfile")}
              name="fullName"
              value={formData.fullName}
              onChange={handleChange}
              placeholder="Enter your full name"
              required
            />
          </div>

          <div className="form-group">
            <Input
              label={t("phoneLabelProfile")}
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              placeholder="+234 000 000 0000"
              required
            />
          </div>

          <div className="form-group email-group">
            <label>{t("emailLabelProfile")}</label>
            <Input
              name="email"
              type="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="amina@example.com"
              required
            />
          </div>

          <div className="form-group role-display-group">
            <label className="role-label">{t("roleLabelProfile")}</label>
            <div className="role-value-box">
              {getTranslatedRole(formData.role)}
            </div>
          </div>




          <div className="profile-actions">
            <button type="button" className="btn-cancel" onClick={() => window.history.back()}>
              {t("cancelBtn")}
            </button>
            <button type="submit" className="btn-save" disabled={isSaving}>
              {isSaving ? t("savingChanges") : t("saveChangesBtn")}
            </button>
          </div>
          <div className="profile-logout-section">
            <button
              type="button"
              className="btn-logout-link"
              onClick={async () => {
                await logout();
                navigate("/", { replace: true });
              }}
            >
              <LogOut size={18} />
              {t("logoutLinkText")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Profile;
