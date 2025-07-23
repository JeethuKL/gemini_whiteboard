import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { Tool } from "@modelcontextprotocol/sdk/types.js";

export interface MCPAtlassianConfig {
  confluenceUrl?: string;
  confluenceUsername?: string;
  confluenceApiToken?: string;
  jiraUrl?: string;
  jiraUsername?: string;
  jiraApiToken?: string;
  jiraProjectsFilter?: string; // e.g., "PROJ,DEV,SUPPORT"
  confluenceSpacesFilter?: string; // e.g., "DEV,TEAM,DOC"
  readOnlyMode?: boolean;
}

export class MCPAtlassianClient {
  private client: Client | null = null;
  private transport: StdioClientTransport | null = null;
  private isConnected = false;
  private availableTools: Tool[] = [];

  constructor(private config: MCPAtlassianConfig) {}

  async connect(): Promise<void> {
    try {
      console.log("🔗 Connecting to MCP Atlassian server...");

      // Create Docker command arguments for MCP Atlassian
      const args = [
        "run",
        "-i",
        "--rm",
        "-e",
        "CONFLUENCE_URL",
        "-e",
        "CONFLUENCE_USERNAME",
        "-e",
        "CONFLUENCE_API_TOKEN",
        "-e",
        "JIRA_URL",
        "-e",
        "JIRA_USERNAME",
        "-e",
        "JIRA_API_TOKEN",
        "-e",
        "JIRA_PROJECTS_FILTER",
        "-e",
        "CONFLUENCE_SPACES_FILTER",
        "-e",
        "READ_ONLY_MODE",
        "-e",
        "MCP_VERBOSE=true",
        "ghcr.io/sooperset/mcp-atlassian:latest",
      ];

      // Set up environment variables
      const env = {
        CONFLUENCE_URL: this.config.confluenceUrl || "",
        CONFLUENCE_USERNAME: this.config.confluenceUsername || "",
        CONFLUENCE_API_TOKEN: this.config.confluenceApiToken || "",
        JIRA_URL: this.config.jiraUrl || "",
        JIRA_USERNAME: this.config.jiraUsername || "",
        JIRA_API_TOKEN: this.config.jiraApiToken || "",
        JIRA_PROJECTS_FILTER: this.config.jiraProjectsFilter || "",
        CONFLUENCE_SPACES_FILTER: this.config.confluenceSpacesFilter || "",
        READ_ONLY_MODE: this.config.readOnlyMode ? "true" : "false",
      };

      // Create transport using Docker command
      this.transport = new StdioClientTransport({
        command: "docker",
        args,
        env,
      });

      // Create MCP client
      this.client = new Client(
        {
          name: "gemini-whiteboard-mcp-client",
          version: "1.0.0",
        },
        {
          capabilities: {
            tools: {},
          },
        }
      );

      // Connect to the MCP server
      await this.client.connect(this.transport);

      // Get available tools
      const result = await this.client.listTools();
      this.availableTools = result.tools;

      this.isConnected = true;
      console.log("✅ Connected to MCP Atlassian server");
      console.log(
        `🛠️ Available tools: ${this.availableTools
          .map((t) => t.name)
          .join(", ")}`
      );
    } catch (error) {
      console.error("❌ Failed to connect to MCP Atlassian server:", error);
      throw new Error(
        `MCP connection failed: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }

  async disconnect(): Promise<void> {
    if (this.client && this.transport) {
      await this.client.close();
      this.client = null;
      this.transport = null;
      this.isConnected = false;
      console.log("🔌 Disconnected from MCP Atlassian server");
    }
  }

  async getJiraIssues(jql?: string): Promise<any> {
    if (!this.isConnected || !this.client) {
      throw new Error("MCP client not connected");
    }

    try {
      const result = await this.client.callTool({
        name: "jira_search",
        arguments: {
          jql:
            jql || "project IN (PROJ) AND status != Done ORDER BY updated DESC",
        },
      });

      return this.parseToolResult(result);
    } catch (error) {
      console.error("❌ Error getting Jira issues:", error);
      throw error;
    }
  }

  async getJiraIssue(issueKey: string): Promise<any> {
    if (!this.isConnected || !this.client) {
      throw new Error("MCP client not connected");
    }

    try {
      const result = await this.client.callTool({
        name: "jira_get_issue",
        arguments: {
          issue_key: issueKey,
        },
      });

      return this.parseToolResult(result);
    } catch (error) {
      console.error("❌ Error getting Jira issue:", error);
      throw error;
    }
  }

  async updateJiraIssue(issueKey: string, updates: any): Promise<any> {
    if (!this.isConnected || !this.client) {
      throw new Error("MCP client not connected");
    }

    if (this.config.readOnlyMode) {
      console.warn("⚠️ Read-only mode enabled, skipping Jira update");
      return { success: false, message: "Read-only mode enabled" };
    }

    try {
      const result = await this.client.callTool({
        name: "jira_update_issue",
        arguments: {
          issue_key: issueKey,
          ...updates,
        },
      });

      return this.parseToolResult(result);
    } catch (error) {
      console.error("❌ Error updating Jira issue:", error);
      throw error;
    }
  }

  async transitionJiraIssue(
    issueKey: string,
    transitionName: string
  ): Promise<any> {
    if (!this.isConnected || !this.client) {
      throw new Error("MCP client not connected");
    }

    if (this.config.readOnlyMode) {
      console.warn("⚠️ Read-only mode enabled, skipping Jira transition");
      return { success: false, message: "Read-only mode enabled" };
    }

    try {
      const result = await this.client.callTool({
        name: "jira_transition_issue",
        arguments: {
          issue_key: issueKey,
          transition_name: transitionName,
        },
      });

      return this.parseToolResult(result);
    } catch (error) {
      console.error("❌ Error transitioning Jira issue:", error);
      throw error;
    }
  }

  async addJiraComment(issueKey: string, comment: string): Promise<any> {
    if (!this.isConnected || !this.client) {
      throw new Error("MCP client not connected");
    }

    if (this.config.readOnlyMode) {
      console.warn("⚠️ Read-only mode enabled, skipping Jira comment");
      return { success: false, message: "Read-only mode enabled" };
    }

    try {
      const result = await this.client.callTool({
        name: "jira_add_comment",
        arguments: {
          issue_key: issueKey,
          comment: comment,
        },
      });

      return this.parseToolResult(result);
    } catch (error) {
      console.error("❌ Error adding Jira comment:", error);
      throw error;
    }
  }

  async searchConfluence(query: string): Promise<any> {
    if (!this.isConnected || !this.client) {
      throw new Error("MCP client not connected");
    }

    try {
      const result = await this.client.callTool({
        name: "confluence_search",
        arguments: {
          cql: query,
        },
      });

      return this.parseToolResult(result);
    } catch (error) {
      console.error("❌ Error searching Confluence:", error);
      throw error;
    }
  }

  private parseToolResult(result: any): any {
    // Handle different result formats
    if (result?.content && Array.isArray(result.content)) {
      // Extract text content from MCP result format
      const content = result.content
        .filter((c: any) => c.type === "text")
        .map((c: any) => c.text)
        .join("\n");

      try {
        return JSON.parse(content);
      } catch {
        return { content, success: true };
      }
    }

    // Handle error results
    if (result?.isError || result?.error) {
      throw new Error(`Tool call failed: ${JSON.stringify(result)}`);
    }

    // Return as-is if already parsed
    return result || { success: false, message: "No result returned" };
  }

  get connected(): boolean {
    return this.isConnected;
  }

  get tools(): Tool[] {
    return this.availableTools;
  }
}
