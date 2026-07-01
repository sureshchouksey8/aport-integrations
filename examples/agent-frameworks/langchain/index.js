import { tool } from "@langchain/core/tools";
import { z } from "zod";
import * as dotenv from "dotenv";

dotenv.config();

/**
 * Wraps a LangChain tool with APort Verification.
 * 
 * @param {Object} baseTool - The original LangChain tool created via `tool()`
 * @param {Object} options - APort configuration options
 * @param {string} options.policyPack - The policy pack ID to verify against
 * @param {string} options.agentId - The agent ID to verify
 * @param {string} [options.apiKey] - APort API Key
 * @param {string} [options.baseUrl] - APort Base URL
 */
export function withAPortGuard(baseTool, options) {
  const apiKey = options.apiKey || process.env.APORT_API_KEY;
  const baseUrl = options.baseUrl || process.env.APORT_BASE_URL || "https://api.aport.io";

  if (!apiKey) {
    throw new Error("APORT_API_KEY is required to use APort Tool Guard");
  }

  return tool(
    async (input, config) => {
      // 1. Verify agent before executing the tool
      try {
        const response = await fetch(`${baseUrl}/v1/verify`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            policyId: options.policyPack,
            passportId: options.agentId,
            action: options.policyPack, // typically policy pack name matches action
            context: {
              toolName: baseTool.name,
              toolInput: input
            }
          }),
        });

        if (!response.ok) {
          throw new Error(`APort verification API failed: ${response.statusText}`);
        }

        const data = await response.json();
        
        // 2. Check decision
        const allowed = data.allowed === true || data.decision === 'allow';
        if (!allowed) {
          return `Tool execution denied by APort Policy: ${data.reason || 'No reason provided'}`;
        }
      } catch (err) {
         return `Tool execution failed during APort verification: ${err.message}`;
      }

      // 3. Execute tool if verified
      return await baseTool.invoke(input, config);
    },
    {
      name: baseTool.name,
      description: baseTool.description,
      schema: baseTool.schema,
    }
  );
}

// --- Example Usage ---

async function runExample() {
  console.log("Setting up APort LangChain Tool Guard Example...\n");

  // Define a sensitive tool
  const refundTool = tool(
    async ({ orderId, amount }) => {
      // In a real scenario, this would call Stripe or Shopify
      return `Successfully refunded $${amount} for order ${orderId}`;
    },
    {
      name: "refund_tool",
      description: "Process customer refunds",
      schema: z.object({
        orderId: z.string().describe("The ID of the order to refund"),
        amount: z.number().describe("The amount to refund in dollars"),
      }),
    }
  );

  // Wrap the tool with APort
  const protectedRefundTool = withAPortGuard(refundTool, {
    policyPack: "finance.payment.refund.v1",
    agentId: "agt_inst_xyz789",
    // Uses APORT_API_KEY from environment, or mock it for the example:
    apiKey: process.env.APORT_API_KEY || "test-key-for-example"
  });

  console.log("Original tool created: refund_tool");
  console.log("Tool wrapped with APort Policy: finance.payment.refund.v1");
  console.log("\nSimulating tool execution (Note: this will fail API request if APORT_API_KEY is not real, which is expected for the example):");
  
  try {
    const result = await protectedRefundTool.invoke({ orderId: "ORD-123", amount: 50.0 });
    console.log("\nResult:", result);
  } catch (err) {
    console.error("\nError:", err.message);
  }
}

if (process.argv[1] === new URL(import.meta.url).pathname) {
  runExample();
}
