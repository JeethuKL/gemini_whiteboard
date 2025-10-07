import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { createReactAgent } from "@langchain/langgraph/prebuilt";
import { MemorySaver } from "@langchain/langgraph";
import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { HumanMessage } from "@langchain/core/messages";

// Import our existing tools
import { processJiraToolCall } from "../tools/jira-whiteboard-tools";
import { processToolCall } from "../tools/whiteboard-tools";

// LangChain tool definitions that wrap our existing functionality
const syncJiraBoardTool = tool(
  async (input: { includeCompleted?: boolean }) => {
    console.log("🔧 LangChain: Executing sync_jira_board tool");

    const currentData = (window as any).getCurrentWhiteboardData?.() || {
      elements: [],
    };
    const result = await processJiraToolCall(
      currentData,
      "sync_jira_board",
      input
    );

    // Update whiteboard if there's new data
    if (result.newData && (window as any).setWhiteboardData) {
      (window as any).setWhiteboardData(result.newData);
    }

    console.log("✅ LangChain: sync_jira_board completed:", result.response);
    return JSON.stringify(result.response);
  },
  {
    name: "sync_jira_board",
    description:
      "Sync whiteboard with real Jira project data. Fetches current issues and displays them in Kanban format.",
    schema: z.object({
      includeCompleted: z
        .boolean()
        .optional()
        .describe("Whether to include completed (Done) issues. Default: true"),
    }),
  }
);

const getTeamWorkloadTool = tool(
  async (input: { includeCompleted?: boolean }) => {
    console.log("🔧 LangChain: Executing get_team_workload tool");

    const currentData = (window as any).getCurrentWhiteboardData?.() || {
      elements: [],
    };
    const result = await processJiraToolCall(
      currentData,
      "get_team_workload",
      input
    );

    console.log("✅ LangChain: get_team_workload completed:", result.response);
    return JSON.stringify(result.response);
  },
  {
    name: "get_team_workload",
    description:
      "Get current workload for team members from Jira. Returns structured data about team assignments.",
    schema: z.object({
      includeCompleted: z
        .boolean()
        .optional()
        .describe("Include recently completed work. Default: false"),
    }),
  }
);

const updateJiraFromStandupTool = tool(
  async (input: { issueKey: string; action: string; comment?: string }) => {
    console.log("🔧 LangChain: Executing update_jira_from_standup tool");

    const currentData = (window as any).getCurrentWhiteboardData?.() || {
      elements: [],
    };
    const result = await processJiraToolCall(
      currentData,
      "update_jira_from_standup",
      input
    );

    console.log(
      "✅ LangChain: update_jira_from_standup completed:",
      result.response
    );
    return JSON.stringify(result.response);
  },
  {
    name: "update_jira_from_standup",
    description: "Update Jira issues based on standup information.",
    schema: z.object({
      issueKey: z.string().describe("Jira issue key (e.g., 'PROJ-123')"),
      action: z
        .enum(["start_work", "complete_work", "add_comment"])
        .describe("Action to perform on the Jira issue"),
      comment: z.string().optional().describe("Comment to add to the issue"),
    }),
  }
);

const updateWhiteboardTool = tool(
  async (input: any) => {
    console.log("🔧 LangChain: Executing update_whiteboard tool");

    const currentData = (window as any).getCurrentWhiteboardData?.() || {
      elements: [],
    };
    const result = await processToolCall(
      currentData,
      "update_whiteboard",
      input
    );

    // Update whiteboard if there's new data
    if (result.newData && (window as any).setWhiteboardData) {
      (window as any).setWhiteboardData(result.newData);
    }

    console.log("✅ LangChain: update_whiteboard completed:", result.response);
    return JSON.stringify(result.response);
  },
  {
    name: "update_whiteboard",
    description: "Add or update elements on the whiteboard.",
    schema: z.object({
      action: z.enum(["add", "update", "delete"]).describe("Action to perform"),
      element: z
        .object({
          id: z.string().optional(),
          type: z
            .enum(["sticky-note", "flow-node", "connection-line"])
            .describe("Type of element"),
          x: z.number().describe("X position"),
          y: z.number().describe("Y position"),
          width: z.number().optional().describe("Width of element"),
          height: z.number().optional().describe("Height of element"),
          content: z.string().describe("Content/text of the element"),
          color: z.string().optional().describe("Color of the element"),
        })
        .optional(),
    }),
  }
);

const moveTaskTool = tool(
  async (input: { taskText: string; targetColumn: string }) => {
    console.log("🔧 LangChain: Executing move_task tool");

    const currentData = (window as any).getCurrentWhiteboardData?.() || {
      elements: [],
    };
    const result = await processToolCall(currentData, "move_task", input);

    // Update whiteboard if there's new data
    if (result.newData && (window as any).setWhiteboardData) {
      (window as any).setWhiteboardData(result.newData);
    }

    console.log("✅ LangChain: move_task completed:", result.response);
    return JSON.stringify(result.response);
  },
  {
    name: "move_task",
    description: "Move a task between columns on the Kanban board.",
    schema: z.object({
      taskText: z.string().describe("Text content of the task to move"),
      targetColumn: z
        .enum(["todo", "inprogress", "done"])
        .describe("Target column to move the task to"),
    }),
  }
);

