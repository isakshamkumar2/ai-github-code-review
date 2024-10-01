import { Octokit } from "@octokit/rest";
import Groq from "groq-sdk";
import * as github from '@actions/github';
import * as core from '@actions/core'
const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

async function getPRDiff(owner: string, repo: string, pull_number: number): Promise<string> {
  const { data } = await octokit.pulls.get({
    owner,
    repo,
    pull_number,
    mediaType: { format: "diff" },
  });
  return data as unknown as string;
}
async function analyzeCode(diff: string): Promise<string> {
  const prompt = `
As a senior code reviewer, provide a concise, professional analysis of the following code diff. Focus on critical issues and include specific code examples. Your review should:

1. Identify the 3-5 most significant issues, covering areas such as security, performance, and code quality.
2. For each issue, provide:
   - A brief explanation of the problem
   - A code snippet demonstrating the issue (in a GitHub-flavored markdown code block)
   - A concise suggestion for improvement

3. Conclude with a short, bullet-point list of key recommendations.

Format your response using proper GitHub Markdown syntax, including code blocks for code examples.

Here's the diff to review:

\`\`\`
${diff}
\`\`\`

Limit your response to around 500 -1000 words, focusing on the most impactful feedback.
`;

  const response = await groq.chat.completions.create({
    messages: [{ role: "user", content: prompt }],
    model: "llama3-8b-8192",
    temperature: 0.1,
    max_tokens: 1000,
  });

  return response.choices[0].message?.content || "No analysis available.";
}
async function postComment(owner: string, repo: string, issue_number: number, body: string): Promise<void> {
  await octokit.issues.createComment({
    owner,
    repo,
    issue_number,
    body,
  });
}

async function main() {
  try {
    const context = github.context;
    const { owner, repo } = context.repo;
    const pull_number = context.payload.pull_request?.number;

    if (!pull_number) {
      throw new Error('No pull request number found');
    }

    console.log(`Analyzing PR #${pull_number} in ${owner}/${repo}`);

    const diff = await getPRDiff(owner, repo, pull_number);
    console.log('Diff retrieved successfully');

    const analysis = await analyzeCode(diff);
    console.log('Code analysis completed');

    await postComment(owner, repo, pull_number, analysis);
    console.log('Comment posted successfully');

    core.setOutput('analysis', analysis);
  } catch (error) {
    console.error('Error in main function:', error);
    core.setFailed((error as Error).message);
  }
}

main().catch(error => {
  console.error('Unhandled error:', error);
  core.setFailed(error.message);
});