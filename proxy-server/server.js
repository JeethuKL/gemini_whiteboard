const express = require("express");
const cors = require("cors");
const axios = require("axios");
require("dotenv").config({ path: "../.env" });

const app = express();
const PORT = process.env.PORT || process.env.PROXY_PORT || 3001;

// Enable CORS for all routes
app.use(cors());
app.use(express.json());

// Jira configuration from environment variables (default)
const ENV_JIRA_CONFIG = {
  baseURL: process.env.VITE_JIRA_URL,
  username: process.env.VITE_JIRA_USERNAME,
  apiToken: process.env.VITE_JIRA_API_TOKEN,
};

// Helper to get effective Jira config per-request (optional header overrides)
function getEffectiveJiraConfig(req) {
  const headerUrl = req.header('X-Jira-Url');
  const headerUser = req.header('X-Jira-Username');
  const headerToken = req.header('X-Jira-Token');
  return {
    baseURL: headerUrl || ENV_JIRA_CONFIG.baseURL,
    username: headerUser || ENV_JIRA_CONFIG.username,
    apiToken: headerToken || ENV_JIRA_CONFIG.apiToken,
  };
}

function getAuthHeader(username, token) {
  return Buffer.from(`${username}:${token}`).toString("base64");
}

// Health check endpoint
app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    message: "Jira Proxy Server is running",
    jiraUrl: JIRA_CONFIG.baseURL,
  });
});

// Proxy endpoint for Jira search
app.post("/api/jira/search", async (req, res) => {
  try {
    console.log("📞 Proxying Jira search request...");
    const cfg = getEffectiveJiraConfig(req);
    const authHeader = getAuthHeader(cfg.username, cfg.apiToken);
    console.log("🎯 Target URL:", `${cfg.baseURL}/rest/api/3/search/jql`);

    // Enforce bounded JQL to satisfy Jira Cloud requirements (avoid unbounded queries)
    const incomingBody = req.body || {};
    const originalJql = (incomingBody.jql || "").trim();
    const hasRestriction = /\b(project\s*=|updated\s*[<>]=|created\s*[<>]=|issuekey\s*=|assignee\s*=|reporter\s*=|updated\s*>=\s*-\d+d)/i.test(
      originalJql
    );
    const boundedJql = hasRestriction
      ? originalJql
      : `${originalJql ? `(${originalJql}) AND ` : ""}updated >= -30d`;

    if (!hasRestriction) {
      console.log("🛡️  Added default bound to JQL: updated >= -30d");
    }

    const payload = { ...incomingBody, jql: boundedJql };

    const response = await axios.post(
      `${cfg.baseURL}/rest/api/3/search/jql`,
      payload,
      {
        headers: {
          Authorization: `Basic ${authHeader}`,
          Accept: "application/json",
          "Content-Type": "application/json",
        },
      }
    );

    console.log(
      `✅ Successfully fetched ${response.data.issues.length} issues from Jira`
    );
    res.json(response.data);
  } catch (error) {
    console.error("❌ Error proxying Jira request:", error.message);
    if (error.response) {
      console.error("📄 Response status:", error.response.status);
      console.error("📄 Response data:", error.response.data);
      res.status(error.response.status).json(error.response.data);
    } else {
      res.status(500).json({
        error: "Proxy server error",
        message: error.message,
      });
    }
  }
});

// Proxy endpoint for Jira issue updates
app.put("/api/jira/issue/:issueKey", async (req, res) => {
  try {
    const { issueKey } = req.params;
    console.log(`📝 Updating Jira issue: ${issueKey}`);

    const cfg = getEffectiveJiraConfig(req);
    const authHeader = getAuthHeader(cfg.username, cfg.apiToken);

    const response = await axios.put(
      `${cfg.baseURL}/rest/api/3/issue/${issueKey}`,
      req.body,
      {
        headers: {
          Authorization: `Basic ${authHeader}`,
          Accept: "application/json",
          "Content-Type": "application/json",
        },
      }
    );

    console.log(`✅ Successfully updated issue ${issueKey}`);
    res.json({ success: true, message: `Updated issue ${issueKey}` });
  } catch (error) {
    console.error(
      `❌ Error updating issue ${req.params.issueKey}:`,
      error.message
    );
    if (error.response) {
      res.status(error.response.status).json(error.response.data);
    } else {
      res.status(500).json({
        error: "Proxy server error",
        message: error.message,
      });
    }
  }
});

