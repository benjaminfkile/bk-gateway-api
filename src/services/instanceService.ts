import getInstanceId from "../utils/getInstanceId";

let instanceId: string | null = null;
let environment: string | null = null;

const instanceService = {
  async init(env: string) {
    if (instanceId) return; // already initialized
    const id = await getInstanceId();
    instanceId = `${id}-${env}`;
    environment = env;
    console.log(`[InstanceService] Initialized with ID: ${instanceId}`);
  },

  async setFromParent(id: string, env: string) {
    instanceId = id;
    environment = env;
    console.log(`[InstanceService] Synced from parent: ${instanceId}`);
  },

  getId() {
    if (!instanceId) throw new Error("[InstanceService] Not initialized — call init() first.");
    return instanceId;
  },

  getEnvironment() {
    return environment;
  },

  getUniqueId() {
    return instanceId!;
  },
};

export default instanceService;
