import { useCallback, useEffect, useState } from "react";
import {
  getMe,
  login as loginRequest,
  register as registerRequest,
} from "../api/auth.js";
import {
  clearToken,
  getToken,
  setToken,
  setUnauthorizedHandler,
} from "../api/client.js";
import { AuthContext } from "./useAuth.js";

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(() => Boolean(getToken()));

  const logout = useCallback(() => {
    clearToken();
    setUser(null);
  }, []);

  useEffect(() => {
    setUnauthorizedHandler(() => {
      clearToken();
      setUser(null);
    });

    return () => {
      setUnauthorizedHandler(null);
    };
  }, []);

  useEffect(() => {
    const token = getToken();
    if (!token) {
      return;
    }

    let active = true;

    getMe()
      .then((me) => {
        if (active) {
          setUser(me);
        }
      })
      .catch(() => {
        clearToken();
        if (active) {
          setUser(null);
        }
      })
      .finally(() => {
        if (active) {
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, []);

  const login = useCallback(async (email, password) => {
    const data = await loginRequest(email, password);
    setToken(data.token);
    setUser(data.user);
    return data.user;
  }, []);

  const register = useCallback(
    async (formData) => {
      await registerRequest(formData);
      return login(formData.email, formData.password);
    },
    [login]
  );

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
