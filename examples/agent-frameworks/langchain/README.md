# APort LangChain Tool Guard

This example demonstrates how to secure LangChain.js tools using APort. 

By wrapping your tools with `withAPortGuard`, you ensure that every time the tool is invoked by an AI agent, APort dynamically checks the policy limits and context. If APort denies the action, the tool wrapper prevents execution and returns the denial reason back to the agent.

## Setup

```bash
cd examples/agent-frameworks/langchain
npm install
```

## Running the Example

```bash
export APORT_API_KEY="your-api-key"
npm run example
```

## Usage

```javascript
import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { withAPortGuard } from "./index.js";

// 1. Create a LangChain tool as usual
const mySensitiveTool = tool(
  async ({ amount }) => {
    return `Action performed with amount ${amount}`;
  },
  {
    name: "sensitive_action",
    description: "Performs a sensitive action",
    schema: z.object({ amount: z.number() }),
  }
);

// 2. Wrap it with APort Verification
const protectedTool = withAPortGuard(mySensitiveTool, {
  policyPack: "my.custom.policy.v1",
  agentId: "agt_inst_xyz789", // The APort passport ID for your agent
});

// 3. Pass the protected tool to your LangChain agent
// const agent = await createOpenAIToolsAgent({ llm, tools: [protectedTool], prompt });
```
