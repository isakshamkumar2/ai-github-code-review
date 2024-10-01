import express from 'express';
import { Octokit } from '@octokit/rest';
import dotenv from 'dotenv';
import Groq from "groq-sdk";

dotenv.config();

const app = express();
app.use(express.json());

const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

app.post('/webhook', async (req, res) => {
  const { action, pull_request } = req.body;

  if (action === 'opened' || action === 'synchronize') {
    const owner = pull_request.base.repo.owner.login;
    const repo = pull_request.base.repo.name;
    const pull_number = pull_request.number;

    try {
      // Fetch the PR diff
      const { data: diffData } = await octokit.pulls.get({
        owner,
        repo,
        pull_number,
        mediaType: { format: 'diff' },
      });

      // The diff is returned as a string
      const diffContent = diffData as unknown as string;

      // Analyze the code using OpenAI
      const analysis = await analyzeCode(diffContent);

      // Post the analysis as a comment
      await octokit.issues.createComment({
        owner,
        repo,
        issue_number: pull_number,
        body: analysis,
      });

      res.sendStatus(200);
    } catch (error) {
      console.error('Error processing webhook:', error);
      res.status(500).send('Error processing webhook');
    }
  } else {
    res.sendStatus(200);
  }
});

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

  try {
    const response = await groq.chat.completions.create({
        messages: [
          {
            role: "user",
            content: prompt, // Use the constructed prompt
          },
        ],
        model: "llama3-8b-8192",
      });
    return response.choices[0].message?.content || "No analysis available.";
  } catch (error) {
    console.error('Error analyzing code:', error);
    return "Error occurred during code analysis.";
  }
}

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});