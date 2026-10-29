"""Download official SCF extract and export an exact weighted empirical CDF."""
import argparse
import bisect
import collections
import csv
import hashlib
import io
import json
import math
from pathlib import Path
import subprocess
import zipfile

URL = "https://www.federalreserve.gov/econres/files/scfp2025excel.zip"
ROOT = Path(__file__).resolve().parents[1]

def prepare(raw):
    with zipfile.ZipFile(io.BytesIO(raw)) as archive:
        with archive.open("SCFP2025.csv") as source:
            rows = list(csv.DictReader(io.TextIOWrapper(source)))
    households = collections.defaultdict(set)
    masses = collections.defaultdict(list)
    per_implicate = collections.defaultdict(list)
    weights = collections.defaultdict(list)
    for row in rows:
        identifier, implicate = int(row["YY1"]), int(row["Y1"]) % 10
        value, weight = float(row["FIN"]), float(row["WGT"])
        if not math.isfinite(value) or value < 0:
            raise ValueError("Missing, nonfinite, or negative FIN: investigate rather than silently alter")
        if not math.isfinite(weight) or weight <= 0:
            raise ValueError("Invalid survey weight")
        if implicate in households[identifier]:
            raise ValueError("Duplicate household implicate")
        households[identifier].add(implicate)
        masses[value].append(weight)
        per_implicate[implicate].append((value, weight))
        weights[identifier].append(weight)
    assert households and all(v == {1,2,3,4,5} for v in households.values())
    # Normalize each implicate separately before averaging its CDF.
    masses = collections.defaultdict(list)
    for entries in per_implicate.values():
        subtotal = math.fsum(w for _, w in entries)
        for value, weight in entries:
            masses[value].append(weight / subtotal / 5)
    total = math.fsum(math.fsum(v) for v in masses.values())
    points, running = [], 0.0
    for value, values in sorted(masses.items()):
        running += math.fsum(values)
        points.append([value, running / total])
    points[-1][1] = 1.0
    assert all(a[0] < b[0] and a[1] <= b[1] for a,b in zip(points,points[1:]))
    thresholds = {str(p): points[bisect.bisect_left([v[1] for v in points],p/100)][0] for p in (50,75,90,95,99)}
    # Independent calculation: average five separately normalized CDFs.
    for value in thresholds.values():
        independent = math.fsum(math.fsum(w for x,w in entries if x<=value)/math.fsum(w for x,w in entries) for entries in per_implicate.values())/5
        pooled = points[bisect.bisect_right([x[0] for x in points],value)-1][1]
        assert abs(independent-pooled) < 1e-10
    return dict(id="us-household-financial-assets",title="U.S. household financial assets",geography="United States",surveyYear=2025,currency="USD",units="2025 dollars",populationUnit="households (SCF primary economic units)",measure="Gross financial assets",definition="Official FIN: transaction accounts, CDs, pooled investment funds, stocks, bonds, retirement accounts, savings bonds, cash-value life insurance, other managed assets and other financial assets. Excludes nonfinancial assets; debts are not subtracted.",source=dict(name="Federal Reserve Survey of Consumer Finances",url="https://www.federalreserve.gov/econres/scfindex.htm",download=URL,sha256=hashlib.sha256(raw).hexdigest()),method="Weighted empirical CDF, at or below; average of five separately normalized weighted CDFs using extract WGT (already X42001/5). No interpolation across point masses.",households=len(households),observations=len(rows),thresholds=thresholds,points=points)

if __name__ == "__main__":
    parser=argparse.ArgumentParser()
    parser.add_argument("--archive",type=Path,help="Use an already downloaded official ZIP")
    parser.add_argument("--output",type=Path,default=ROOT/"data/us-financial-assets.json")
    args=parser.parse_args()
    raw=args.archive.read_bytes() if args.archive else subprocess.check_output(["curl", "--fail", "--silent", "--show-error", "--location", "--max-time", "60", URL])
    result=prepare(raw)
    args.output.parent.mkdir(parents=True,exist_ok=True)
    args.output.write_text(json.dumps(result,separators=(",",":"))+"\n")
    print(json.dumps({k:result[k] for k in ("households","observations","thresholds","source")},indent=2))
