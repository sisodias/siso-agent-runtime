# SISO Agent Runtime

SISO Agent Runtime is the provider-neutral application boundary for running a coding-agent host with an explicit configuration, a composed profile, bounded context, durable checkpoints, and machine-readable status events.

This repository is a clean public extraction from the SISO Agent Base warehouse. It is intentionally smaller than that warehouse: it does not contain Skills, Playbooks, Agent Zero, shared intelligence, research engines, provider credentials, private network topology, or personal agent state.

## What is here

```text
SISO Agent Runtime
├── application shell
│   ├── manifest / doctor / where
│   └── host launcher (argv only; never a shell)
└── runtime packages
    ├── control-core       task state and ordered events
    ├── session-lifecycle  checkpoint creation and restoration
    ├── context-manager    deterministic context budgeting
    ├── status-surface     stable machine-readable status
    ├── tui-contracts      normalized runtime/UI events
    └── profile-composer   explicit, bounded profile composition
```

These are internal package boundaries, not six repositories. They can split later if independent adoption, release cadence, or ownership proves that a separate repository is useful.

## Quick start

Requires Node.js 20 or newer and a coding-agent host already installed.

```bash
cp config/example.json runtime.local.json
# Edit host.command in runtime.local.json.
node bin/siso-agent-runtime doctor --config runtime.local.json
node bin/siso-agent-runtime run --config runtime.local.json --dry-run -- --help
node bin/siso-agent-runtime run --config runtime.local.json -- --help
```

The launcher passes an argument array directly to the configured executable with `shell: false`. Profile files and environment additions are opt-in and explicit. The runtime does not search a laptop for profiles, sessions, or credentials.

## Commands

- `manifest` — print the versioned runtime/module contract.
- `doctor --config <file>` — validate configuration, host resolution, profiles, and checkpoint directory.
- `where [--config <file>]` — print public runtime paths and resolved local paths.
- `run --config <file> [--dry-run] -- [host args]` — launch the configured host.
- `checkpoint --input <state.json> --output <checkpoint.json>` — write a durable, versioned checkpoint.
- `compact --input <messages.json> [--max-chars N]` — apply deterministic context budgeting.
- `status --input <state.json>` — normalize runtime state for a UI or MCP consumer.

## Adoption contract

The public contract is `runtime.manifest.json`, the CLI, and the exported package functions. The first release is experimental (`0.1.0`): it proves the clean boundary and core invariants, but it does not claim feature parity with the warehouse's Pi-specific router or terminal application.

- Architecture: [`docs/ARCHITECTURE.html`](docs/ARCHITECTURE.html)
- Migration decisions: [`MIGRATION-MAP.json`](MIGRATION-MAP.json)
- Source provenance: [`PROVENANCE.md`](PROVENANCE.md)
- Release checkpoint: [`reports/checkpoint-agent-runtime.html`](reports/checkpoint-agent-runtime.html)

## Safety and privacy

- no shell interpolation or permission-bypass flags;
- no automatic credential or session discovery;
- no private hostnames, home-directory paths, or machine state;
- checkpoints are written only to paths the caller explicitly supplies;
- profile input has a byte limit and comes only from configured files.

## Development

```bash
npm test
```

Licensed under MIT.

---

The Great Library of SISO — Built by the SISO Open Source Foundation · Funded by SISO Agency.
