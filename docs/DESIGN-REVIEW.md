# Review of `DESIGN.md`

**Re:** riichi-hand-generator — Design & Implementation Plan
**Verdict:** architecture accepted. Three revisions required before implementation.

---

## Summary

The propose→verify architecture is right, and the case for it is argued better
than our own internal sketch was. In particular, *"the planner is allowed to be
heuristic, incomplete, even wrong — its bugs cost throughput, never correctness"*
is the correct frame, and the reduction of the correctness surface to
(a) `riichi-score` and (b) the comparator is the load-bearing insight of the
document. We are adopting it.

Before code starts, three things need to change. One of them is serious: **M1 as
specified cannot retire the risk it exists to retire.**

We tested two of the plan's unverified quantitative claims. Results are in §4
below, with reproduction instructions. One claim holds, one holds by coincidence,
and one mechanism is misattributed.

---

## 1. Adopted without change

Called out because these are improvements on what we had, not merely acceptable:

- **Tied-top-set semantics (§5).** Our spec told the caller to check
  `handInterpretations[0]`. Your observation that index 0 among ties is arbitrary
  (insertion order under a stable sort) is correct, and the all-of-`T` rule is
  strictly better — it subsumes wait-ambiguity filtering as a special case rather
  than treating it as a bolt-on. Keep this exactly as written.

- **"Exclusivity needs coverage of the *accidental* yaku, not the *requested*
  ones" (§4).** We had not drawn this distinction explicitly. It is the right
  driver for detector priority ordering, and §4 below confirms it empirically.

- **Refusing `"exact"` specs loudly when scorer coverage cannot enforce them**,
  plus the version-pinned capability manifest. This is the honest engineering
  call and we want it in v1, not deferred.

- **Determinism documented as per-version**, with lesson reproducibility coming
  from storing the hand rather than the seed. Subtle and correct.

- **The guard-filter analysis (§4).** Correctly identifies that a reject-only
  detector has safe asymmetry, and still deprioritizes it. We agree with both
  halves.

- **§9's scorer findings.** These match our own independent inspection. Finding 7
  (no 4-copy validation across tiles + melds + indicators) is one we had missed.

---

## 2. Required revisions

### 2.1 M1 cannot retire the architecture risk — it would conceal it

This is the one that matters.

M1 is the convergence spike. §12 names propose→verify convergence as the biggest
in-library design risk, and M1 exists to replace estimates with measurements
"before any architecture is load-bearing." Its headline spec is
*"closed, tanyao+pinfu only, 3 han 30 fu, ryanmen"* and its verifier — per §2's
ownership table — is `calculate()`.

`calculate()` detects six yaku: tanyao, pinfu, yakuhai, menzen-tsumo, chiitoitsu,
kokushi. It cannot see iipeiko, which our measurement puts at **33.1% of fills
for exactly that spec**, nor sanshoku (3.2%), nor ryanpeikou (1.3%).

So M1 would measure an acceptance rate near 95% where the true figure is ~63%,
report `E[attempts] ≈ 1.05` against your predicted 1.2–1.7, and conclude the
architecture is validated with room to spare. The milestone designed to expose
the risk would hide it, and it would do so *in the direction of false
confidence*.

**Required change:** M1's verifier must be a scorer with real yaku coverage,
independent of `riichi-score`. Two options:

- **Preferred:** use the independent reference scorer we already built during
  spec work (own parser, own fu model, 17 yaku detectors). It produced every
  number in §4 below and is a drop-in measurement harness. It should be moved
  into this repo as a test-only asset — it is also the differential-testing
  counterpart §11.1 asks for, so it earns its keep twice.
- Otherwise: move M1 after enough of the M5 detector track that the accidental
  set is covered — which delays the architecture decision considerably and we do
  not recommend it.

Note this does not change M1's position in the build order. It changes what M1
measures *against*. M0 and M1 can then genuinely run in parallel, since M1 no
longer depends on `riichi-score` being correct.

### 2.2 Drop the fu/han dimensions from `requireUnambiguous`

§13.1 recommends replacing `requireUnambiguousWait` with
`requireUnambiguous: Array<"wait"|"fu"|"han"|"yaku">`, on the grounds that
score-tied readings can disagree about fu and han via basic-point collisions
(`30·2⁵ = 60·2⁴`).

**The conclusion is right; the mechanism is not.** Measured over 27,121 tied top
sets:

```
  T disagrees on fu                    2.5%
  T disagrees on han                   0.8%

  fu/han disagreement at mangan+        706 cases
  fu/han disagreement below mangan        0 cases
```

Zero collision-driven cases occurred. Every fu/han-ambiguous hand was mangan or
above, where the 2000-point cap flattens differing fu and han onto the same
score. The `fu × 2^(2+han)` collision you cite is real arithmetic but is not what
drives the phenomenon in practice.

That confines the exposure to limit hands — where fu does not affect the payment
anyway, and where a "count the fu" exercise is pedagogically odd to begin with.
Fu-counting lessons live at 30–40 fu and 1–2 han, provably clear of it.

**Required change:** keep the tied-top-set semantics (they are free, correct, and
handle this uniformly). Ship `requireUnambiguousWait` only. Handle the limit-hand
case with a documented constraint that fu-graded lessons exclude mangan+ hands.

**One caveat we could not close:** our sample contained no kans. Kans drive fu
high (up to 110+) while han can stay low, which is the one region where a
sub-mangan collision could plausibly hide. If you disagree with this revision,
that is the experiment that would settle it — and it is worth running before M7
regardless.

