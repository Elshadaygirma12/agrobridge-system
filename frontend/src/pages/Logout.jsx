import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

/** Handles bookmarked /logout: clears session and sends user to login (no UI). */
const Logout = () => {
  const { logout } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const runLogout = async () => {
      await logout();
      navigate("/", { replace: true });
    };
    runLogout();
  }, [logout, navigate]);

  return null;
};

export default Logout;
