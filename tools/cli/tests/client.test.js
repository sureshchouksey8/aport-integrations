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
    
    it("should throw error if API key is missing", async () => {
      client.apiKey = null;
      await expect(client.createPassport({})).rejects.toThrow(/API key required/);
    });
    
    it("should handle API errors", async () => {
      mockAxiosInstance.post.mockRejectedValue({ response: { data: { message: "Error" } } });
      await expect(client.createPassport({})).rejects.toThrow("API Error: Error");
    });
    it("should handle network errors", async () => {
      mockAxiosInstance.post.mockRejectedValue(new Error("Net Error"));
      await expect(client.createPassport({})).rejects.toThrow("Network Error: Net Error");
    });
  });

  describe("verifyPolicy", () => {
    it("should verify policy successfully", async () => {
      const mockResponse = { data: { allowed: true } };
      mockAxiosInstance.post.mockResolvedValue(mockResponse);
      const result = await client.verifyPolicy("policy", "agent", {});
      expect(result.allowed).toBe(true);
    });
    it("should handle API errors", async () => {
      mockAxiosInstance.post.mockRejectedValue({ response: { data: { message: "Error" } } });
      await expect(client.verifyPolicy("policy", "agent")).rejects.toThrow("API Error: Error");
    });
    it("should handle network errors", async () => {
      mockAxiosInstance.post.mockRejectedValue(new Error("Net Error"));
      await expect(client.verifyPolicy("policy", "agent")).rejects.toThrow("Network Error: Net Error");
    });
  });

  describe("getPolicyPack", () => {
    it("should get policy pack successfully", async () => {
      const mockResponse = { data: { id: "pack1" } };
      mockAxiosInstance.get.mockResolvedValue(mockResponse);
      const result = await client.getPolicyPack("pack1");
      expect(result.id).toBe("pack1");
    });
    it("should handle API errors", async () => {
      mockAxiosInstance.get.mockRejectedValue({ response: { data: { message: "Error" } } });
      await expect(client.getPolicyPack("pack1")).rejects.toThrow("API Error: Error");
    });
    it("should handle network errors", async () => {
      mockAxiosInstance.get.mockRejectedValue(new Error("Net Error"));
      await expect(client.getPolicyPack("pack1")).rejects.toThrow("Network Error: Net Error");
    });
  });

  describe("listPolicyPacks", () => {
    it("should list policy packs successfully", async () => {
      const mockResponse = { data: [{ id: "pack1" }] };
      mockAxiosInstance.get.mockResolvedValue(mockResponse);
      const result = await client.listPolicyPacks();
      expect(result.length).toBe(1);
    });
    it("should handle API errors", async () => {
      mockAxiosInstance.get.mockRejectedValue({ response: { data: { message: "Error" } } });
      await expect(client.listPolicyPacks()).rejects.toThrow("API Error: Error");
    });
    it("should handle network errors", async () => {
      mockAxiosInstance.get.mockRejectedValue(new Error("Net Error"));
      await expect(client.listPolicyPacks()).rejects.toThrow("Network Error: Net Error");
    });
  });

  describe("getPassport", () => {
    it("should get passport successfully via verify fallback", async () => {
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
    
    it("should fallback to direct fetch if verify fails", async () => {
      mockAxiosInstance.get
        .mockRejectedValueOnce(new Error("Verify failed"))
        .mockResolvedValueOnce({ data: { agent_id: "agt", name: "Direct" } });
      const result = await client.getPassport("agt");
      expect(result.name).toBe("Direct");
    });
    
    it("should throw if verify fails and no api key", async () => {
      mockAxiosInstance.get.mockRejectedValueOnce(new Error("Verify failed"));
      client.apiKey = null;
      await expect(client.getPassport("agt")).rejects.toThrow(/API key required/);
    });

    it("should handle API errors", async () => {
      mockAxiosInstance.get
        .mockRejectedValueOnce(new Error("Verify failed"))
        .mockRejectedValueOnce({ response: { data: { message: "Error" } } });
      await expect(client.getPassport("agt")).rejects.toThrow("API Error: Error");
    });

    it("should handle network errors", async () => {
      mockAxiosInstance.get
        .mockRejectedValueOnce(new Error("Verify failed"))
        .mockRejectedValueOnce(new Error("Net Error"));
      await expect(client.getPassport("agt")).rejects.toThrow("Network Error: Net Error");
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
    
    it("should handle API errors", async () => {
      mockAxiosInstance.post.mockRejectedValue({ response: { data: { message: "Error" } } });
      await expect(client.suspendPassport("agt")).rejects.toThrow("API Error: Error");
    });

    it("should handle network errors", async () => {
      mockAxiosInstance.post.mockRejectedValue(new Error("Net Error"));
      await expect(client.suspendPassport("agt")).rejects.toThrow("Network Error: Net Error");
    });
  });
});
