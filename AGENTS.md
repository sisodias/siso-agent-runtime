# Agent instructions

This repository is the public, provider-neutral SISO Agent Runtime.

- Keep the CLI and `runtime.manifest.json` backward-readable.
- Pass host arguments as an array with `shell: false`; never add shell interpolation.
- Accept state, profiles, checkpoints, and configuration only through explicit paths.
- Do not add credentials, personal profiles, private topology, machine paths, session transcripts, or generated runtime state.
- Keep Skills, Playbooks, Agent Zero, intelligence, integrations, and research engines in their own repositories.
- A package becomes a separate repository only after independent adoption, ownership, or release cadence is demonstrated.
- Run `npm test` before committing.

The Great Library of SISO registry is the authority for Work and Release identity; this repository is a replaceable artifact locator for that Work.
