import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Provider } from "react-redux";
import { store } from "./app/store";
import { Splash } from "./pages/Splash";
import { Login } from "./pages/Login";
import { Signup } from "./pages/Signup";
import { VerifyOtp } from "./pages/VerifyOtp";
import { Dashboard } from "./pages/Dashboard";
import { Onboarding } from "./pages/Onboarding";
import { ProtectedRoute } from "./features/auth";
import { AppLayout } from "./components/layout/AppLayout";
import { LogFood } from "./pages/LogFood";
import { Workout } from "./pages/Workout";
import { Profile } from "./pages/Profile";
import { ScanFood } from "./pages/ScanFood";

function App() {
  return (
    <Provider store={store}>
      <BrowserRouter>
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<Splash />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/verify-otp" element={<VerifyOtp />} />

          {/* Protected Routes */}
          <Route element={<ProtectedRoute />}>
            <Route path="/onboarding" element={<Onboarding />} />

            <Route element={<AppLayout />}>
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/log-food" element={<LogFood />} />
              <Route path="/log-food/scan" element={<ScanFood />} />
              <Route path="/workout" element={<Workout />} />
              <Route path="/profile" element={<Profile />} />
            </Route>
          </Route>

          {/* Catch-all redirect to Splash for unknown public routes */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </Provider>
  );
}

export default App;
