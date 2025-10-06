export default async function handler(req: any, res: any) {
  const { issueKey } = req.query || {};
  const baseURL = process.env.JIRA_URL;
  const username = process.env.JIRA_USERNAME;
  const apiToken = process.env.JIRA_API_TOKEN;

  if (!baseURL || !username || !apiToken) {
    res.status(500).json({ error: 'Missing Jira configuration' });
    return;
  }

  const auth = Buffer.from(`${username}:${apiToken}`).toString('base64');

  if (req.method === 'POST') {
    try {
      const jiraResp = await fetch(`${baseURL}/rest/api/3/issue/${issueKey}/comment`, {
        method: 'POST',
        headers: {
          Authorization: `Basic ${auth}`,
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(req.body || {}),
      });
      const data = await jiraResp.json().catch(() => ({}));
      res.status(jiraResp.status).json(data);
    } catch (e: any) {
      res.status(500).json({ error: 'Proxy error', message: e?.message || 'Unknown error' });
    }
    return;
  }

  res.status(405).json({ error: 'Method not allowed' });
}


