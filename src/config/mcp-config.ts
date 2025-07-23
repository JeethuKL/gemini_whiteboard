// MCP Atlassian Client Configuration
export interface MCPConfig {
  jiraUrl: string;
  username: string;
  apiToken: string;
  serverUrl?: string; // Optional custom MCP server URL
}

// Default configuration - should be overridden by user
export const defaultMCPConfig: MCPConfig = {
  jiraUrl: "", // e.g., "https://your-company.atlassian.net"
  username: "", // Your Atlassian email
  apiToken: "", // Your Atlassian API token
  serverUrl: "ghcr.io/sooperset/mcp-atlassian", // Default MCP server
};

// Environment variable names for configuration
export const MCP_ENV_VARS = {
  JIRA_URL: "JIRA_URL",
  JIRA_USERNAME: "JIRA_USERNAME",
  JIRA_API_TOKEN: "JIRA_API_TOKEN",
  MCP_SERVER_URL: "MCP_SERVER_URL",
} as const;

// Load configuration from environment variables or defaults
export function loadMCPConfig(): MCPConfig {
  // Use import.meta.env for Vite (browser) environment
  const env = import.meta.env;

  return {
    jiraUrl: env.VITE_JIRA_URL || defaultMCPConfig.jiraUrl,
    username: env.VITE_JIRA_USERNAME || defaultMCPConfig.username,
    apiToken: env.VITE_JIRA_API_TOKEN || defaultMCPConfig.apiToken,
    serverUrl: env.VITE_MCP_SERVER_URL || defaultMCPConfig.serverUrl,
  };
}

// Validate configuration
export function validateMCPConfig(config: MCPConfig): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (!config.jiraUrl) {
    errors.push("Jira URL is required");
  } else if (!config.jiraUrl.startsWith("https://")) {
    errors.push("Jira URL must start with https://");
  }

  if (!config.username) {
    errors.push("Username/email is required");
  }

  if (!config.apiToken) {
    errors.push("API token is required");
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

// Check if MCP configuration is available and valid
export function isMCPConfigured(): boolean {
  const config = loadMCPConfig();
  const validation = validateMCPConfig(config);
  return validation.valid;
}

// Get configuration instructions for users
export function getMCPSetupInstructions(): string {
  return `
🔧 Jira MCP Setup Instructions:

1. Set up environment variables in your .env file:
   JIRA_URL=https://your-company.atlassian.net
   JIRA_USERNAME=your-email@company.com
   JIRA_API_TOKEN=your-api-token

2. Generate Jira API Token:
   - Go to https://id.atlassian.com/manage-profile/security/api-tokens
   - Click "Create API token"
   - Enter a label (e.g., "Gemini Whiteboard")
   - Copy the generated token

3. Ensure Docker is running for MCP Atlassian server

4. Restart the application after setting environment variables

Current status: ${isMCPConfigured() ? "✅ Configured" : "❌ Not configured"}
  `;
}
