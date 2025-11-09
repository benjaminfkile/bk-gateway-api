import { Server } from "socket.io";
import { io as ClientIO, Socket } from "socket.io-client";

const socketIOService = {
  isLeader: false,
  instanceId: null as string | null,
  ioServer: null as Server | null,
  client: null as Socket | null,
  port: Number(process.env.SOCKET_PORT ?? 5000),

  init(isLeader: boolean, instanceId: string) {
    this.instanceId = instanceId;
    console.log(
      `[socketIOService] init(isLeader=${isLeader}, instanceId=${instanceId})`
    );

    // Start the appropriate mode immediately on init (no early return).
    if (isLeader) {
      this.isLeader = true;
      this.stopFollowerMode();
      this.startLeaderMode();
    } else {
      this.isLeader = false;
      this.stopLeaderMode();
      this.startFollowerMode();
    }
  },

  setRole(isLeader: boolean) {
    console.log(
      `[socketIOService] setRole called: requested=${isLeader}, current=${this.isLeader}, ` +
        `clientConnected=${
          !!this.client && this.client.connected
        }, serverUp=${!!this.ioServer}`
    );

    if (isLeader === this.isLeader) {
      // Role didn't change. Ensure the proper side is actually running.
      if (isLeader) {
        if (!this.ioServer) this.startLeaderMode();
      } else {
        if (!this.client || !this.client.connected) this.startFollowerMode();
      }
      return;
    }

    // Role changed → switch modes
    this.isLeader = isLeader;
    if (isLeader) {
      this.stopFollowerMode();
      this.startLeaderMode();
    } else {
      this.stopLeaderMode();
      this.startFollowerMode();
    }
  },

  startLeaderMode() {
    // console.log(`[socketIOService] startLeaderMode()`);

    // // only start if not already running
    // if (!this.ioServer) {
    //   console.log("starting leader mode....");

    //   const port = this.port; // you already set this at the top
    //   this.ioServer = new Server(port, { cors: { origin: "*" } });

    //   this.ioServer.on("connection", (socket) => {
    //     console.log(`[Leader] follower connected: ${socket.id}`);

    //     // optional handshake message
    //     socket.emit("welcome", { leaderId: this.instanceId });

    //     socket.on("ping", (data) => {
    //       console.log(`[Leader] received ping:`, data);
    //       socket.emit("pong", { from: this.instanceId, ts: Date.now() });
    //     });
    //   });

    //   console.log(`[Leader] Socket.IO server running on port ${port}`);
    // }
  },

  startFollowerMode() {
    // console.log(`[socketIOService] startFollowerMode()`);
    // if (!this.client) {
    //   console.log("starting client");

    //   const leaderUrl =
    //     process.env.LEADER_URL ?? `http://localhost:${this.port}`;
    //   this.client = ClientIO(leaderUrl, { transports: ["websocket"] });

    //   this.client.on("connect", () => {
    //     console.log(`[Follower] Connected to leader at ${leaderUrl}`);
    //     this.client?.emit("ping", { from: this.instanceId, ts: Date.now() });
    //   });

    //   this.client.on("connect_error", (err) => {
    //     console.log(`[Follower] connect_error: ${err.message}`);
    //   });

    //   this.client.on("welcome", (msg) =>
    //     console.log(`[Follower] Welcome:`, msg)
    //   );

    //   this.client.on("pong", (msg) => console.log(`[Follower] Pong:`, msg));

    //   this.client.on("disconnect", (reason) =>
    //     console.log(`[Follower] Disconnected: ${reason}`)
    //   );
    // }
  },

  stopLeaderMode() {
    console.log(`[socketIOService] Stopping leader server`);
    if (this.ioServer) {
      try {
        this.ioServer.close();
        this.ioServer = null;
      } catch (err) {
        console.error(err);
      }
    }
  },

  stopFollowerMode() {
    console.log(`[socketIOService] Disconnecting follower client`);
    if (this.client) {
      try {
        this.client.disconnect();
      } catch (err) {
        console.error(err);
      }
      this.client = null;
    }
  },
};

export default socketIOService;
