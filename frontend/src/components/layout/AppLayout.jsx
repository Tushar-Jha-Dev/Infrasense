import { useCallback, useRef, useState } from "react";
import { Outlet } from "react-router-dom";
import { useAuth } from "../../context/useAuth.js";
import Sidebar from "./Sidebar.jsx";
import Topbar from "./Topbar.jsx";
import "./AppLayout.css";

function AppLayout() {
  const { user } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const menuButtonRef = useRef(null);

  const openSidebar = useCallback(() => {
    setSidebarOpen(true);
  }, []);

  const closeSidebar = useCallback(() => {
    setSidebarOpen(false);
  }, []);

  return (
    <div className="app-shell">
      <Sidebar
        role={user?.role}
        isOpen={sidebarOpen}
        onClose={closeSidebar}
        returnFocusRef={menuButtonRef}
      />

      <div className="app-main">
        <Topbar
          isSidebarOpen={sidebarOpen}
          onOpenSidebar={openSidebar}
          menuButtonRef={menuButtonRef}
        />

        <main className="app-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

export default AppLayout;
