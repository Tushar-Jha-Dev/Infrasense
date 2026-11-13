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

  const refreshUser = useCallback(async () => {
    try {
      const me = await getMe();
      setUser(me);
      return me;
    } catch {
      return null;
    }
  }, []);

  // Set / remove body class for hiding sidebar links when mustChangePassword is true
  useEffect(() => {
    if (user?.mustChangePassword) {
      document.body.classList.add("must-change-password");
    } else {
      document.body.classList.remove("must-change-password");
    }
    return () => {
      document.body.classList.remove("must-change-password");
    };
  }, [user?.mustChangePassword]);

  // Handle 403 PASSWORD_CHANGE_REQUIRED from API requests without logging out
  useEffect(() => {
    const handleRejection = (event) => {
      const err = event.reason;
      if (
        err?.status === 403 &&
        (err?.message === "You must change your temporary password first" ||
          err?.code === "PASSWORD_CHANGE_REQUIRED")
      ) {
        setUser((prev) => (prev ? { ...prev, mustChangePassword: true } : prev));
        if (window.location.pathname !== "/change-password") {
          window.location.href = "/change-password";
        }
      }
    };

    window.addEventListener("unhandledrejection", handleRejection);
    return () => {
      window.removeEventListener("unhandledrejection", handleRejection);
    };
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
    <AuthContext.Provider
      value={{ user, setUser, refreshUser, loading, login, register, logout }}
    >
      {children}
    </AuthContext.Provider>
  );
}
