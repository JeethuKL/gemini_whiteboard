import { FunctionDeclaration, Type } from "@google/genai";
import { WhiteboardData, WhiteboardElement } from "../types/whiteboard";

const PROXY_BASE_URL =
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_PROXY_BASE_URL) ||
  "https://gemini-whiteboard.onrender.com";

// Simple utility to estimate sticky height based on number of text lines.
// This keeps vertical spacing consistent and prevents overlap without
// needing to measure DOM nodes in this data layer.
function estimateStickyHeight(text: string): number {
  const lines = text.split("\n").length;
  const baseHeight = 70; // header + padding
  const perLine = 20; // approximate line height
  const clampedLines = Math.max(lines, 1);
  return baseHeight + clampedLines * perLine;
}

// Cache for real team members from Jira
let realTeamMembers: string[] = [];

// Helper function to get real team members from Jira via proxy
async function getRealTeamMembers(): Promise<string[]> {
  if (realTeamMembers.length > 0) {
    return realTeamMembers; // Return cached if available
  }

  try {
    console.log("🔍 Fetching team members from Jira via proxy...");

    const response = await fetch(`${PROXY_BASE_URL}/api/jira/search`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        // Optional Jira override headers for dev use
        ...(localStorage.getItem('jira-override-url')
          ? {
              'X-Jira-Url': localStorage.getItem('jira-override-url')!,
              'X-Jira-Username': localStorage.getItem('jira-override-user') || '',
              'X-Jira-Token': localStorage.getItem('jira-override-token') || '',
            }
          : {}),
      },
      body: JSON.stringify({
        jql: "updated >= -30d order by updated DESC",
        maxResults: 50,
        fields: ["assignee"],
      }),
    });

    if (!response.ok) {
      throw new Error(`Proxy request failed: ${response.status}`);
    }

    const data = await response.json();
    const assignees = new Set<string>();

    data.issues.forEach((issue: any) => {
      const assignee =
        issue.fields.assignee?.displayName ||
        issue.fields.assignee?.emailAddress;
      if (assignee && assignee.trim()) {
        assignees.add(assignee.trim());
      }
    });

    realTeamMembers = Array.from(assignees).sort();
    console.log(
      `👥 Found ${realTeamMembers.length} real team members from Jira:`,
      realTeamMembers
    );
    return realTeamMembers;
  } catch (error) {
    console.error("❌ Error fetching real team members via proxy:", error);
    // Return fallback development team names
    realTeamMembers = ["Jeethu Kumar", "Developer A", "Developer B"];
    console.log("🔄 Using fallback team members:", realTeamMembers);
    return realTeamMembers;
  }
}

// Check if proxy server is available
export function isMCPAvailable(): boolean {
  return true; // Always true since we're using proxy server
}

// Ensure proxy server is available
export async function ensureMCPInitialized(): Promise<boolean> {
  try {
    const response = await fetch(`${PROXY_BASE_URL}/health`);
    return response.ok;
  } catch (error) {
    console.warn("⚠️ Proxy server not available:", error);
    return false;
  }
}

// Export function to get real team members for use in other files
export async function getTeamMembers(): Promise<string[]> {
  return await getRealTeamMembers();
}

// Simple Jira whiteboard tools that use proxy server
export const jiraWhiteboardTools: FunctionDeclaration[] = [
  {
    name: "sync_jira_board",
    description: `Sync whiteboard with real Jira project data via proxy server. Fetches current issues and displays them in Kanban format.`,
    parameters: {
      type: Type.OBJECT,
      properties: {
        includeCompleted: {
          type: Type.BOOLEAN,
          description:
            "Whether to include completed (Done) issues. Default: true",
        },
      },
      required: [],
    },
  },
  {
    name: "get_team_workload",
    description: `Get current workload for team members from Jira via proxy server.`,
    parameters: {
      type: Type.OBJECT,
      properties: {
        includeCompleted: {
          type: Type.BOOLEAN,
          description: "Include recently completed work. Default: false",
        },
      },
      required: [],
    },
  },
  {
    name: "update_jira_from_standup",
    description: `Update Jira issues based on standup information via proxy server.`,
    parameters: {
      type: Type.OBJECT,
      properties: {
        issueKey: {
          type: Type.STRING,
          description: "Jira issue key (e.g., 'PROJ-123')",
        },
        action: {
          type: Type.STRING,
          enum: ["start_work", "complete_work", "add_comment"],
          description: "Action to perform on the Jira issue",
        },
        comment: {
          type: Type.STRING,
          description: "Comment to add to the issue",
        },
      },
      required: ["issueKey", "action"],
    },
  },
  {
    name: "create_standup_summary",
    description: `Create a standup summary on the whiteboard.`,
    parameters: {
      type: Type.OBJECT,
      properties: {
        meetingDate: {
          type: Type.STRING,
          description: "Date of the standup meeting (YYYY-MM-DD format)",
        },
        accomplishments: {
          type: Type.ARRAY,
          items: { type: Type.STRING },
          description: "List of work completed since last standup",
        },
        inProgress: {
          type: Type.ARRAY,
          items: { type: Type.STRING },
          description: "List of work currently in progress",
        },
        blockers: {
          type: Type.ARRAY,
          items: { type: Type.STRING },
          description: "List of blockers identified during standup",
        },
      },
      required: ["meetingDate"],
    },
  },
];

