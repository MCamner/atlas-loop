# Changelog

<!-- markdownlint-disable MD024 -->

All notable changes to this project will be documented in this file.

## [Unreleased]

### Added

* `scripts/core-analyze.mjs`: analyze exported experiments with Atlas Core
  (`atlas create`, `run --repo-path`, `inspect`). It is read-only: it posts
  nothing and opens no network connection. Rates and Signal Score are copied
  as atlas-loop recorded them, and Core gets no variable from `.env`.
* `npm test` (`node --test`), with a contract test against a fake `atlas`, and
  a CI workflow that runs `npm run check` and `npm test`.

## [0.1.1] - 2026-05-08

### Added

* Added Experiment Brief fields for audience, pillar, hypothesis, format, metric, and risk.
* Added Hook Lab mode for generating and comparing opening hooks.
* Added Signal Score, expanded metrics, Next Test Queue, and Winner Patterns analysis.
* Added CLI support for hook and patterns prompts.

### Changed

* Updated README to describe the expanded loop workflow and new command surface.

## [0.1.0] - 2026-05-04

### Added

* Initial release setup