export class SparkLangChainAgent {
  private agent: any;
  private memory: MemorySaver;
  private llm: ChatGoogleGenerativeAI;
  private tools: any[];

  constructor(apiKey: string) {
    console.log("🤖 Initializing Spark LangChain Agent...");

    // Initialize Gemini model
    this.llm = new ChatGoogleGenerativeAI({
      model: "gemini-2.0-flash-exp",
      apiKey: apiKey,
      temperature: 0.7,
    });

    // Initialize memory for session management
    this.memory = new MemorySaver();

    // Define tools
    this.tools = [
      syncJiraBoardTool,
      getTeamWorkloadTool,
      updateJiraFromStandupTool,
      updateWhiteboardTool,
      moveTaskTool,
    ];

    // Create the agent with memory
    this.agent = createReactAgent({
      llm: this.llm,
      tools: this.tools,
      checkpointSaver: this.memory,
      messageModifier: `You are 'Spark', an AI facilitator for daily standup meetings. You have access to live Jira data and should conduct data-driven conversations.

## YOUR MISSION
Facilitate efficient, engaging, and data-driven standup meetings using real team information from Jira.

## CRITICAL PROTOCOL: ALWAYS START WITH DATA
When ANY session begins, you MUST:
1. **IMMEDIATELY** call sync_jira_board to get current sprint data
2. **IMMEDIATELY** call get_team_workload to discover real team members and their assignments
3. **PARSE the responses** to extract actual team member names and current tasks
4. **USE ONLY the discovered team members** - NEVER use placeholder names like Alice, Bob, Charlie, etc.

## REAL TEAM CONTEXT
- The team composition is DYNAMIC and comes from Jira data
- Team member names will be in the workload response
- Tasks and their status come from the sync_jira_board response
- NEVER assume team composition - always discover it first

## MEETING FACILITATION
Once you have real data:
1. Greet the team using their ACTUAL names from Jira
2. For each team member with active work:
   - Ask about progress on their SPECIFIC current tasks
   - Reference actual Jira issue keys and summaries
   - Update the board in real-time as they speak
3. Keep conversations focused and energetic
4. Use tools to update both the whiteboard and Jira as needed

## CONVERSATION STYLE
- Be friendly, professional, and energetic
- Reference specific task names and Jira issues
- Update the board visually as people give updates
- Ask follow-up questions about blockers and dependencies
- Celebrate completed work and progress

Remember: Your knowledge comes from real Jira data, not hardcoded assumptions. Always start by fetching current data to understand who you're working with and what they're working on.`,
    });

    console.log(
      "✅ Spark LangChain Agent initialized with",
      this.tools.length,
      "tools"
    );
  }

  async invoke(
    message: string,
    sessionId: string = "default"
  ): Promise<string> {
    try {
      console.log("💬 LangChain Agent processing:", message);
      console.log("🔑 Session ID:", sessionId);

      const result = await this.agent.invoke(
        {
          messages: [new HumanMessage(message)],
        },
        {
          configurable: { thread_id: sessionId },
        }
      );

      // Extract the final AI message
      const lastMessage = result.messages[result.messages.length - 1];
      const response = lastMessage.content;

      console.log("✅ LangChain Agent response:", response);
      return response;
    } catch (error) {
      console.error("❌ LangChain Agent error:", error);
      throw error;
    }
  }

  async stream(
    message: string,
    sessionId: string = "default"
  ): Promise<AsyncGenerator<string, void, unknown>> {
    console.log("🌊 LangChain Agent streaming:", message);
    console.log("🔑 Session ID:", sessionId);

    const stream = await this.agent.stream(
      {
        messages: [new HumanMessage(message)],
      },
      {
        configurable: { thread_id: sessionId },
        streamMode: "values",
      }
    );

    return this.processStream(stream);
  }

  private async *processStream(
    stream: any
  ): AsyncGenerator<string, void, unknown> {
    for await (const chunk of stream) {
      const lastMsg = chunk.messages[chunk.messages.length - 1];

      if (lastMsg?.tool_calls?.length) {
        // Tool call in progress
        const toolCall = lastMsg.tool_calls[0];
        yield `🔧 Using ${toolCall.name}...`;
      } else if (lastMsg?.content) {
        // AI response content
        yield lastMsg.content;
      }
    }
  }

  // Get session history for debugging
  async getSessionHistory(sessionId: string): Promise<any> {
    return this.memory.get({ configurable: { thread_id: sessionId } });
  }

  // Clear session history
  async clearSession(sessionId: string): Promise<void> {
    console.log(`🧠 Clearing session: ${sessionId}`);
    // Note: MemorySaver doesn't have a delete method, so we reinitialize
    this.memory = new MemorySaver();
    console.log(`✅ Session ${sessionId} cleared (memory reinitialized)`);
  }
}

// Export singleton instance
let sparkAgent: SparkLangChainAgent | null = null;

export function initializeSparkAgent(apiKey: string): SparkLangChainAgent {
  if (!sparkAgent || !apiKey) {
    sparkAgent = new SparkLangChainAgent(apiKey);
  }
  return sparkAgent;
}

export function getSparkAgent(): SparkLangChainAgent | null {
  return sparkAgent;
}
