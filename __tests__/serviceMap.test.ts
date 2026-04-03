describe("serviceMap", () => {
  afterEach(() => {
    jest.resetModules();
  });

  describe("in local mode (IS_LOCAL=true)", () => {
    let serviceMap: Record<string, { url: string; includeInHealthCheck: boolean }>;

    beforeEach(() => {
      jest.resetModules();
      jest.doMock("../src/utils/isLocal", () => ({ isLocal: () => true }));
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      serviceMap = require("../src/config/serviceMap").serviceMap;
    });

    it("uses localhost URLs with the correct port for each service", () => {
      expect(serviceMap["portfolio-api"].url).toBe("http://localhost:3001");
      expect(serviceMap["lease-tracker-api"].url).toBe("http://localhost:3005");
    });

    it("generates dev variant URLs at port + 1000 for services with includeDevApi: true", () => {
      expect(serviceMap["lease-tracker-api-dev"].url).toBe(
        "http://localhost:4005"
      );
      expect(serviceMap["wmsfo-api-dev"].url).toBe("http://localhost:4003");
    });
  });

  describe("in non-local mode (IS_LOCAL=false)", () => {
    let serviceMap: Record<string, { url: string; includeInHealthCheck: boolean }>;

    beforeEach(() => {
      jest.resetModules();
      jest.doMock("../src/utils/isLocal", () => ({ isLocal: () => false }));
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      serviceMap = require("../src/config/serviceMap").serviceMap;
    });

    it("uses the service name as the hostname in URLs", () => {
      expect(serviceMap["portfolio-api"].url).toBe(
        "http://portfolio-api:3001"
      );
      expect(serviceMap["lease-tracker-api"].url).toBe(
        "http://lease-tracker-api:3005"
      );
    });

    it("generates dev variant URLs with -dev suffix at port + 1000", () => {
      expect(serviceMap["lease-tracker-api-dev"].url).toBe(
        "http://lease-tracker-api-dev:4005"
      );
    });
  });

  describe("dev variant logic", () => {
    let serviceMap: Record<string, { url: string; includeInHealthCheck: boolean }>;

    beforeEach(() => {
      jest.resetModules();
      jest.doMock("../src/utils/isLocal", () => ({ isLocal: () => false }));
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      serviceMap = require("../src/config/serviceMap").serviceMap;
    });

    it("services with includeDevApi: true have a -dev entry", () => {
      expect(serviceMap).toHaveProperty("wmsfo-api-dev");
      expect(serviceMap).toHaveProperty("3gixhub-api-dev");
      expect(serviceMap).toHaveProperty("lease-tracker-api-dev");
    });

    it("services with includeDevApi: false have no -dev entry", () => {
      expect(serviceMap).not.toHaveProperty("portfolio-api-dev");
    });
  });
});
