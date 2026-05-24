import { readFile, resolveIdea, listArtifacts, writeArtifact, getOpcDir } from "../lib/workspace.js";
import { renderPrompt } from "../lib/render.js";
import { chat } from "../lib/llm.js";
import { join } from "node:path";

export interface IdeaExitCheckOptions {
  idea?: string;
}

export async function ideaExitCheck(opts: IdeaExitCheckOptions): Promise<void> {
  const ideaDir = resolveIdea(opts.idea);

  const artifacts = listArtifacts(ideaDir);

  const readHypothesis = () => {
    const path = join(ideaDir, "01-hypothesis.md");
    try {
      return readFile(path);
    } catch {
      return "(not yet generated — run `opc idea brief` first)";
    }
  };

  const readKill = () => {
    const path = join(ideaDir, "02-kill.md");
    try {
      return readFile(path);
    } catch {
      return "(not yet generated — run `opc idea kill` first)";
    }
  };

  const readFramework = () => {
    const path = join(ideaDir, "07-interviews/framework.md");
    try {
      return readFile(path);
    } catch {
      return "(not yet generated — run `opc idea interview-prep` first)";
    }
  };

  const readAudit = () => {
    try {
      const auditDirs = artifacts.filter((a) => a.startsWith("07-interviews/audit/"));
      if (auditDirs.length === 0) return "(not yet generated)";
      return auditDirs.map((a) => `${a}:\n${readFile(join(ideaDir, a))}`).join("\n\n");
    } catch {
      return "(not yet generated)";
    }
  };

  const prompt = renderPrompt("idea-exit-check", {
    hypothesis: readHypothesis(),
    kill: readKill(),
    framework: readFramework(),
    audit: readAudit(),
    notes: "",
  });

  console.log("Evaluating Idea-stage exit criteria...");
  console.log(`Artifacts found: ${artifacts.length} files`);
  const result = await chat({
    system: "You are an Idea-stage exit-check evaluator.",
    user: prompt,
    max_tokens: 4096,
  });

  writeArtifact(ideaDir, "exit-check.md", result);
  console.log(`Written to ${getOpcDir()}/${ideaDir.split("/").pop()}/exit-check.md`);
}