// Initialize tools with real team data (simple version)
export async function initializeJiraTools(): Promise<void> {
  console.log("✅ Simple Jira tools initialized (using proxy server)");
}

// Process Jira tool calls using proxy server
export async function processJiraToolCall(
  currentData: WhiteboardData,
  toolName: string,
  toolArgs: any
): Promise<{ newData?: WhiteboardData; response: any }> {
  console.log(`🔧 Processing Jira tool call: ${toolName}`, toolArgs);

  try {
    switch (toolName) {
      case "sync_jira_board":
        return await syncJiraBoard(currentData, toolArgs);
      case "get_team_workload":
        return await getTeamWorkload(toolArgs);
      case "update_jira_from_standup":
        return await updateJiraFromStandup(toolArgs);
      case "create_standup_summary":
        return await createStandupSummary(currentData, toolArgs);
      default:
        return {
          response: {
            success: false,
            error: `Unknown Jira tool: ${toolName}`,
          },
        };
    }
  } catch (error) {
    console.error(`❌ Error in ${toolName}:`, error);
    return {
      response: {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
    };
  }
}

// Sync Jira board via proxy server
async function syncJiraBoard(
  currentData: WhiteboardData,
  args: any
): Promise<{ newData?: WhiteboardData; response: any }> {
  const { includeCompleted = true } = args;

  try {
    console.log("🔄 Syncing Jira board via proxy server...");

    const response = await fetch(`${PROXY_BASE_URL}/api/jira/search`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(localStorage.getItem('jira-override-url')
          ? {
              'X-Jira-Url': localStorage.getItem('jira-override-url')!,
              'X-Jira-Username': localStorage.getItem('jira-override-user') || '',
              'X-Jira-Token': localStorage.getItem('jira-override-token') || '',
            }
          : {}),
      },
      body: JSON.stringify({
        jql: includeCompleted
          ? "updated >= -30d order by updated DESC"
          : "updated >= -30d AND status != Done order by updated DESC",
        maxResults: 20,
        fields: ["summary", "status", "assignee", "priority", "issuetype"],
      }),
    });

    if (!response.ok) {
      throw new Error(`Proxy request failed: ${response.status}`);
    }

    const data = await response.json();
    console.log(`📊 Fetched ${data.issues.length} issues from Jira via proxy`);

    // Convert to whiteboard elements
    const newElements: WhiteboardElement[] = [];
    let todoY = 180,
      inProgressY = 180,
      doneY = 180;
    const gapY = 16;

    data.issues.forEach((issue: any) => {
      const status = issue.fields.status.name.toLowerCase();
      const assignee =
        issue.fields.assignee?.displayName ||
        issue.fields.assignee?.emailAddress ||
        "Unassigned";
      const priority = issue.fields.priority?.name || "Medium";

      let x = 100,
        color = "yellow",
        y = todoY;

      if (
        status.includes("progress") ||
        status.includes("development") ||
        status.includes("review")
      ) {
        x = 460;
        color = "orange";
        y = inProgressY;
        const text = `🎫 ${issue.key}: ${issue.fields.summary}\n👤 ${assignee}\n⚡ ${priority}`;
        const height = estimateStickyHeight(text);
        inProgressY += height + gapY;
      } else if (
        status.includes("done") ||
        status.includes("complete") ||
        status.includes("resolved")
      ) {
        x = 820;
        color = "green";
        y = doneY;
        const text = `🎫 ${issue.key}: ${issue.fields.summary}\n👤 ${assignee}\n⚡ ${priority}`;
        const height = estimateStickyHeight(text);
        doneY += height + gapY;
      } else {
        const text = `🎫 ${issue.key}: ${issue.fields.summary}\n👤 ${assignee}\n⚡ ${priority}`;
        const height = estimateStickyHeight(text);
        todoY += height + gapY;
      }

      newElements.push({
        id: `jira-${issue.key}`,
        type: "sticky",
        x,
        y,
        text: `🎫 ${issue.key}: ${issue.fields.summary}\n👤 ${assignee}\n⚡ ${priority}`,
        color,
      });
    });

    // Add header
    newElements.push({
      id: "sprint-header",
      type: "sticky",
      x: 450,
      y: 50,
      text: `🚀 Current Sprint\n📊 ${
        data.issues.length
      } issues synced from Jira\n🔄 Last updated: ${new Date().toLocaleTimeString()}`,
      color: "blue",
    });

    const newData = {
      ...currentData,
      elements: [
        ...currentData.elements.filter(
          (el) => !el.id.startsWith("jira-") && el.id !== "sprint-header"
        ),
        ...newElements,
      ],
    };

    // Extract team members from synced issues
    const teamMembersFromSync = new Set<string>();
    data.issues.forEach((issue: any) => {
      const assignee =
        issue.fields.assignee?.displayName ||
        issue.fields.assignee?.emailAddress;
      if (assignee && assignee.trim()) {
        teamMembersFromSync.add(assignee.trim());
      }
    });
    const teamMembersList = Array.from(teamMembersFromSync);

    return {
      newData,
      response: {
        success: true,
        message: `Synced ${data.issues.length} issues from Jira`,
        issueCount: data.issues.length,

        // Add team member information to sync response
        DISCOVERED_TEAM_MEMBERS: teamMembersList,
        TEAM_MEMBER_COUNT: teamMembersList.length,

        // Simple, clear response for natural conversation
        boardSummary: `Synced ${
          data.issues.length
        } issues for team: ${teamMembersList.join(", ")}`,
        teamSummary: `Found ${
          teamMembersList.length
        } team members: ${teamMembersList.join(", ")}`,

        // Immediate action suggestion
        IMMEDIATE_RESPONSE: `Board synced! Team members found: ${teamMembersList.join(
          ", "
        )}`,

        // Issue breakdown by status for better context
        issuesByStatus: {
          todo: data.issues.filter((issue: any) =>
            ["to do", "open", "new"].some((status) =>
              issue.fields.status.name.toLowerCase().includes(status)
            )
          ).length,
          inProgress: data.issues.filter((issue: any) =>
            ["in progress", "progress"].some((status) =>
              issue.fields.status.name.toLowerCase().includes(status)
            )
          ).length,
          done: data.issues.filter((issue: any) =>
            ["done", "complete", "resolved"].some((status) =>
              issue.fields.status.name.toLowerCase().includes(status)
            )
          ).length,
        },

        // Structured data for response
        responseData: {
          totalIssues: data.issues.length,
          teamMembers: teamMembersList,
          boardUpdated: true,
        },
      },
    };
  } catch (error) {
    console.error("❌ Error syncing Jira board:", error);
    return {
      response: {
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to sync Jira board",
      },
    };
  }
}