### 2.3 Rebalance the anti-yaku bias design around iipeiko

§7 borrows SPEC §3.3's ~40% accidental-yaku rate — which was measured for
**pinfu alone** — and applies it to **pinfu + tanyao**. Measured:

```
  pinfu only        kill 40.8%    iipeiko 25.1%  tanyao 20.0%  sanshoku 1.7%
  pinfu + tanyao    kill 37.4%    iipeiko 33.1%  sanshoku 3.2%  ryanpeikou 1.3%
```

The headline number survives, so §7's `E[attempts]` estimates stand. But it
survives by cancellation, not because the rate is stable: requiring tanyao
removes it as an accident (−20 points) while shrinking the legal run pool to
starts 2–6, which drives iipeiko up by a third and sanshoku up 88%.

**Required change:** §3.3's anti-yaku bias list treats duplicate-run avoidance as
one heuristic among several. It is not — **iipeiko is a third of all fills for a
tanyao-constrained pinfu spec**, several times the size of everything else
combined. It should be the primary bias, designed first and measured
independently. The general principle worth encoding: *the tighter the tile
predicate a required yaku imposes, the higher the collision rate among the
remaining degrees of freedom.* Any spec that narrows the pool (tanyao, honitsu,
chinitsu) should raise the expected duplicate-run rate, not leave it constant.

---

## 3. Minor corrections

1. **§3.2, "a six-value set determined by {triplet|kan} × {open|closed} ×
   {simple|yaochu}"** — that product is 8 combinations, yielding 5 distinct fu
   values (2, 4, 8, 16, 32). Neither count is six. The reasoning around it is
   sound; the table appears not to have been built yet.

2. **Winning-tile selection should be a named component in §2.** 85.5% of tied
   top sets disagree on the wait, and the ambiguity arises from *which copy* of
   the winning tile completed the hand. That makes winning-tile choice the
   primary lever for controlling ambiguity — not a planner bias mentioned in
   passing in §12. Given M7's yield depends on it, it deserves ownership in the
   architecture table.

3. **M0–M9 is a large plan.** No milestone is wrong, but please mark which are
   v1-blocking and which are aspirational, so the remainder does not silently
   become a backlog.

---

## 4. Evidence

All figures above come from two scripts, both plain Node with no dependencies,
run against an independent reference implementation (own parser, own fu model,
17 yaku detectors — not `riichi-score`).

| Claim | Source | Result |
|---|---|---|
| Ambiguity is not wait-only | §13.1 | **Confirmed**, mechanism misattributed (§2.2) |
| Ambiguity is fu×2^han collisions | §13.1 | **Not observed** — 0/27,121; cause is the mangan cap |
| ~40% accidental kill for pinfu+tanyao | §7 | **Holds** (37.4%), composition differs sharply (§2.3) |
| iipeiko/tanyao are top offenders | §4 | **Confirmed**, and iipeiko dominates once tanyao is required |

Sample sizes: 400k random winning hands for the ambiguity measurement (27,121
tied top sets); 600k for the mangan/sub-mangan split; ~300k fills per spec for
the accidental-yaku rates. Sampling is uniform over group shapes rather than over
realistic hands, so treat these as order-of-magnitude, not precise. **No kans in
any sample** — see the caveat in §2.2.

---

## 5. Correction to `SPEC.md` on our side

§13.2 is a fair hit. SPEC §8.4 claims structural constraints "are unaffected and
can be honoured before coverage is complete." That is true of the *search* and
false of the *answer keys* — the ankan-scored-as-open bug, the missing
ron-completed-triplet rule, absent riichi han, and the missing kuipinfu floor all
corrupt kan and riichi lessons regardless of yaku coverage. M0 does precede
structural work. SPEC §8.4 will be corrected.

We also accept §13.4: `doraCount` was under-defined. Adopting your reading —
omote only, with `uraDoraCount` and `akaDoraCount` separate, ranges on all three,
no combined convenience field in v1.

---

## 6. Positions on your §13 answers

Accepted as written: yakuhai naming (sugar + qualified forms, multiset
comparison), Tenhou-flavored default ruleset behind the config object from day
one, yakuman as a distinct `limit` value rather than `han: 13` (note this implies
a `riichi-score` change — kokushi is currently `han: 13`), ranges from day one,
situational yaku modelled-to-exclude with only the riichi family requestable,
batch distinctness with explicit shortfall, and the `analyze` return shape.

One to reconsider: **aka dora as "a substitution pass"** (§13.6). The scorer
parses `0m/0p/0s`, but a red 5 is also a *physical tile* against the 4-copy
budget and a dora-indicator candidate. Treating it as a late find-and-replace
risks double-counting a 5 that the dora planner already allocated. It probably
belongs in the tile assigner's budget rather than after it.

---

## 7. What we need back

1. Revised M1 with an independent verifier, and confirmation M0/M1 can run in
   parallel once decoupled.
2. `requireUnambiguousWait` only, with the mangan-hand constraint documented.
3. §3.3 rebalanced around iipeiko as the primary anti-yaku bias.
4. v1-blocking vs. aspirational marked across M0–M9.

Nothing else blocks. Once those land we would start M0 in the `riichi-score`
repo — the ankan and ron-completed-triplet fixes first, since those are what make
current fu lessons wrong.
