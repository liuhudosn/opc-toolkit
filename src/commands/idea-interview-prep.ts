import { resolveIdea, readSection, writeArtifact, getOpcDir } from "../lib/workspace.js";
import { renderPrompt } from "../lib/render.js";
import { chat } from "../lib/llm.js";

export interface IdeaInterviewPrepOptions {
  idea?: string;
  persona: string[];
}

export async function ideaInterviewPrep(opts: IdeaInterviewPrepOptions): Promise<void> {
  const ideaDir = resolveIdea(opts.idea);
  const readmePath = `${ideaDir}/README.md`;

  const hypothesis = readSection(readmePath, "Hypothesis (rough)");

  const sections: string[] = [];

  for (const persona of opts.persona) {
    const prompt = renderPrompt("idea-interview-prep", {
      hypothesis,
      persona,
    });
    console.log(`Generating interview framework for persona: ${persona}...`);
    const result = await chat({
      system: "You are an interview framework designer.",
      user: prompt,
      max_tokens: 2048,
    });
    sections.push(`## ${persona}\n\n${result}`);
  }

  const output = sections.join("\n\n---\n\n");
  writeArtifact(ideaDir, "07-interviews/framework.md", output);
  console.log(`Written to ${getOpcDir()}/${ideaDir.split("/").pop()}/07-interviews/framework.md`);
}