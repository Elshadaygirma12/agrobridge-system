import api from "./api";

export const registerUser = async ({
  fullName,
  email,
  phone,
  role,
  password,
}) => {
  const response = await api.post("/users/register/", {
    full_name: fullName,
    email: email,
    phone: phone,
    role: role,
    password: password,
  });
  return response.data;
};

export const loginUser = async ({ email, password }) => {
  const response = await api.post("/users/login/", {
    email: email,
    password: password,
  });
  return response.data;
};

export const forgotPassword = async ({ email }) => {
  const response = await api.post("/users/password-reset/", { email: email });
  return response.data;
};

export const logoutUser = async () => {
  const refreshToken = localStorage.getItem("refresh_token");
  const payload = refreshToken ? { refresh: refreshToken } : {};
  const response = await api.post("/users/logout/", payload);
  return response.data;
};

export const getUserProfile = async () => {
  const response = await api.get("/users/profile/");
  return response.data;
};

export const updateProfile = async (profileData) => {
  const response = await api.patch("/users/profile/", {
    full_name: profileData.fullName,
    phone: profileData.phone,
    email: profileData.email,
  });
  return response.data;
};

