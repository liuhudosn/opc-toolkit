import { readFile, resolveIdea, writeArtifact, getOpcDir } from "../lib/workspace.js";
import { renderPrompt } from "../lib/render.js";
import { chat } from "../lib/llm.js";
import { resolve } from "node:path";

export interface IdeaInterviewAuditOptions {
  file: string;
  idea?: string;
}

export async function ideaInterviewAudit(opts: IdeaInterviewAuditOptions): Promise<void> {
  const ideaDir = resolveIdea(opts.idea);

  const filePath = resolve(ideaDir, opts.file);

  let questions: string;
  try {
    questions = readFile(filePath);
  } catch {
    throw new Error(`File not found: ${filePath}. Provide a path relative to the idea workspace.`);
  }

  const prompt = renderPrompt("idea-interview-audit", { questions });
  console.log(`Auditing questions in ${opts.file}...`);
  const result = await chat({
    system: "You are an interview question auditor.",
    user: prompt,
    fast: true,
  });

  const basename = opts.file.replace(/\.md$/, "");
  writeArtifact(ideaDir, `07-interviews/audit/${basename}.md`, result);
  console.log(
    `Written to ${getOpcDir()}/${ideaDir.split("/").pop()}/07-interviews/audit/${basename}.md`,
  );
}