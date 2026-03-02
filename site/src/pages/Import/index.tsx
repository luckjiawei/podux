import { useState, useEffect } from "react";
import { useImport } from "./useImport";
import { ImportPageView } from "./ImportPage.view";

export function ImportPage() {
  const importState = useImport();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setVisible(true), 100);
    return () => clearTimeout(timer);
  }, []);

  return <ImportPageView {...importState} visible={visible} />;
}
