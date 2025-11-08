import { getDb } from "../db/db";
import ec2HeartbeatService from "./ec2HeartbeatService";

interface LeaderState {
  instanceId: string;
  isLeader: boolean;
  leaderId: string | null;
  lastChecked: Date | null;
}

const LEADER_CHECK_INTERVAL_MS = 5_000; // backup recheck

const leaderElectionService = {
  state: {
    instanceId: "",
    isLeader: false,
    leaderId: null,
    lastChecked: null,
  } as LeaderState,

  _interval: null as NodeJS.Timeout | null,

  /**
   * Initialize election system for this instance.
   */
  async init(instanceId: string) {
    this.state.instanceId = instanceId;
    console.log(`[LeaderService] Initializing for ${instanceId}`);

    // First-time check and record
    await this.evaluate();

    // Start heartbeat (which now calls evaluate() each tick)
    ec2HeartbeatService.startHeartbeatLoop(instanceId);

    // Backup periodic evaluation if heartbeats lag
    if (this._interval) clearInterval(this._interval);
    this._interval = setInterval(() => this.evaluate(), LEADER_CHECK_INTERVAL_MS);
  },

  /**
   * Core leader election and self-registration logic.
   */
  async evaluate() {
    const db = getDb();
    const { instanceId } = this.state;

    try {
      // 1️⃣ Ensure this instance exists in ec2_launch
      let existing = await db("ec2_launch").where({ instance_id: instanceId }).first();

      if (!existing) {
        const totalCount = Number(
          (await db("ec2_launch").count("* as c").first())?.c ?? 0
        );
        const shouldBeLeader = totalCount === 0;

        await db("ec2_launch").insert({
          instance_id: instanceId,
          launched_at: db.fn.now(),
          is_leader: shouldBeLeader,
        });

        console.log(
          `[LeaderService] Inserted ${instanceId} (leader=${shouldBeLeader})`
        );

        // First heartbeat for FK validity
        await new Promise((r) => setTimeout(r, 200));
        await ec2HeartbeatService.record(instanceId);

        if (shouldBeLeader) {
          this._updateState(true, instanceId);
          return;
        }
      }

      // 2️⃣ Determine current leader from DB
      const currentLeader = await db("ec2_launch")
        .where({ is_leader: true })
        .first();

      let leaderId = currentLeader?.instance_id ?? null;
      let leaderAlive = false;

      if (leaderId) {
        const hb = await db("ec2_heartbeat")
          .where({ instance_id: leaderId })
          .orderBy("heartbeat_at", "desc")
          .first();
        leaderAlive =
          !!hb && new Date(hb.heartbeat_at).getTime() > Date.now() - 10_000;
      }

      // 3️⃣ Elect new leader if none or stale
      if (!leaderId || !leaderAlive) {
        const aliveQuery = await db.raw(`
          SELECT l.instance_id
          FROM ec2_launch l
          JOIN LATERAL (
            SELECT heartbeat_at
            FROM ec2_heartbeat h
            WHERE h.instance_id = l.instance_id
            ORDER BY heartbeat_at DESC
            LIMIT 1
          ) h ON TRUE
          WHERE h.heartbeat_at > (NOW() - INTERVAL '10 seconds')
          ORDER BY l.launched_at ASC
          LIMIT 1;
        `);

        leaderId =
          aliveQuery.rows?.[0]?.instance_id ??
          (
            await db("ec2_launch")
              .select("instance_id")
              .orderBy("launched_at", "asc")
              .first()
          )?.instance_id ??
          null;

        await db.transaction(async (trx) => {
          await trx("ec2_launch").update({ is_leader: false });
          if (leaderId)
            await trx("ec2_launch")
              .where({ instance_id: leaderId })
              .update({ is_leader: true });
        });

        console.log(`[LeaderService] New leader elected: ${leaderId}`);
      }

      const isLeader = leaderId === instanceId;
      this._updateState(isLeader, leaderId);
    } catch (err) {
      console.error("[LeaderService Error]:", err);
    }
  },

  _updateState(isLeader: boolean, leaderId: string | null) {
    const prev = this.state.isLeader;
    this.state.isLeader = isLeader;
    this.state.leaderId = leaderId;
    this.state.lastChecked = new Date();

    if (prev !== isLeader) {
      console.log(
        `[LeaderService] State change → isLeader=${isLeader}, leaderId=${leaderId}`
      );
    }
  },

  getState() {
    return this.state;
  },

  isLeaderNow() {
    return this.state.isLeader;
  },

  destroy() {
    if (this._interval) clearInterval(this._interval);
    ec2HeartbeatService.stopHeartbeatLoop(this.state.instanceId);
    this._interval = null;
    console.log("[LeaderService] Stopped leader evaluation");
  },
};

export default leaderElectionService;
