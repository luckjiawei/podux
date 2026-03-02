import { useVersion } from "./useVersion";
import { VersionView } from "./VersionPage.view";

export function VersionPage() {
  const state = useVersion();

  return <VersionView {...state} />;
}

export default VersionPage;
