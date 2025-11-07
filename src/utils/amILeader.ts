import { getDb } from "../db/db";

/**
 * Determines if this instance is the leader.
 * Returns both the leader ID and whether this instance is that leader.
 */
export async function amILeader(instanceId: string): Promise<{
  isLeader: boolean;
  instanceId: string;
  leaderId: string | null;
}> {
  const db = getDb();
  try {
    const result = await db.raw(`
      WITH alive AS (
        SELECT l.instance_id, l.launched_at, h.heartbeat_at
        FROM ec2_launch l
        JOIN LATERAL (
          SELECT heartbeat_at
          FROM ec2_heartbeat h
          WHERE h.instance_id = l.instance_id
          ORDER BY heartbeat_at DESC
          LIMIT 1
        ) h ON TRUE
        WHERE h.heartbeat_at > (NOW() - INTERVAL '10 seconds')
      )
      SELECT instance_id
      FROM alive
      ORDER BY launched_at ASC
      LIMIT 1;
    `);

    const leaderId = result.rows?.[0]?.instance_id ?? null;
    const isLeader = leaderId === instanceId;

    return { isLeader, instanceId, leaderId };
  } catch (err) {
    console.error("[Leader Election Error]:", err);
    return { isLeader: false, instanceId, leaderId: null };
  }
}
