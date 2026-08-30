import { createServer } from "node:http";
import next from "next";
import { Server } from "socket.io";
import { registerSocketServer } from "./src/lib/socket/server";

const port = Number(process.env.PORT ?? 3000);
const dev = process.env.NODE_ENV !== "production";

const app = next({ dev });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const httpServer = createServer((req, res) => handle(req, res));

  const io = new Server(httpServer, {
    path: "/ws",
    cors: { origin: process.env.APP_URL ?? "*" },
  });

  registerSocketServer(io);

  httpServer.listen(port, () => {
    console.log(`Bounce listening on http://localhost:${port}`);
  });
});
