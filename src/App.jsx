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
import RolesPermissions from "./pages/RolesPermissions";
import Checklist from "./pages/Checklist";
// import FuelRequisitions from "./pages/FuelRequisitions";
// import FuelRequisitionCreate from "./pages/FuelRequisitionCreate";
// import FuelRequisitionApproval from "./pages/FuelRequisitionApproval";
import VehicleServices from "./pages/VehicleServices";
import VehicleView from "./pages/VehicleView";
import VehicleAvailability from "./pages/VehicleAvailability";
// import RouteDistances from "./pages/RouteDistances";
import Inspections from "./pages/Inspections";
import PerformanceDashboard from "./pages/IncidentReports";
import OdometerReports from "./pages/OdometerReports";
import OdometerReportView from "./pages/OdometerReportView";
import LongTermLeasing from "./pages/LongTermLeasing";
import LeaseCalendar from "./pages/LeaseCalendar";
import LeaseAllocations from "./pages/LeaseAllocations";
import LeaseProformaInvoices from "./pages/LeaseProformaInvoices";
import { isAuthenticated, hasPermission } from "./utils/auth";

function AccessDenied() {
  return (
    <div className="mx-auto max-w-2xl rounded-2xl border border-amber-200 bg-amber-50 p-6 text-amber-900 shadow-sm">
      <h2 className="text-lg font-semibold">Access Denied</h2>
      <p className="mt-2 text-sm">
        You do not have permission to view this page. Please contact your
        administrator to grant access.
      </p>
    </div>
  );
}

function PermissionRoute({ permission, element }) {
  if (!hasPermission(permission)) {
    return <AccessDenied />;
  }
  return element;
}

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
        <Route
          path="/"
          element={
            <PermissionRoute
              permission="dashboard.view"
              element={<Dashboard />}
            />
          }
        />
        <Route
          path="/performance-dashboard"
          element={
            <PermissionRoute
              permission="vehicles.view"
              element={<PerformanceDashboard />}
            />
          }
        />
        <Route
          path="/incident-reports"
          element={<Navigate to="/performance-dashboard" replace />}
        />
        <Route
          path="/vehicles"
          element={
            <PermissionRoute
              permission="vehicles.view"
              element={<Vehicles />}
            />
          }
        />
        <Route
          path="/vehicles/:id"
          element={
            <PermissionRoute
              permission="vehicles.view"
              element={<VehicleView />}
            />
          }
        />
        <Route
          path="/vehicle-availability"
          element={
            <PermissionRoute
              permission="vehicles.view"
              element={<VehicleAvailability />}
            />
          }
        />
        <Route
          path="/long-term-leasing"
          element={
            <PermissionRoute
              permission="vehicles.view"
              element={<LongTermLeasing />}
            />
          }
        />
        <Route
          path="/lease-calendar"
          element={
            <PermissionRoute
              permission="vehicles.view"
              element={<LeaseCalendar />}
            />
          }
        />
        <Route
          path="/lease-allocations"
          element={
            <PermissionRoute
              permission="vehicles.view"
              element={<LeaseAllocations />}
            />
          }
        />
        <Route
          path="/lease-proforma-invoices"
          element={
            <PermissionRoute
              permission="proforma-invoices.view"
              element={<LeaseProformaInvoices />}
            />
          }
        />
        <Route
          path="/clients"
          element={
            <PermissionRoute permission="clients.view" element={<Clients />} />
          }
        />
        <Route
          path="/job-cards"
          element={
            <PermissionRoute
              permission="job-cards.view"
              element={<JobCards />}
            />
          }
        />
        <Route
          path="/safari-allocations"
          element={
            <PermissionRoute
              permission="safari-allocations.view"
              element={<SafariAllocations />}
            />
          }
        />
        <Route
          path="/leads"
          element={
            <PermissionRoute permission="leads.view" element={<Leads />} />
          }
        />
        <Route
          path="/quotations"
          element={
            <PermissionRoute
              permission="quotations.view"
              element={<Quotations />}
            />
          }
        />
        <Route
          path="/parks"
          element={
            <PermissionRoute permission="parks.view" element={<Parks />} />
          }
        />
        <Route
          path="/proforma-invoices"
          element={
            <PermissionRoute
              permission="proforma-invoices.view"
              element={<ProformaInvoices />}
            />
          }
        />
        <Route
          path="/invoices"
          element={
            <PermissionRoute
              permission="invoices.view"
              element={<Invoices />}
            />
          }
        />
        <Route
          path="/payments"
          element={
            <PermissionRoute
              permission="invoice-payments.view"
              element={<Payments />}
            />
          }
        />
        <Route
          path="/users"
          element={
            <PermissionRoute permission="users.view" element={<Users />} />
          }
        />
        <Route
          path="/roles-permissions"
          element={
            <PermissionRoute
              permission="users.view"
              element={<RolesPermissions />}
            />
          }
        />
        <Route path="/checklist" element={<Checklist />} />
        {/* <Route path="/fuel-requisitions" element={<FuelRequisitions />} /> */}
        {/*
        <Route
          path="/fuel-requisitions/:id/approval"
          element={<FuelRequisitionApproval />}
        />
        */}
        <Route
          path="/vehicle-services"
          element={
            <PermissionRoute
              permission="vehicles.view"
              element={<VehicleServices />}
            />
          }
        />
        {/* <Route path="/route-distances" element={<RouteDistances />} /> */}
        <Route path="/inspections" element={<Inspections />} />
        <Route
          path="/odometer-reports"
          element={
            <PermissionRoute
              permission="odometer-logs.view"
              element={<OdometerReports />}
            />
          }
        />
        <Route
          path="/odometer-reports/:tripId"
          element={
            <PermissionRoute
              permission="odometer-logs.view"
              element={<OdometerReportView />}
            />
          }
        />
        <Route
          path="/odometer-reports/view"
          element={
            <PermissionRoute
              permission="odometer-logs.view"
              element={<OdometerReportView />}
            />
          }
        />
        {/*
        <Route
          path="/fuel-requisitions/new"
          element={<FuelRequisitionCreate />}
        />
        */}
        <Route
          path="/settings"
          element={
            <PermissionRoute
              permission="settings.view"
              element={<Settings />}
            />
          }
        />
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
