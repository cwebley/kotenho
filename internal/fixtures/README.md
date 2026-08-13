# @kotenho/fixtures

Shared test corpus. Private, never published.

Fixtures move from `riichi-score` into the generator's regression corpus with
**every yaku detector landing**. Keeping them in one place rather than
duplicated per package is one of the reasons this is a monorepo.

## Intended contents

| Directory | Contents |
|---|---|
| `curated/` | Hand-verified scoring cases: book examples, every fu special case, and known kōtenhō ties verbatim. **The anchor for ground truth** — differential testing finds disagreement, but only curated cases catch a shared blind spot. |
| `generated/` | Frozen regression hands with their expected breakdowns, grown as detectors land. |
| `impossible/` | Generator specs that must be reported as unsatisfiable with a specific reason, for reason-string snapshot tests. |

Empty for now.
