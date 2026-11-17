import { createContext, useContext, useEffect, useState } from "react";
import api from "../api/axios.js";

const AuthContext = createContext(null);
export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // On first load, restore the session from a saved token.
  useEffect(() => {
    const token = localStorage.getItem("spendwise_token");
    if (!token) {
      setLoading(false);
      return;
    }
    api
      .get("/auth/me")
      .then((res) => setUser(res.data.user))
      .catch(() => localStorage.removeItem("spendwise_token"))
      .finally(() => setLoading(false));
  }, []);

  const handleAuth = (data) => {
    localStorage.setItem("spendwise_token", data.token);
    setUser(data.user);
  };

  const login = async (email, password) => handleAuth((await api.post("/auth/login", { email, password })).data);
  const register = async (name, email, password) =>
    handleAuth((await api.post("/auth/register", { name, email, password })).data);
  const logout = () => {
    localStorage.removeItem("spendwise_token");
    setUser(null);
  };

  return <AuthContext.Provider value={{ user, loading, login, register, logout }}>{children}</AuthContext.Provider>;
}
