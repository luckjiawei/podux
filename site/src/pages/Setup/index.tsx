import { useSetup } from "./useSetup";
import { SetupView } from "./SetupPage.view";

export function SetupPage() {
  const setupState = useSetup();

  return <SetupView {...setupState} />;
}

export default SetupPage;
