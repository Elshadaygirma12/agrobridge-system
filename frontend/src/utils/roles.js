/** Normalize role strings from the API or query params for comparisons. */
export function normalizeRole(role) {
  if (role == null || role === "") return "";
  return String(role).trim().toLowerCase();
}

function firstNonEmpty(...vals) {
  for (const v of vals) {
    if (v != null && String(v).trim() !== "") return String(v).trim();
  }
  return "";
}

function hasTruthy(value) {
  return value === true || value === 1 || String(value).toLowerCase() === "true";
}

/** Try to read role/user_type claims from a JWT access token (client-side only). */
export function tryRoleFromAccessToken(accessToken) {
  if (!accessToken || typeof accessToken !== "string") return "";
  const parts = accessToken.split(".");
  if (parts.length < 2) return "";
  try {
    let b64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    while (b64.length % 4) b64 += "=";
    const json = atob(b64);
    const payload = JSON.parse(json);
    return firstNonEmpty(
      payload.role,
      payload.user_role,
      payload.user_type,
      payload.usertype,
    );
  } catch {
    return "";
  }
}

/**
 * Reads role from common API shapes (many backends omit `user` or use other keys).
 */
export function extractRoleFromLoginPayload(data, accessToken) {
  if (!data || typeof data !== "object") {
    return tryRoleFromAccessToken(accessToken) || "";
  }
  const u = data.user;
  if (
    hasTruthy(u?.is_provider) ||
    hasTruthy(u?.is_farmer) ||
    hasTruthy(u?.is_supplier) ||
    hasTruthy(data.is_provider) ||
    hasTruthy(data.is_farmer) ||
    hasTruthy(data.is_supplier)
  ) {
    return "provider";
  }

  const direct = firstNonEmpty(
    u?.role,
    u?.role_name,
    u?.role_type,
    u?.type,
    u?.account_type,
    u?.user_type,
    u?.user_role,
    data.role,
    data.role_name,
    data.role_type,
    data.type,
    data.account_type,
    data.user_type,
    data.user_role,
    data.profile?.role,
  );
  if (direct) return direct;
  return tryRoleFromAccessToken(accessToken) || "";
}

/** Build the user object we persist after login (merged API user + resolved role). */
export function mergeLoginUser(data, credentials, options = {}) {
  const accessToken = data.access || data.token;
  const extracted = extractRoleFromLoginPayload(data, accessToken);
  const base = data.user ? { ...data.user } : {};
  const hintRole = options.hintRole;
  const role =
    firstNonEmpty(base.role, extracted, data.role, hintRole) || "User";
  return {
    ...base,
    email: base.email ?? credentials.email,
    role,
  };
}

/** True if this account should use provider (seller) navigation and dashboard. */
export function isProviderRole(role) {
  const r = normalizeRole(role);
  if (!r) return false;
  if (
    r.includes("provider") ||
    r.includes("farmer") ||
    r.includes("supplier") ||
    r.includes("seller") ||
    r.includes("vendor")
  ) {
    return true;
  }
  return (
    r === "provider" ||
    r === "farmer" ||
    r === "supplier" ||
    r === "seller" ||
    r === "vendor"
  );
}
