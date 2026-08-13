# riichi-hand-generator

Generate randomized, valid, completed Riichi Mahjong winning hands that satisfy
scoring and structural constraints — the inverse of scoring a hand.

```ts
generate({
  yaku: ["tanyao", "pinfu"],   // exclusive: these and nothing else
  han: 3,
  fu: 30,
  closed: true,
  waitType: "ryanmen",
})
```

**Status: not implemented.** Design is complete and reviewed; see
[`docs/DESIGN.md`](../../docs/DESIGN.md) for the plan and
[`docs/SPEC.md`](../../docs/SPEC.md) for the contract. Work starts at M0, in
`riichi-score`.

## The one rule

This package never computes a score. It proposes hands; `riichi-score` decides
what they are worth, and its output *is* the answer key returned to the caller.
One source of truth, no drift.

That is enforced by [`.eslintrc.json`](.eslintrc.json), which blocks imports of
`riichi-score` internals and of the test-only reference scorer. In a monorepo
the package boundary alone cannot enforce it — the lint rules *are* the
boundary. See [`docs/REPO-STRUCTURE.md`](../../docs/REPO-STRUCTURE.md).
