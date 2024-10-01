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
    Analyze the following code diff and provide a concise code review:
    ${diff}

    Focus on:
    1. Potential bugs or errors
    2. Code style and best practices
    3. Performance issues
    4. Security concerns

    Format your response as a markdown list.
  `;

  const response = await groq.chat.completions.create({
    messages: [{ role: "user", content: prompt }],
    model: "llama3-8b-8192",
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

    const diff = await getPRDiff(owner, repo, pull_number);
    const analysis = await analyzeCode(diff);
    await postComment(owner, repo, pull_number, analysis);

    core.setOutput('analysis', analysis);
  } catch (error) {
    core.setFailed((error as Error).message);
  }
}

main().catch(error => core.setFailed(error.message));
