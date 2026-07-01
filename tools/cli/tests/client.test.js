const APortClient = require("../src/client");

// Mock axios
jest.mock("axios");
const axios = require("axios");

describe("APortClient", () => {
  let client;
  let mockAxiosInstance;
  const mockApiKey = "test-api-key";
  const mockBaseUrl = "https://api.aport.io";

  beforeEach(() => {
    process.env.APORT_API_KEY = mockApiKey;
    process.env.APORT_BASE_URL = mockBaseUrl;
    
    mockAxiosInstance = {
      post: jest.fn(),
      get: jest.fn(),
    };
    axios.create.mockReturnValue(mockAxiosInstance);
    
    client = new APortClient();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("constructor", () => {
    it("should initialize with environment variables", () => {
      expect(client.apiKey).toBe(mockApiKey);
      expect(client.baseUrl).toBe(mockBaseUrl);
    });

    it("should use custom options when provided", () => {
      const customClient = new APortClient({
        apiKey: "custom-key",
        baseUrl: "https://custom.api.com",
      });
      expect(customClient.apiKey).toBe("custom-key");
      expect(customClient.baseUrl).toBe("https://custom.api.com");
    });
  });

  describe("verify", () => {
    it("should verify agent successfully", async () => {
      const mockResponse = {
        data: {
          verified: true,
          passport: { agent_id: "test-agent" },
        },
      };
      mockAxiosInstance.post.mockResolvedValue(mockResponse);

      const result = await client.verify(
        "finance.payment.refund.v1",
        "test-agent",
        {
          amount: 100,
        }
      );

      expect(result.verified).toBe(true);
      expect(result.passport.agent_id).toBe("test-agent");
    });

    it("should handle API errors", async () => {
      const mockError = {
        response: {
          data: { message: "Agent not found" },
          statusText: "Not Found",
        },
      };
      mockAxiosInstance.post.mockRejectedValue(mockError);

      await expect(
        client.verify("finance.payment.refund.v1", "invalid-agent")
      ).rejects.toThrow("API Error: Agent not found");
    });

    it("should handle network errors", async () => {
      const mockError = new Error("Network Error");
      mockAxiosInstance.post.mockRejectedValue(mockError);

      await expect(
        client.verify("finance.payment.refund.v1", "test-agent")
      ).rejects.toThrow("Network Error: Network Error");
    });
  });

  describe("createPassport", () => {
    it("should create passport successfully", async () => {
      const mockPassportData = {
        name: "Test Agent",
        role: "Test Role",
      };
      const mockResponse = {
        data: {
          agent_id: "agt_inst_test_123",
          ...mockPassportData,
        },
      };
      mockAxiosInstance.post.mockResolvedValue(mockResponse);

      const result = await client.createPassport(mockPassportData);

      expect(result.agent_id).toBe("agt_inst_test_123");
      expect(result.name).toBe("Test Agent");
    });
  });

  describe("getPassport", () => {
    it("should get passport successfully", async () => {
      const mockResponse = {
        data: {
          agent_id: "agt_inst_test_123",
          name: "Test Agent",
        },
      };
      mockAxiosInstance.get.mockResolvedValue(mockResponse);

      const result = await client.getPassport("agt_inst_test_123");

      expect(result.agent_id).toBe("agt_inst_test_123");
      expect(result.name).toBe("Test Agent");
    });
  });

  describe("suspendPassport", () => {
    it("should suspend passport successfully", async () => {
      const mockResponse = {
        data: {
          success: true,
          message: "Passport suspended",
        },
      };
      mockAxiosInstance.post.mockResolvedValue(mockResponse);

      const result = await client.suspendPassport(
        "agt_inst_test_123",
        "Test suspension"
      );

      expect(result.success).toBe(true);
    });
  });
});
