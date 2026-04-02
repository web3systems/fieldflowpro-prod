import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

const GITHUB_TOKEN = Deno.env.get("GITHUB_TOKEN");
const REPO = "web3systems/fieldflowpro-prod";

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();

  if (!user || (user.role !== 'admin' && user.role !== 'super_admin')) {
    return Response.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { limit = 50 } = await req.json().catch(() => ({}));

  // Fetch recent commits from GitHub
  const commitsRes = await fetch(
    `https://api.github.com/repos/${REPO}/commits?per_page=${limit}`,
    {
      headers: {
        Authorization: `Bearer ${GITHUB_TOKEN}`,
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
      },
    }
  );

  if (!commitsRes.ok) {
    const err = await commitsRes.text();
    console.error("GitHub API error:", err);
    return Response.json({ error: `GitHub API error: ${commitsRes.status}` }, { status: 500 });
  }

  const commits = await commitsRes.json();

  // Format commits for the AI
  const commitList = commits.map(c => ({
    sha: c.sha.slice(0, 7),
    message: c.commit.message.split('\n')[0], // first line only
    author: c.commit.author.name,
    date: c.commit.author.date,
    url: c.html_url,
  }));

  // Use AI to generate release notes
  const prompt = `You are a software release notes writer. Given the following list of git commits, generate clean, user-friendly release notes grouped into categories: "New Features", "Improvements", "Bug Fixes", and "Other". 

Only include categories that have relevant commits. Write in plain English — not technical jargon. Each bullet point should be concise (1 sentence max).

Commits:
${commitList.map(c => `- [${c.date.slice(0,10)}] ${c.message} (by ${c.author})`).join('\n')}

Return a JSON object with this structure:
{
  "version": "auto-generated version label based on date",
  "generated_at": "ISO date string",
  "categories": [
    { "name": "New Features", "items": ["..."] },
    { "name": "Bug Fixes", "items": ["..."] }
  ],
  "total_commits": number
}`;

  const aiRes = await base44.asServiceRole.integrations.Core.InvokeLLM({
    prompt,
    response_json_schema: {
      type: "object",
      properties: {
        version: { type: "string" },
        generated_at: { type: "string" },
        categories: {
          type: "array",
          items: {
            type: "object",
            properties: {
              name: { type: "string" },
              items: { type: "array", items: { type: "string" } }
            }
          }
        },
        total_commits: { type: "number" }
      }
    }
  });

  return Response.json({ releaseNotes: aiRes, commits: commitList });
});