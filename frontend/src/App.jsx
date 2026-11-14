import { Suspense, lazy } from "react";
import { Routes, Route } from "react-router-dom";
import ProtectedRoute from "./components/ProtectedRoute.jsx";
import AppLayout from "./components/layout/AppLayout.jsx";
import Spinner from "./components/ui/Spinner.jsx";
import Landing from "./pages/public/Landing.jsx";
import Login from "./pages/public/Login.jsx";
import Register from "./pages/public/Register.jsx";

// Lazy-loaded page components for route-based code splitting
const AssetDetails = lazy(() => import("./pages/shared/assets/AssetDetails.jsx"));
const AssetForm = lazy(() => import("./pages/shared/assets/AssetForm.jsx"));
const AssetList = lazy(() => import("./pages/shared/assets/AssetList.jsx"));
const ComplaintDetails = lazy(() => import("./pages/user/ComplaintDetails.jsx"));
const NewComplaint = lazy(() => import("./pages/user/NewComplaint.jsx"));
const UserDashboard = lazy(() => import("./pages/user/UserDashboard.jsx"));
const AdminDashboard = lazy(() => import("./pages/admin/AdminDashboard.jsx"));
const AdminComplaints = lazy(() => import("./pages/admin/AdminComplaints.jsx"));
const AdminComplaintReview = lazy(() => import("./pages/admin/AdminComplaintReview.jsx"));
const Analytics = lazy(() => import("./pages/admin/Analytics.jsx"));
const UsersManagement = lazy(() => import("./pages/admin/UsersManagement.jsx"));
const MyTasks = lazy(() => import("./pages/technician/MyTasks.jsx"));
const TaskDetails = lazy(() => import("./pages/technician/TaskDetails.jsx"));
const Profile = lazy(() => import("./pages/shared/Profile.jsx"));
const ChangePassword = lazy(() => import("./pages/shared/ChangePassword.jsx"));
const NotFound = lazy(() => import("./pages/shared/NotFound.jsx"));

function App() {
  return (
    <Suspense fallback={<Spinner fullPage label="Loading..." />}>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        {/* User routes */}
        <Route element={<ProtectedRoute allowedRoles={["user"]} />}>
          <Route element={<AppLayout />}>
            <Route path="/dashboard" element={<UserDashboard />} />
            <Route path="/complaints/new" element={<NewComplaint />} />
            <Route path="/complaints/:id" element={<ComplaintDetails />} />
            <Route
              path="/assets"
              element={<AssetList canManage={false} basePath="/assets" />}
            />
            <Route
              path="/assets/:id"
              element={<AssetDetails canManage={false} basePath="/assets" />}
            />
          </Route>
        </Route>

        {/* Admin routes */}
        <Route element={<ProtectedRoute allowedRoles={["admin"]} />}>
          <Route element={<AppLayout />}>
            <Route path="/admin" element={<AdminDashboard />} />
            <Route path="/admin/complaints" element={<AdminComplaints />} />
            <Route
              path="/admin/complaints/:id"
              element={<AdminComplaintReview />}
            />
            <Route
              path="/admin/assets"
              element={<AssetList canManage={true} basePath="/admin/assets" />}
            />
            <Route
              path="/admin/assets/new"
              element={<AssetForm key="create" basePath="/admin/assets" />}
            />
            <Route
              path="/admin/assets/:id"
              element={<AssetDetails canManage={true} basePath="/admin/assets" />}
            />
            <Route
              path="/admin/assets/:id/edit"
              element={<AssetForm key="edit" basePath="/admin/assets" />}
            />
            <Route path="/admin/users" element={<UsersManagement />} />
            <Route path="/admin/analytics" element={<Analytics />} />
          </Route>
        </Route>

        {/* Technician routes */}
        <Route element={<ProtectedRoute allowedRoles={["technician"]} />}>
          <Route element={<AppLayout />}>
            <Route path="/technician" element={<MyTasks />} />
            <Route path="/technician/tasks/:id" element={<TaskDetails />} />
          </Route>
        </Route>

        {/* Shared logged-in routes */}
        <Route
          element={
            <ProtectedRoute allowedRoles={["user", "admin", "technician"]} />
          }
        >
          <Route element={<AppLayout />}>
            <Route path="/profile" element={<Profile />} />
            <Route path="/change-password" element={<ChangePassword />} />
          </Route>
        </Route>

        <Route path="*" element={<NotFound />} />
      </Routes>
    </Suspense>
  );
}

export default App;
