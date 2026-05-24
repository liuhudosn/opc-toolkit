import { resolveIdea, readSection, writeArtifact, getOpcDir } from "../lib/workspace.js";
import { renderPrompt } from "../lib/render.js";
import { chat } from "../lib/llm.js";

export interface IdeaBriefOptions {
  idea?: string;
}

export async function ideaBrief(opts: IdeaBriefOptions): Promise<void> {
  const ideaDir = resolveIdea(opts.idea);
  const readmePath = `${ideaDir}/README.md`;

  const hypothesis = readSection(readmePath, "Hypothesis (rough)");
  const who = readSection(readmePath, "Who I think has this problem");
  const why = readSection(readmePath, "Why I think this");

  if (!hypothesis) {
    throw new Error(
      `Section "Hypothesis (rough)" is empty in README.md. Fill it in before running this command.`,
    );
  }

  const prompt = renderPrompt("idea-brief", { hypothesis, who, why });
  console.log("Sharpening hypothesis...");
  const result = await chat({
    system: "You are a startup hypothesis sharpener.",
    user: prompt,
    fast: true,
    max_tokens: 2048,
  });

  writeArtifact(ideaDir, "01-hypothesis.md", result);
  console.log(`Written to ${getOpcDir()}/${ideaDir.split("/").pop()}/01-hypothesis.md`);
}