// Proxy endpoint for Jira issue transitions
app.post("/api/jira/issue/:issueKey/transitions", async (req, res) => {
  try {
    const { issueKey } = req.params;
    console.log(`🔄 Transitioning Jira issue: ${issueKey}`);

    const cfg = getEffectiveJiraConfig(req);
    const authHeader = getAuthHeader(cfg.username, cfg.apiToken);

    const response = await axios.post(
      `${cfg.baseURL}/rest/api/3/issue/${issueKey}/transitions`,
      req.body,
      {
        headers: {
          Authorization: `Basic ${authHeader}`,
          Accept: "application/json",
          "Content-Type": "application/json",
        },
      }
    );

    console.log(`✅ Successfully transitioned issue ${issueKey}`);
    res.json({ success: true, message: `Transitioned issue ${issueKey}` });
  } catch (error) {
    console.error(
      `❌ Error transitioning issue ${req.params.issueKey}:`,
      error.message
    );
    if (error.response) {
      res.status(error.response.status).json(error.response.data);
    } else {
      res.status(500).json({
        error: "Proxy server error",
        message: error.message,
      });
    }
  }
});

// Proxy endpoint for adding comments
app.post("/api/jira/issue/:issueKey/comment", async (req, res) => {
  try {
    const { issueKey } = req.params;
    console.log(`💬 Adding comment to Jira issue: ${issueKey}`);

    const cfg = getEffectiveJiraConfig(req);
    const authHeader = getAuthHeader(cfg.username, cfg.apiToken);

    const response = await axios.post(
      `${cfg.baseURL}/rest/api/3/issue/${issueKey}/comment`,
      req.body,
      {
        headers: {
          Authorization: `Basic ${authHeader}`,
          Accept: "application/json",
          "Content-Type": "application/json",
        },
      }
    );

    console.log(`✅ Successfully added comment to issue ${issueKey}`);
    res.json({ success: true, message: `Added comment to issue ${issueKey}` });
  } catch (error) {
    console.error(
      `❌ Error adding comment to issue ${req.params.issueKey}:`,
      error.message
    );
    if (error.response) {
      res.status(error.response.status).json(error.response.data);
    } else {
      res.status(500).json({
        error: "Proxy server error",
        message: error.message,
      });
    }
  }
});

// Proxy endpoint for getting projects
app.get("/api/jira/project", async (req, res) => {
  try {
    console.log("📁 Fetching Jira projects...");

    const cfg = getEffectiveJiraConfig(req);
    const authHeader = getAuthHeader(cfg.username, cfg.apiToken);

    const response = await axios.get(
      `${cfg.baseURL}/rest/api/3/project`,
      {
        headers: {
          Authorization: `Basic ${authHeader}`,
          Accept: "application/json",
        },
      }
    );

    console.log(
      `✅ Successfully fetched ${response.data.length} projects from Jira`
    );
    res.json(response.data);
  } catch (error) {
    console.error("❌ Error fetching projects:", error.message);
    if (error.response) {
      res.status(error.response.status).json(error.response.data);
    } else {
      res.status(500).json({
        error: "Proxy server error",
        message: error.message,
      });
    }
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Jira Proxy Server running on http://localhost:${PORT}`);
  console.log(`🎯 Proxying requests to: ${JIRA_CONFIG.baseURL}`);
  console.log(`👤 Authenticated as: ${JIRA_CONFIG.username}`);
  console.log(`📋 Health check: http://localhost:${PORT}/health`);
});
