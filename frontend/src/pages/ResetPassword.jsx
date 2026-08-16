import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import api from '../services/api';
import { useLanguage } from '../context/LanguageContext';
import '../styles/ResetPassword.css';

const ResetPassword = () => {
  const { t } = useLanguage();
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  
  const { uid: pathUid, token: pathToken } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  // Extract from path or query params
  const uid = pathUid || searchParams.get('uid');
  const token = pathToken || searchParams.get('token');

  useEffect(() => {
    if (!uid || !token) {
      setError(t('missingCredsError'));
    }
  }, [uid, token, t]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (newPassword !== confirmPassword) {
      setError(t('passwordsDoNotMatch'));
      return;
    }
    
    if (newPassword.length < 8) {
      setError(t('passwordLengthError'));
      return;
    }

    if (!uid || !token) {
      setError(t('missingUidTokenError'));
      return;
    }

    setLoading(true);
    try {
      await api.post('/users/password-reset-confirm/', {
        uidb64: uid,
        token: token,
        new_password: newPassword
      });

      setSuccess(t('resetSuccessMsg'));
      setNewPassword('');
      setConfirmPassword('');
      
      // Auto-redirect to login after 3 seconds
      setTimeout(() => navigate('/login'), 3000);
      
    } catch (err) {
      setError(err.response?.data?.detail || err.response?.data?.non_field_errors?.[0] || 'Failed to reset password. The link might be expired or invalid.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="reset-password-bg">
      <div className="reset-password-card">
        <h1 className="reset-password-title">{t('resetPasswordFormTitle')}</h1>
        <p className="reset-password-subtitle">
          {t('resetPasswordFormSubtitle')}
        </p>

        {error && (
          <div className="alert-box error">
            <strong>{t('errorLabel')}</strong> {error}
          </div>
        )}

        {success && (
          <div className="alert-box success">
            <strong>{t('successLabel')}</strong> {success}
          </div>
        )}

        <form className="reset-password-form" onSubmit={handleSubmit}>
          <div className="form-group">
            <label>{t('newPasswordLabel')}</label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Enter new password"
              required
              className="input-field"
              disabled={loading || !uid || !token || success}
            />
          </div>

          <div className="form-group">
            <label>{t('confirmNewPasswordLabel')}</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirm new password"
              required
              className="input-field"
              disabled={loading || !uid || !token || success}
            />
          </div>

          <button 
            type="submit" 
            className="btn-confirm" 
            disabled={loading || !uid || !token || success}
          >
            {loading ? t('resettingBtn') : t('updatePasswordBtn')}
          </button>
        </form>

        <div className="back-to-login">
          {t('rememberedPassword')}{' '}
          <span className="auth-link" onClick={() => navigate('/login')}>
            {t('logInHere')}
          </span>
        </div>
      </div>
    </div>
  );
};

export default ResetPassword;
