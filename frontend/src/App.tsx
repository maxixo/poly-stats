import React from "react";
import { Routes, Route, Navigate, Outlet } from "react-router-dom";
import { Layout } from "./components/Layout";
import { AuthLayout } from "./components/AuthLayout";
import { Dashboard } from "./pages/Dashboard";
import { WalletExplorer } from "./pages/WalletExplorer";
import { CopyTrading } from "./pages/CopyTrading";
import { TradePanel } from "./pages/TradePanel";
import { Login } from "./pages/Login";
import { Signup } from "./pages/Signup";

const AppShell = () => (
  <Layout>
    <Outlet />
  </Layout>
);

const App = () => (
  <Routes>
    <Route element={<AppShell />}>
      <Route path="/" element={<Dashboard />} />
      <Route path="/wallets" element={<WalletExplorer />} />
      <Route path="/copy-trading" element={<CopyTrading />} />
      <Route path="/trade" element={<TradePanel />} />
    </Route>
    <Route element={<AuthLayout />}>
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />
    </Route>
    <Route path="*" element={<Navigate to="/" replace />} />
  </Routes>
);

export default App;