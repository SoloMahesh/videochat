import { io, type Socket } from "socket.io-client";
import { getDeviceId } from "@/lib/device";

let socket: Socket | null = null;

export function getSocket(): Socket {
  if (!socket) {
    socket = io({ path: "/ws", auth: { deviceId: getDeviceId() }, autoConnect: false });
  }
  return socket;
}
