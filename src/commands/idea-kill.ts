import { resolveIdea, readFile, writeArtifact, getOpcDir } from "../lib/workspace.js";
import { renderPrompt } from "../lib/render.js";
import { chat } from "../lib/llm.js";

export interface IdeaKillOptions {
  idea?: string;
}

export async function ideaKill(opts: IdeaKillOptions): Promise<void> {
  const ideaDir = resolveIdea(opts.idea);
  const hypothesisPath = `${ideaDir}/01-hypothesis.md`;

  let hypothesis: string;
  try {
    hypothesis = readFile(hypothesisPath);
  } catch {
    throw new Error(
      "01-hypothesis.md not found. Run `opc idea brief` first to generate a testable hypothesis.",
    );
  }

  const prompt = renderPrompt("idea-kill", { hypothesis });
  console.log("Running adversarial pressure test...");
  const result = await chat({
    system: "You are a critic, not a balanced advisor.",
    user: prompt,
    max_tokens: 4096,
  });

  writeArtifact(ideaDir, "02-kill.md", result);
  console.log(`Written to ${getOpcDir()}/${ideaDir.split("/").pop()}/02-kill.md`);
}