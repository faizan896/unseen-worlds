"""Export the recorded portfolio replay as one offline-capable HTML file."""
import argparse
import base64
import json
from pathlib import Path

from server import ROOT, serve


def data_url(mime, data):
    return f"data:{mime};base64," + base64.b64encode(data).decode("ascii")


def exported_demo():
    web = ROOT / "web"
    benchmark = serve("/api/benchmark", {})
    witness = benchmark["examples"]["transfer"]["branch"]["All"]
    primary, alternate = witness["id"], witness["alternate"]
    reverse = dict(witness, id=alternate, alternate=primary,
                   endpoint=witness["alternate_endpoint"], alternate_endpoint=witness["endpoint"],
                   next=witness["alternate_next"], alternate_next=witness["next"])
    recordings = {}
    for fork in (witness, reverse):
        query = {"world": [fork["id"]]}
        recordings[fork["id"]] = {
            "base": serve("/api/open", query),
            "episodes": {p: serve("/api/replay", dict(query, policy=[p])) for p in ("learned", "fixed")},
            "witness": fork,
        }

    rows = []
    for policy, name in (("learned", "Trained chooser"), ("fixed", "Training-selected fixed plan"),
                         ("gain", "Information gain")):
        values = [s["All"]["at_three"][policy] for s in benchmark["splits"].values()]
        runs = sum(v["runs"] for v in values)
        error = sum(v["error"] * v["runs"] for v in values) / runs
        rows.append(f'<tr><th scope="row">{name}</th><td>{sum(v["unique"] for v in values)} / {runs}</td>'
                    f'<td>{error:.2f} units</td></tr>')

    styles = (web / "style.css").read_text(encoding="utf-8")
    for font in ("geist", "geist-mono"):
        path = f"fonts/{font}.woff2"
        styles = styles.replace(f"url({path})", f'url({data_url("font/woff2", (web/path).read_bytes())})')
    styles += '\n/* ' + (web / "fonts/LICENSE.txt").read_text(encoding="utf-8") + ' */\n'
    styles += '.bar nav a{align-self:center;padding:12px 0;font-size:13px}'

    # An inline ES module has no directory for relative imports; embed its one dependency.
    scope = data_url("text/javascript", (web / "scope.js").read_bytes())
    comparison = (web / "comparison.js").read_text(encoding="utf-8").replace("'./scope.js'", repr(scope))
    bindings = {
        "STYLE": styles, "MARK": data_url("image/svg+xml", (web / "mark.svg").read_bytes()),
        "ROWS": "".join(rows), "COMPARISON": data_url("text/javascript", comparison.encode()),
        "RECORDINGS": json.dumps(dict(primary=primary, worlds=recordings), separators=(",", ":")).replace("<", "\\u003c"),
    }
    page = (ROOT / "portfolio/index.html").read_text(encoding="utf-8")
    for name, value in bindings.items():
        page = page.replace(f"@@{name}@@", value)
    return page


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("output", type=Path, help="HTML file to create")
    args = parser.parse_args()
    args.output.write_text(exported_demo(), encoding="utf-8")
