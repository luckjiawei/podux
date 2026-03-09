import { useState, useEffect } from "react";
import { useProxyForm } from "./useProxyForm";
import { ProxyFormPageView } from "./ProxyFormPage.view";

export function ProxyFormPage() {
  const form = useProxyForm();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setMounted(true), 100);
    return () => clearTimeout(timer);
  }, []);

  return (
    <ProxyFormPageView
      isEditing={form.isEditing}
      formData={form.formData}
      servers={form.servers}
      loadingServers={form.loadingServers}
      loadingProxy={form.loadingProxy}
      submitting={form.submitting}
      errors={form.errors}
      isHttpType={form.isHttpType}
      isSubmitDisabled={form.isSubmitDisabled}
      mounted={mounted}
      onChange={form.handleChange}
      onSubmit={form.handleSubmit}
      onCancel={() => form.navigate("/proxies")}
      onNavigateToServers={() => form.navigate("/servers")}
    />
  );
}

export default ProxyFormPage;
