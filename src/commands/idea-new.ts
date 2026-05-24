import { createIdeaDir, getOpcDir } from "../lib/workspace.js";
import { writeFileSync } from "node:fs";
import { join } from "node:path";

export interface IdeaNewOptions {
  slug?: string;
}

export function ideaNew(opts: IdeaNewOptions): void {
  const slug = opts.slug;
  if (!slug) {
    throw new Error("Missing <slug> argument. Usage: opc idea new <slug>");
  }

  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug)) {
    throw new Error(
      `Invalid slug "${slug}". Use lowercase alphanumeric characters and hyphens only, e.g. "expense-tool".`,
    );
  }

  const dir = createIdeaDir(slug);

  const readme = `# ${slug}

## Hypothesis (rough)

[Describe the problem, who has it, and what your solution idea is. Be as specific as you can.]

## Why I think this

[What makes you believe this is worth pursuing? Domain experience, personal frustration, market observation — whatever drove you here.]

## Who I think has this problem

[Be specific: job titles, company types, team structures, seniority levels. Not "everyone."]
`;

  writeFileSync(join(dir, "README.md"), readme);
  console.log(`Created ${getOpcDir()}/${slug}/`);
  console.log(`Edit ${getOpcDir()}/${slug}/README.md to fill in your hypothesis, then run opc idea brief`);
}