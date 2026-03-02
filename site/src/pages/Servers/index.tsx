import { useServers } from "./useServers";
import { ServersView } from "./ServersPage.view";

export function ServersPage() {
  const state = useServers();

  return <ServersView {...state} />;
}

export default ServersPage;
