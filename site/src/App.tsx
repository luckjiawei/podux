import { BrowserRouter, Routes, Route, Navigate, Outlet } from "react-router-dom";
import { lazy, Suspense } from "react";
import { RequireAuth } from "./components/RequireAuth";
import { RequireSetup } from "./components/RequireSetup";
import { MainLayout } from "./layouts/MainLayout";
import { Loading } from "./components/Loading";

// 路由懒加载 - 按需加载页面组件
const SetupPage = lazy(() => import("./pages/Setup").then((m) => ({ default: m.SetupPage })));
const LoginPage = lazy(() => import("./pages/Login").then((m) => ({ default: m.LoginPage })));
const ProxiesPage = lazy(() => import("./pages/Proxies").then((m) => ({ default: m.ProxiesPage })));
const ServersPage = lazy(() => import("./pages/Servers").then((m) => ({ default: m.ServersPage })));
const DashboardPage = lazy(() =>
  import("./pages/Dashboard").then((m) => ({ default: m.DashboardPage }))
);
const SettingsPage = lazy(() =>
  import("./pages/Settings").then((m) => ({ default: m.SettingsPage }))
);
const NotFoundPage = lazy(() =>
  import("./pages/NotFound").then((m) => ({ default: m.NotFoundPage }))
);
const ServerDetailPage = lazy(() =>
  import("./pages/ServerDetail").then((m) => ({ default: m.ServerDetailPage }))
);
const ImportPage = lazy(() => import("./pages/Import").then((m) => ({ default: m.ImportPage })));

function AuthenticatedLayout() {
  console.log("AuthenticatedLayout rendered");
  return (
    <RequireSetup>
      <RequireAuth>
        <MainLayout>
          <Outlet />
        </MainLayout>
      </RequireAuth>
    </RequireSetup>
  );
}

function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<Loading fullscreen />}>
        <Routes>
          {/* Setup Route - No authentication or initialization check required */}
          <Route path="/setup" element={<SetupPage />} />

          {/* Login Route - Requires system to be initialized */}
          <Route
            path="/login"
            element={
              <RequireSetup>
                <LoginPage />
              </RequireSetup>
            }
          />

          {/* Authenticated Routes with shared layout */}
          <Route element={<AuthenticatedLayout />}>
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/proxies" element={<ProxiesPage />} />
            <Route path="/servers" element={<ServersPage />} />
            <Route path="/servers/:id" element={<ServerDetailPage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="/import" element={<ImportPage />} />
            {/* <Route path="/versions" element={<VersionPage />} /> */}
          </Route>

          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/404" element={<NotFoundPage />} />
          <Route path="*" element={<Navigate to="/404" replace />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}

export default App;
