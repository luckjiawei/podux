import PocketBase, { type SendOptions } from "pocketbase";

const pb = new PocketBase(import.meta.env.VITE_POCKETBASE_URL || "/api");

const _send = pb.send.bind(pb);
pb.send = function <T = unknown>(path: string, options: SendOptions = {}): Promise<T> {
  if (!("requestKey" in options)) {
    options.requestKey = null;
  }
  return _send<T>(path, options);
};

export default pb;