// Get team workload via proxy server
async function getTeamWorkload(args: any): Promise<{ response: any }> {
  const { includeCompleted = false } = args;

  try {
    const teamMembers = await getRealTeamMembers();
    console.log(
      `📊 Getting workload for team members: ${teamMembers.join(", ")}`
    );

    const response = await fetch(`${PROXY_BASE_URL}/api/jira/search`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(localStorage.getItem('jira-override-url')
          ? {
              'X-Jira-Url': localStorage.getItem('jira-override-url')!,
              'X-Jira-Username': localStorage.getItem('jira-override-user') || '',
              'X-Jira-Token': localStorage.getItem('jira-override-token') || '',
            }
          : {}),
      },
      body: JSON.stringify({
        jql: includeCompleted
          ? "updated >= -30d order by updated DESC"
          : "updated >= -30d AND status != Done order by updated DESC",
        maxResults: 100,
        fields: ["summary", "status", "assignee", "priority"],
      }),
    });

    if (!response.ok) {
      throw new Error(`Proxy request failed: ${response.status}`);
    }

    const data = await response.json();
    const workloadData: any = {};

    // Group issues by assignee
    teamMembers.forEach((member) => {
      const memberIssues = data.issues.filter((issue: any) => {
        const assignee =
          issue.fields.assignee?.displayName ||
          issue.fields.assignee?.emailAddress;
        return (
          assignee && assignee.toLowerCase().includes(member.toLowerCase())
        );
      });

      workloadData[member] = {
        totalIssues: memberIssues.length,
        issues: memberIssues.map((issue: any) => ({
          key: issue.key,
          summary: issue.fields.summary,
          status: issue.fields.status.name,
          priority: issue.fields.priority?.name || "Medium",
        })),
      };
    });

    return {
      response: {
        success: true,
        message: "Retrieved team workload data",

        // CRITICAL: These are the REAL team members for this project
        REAL_TEAM_MEMBERS: Object.keys(workloadData),
        TEAM_COUNT: Object.keys(workloadData).length,

        // IMMEDIATE PROCESSING INSTRUCTION - Simple and direct
        IMMEDIATE_RESPONSE: `Great! I found our team members: ${Object.keys(
          workloadData
        ).join(", ")}. Let's start our standup meeting.`,

        // Clear, simple summary for natural conversation flow
        teamSummary: `Active team members: ${Object.keys(workloadData).join(
          ", "
        )}`,

        // Conversation starter that Gemini should use immediately
        nextAction: `Start standup meeting with: ${Object.keys(
          workloadData
        ).join(", ")}`,

        workload: workloadData,
        individualWorkloads: Object.keys(workloadData).map((member) => ({
          assignee: member, // Make this field very clear
          name: member,
          totalIssues: workloadData[member].totalIssues,
          tasks: workloadData[member].issues, // Add this for easier access
          currentWork: workloadData[member].issues.map(
            (issue: any) => `${issue.key}: ${issue.summary} (${issue.status})`
          ),
        })),

        // Structured data for the response
        responseData: {
          teamCount: Object.keys(workloadData).length,
          teamNames: Object.keys(workloadData),
          totalIssues: Object.values(workloadData).reduce(
            (sum: number, member: any) => sum + member.totalIssues,
            0
          ),
        },
      },
    };
  } catch (error) {
    console.error("❌ Error getting team workload:", error);
    return {
      response: {
        success: false,
        error: "Failed to retrieve team workload data",
      },
    };
  }
}

