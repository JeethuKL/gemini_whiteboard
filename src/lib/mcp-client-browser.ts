// Browser-compatible MCP client with mock data for development
export interface MCPAtlassianConfig {
  confluenceUrl?: string;
  confluenceUsername?: string;
  confluenceApiToken?: string;
  jiraUrl?: string;
  jiraUsername?: string;
  jiraApiToken?: string;
  jiraProjectsFilter?: string;
  confluenceSpacesFilter?: string;
  readOnlyMode?: boolean;
}

export interface JiraIssue {
  id: string;
  key: string;
  summary: string;
  status: string;
  assignee?: string;
  description?: string;
  issueType?: string;
  priority?: string;
}

export class MCPAtlassianClient {
  private isConnected = false;
  public connected = false;

  constructor(private config: MCPAtlassianConfig) {
    // Config available for future use
  }

  async connect(): Promise<void> {
    try {
      console.log("🔗 Browser mode: Using mock Jira data for development");

      // Simulate connection delay
      await new Promise((resolve) => setTimeout(resolve, 1000));

      this.isConnected = true;
      this.connected = true;

      console.log("✅ Mock MCP Atlassian client connected");
    } catch (error) {
      console.error("❌ Failed to connect mock MCP client:", error);
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    this.isConnected = false;
    this.connected = false;
    console.log("🔌 Mock MCP client disconnected");
  }

  async getJiraIssues(_projectKey?: string): Promise<JiraIssue[]> {
    if (!this.isConnected) {
      throw new Error("MCP client not connected");
    }

    // Mock Jira issues for development
    return [
      {
        id: "1001",
        key: "PROJ-123",
        summary: "Implement authentication system",
        status: "To Do",
        assignee: "Akash",
        description: "Build JWT-based authentication for the application",
        issueType: "Story",
        priority: "High",
      },
      {
        id: "1002",
        key: "PROJ-124",
        summary: "Setup payment gateway integration",
        status: "In Progress",
        assignee: "Deepak",
        description: "Integrate Stripe payment processing",
        issueType: "Story",
        priority: "High",
      },
      {
        id: "1003",
        key: "PROJ-125",
        summary: "Write unit tests for API endpoints",
        status: "In Progress",
        assignee: "Kumar",
        description: "Add comprehensive test coverage for REST API",
        issueType: "Task",
        priority: "Medium",
      },
      {
        id: "1004",
        key: "PROJ-126",
        summary: "Fix mobile responsive design",
        status: "Done",
        assignee: "Akash",
        description: "Ensure app works properly on mobile devices",
        issueType: "Bug",
        priority: "Medium",
      },
      {
        id: "1005",
        key: "PROJ-127",
        summary: "Optimize database queries",
        status: "To Do",
        assignee: "Deepak",
        description: "Improve query performance for large datasets",
        issueType: "Task",
        priority: "Low",
      },
    ];
  }

  async updateJiraIssue(issueKey: string, fields: any): Promise<void> {
    if (!this.isConnected) {
      throw new Error("MCP client not connected");
    }

    console.log(`📝 Mock: Updated Jira issue ${issueKey}:`, fields);

    // Simulate API delay
    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  async transitionJiraIssue(
    issueKey: string,
    transitionId: string
  ): Promise<void> {
    if (!this.isConnected) {
      throw new Error("MCP client not connected");
    }

    const transitionMap: { [key: string]: string } = {
      "11": "To Do",
      "21": "In Progress",
      "31": "Done",
    };

    const newStatus = transitionMap[transitionId] || "Unknown";
    console.log(`🔄 Mock: Transitioned ${issueKey} to "${newStatus}"`);

    // Simulate API delay
    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  async addCommentToIssue(issueKey: string, comment: string): Promise<void> {
    if (!this.isConnected) {
      throw new Error("MCP client not connected");
    }

    console.log(`💬 Mock: Added comment to ${issueKey}: "${comment}"`);

    // Simulate API delay
    await new Promise((resolve) => setTimeout(resolve, 300));
  }

  // Alias for compatibility
  async addJiraComment(issueKey: string, comment: string): Promise<void> {
    return this.addCommentToIssue(issueKey, comment);
  }

  async searchConfluence(query: string): Promise<any[]> {
    if (!this.isConnected) {
      throw new Error("MCP client not connected");
    }

    console.log(`🔍 Mock: Searching Confluence for: "${query}"`);

    // Mock Confluence search results
    return [
      {
        id: "conf-1",
        title: "Team Standup Process",
        type: "page",
        url: "https://company.atlassian.net/wiki/spaces/TEAM/pages/123456/Standup+Process",
        excerpt: "Our daily standup process and guidelines...",
      },
      {
        id: "conf-2",
        title: "Sprint Planning Template",
        type: "page",
        url: "https://company.atlassian.net/wiki/spaces/DEV/pages/789012/Sprint+Planning",
        excerpt: "Template for sprint planning meetings...",
      },
    ];
  }

  async searchIssues(jql: string): Promise<JiraIssue[]> {
    if (!this.isConnected) {
      throw new Error("MCP client not connected");
    }

    console.log(`🔍 Mock: Searching issues with JQL: ${jql}`);

    // Return filtered mock data based on search
    const allIssues = await this.getJiraIssues();

    // Simple mock filtering
    if (jql.includes("assignee")) {
      const assigneeMatch = jql.match(/assignee\s*[=~]\s*["']?(\w+)["']?/i);
      if (assigneeMatch) {
        const assignee = assigneeMatch[1];
        return allIssues.filter((issue) =>
          issue.assignee?.toLowerCase().includes(assignee.toLowerCase())
        );
      }
    }

    if (jql.includes("status")) {
      const statusMatch = jql.match(/status\s*[=~]\s*["']?([^"']+)["']?/i);
      if (statusMatch) {
        const status = statusMatch[1];
        return allIssues.filter((issue) =>
          issue.status.toLowerCase().includes(status.toLowerCase())
        );
      }
    }

    return allIssues;
  }

  async getTeamWorkload(): Promise<{ [assignee: string]: JiraIssue[] }> {
    if (!this.isConnected) {
      throw new Error("MCP client not connected");
    }

    const issues = await this.getJiraIssues();
    const workload: { [assignee: string]: JiraIssue[] } = {};

    issues.forEach((issue) => {
      if (issue.assignee) {
        if (!workload[issue.assignee]) {
          workload[issue.assignee] = [];
        }
        workload[issue.assignee].push(issue);
      }
    });

    return workload;
  }

  // Check if running in browser environment
  static isBrowserEnvironment(): boolean {
    return typeof window !== "undefined" && typeof process === "undefined";
  }

  // Get environment-appropriate client
  static async createClient(
    config: MCPAtlassianConfig
  ): Promise<MCPAtlassianClient> {
    if (MCPAtlassianClient.isBrowserEnvironment()) {
      console.log("🌐 Browser environment detected - using mock MCP client");
      return new MCPAtlassianClient(config);
    } else {
      console.log(
        "🖥️ Node.js environment detected - would use real MCP client"
      );
      // In a real Node.js environment, you would import and use the real MCP client
      return new MCPAtlassianClient(config);
    }
  }
}
