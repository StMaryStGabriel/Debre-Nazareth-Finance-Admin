export function isAuthenticated() {
  const token = localStorage.getItem("adminToken");
  const expiry = localStorage.getItem("adminExpiry");

  if (!token || !expiry) return false;

  if (Date.now() > Number(expiry)) {
    localStorage.clear();
    return false;
  }

  return true;
}