// Update Jira from standup (simplified)
async function updateJiraFromStandup(args: any): Promise<{ response: any }> {
  const { issueKey, action } = args;

  try {
    console.log(`📝 Updating Jira issue ${issueKey} with action: ${action}`);

    // For now, just return success - real implementation would update via proxy
    return {
      response: {
        success: true,
        message: `Mock update: ${action} for ${issueKey}`,
        note: "Real Jira updates would be implemented via proxy server",
      },
    };
  } catch (error) {
    console.error("❌ Error updating Jira:", error);
    return {
      response: {
        success: false,
        error: "Failed to update Jira issue",
      },
    };
  }
}

// Create standup summary
async function createStandupSummary(
  currentData: WhiteboardData,
  args: any
): Promise<{ newData?: WhiteboardData; response: any }> {
  const {
    meetingDate,
    accomplishments = [],
    inProgress = [],
    blockers = [],
  } = args;

  try {
    const teamMembers = await getRealTeamMembers();
    const summaryText = `📅 Daily Standup - ${meetingDate}

✅ Accomplishments:
${accomplishments.map((item: string) => `• ${item}`).join("\n")}

🔄 In Progress:
${inProgress.map((item: string) => `• ${item}`).join("\n")}

⚠️ Blockers:
${blockers.map((item: string) => `• ${item}`).join("\n")}

👥 Team: ${teamMembers.join(", ")}
🕐 Meeting Time: ${new Date().toLocaleTimeString()}`;

    const summaryElement: WhiteboardElement = {
      id: `standup-summary-${meetingDate}`,
      type: "sticky",
      x: 450,
      y: 650,
      text: summaryText,
      color: "blue",
    };

    const newData = {
      ...currentData,
      elements: [
        ...currentData.elements.filter(
          (el) => !el.id.startsWith("standup-summary-")
        ),
        summaryElement,
      ],
    };

    return {
      newData,
      response: {
        success: true,
        message: "Created standup summary",
        summaryId: summaryElement.id,
      },
    };
  } catch (error) {
    console.error("❌ Error creating standup summary:", error);
    return {
      response: {
        success: false,
        error: "Failed to create standup summary",
      },
    };
  }
}
