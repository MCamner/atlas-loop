---
name: repo-product-auditor
description: Review GitHub repositories as products. Use when asked to improve a repo, README, GitHub profile, pinned repo strategy, discovery, case page, product positioning, or launch readiness.
---

# Repo Product Auditor

Use this skill to review a GitHub repository as a product, not just as code.

The goal is to help the user make a repository clearer, more credible, more discoverable, and easier for visitors to understand quickly.

## When to use

Use this skill when the user asks for any of the following:

- Review a GitHub repo
- Improve a README
- Improve GitHub profile positioning
- Improve pinned repositories
- Turn a technical repo into a product/case-page
- Improve discovery, stars, traffic, or credibility
- Create a product-style hero section
- Audit repo launch readiness
- Compare the repo against top-tier open-source presentation standards

## When not to use

Do not use this skill for:

- General code review only
- Security audit only
- Legal or compliance review
- Package vulnerability scanning
- Deep architecture review unless product presentation is also part of the task

If the task is only technical correctness, use a code review approach instead.

## Required inputs

Prefer these inputs when available:

1. Repository URL
2. README content
3. File tree
4. GitHub Pages URL, if any
5. Screenshot or page content, if relevant
6. User goal, for example: get stars, portfolio credibility, recruiter interest, internal demo, or launch polish

If repository content is not available, do not invent it. Ask for the repo URL, README, or file tree.

## Audit principles

Evaluate the repo through four lenses:

1. Clarity  
   Can a visitor understand what this is in 10 seconds?

2. Credibility  
   Does it look real, tested, maintained, and useful?

3. Differentiation  
   Why is this repo worth attention compared to similar tools?

4. Conversion  
   Is there a clear next action: try it, install it, view demo, read case study, star it, or contact the author?

## Review checklist

Always check:

- Repository name
- One-line positioning
- README hero section
- Badges
- Screenshots / GIF / terminal preview
- Quick start
- Use cases
- Architecture overview
- Examples
- Demo / GitHub Pages link
- Installation clarity
- Requirements
- File structure explanation
- Roadmap
- License
- Contribution section, if relevant
- Pinned repo fit
- Topics / tags
- Release status
- Case-page quality
- Social proof or credibility signals

## Scoring model

Score each area from 1 to 5:

1. Positioning
2. README clarity
3. Visual proof
4. Setup friction
5. Product credibility
6. Discovery readiness
7. Portfolio value
8. Next-action clarity

Then provide:

- Overall score out of 40
- Strongest area
- Weakest area
- Top 3 fixes
- One highest-leverage next step

## Required output format

Return the answer in this structure:

## Goal
State what the audit is trying to improve.

## Current state
Summarize what the repo currently communicates.

## Scorecard
Use a compact table with the scoring model.

## Strongest parts
List the strongest 2-4 parts.

## Weakest parts
List the weakest 2-4 parts.

## Recommended fixes
Give concrete fixes in priority order.

## Copy-paste improvements
When useful, provide ready-to-paste README sections, hero copy, GitHub topics, or case-page text.

## Next step
Give exactly one next action.

## Tone rules

Be direct, practical, and product-minded.

Do not flatter weak work.
Do not be vague.
Do not invent repo details.
Do not recommend cosmetic polish before fixing positioning.
Prefer one strong next step over many optional ideas.

## Copy style

Use concise, high-signal language.

Good repo positioning sounds like:

- "A terminal-first macOS automation toolkit for power users."
- "A browser-based client readiness checker for Citrix, IGEL, and eLux environments."
- "A prompt routing system for reusable AI workflows."

Avoid generic language like:

- "A powerful tool"
- "An innovative solution"
- "This project helps users"
