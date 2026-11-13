import { Routes, Route } from "react-router-dom";
import ProtectedRoute from "./components/ProtectedRoute.jsx";
import AppLayout from "./components/layout/AppLayout.jsx";
import Landing from "./pages/public/Landing.jsx";
import Login from "./pages/public/Login.jsx";
import Register from "./pages/public/Register.jsx";
import AssetDetails from "./pages/shared/assets/AssetDetails.jsx";
import AssetForm from "./pages/shared/assets/AssetForm.jsx";
import AssetList from "./pages/shared/assets/AssetList.jsx";
import ComplaintDetails from "./pages/user/ComplaintDetails.jsx";
import NewComplaint from "./pages/user/NewComplaint.jsx";
import UserDashboard from "./pages/user/UserDashboard.jsx";
import AdminDashboard from "./pages/admin/AdminDashboard.jsx";
import AdminComplaints from "./pages/admin/AdminComplaints.jsx";
import AdminComplaintReview from "./pages/admin/AdminComplaintReview.jsx";
import Analytics from "./pages/admin/Analytics.jsx";
import UsersManagement from "./pages/admin/UsersManagement.jsx";
import MyTasks from "./pages/technician/MyTasks.jsx";
import TaskDetails from "./pages/technician/TaskDetails.jsx";
import Profile from "./pages/shared/Profile.jsx";
import NotFound from "./pages/shared/NotFound.jsx";

function App() {
  return (
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
          <Route
            path="/admin/users"
            element={<UsersManagement />}
          />
          <Route
            path="/admin/analytics"
            element={<Analytics />}
          />
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
        </Route>
      </Route>

      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

export default App;
