import { isAndroid } from '../platform/platform';
import { session } from '../platform/session';
import { io } from "socket.io-client";
import { SOCKET_URL } from "./constants";

export const createSocketConnection = (options = {}) => {
  return io(SOCKET_URL, {
    withCredentials: !isAndroid(),
    auth: isAndroid() ? { token: session.token() } : {},
    transports: ["websocket"],
    autoConnect: options.autoConnect !== false,
  });
};
