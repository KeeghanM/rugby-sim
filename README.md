# Rugby Sim

Browser rugby simulation built with TypeScript, Vite, and Babylon.js.

## Development

- `npm run dev` starts Vite.
- `npm run build` type-checks and creates a production build.
- `npm run qa` runs strict TypeScript checks and verifies formatting without rewriting files.
- `npm run monte-carlo` exercises complete simulated matches across many seeds.

## Verification Policy

This project intentionally has no unit-test suite while match logic is changing rapidly. Most outcomes are probabilistic and useful correctness checks concern whole-match behaviour and distributions rather than fixed outcomes from isolated functions. Maintaining narrow unit fixtures during this phase would freeze temporary tuning values and create more churn than confidence.

Changes must still be verified with strict TypeScript, a production build, browser play-throughs for affected scenarios, and seeded Monte Carlo runs when simulation behaviour changes. Seed support exists for reproduction and aggregate comparison. Add focused automated tests later when rules and public contracts stabilize, or sooner for deterministic regressions that these checks cannot expose.
