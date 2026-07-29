# Provenance

This repository is a clean public extraction informed by the runtime-shaped parts of the SISO Agent Base warehouse:

- the `bin/siso` launcher and installer boundary;
- the agent router/control core;
- session lifecycle and checkpoint handling;
- context budgeting;
- status projection;
- terminal-event contracts and session host boundary;
- profile composition.

The public code was reimplemented around the smallest stable contracts. Warehouse Git history, generated state, provider configuration, credentials, private machine/network topology, transcripts, and personal profiles were not copied.

The source warehouse remains untouched. `MIGRATION-MAP.json` records what was reimplemented, deferred, reclassified, and excluded so later work can challenge or refine these decisions without losing the reasoning.
