import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import Layout from "./components/Layout";
import Dashboard from "./pages/Dashboard";
import Vehicles from "./pages/Vehicles";
import Clients from "./pages/Clients";
import JobCards from "./pages/JobCards";
import SafariAllocations from "./pages/SafariAllocations";
import Quotations from "./pages/Quotations";
import Parks from "./pages/Parks";
import ProformaInvoices from "./pages/ProformaInvoices";
import Invoices from "./pages/Invoices";
import Payments from "./pages/Payments";
import Settings from "./pages/Settings";
import Login from "./pages/Login";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import Leads from "./pages/Leads";
import Users from "./pages/Users";
import { isAuthenticated } from "./utils/auth";

function LoginRoute() {
  return isAuthenticated() ? <Navigate to="/" replace /> : <Login />;
}

function ProtectedRoutes() {
  if (!isAuthenticated()) {
    return <Navigate to="/login" replace />;
  }

  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/vehicles" element={<Vehicles />} />
        <Route path="/clients" element={<Clients />} />
        <Route path="/job-cards" element={<JobCards />} />
        <Route path="/safari-allocations" element={<SafariAllocations />} />
        <Route path="/leads" element={<Leads />} />
        <Route path="/quotations" element={<Quotations />} />
        <Route path="/parks" element={<Parks />} />
        <Route path="/proforma-invoices" element={<ProformaInvoices />} />
        <Route path="/invoices" element={<Invoices />} />
        <Route path="/payments" element={<Payments />} />
        <Route path="/users" element={<Users />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Layout>
  );
}

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<LoginRoute />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/*" element={<ProtectedRoutes />} />
      </Routes>
    </Router>
  );
}

export default App;
