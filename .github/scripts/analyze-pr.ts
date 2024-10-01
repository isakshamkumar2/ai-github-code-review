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
As a senior software engineer at a leading tech company, perform a comprehensive code review on the following diff. Provide a detailed, professional analysis focusing on:

1. Code Quality:
   - Adherence to best practices and design patterns
   - Code readability and maintainability
   - Proper error handling and logging

2. Performance:
   - Algorithmic efficiency
   - Potential bottlenecks or resource-intensive operations

3. Security:
   - Potential vulnerabilities or security risks
   - Proper handling of sensitive data

4. Testing:
   - Coverage of edge cases
   - Suggestions for additional unit or integration tests

5. Documentation:
   - Clarity and completeness of comments and documentation
   - Adherence to documentation standards

6. Architecture:
   - Scalability and extensibility of the design
   - Proper separation of concerns

Provide specific examples from the code and suggest improvements where applicable. Format your response using proper GitHub Markdown syntax, including code blocks for code examples.

Here's the diff to review:

\`\`\`
${diff}
\`\`\`

Begin your review with a brief summary of the changes, followed by your detailed analysis. Conclude with a list of actionable recommendations.
`;

  const response = await groq.chat.completions.create({
    messages: [{ role: "user", content: prompt }],
    model: "llama3-8b-8192",
    temperature: 0.2,
    max_tokens: 1800,
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