import { Redirect, Route, Switch } from "react-router-dom";
import { ProtectedRoute } from "./routes/ProtectedRoute";
import { LoginPage } from "./pages/LoginPage";
import { RegisterPage } from "./pages/RegisterPage";
import { HealthPage } from "./pages/HealthPage";
import { NotFoundPage } from "./pages/NotFoundPage";
import { AdminLayout } from "./features/admin/AdminComponents";
import { AdminDashboard } from "./features/admin/pages/AdminDashboard";
import {
  AdminActivityLog,
  AdminClientDetails,
  AdminClients,
  AdminDocuments,
  AdminInvestments,
  AdminNotifications,
  AdminReferrals,
  AdminReports,
  AdminSettings,
  AdminSystemHealth,
  AdminTransactions,
  AdminWithdrawals
} from "./features/admin/pages/AdminRecordsPages";
import { ClientLayout } from "./features/client/ClientComponents";
import {
  AccountOverviewPage,
  AddInvestmentPage,
  BankDetailsPage,
  ClientDashboardPage,
  ClientDocumentsPage,
  ClientNotificationsPage,
  ClientProfilePage,
  ClientReferralsPage,
  ClientSettingsPage,
  ClientTransactionsPage,
  ClientWithdrawalsPage,
  FaqPage,
  HelpSupportPage
} from "./features/client/pages/ClientPages";

export function App() {
  return (
    <Switch>
      <Route path="/login" component={LoginPage} />
      <Route path="/admin-login" render={() => <Redirect to="/login" />} />
      <Route path="/register" component={RegisterPage} />
      <Route path="/health" component={HealthPage} />
      <ProtectedRoute role="client" path="/client">
        <ClientLayout>
          <Switch>
            <Route path="/client/account-overview" component={AccountOverviewPage} />
            <Route path="/client/bank-details" component={BankDetailsPage} />
            <Route path="/client/transactions" component={ClientTransactionsPage} />
            <Route path="/client/add-investment" component={AddInvestmentPage} />
            <Route path="/client/withdrawals" component={ClientWithdrawalsPage} />
            <Route path="/client/agreements" render={() => <Redirect to="/client/documents" />} />
            <Route path="/client/documents" component={ClientDocumentsPage} />
            <Route path="/client/referrals" component={ClientReferralsPage} />
            <Route path="/client/profile" component={ClientProfilePage} />
            <Route path="/client/notifications" component={ClientNotificationsPage} />
            <Route path="/client/faq" component={FaqPage} />
            <Route path="/client/support" component={HelpSupportPage} />
            <Route path="/client/settings" component={ClientSettingsPage} />
            <Route exact path="/client" component={ClientDashboardPage} />
          </Switch>
        </ClientLayout>
      </ProtectedRoute>
      <ProtectedRoute role="admin" path="/admin">
        <AdminLayout>
          <Switch>
            <Route path="/admin/clients/:id" component={AdminClientDetails} />
            <Route path="/admin/clients" component={AdminClients} />
            <Route path="/admin/investments" component={AdminInvestments} />
            <Route path="/admin/transactions" component={AdminTransactions} />
            <Route path="/admin/withdrawals" component={AdminWithdrawals} />
            <Route path="/admin/documents" component={AdminDocuments} />
            <Route path="/admin/referrals" component={AdminReferrals} />
            <Route path="/admin/notifications" component={AdminNotifications} />
            <Route path="/admin/reports" component={AdminReports} />
            <Route path="/admin/settings" component={AdminSettings} />
            <Route path="/admin/activity" component={AdminActivityLog} />
            <Route path="/admin/system-health" component={AdminSystemHealth} />
            <Route exact path="/admin" component={AdminDashboard} />
          </Switch>
        </AdminLayout>
      </ProtectedRoute>
      <Route exact path="/" render={() => <Redirect to="/login" />} />
      <Route component={NotFoundPage} />
    </Switch>
  );
}
