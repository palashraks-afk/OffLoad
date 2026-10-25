"""Download the OpenStreetMap road network for the region.

Python's TLS in this environment cannot talk to the Overpass servers, so the download uses curl,
in tiles to stay under Overpass limits, then osmnx builds the graph from the XML.
Cached to data/raw/osm/<id>.graphml.
"""
import subprocess
import sys
from pathlib import Path

import osmnx as ox

sys.path.insert(0, str(Path(__file__).parent))
from common import ROOT, region  # noqa: E402
from people import district_polygon  # noqa: E402

HIGHWAYS = ("motorway|motorway_link|trunk|trunk_link|primary|primary_link|secondary|secondary_link|"
            "tertiary|tertiary_link|unclassified|residential")
import os
URL = os.environ.get("OVERPASS_URL", "https://overpass-api.de/api/interpreter")   # set OVERPASS_URL to use a mirror when the main server refuses this machine


def tile_xml(bbox, dest, tries=8):
    import time
    for k in range(tries):
        try:
            return _tile_xml(bbox, dest)
        except RuntimeError as err:
            wait = min(300, 20 * 2 ** k)
            print("retry", k + 1, "in", wait, "s:", str(err)[:80].replace("\n", " "), flush=True)
            time.sleep(wait)
    raise RuntimeError("giving up on tile " + str(bbox))


def _tile_xml(bbox, dest):
    s, w, n, e = bbox
    q = (f'[out:xml][timeout:600];(way["highway"~"^({HIGHWAYS})$"]({s},{w},{n},{e}););(._;>;);out;')
    r = subprocess.run(["curl", "-s", "-m", "900", "-A", "shiftready-student-project/1.0",
                        "--data-urlencode", f"data={q}", "-o", str(dest), URL], capture_output=True)
    head = dest.read_bytes()[:600] if dest.exists() else b""
    if r.returncode or b"<osm" not in head or b"<remark" in head:
        raise RuntimeError(f"tile failed {bbox}: {dest.read_bytes()[:300] if dest.exists() else ''}")


def area_polygon(cfg):
    if cfg.get("model_area") == "county":
        import shapefile
        from shapely.geometry import shape
        from shapely.ops import unary_union
        r = shapefile.Reader(str(ROOT / f"data/raw/tract/shp/cb_2023_{cfg['state_fips']}_tract_500k"))
        polys = [shape(s.shape.__geo_interface__) for s in r.iterShapeRecords() if s.record.as_dict()["COUNTYFP"] in cfg["county_fips"]]
        return unary_union(polys).buffer(0.003)
    return district_polygon(cfg).buffer(0.01)    # about 1 km so edges at the boundary are whole


def fetch(rid="ca33", nx=3, ny=3):
    cfg = region(rid)
    out = ROOT / f"data/raw/osm/{rid}.graphml"
    if out.exists():
        return out
    d = ROOT / f"data/raw/osm/{rid}_tiles3"
    d.mkdir(parents=True, exist_ok=True)
    parts = []
    if cfg.get("osm_tiles"):
        # a district that is mostly empty desert: fetch only the listed populated boxes [south, west, north, east]
        for k, box in enumerate(cfg["osm_tiles"]):
            f = d / f"box{k}.osm"
            if not f.exists():
                print("box", k, box, flush=True)
                tile_xml(tuple(box), f)
            parts.append(f)
    else:
        w, s, e, n = area_polygon(cfg).bounds
        nx, ny = (4, 4) if cfg.get("model_area") == "county" else (nx, ny)
        xs = [w + (e - w) * i / nx for i in range(nx + 1)]
        ys = [s + (n - s) * j / ny for j in range(ny + 1)]
        for i in range(nx):
            for j in range(ny):
                f = d / f"t{i}{j}.osm"
                if not f.exists():
                    print("tile", i, j, flush=True)
                    tile_xml((ys[j], xs[i], ys[j + 1], xs[i + 1]), f)
                parts.append(f)
    # merge tiles into one XML (ways/nodes may repeat across tiles; osmnx ignores duplicates)
    merged = d / "merged.osm"
    import re
    bodies = []
    for f in parts:
        txt = f.read_text(encoding="utf-8")
        body = txt[txt.index("<osm"):]
        bodies.append(body[body.index(">") + 1: body.rindex("</osm>")])
    # a mirror can be a moment out of step with itself: drop the few ways that point at a node that was not delivered
    have = set(re.findall(r'<node id="(\d+)"', "".join(bodies)))
    dropped = 0
    with merged.open("w", encoding="utf-8") as m:
        m.write('<?xml version="1.0" encoding="UTF-8"?><osm version="0.6">')
        for body in bodies:
            def keep(mt):
                nonlocal dropped
                if all(r in have for r in re.findall(r'<nd ref="(\d+)"', mt.group(0))):
                    return mt.group(0)
                dropped += 1
                return ""
            m.write(re.sub(r"<way .*?</way>", keep, body, flags=re.S))
        m.write("</osm>")
    if dropped:
        print("dropped", dropped, "ways with missing nodes", flush=True)
    ox.settings.useful_tags_way = ["highway", "lanes", "maxspeed", "oneway", "name", "bridge", "tunnel", "lit", "sidewalk"]
    g = ox.graph_from_xml(merged, simplify=True, retain_all=True)
    ox.save_graphml(g, out)
    print("saved", out, g.number_of_nodes(), "nodes", g.number_of_edges(), "edges")
    return out


if __name__ == "__main__":
    fetch(sys.argv[1] if len(sys.argv) > 1 else "ca33")
