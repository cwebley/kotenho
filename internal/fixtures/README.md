# @kotenho/fixtures

Shared test corpus. Private, never published.

Per [`docs/DESIGN.md`](../../docs/DESIGN.md) §11.5, fixtures move from
`riichi-score` into the generator's regression corpus with **every yaku detector
landing**. Keeping them here rather than duplicated in each package is one of the
reasons this is a monorepo — see
[`docs/REPO-STRUCTURE.md`](../../docs/REPO-STRUCTURE.md).

## Intended contents

| Directory | Contents |
|---|---|
| `curated/` | Hand-verified scoring cases: book examples, every fu special case in SPEC §4.6, and the SPEC §4.10 kōtenhō tie verbatim. **The anchor for ground truth** — differential testing finds disagreement, but only curated cases catch a shared blind spot. |
| `generated/` | Frozen regression hands with their expected breakdowns, grown as detectors land. |
| `impossible/` | Specs that must return `unsatisfiable` with a specific reason (SPEC §7.2, §7.3), for the reason-string snapshot tests in DESIGN §11.3. |

Empty for now — populated by M0.
