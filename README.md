# Household Financial Distribution

An interactive, mobile-first exploration of U.S. household gross financial assets and annual income. The two-tab application uses static HTML/CSS/JavaScript; it needs no frontend build or runtime dependencies.

Roadmap: (1) U.S. household financial assets, (2) U.S. household income, (3) global financial assets, (4) global income. Phases 1 and 2 are implemented; global datasets remain future work.

## Data and provenance

Source: [Federal Reserve 2025 Survey of Consumer Finances](https://www.federalreserve.gov/econres/scfindex.htm), official [CSV summary extract](https://www.federalreserve.gov/econres/files/scfp2025excel.zip), retrieved October 29, 2026 over verified HTTPS. Archive SHA-256: `7f1600daefd9caa6fef32e74977c4aa3e362172f3c5f91ba6d122c64c805e494`. The index explicitly identifies 2025 as its most recent survey and links this extract; the archive contains SCFP2025.csv. No synthetic values or 2022 substitute are used. The export contains its provenance hash for comparison on future downloads; upstream revisions can change that hash.

`FIN` is the official aggregate, not net worth. The [Federal Reserve extraction program](https://www.federalreserve.gov/econres/files/bulletin.macro.txt) defines it as LIQ + CDS + NMMF + STOCKS + BOND + RETQLIQ + SAVBND + CASHLI + OTHMA + OTHFIN. It includes transaction accounts, securities, retirement accounts, cash-value life insurance, managed assets and other financial assets. It excludes homes, vehicles and other nonfinancial assets; debts are not subtracted. Defined-benefit pension promises and Social Security wealth are not account balances included here. Values are 2025 dollars, measured for households (SCF primary economic units), not individuals.

## Household income (Phase 2)

The Household Income tab uses `INCOME` from the **same 2025 SCF summary extract and archive hash** as financial assets. The reference period is **calendar year 2024**, expressed in **2025 dollars**, not income earned in 2025. This is total household income before taxes, not wages alone or disposable income. The extraction program sets the base to `MAX(0, X5729)`, adds the specified IRA and tax-deferred pension withdrawals (`PENACCTWD`), and applies the previous-year-to-survey-year adjustment (`CPILAG = 4750/4625`). The [codebook](https://www.federalreserve.gov/econres/files/codebk2025.txt), “INCOME, TAXES, SUPPORT” section, confirms the 2024 reference period. We use the supplied aggregate without reconstructing it or undoing the official floor.

The income extract contains 117 zero-valued implicate records and **no negative INCOME records**. Valid signed income is supported by the processor and chart, but negative raw-income values must not be fabricated from an official aggregate that is already floored. Missing/nonfinite values are rejected; zero and any valid negative aggregate values are retained for income. Percentiles use the same weighted, five-implicate, at-or-below CDF described below.

| Income percentile | Annual income (2025 dollars, rounded) |
| --- | ---: |
| 25th | $42,108 |
| 50th | $82,162 |
| 75th | $148,919 |
| 90th | $252,649 |
| 95th | $400,541 |
| 99th | $1,150,270 |

The JSON retains unrounded observed thresholds. Both tabs share one chart module, input and slider. Each tab remembers its last valid selected amount for this page session. Tabs support touch, keyboard arrows, Home and End. The income numeric input permits a minus sign (text keyboard on mobile); values below the observed minimum report 0% and clamp the marker/slider to the left boundary. The signed horizontal transform is `sign(x) × log(1 + |x| / 1000)`, continuous and invertible through zero. For nonnegative assets this is identical to the Phase 1 scale. The slider covers the actual observed range plus zero; very large inputs are accepted and clamp only the chart marker.

## Statistical method

The public extract has 21,800 records for 4,360 households. YY1 identifies households; the last digit of Y1 identifies implicates 1–5. The script requires exactly one of each for every household. These are alternative imputations, not five independent households.

Use the supplied `WGT`. The official extraction program sets WGT = X42001 / 5; do not divide the extract weight again. The [2025 codebook](https://www.federalreserve.gov/econres/files/codebk2025.txt), multiple-imputation section, describes five implicates and the use of divided weights for simple point estimates. Our estimator averages the five separately normalized weighted CDFs: F(x) = (1/5) Σ_i [Σ_j WGT_ij 1(FIN_ij ≤ x) / Σ_j WGT_ij]. This gives each implicate equal influence even if its weight total differs slightly. It is not an average of five quantile thresholds or an average of household balances. We invert this combined CDF for thresholds.

Every distinct balance is retained. Equal balances are grouped and their weights summed; the percentile is **at or below** the selected amount. The CDF is a right-continuous step function: between observed values the percentile stays constant. There is no percentile interpolation through ties or gaps. Thresholds are the smallest observed balance reaching the requested probability. JSON stores unrounded balance values and full floating-point cumulative probabilities; the UI rounds percentiles to one decimal and dollar labels to whole dollars. The numeric control accepts cents; the slider selects whole dollars on a log(1 + assets / 1,000) scale. The chart uses the same scale and clamps its marker at the observed maximum for larger inputs, while the readout reports 100%. Negative financial-assets inputs and invalid inputs are rejected; income permits finite negative inputs. The processor fails on missing, nonfinite or negative FIN and invalid weights, rather than silently replacing or dropping them. Valid zero balances are retained.

| Percentile | Financial assets |
| --- | ---: |
| 50th (median) | $41,000 |
| 75th | $297,000 |
| 90th | $1,225,990 |
| 95th | $2,670,000 |
| 99th | $9,518,450 |

Survey point estimates have sampling and imputation uncertainty. No confidence intervals are calculated; those would require replicate weights and multiple-imputation variance combination. The extreme tail is sparsely sampled and is not an exact rank for all U.S. households. Public disclosure adjustments mean these estimates can differ from internal-data published tables. Statistics conditional on asset ownership are not directly comparable to this all-household distribution.

## Reproduce

Requires Python 3.10+ and curl (TLS verification stays enabled); no Python packages are needed.

```sh
python3 scripts/prepare_us_scf.py
python3 scripts/prepare_us_scf.py --measure INCOME
# Or use a previously downloaded official ZIP:
python3 scripts/prepare_us_scf.py --archive /path/to/scfp2025excel.zip
```

The script downloads directly into memory, validates identifiers and variables, builds the exact CDF, verifies monotonicity and independently checks CDF values at all reported thresholds using separate implicate calculations. Both commands use the same official archive; use `--archive` with either measure for offline preparation. Raw data is not committed. The generated compact JSON is the only runtime data dependency.

## Run and test

From the repository:

```sh
python3 -m http.server 8000
node tests/distribution.test.mjs
python3 tests/prepare_test.py
```

Open the server in a browser. Module and JSON loading require HTTP rather than opening index.html directly. Node 22+ can run the module tests without package configuration.

`tests/browser.cjs` additionally uses environment-provided Playwright and Chromium; these are optional development tools, not application dependencies. Set TEST_URL to the hosted repository root and CHROMIUM_PATH if necessary. It checks input values against the CDF, marker placement, slider/input synchronization, mobile overflow, touch interaction and dark mode. For the tested cloud setup, serve `/workspace` on port 8000 and run `node tests/browser.cjs`; its default URL includes the repository subpath. A screenshot is written outside the repository at `/tmp/scf-mobile.png`.

Validation completed: direct official download and deterministic regeneration; five-implicate completeness; independent per-implicate CDF check at thresholds; ties, gaps, zero, small, median, high and above-range inputs; quantile inversion, monotonicity and nonlinear-scale round trips. Browser test outcomes are reported in the task summary. Income validation additionally covers all six quantiles, zero and negative inputs, a signed synthetic processing fixture, missing/nonfinite rejection, repeated tab-state preservation, keyboard tabs, income slider/marker synchronization and desktop layout. No comparison to a directly comparable official all-household quantile table is claimed.

## Architecture and deployment

`distribution.js` accepts metadata and exact [balance, cumulative probability] points. `app.js` loads the dataset and binds controls. `index.html` and `styles.css` provide accessible controls, a responsive SVG, source notes and automatic light/dark mode. The two tabs share the component; no global distributions or placeholder navigation are implemented.

To deploy, push to GitHub, then in repository **Settings → Pages**, choose **Deploy from a branch**, select the branch containing these files and **/(root)**, then Save. Relative CSS/module paths and module-relative data URLs support `/<repository-name>/` hosting. No custom domain, bundler or Python server is needed on GitHub Pages. The connected environment may have Git push access without GitHub API access; enabling Pages through Settings can therefore require the repository owner.
