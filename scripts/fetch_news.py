#!/usr/bin/env python3
"""Builds news.json: the most important headlines of the moment, tagged by topic.

Run by .github/workflows/news.yml at 6 AM, 12 PM and 6 PM Pacific. Importance is a simple, transparent score:
a story ranks higher when several outlets carry it, when it sits near the top of a feed, when it is recent,
and (for staying power) when it was already in the previous top 5. Needs only the Python standard library.
"""
import datetime as dt, email.utils, html, json, math, os, re, sys, urllib.request
import xml.etree.ElementTree as ET
from zoneinfo import ZoneInfo

# (topic, outlet, url, weight). topic None = general front page, topic then comes from matching stories or keywords.
FEEDS = [
    ("World", "BBC News", "http://feeds.bbci.co.uk/news/rss.xml", 1.3, True),
    ("U.S.", "NPR", "https://feeds.npr.org/1001/rss.xml", 1.3, True),
    ("U.S.", "CBS News", "https://www.cbsnews.com/latest/rss/main", 1.2, True),
    ("World", "The Guardian", "https://www.theguardian.com/world/rss", 1.1, True),
    ("U.S.", "NPR National", "https://feeds.npr.org/1003/rss.xml", 1.0, False),
    ("U.S.", "BBC US & Canada", "http://feeds.bbci.co.uk/news/world/us_and_canada/rss.xml", 1.0, False),
    ("World", "BBC World", "http://feeds.bbci.co.uk/news/world/rss.xml", 1.0, False),
    ("World", "NPR World", "https://feeds.npr.org/1004/rss.xml", 1.0, False),
    ("Politics", "NPR Politics", "https://feeds.npr.org/1014/rss.xml", 1.0, False),
    ("Economy", "NPR Economy", "https://feeds.npr.org/1017/rss.xml", 1.0, False),
    ("Economy", "BBC Business", "http://feeds.bbci.co.uk/news/business/rss.xml", 1.0, False),
    ("Finance", "CNBC Finance", "https://www.cnbc.com/id/10000664/device/rss/rss.html", 1.0, False),
    ("Finance", "CNBC Investing", "https://www.cnbc.com/id/15839069/device/rss/rss.html", 1.0, False),
    ("Local", "KQED", "https://ww2.kqed.org/news/feed/", 1.0, False),
    ("Local", "Mercury News", "https://www.mercurynews.com/feed/", 1.0, False),
    ("Local", "East Bay Times", "https://www.eastbaytimes.com/feed/", 1.0, False),
    ("Sports", "ESPN", "https://www.espn.com/espn/rss/news", 1.0, False),
    ("Sports", "BBC Sport", "http://feeds.bbci.co.uk/sport/rss.xml", 1.0, False),
    ("Sports", "CBS Sports", "https://www.cbssports.com/rss/headlines/", 1.0, False),
    ("Tech", "Ars Technica", "https://feeds.arstechnica.com/arstechnica/index", 1.0, False),
    ("Tech", "The Verge", "https://www.theverge.com/rss/index.xml", 1.0, False),
    ("Science", "NPR Science", "https://feeds.npr.org/1007/rss.xml", 1.0, False),
    ("Health", "NPR Health", "https://feeds.npr.org/1128/rss.xml", 1.0, False),
    ("Entertainment", "BBC Entertainment", "http://feeds.bbci.co.uk/news/entertainment_and_arts/rss.xml", 1.0, False),
    ("Entertainment", "Variety", "https://variety.com/feed/", 1.0, False),
]
KEYWORDS = {
    "Sports": r"\b(nfl|nba|mlb|nhl|soccer|football|basketball|baseball|playoff|championship|world cup|olympic|coach|quarterback)\b",
    "Finance": r"\b(stocks?|wall street|dow|nasdaq|s&p|shares|earnings|investors?|bitcoin|crypto)\b",
    "Economy": r"\b(inflation|economy|economic|jobs report|unemployment|interest rates?|fed|tariffs?|recession|gdp)\b",
    "Politics": r"\b(congress|senate|house republicans|democrats|republicans|white house|election|campaign|trump|biden|governor)\b",
    "Health": r"\b(health|disease|vaccine|hospital|cancer|medical|virus|outbreak)\b",
    "Tech": r"\b(ai|openai|google|apple|microsoft|meta|chip|software|cyber)\b",
    "Science": r"\b(nasa|space|climate|scientists?|study finds|research)\b",
    "Entertainment": r"\b(movie|film|oscar|album|singer|actor|actress|tv series|netflix|box office)\b",
}
STOP = set("the and for with that this from are was were has have had will its into over after before about than more not but you your they their what who how why when where says said say new news first one two out off per via amid".split())
MAX_AGE_H = 48
PER_FEED = 12
HEADERS = {"User-Agent": "Mozilla/5.0 (compatible; HomeDashboardNews/1.0)", "Accept": "application/rss+xml, application/atom+xml, application/xml, text/xml, */*"}


def local(tag):
    return tag.rsplit("}", 1)[-1]


def clean(s, n=None):
    s = html.unescape(re.sub(r"<[^>]+>", " ", s or ""))
    s = re.sub(r"\s+", " ", s).strip()
    if n and len(s) > n:
        s = s[: n - 1].rsplit(" ", 1)[0].rstrip(",;:- ") + "…"
    return s


def parse_date(s):
    if not s:
        return None
    s = s.strip()
    try:
        d = email.utils.parsedate_to_datetime(s)
    except Exception:
        try:
            d = dt.datetime.fromisoformat(s.replace("Z", "+00:00"))
        except Exception:
            return None
    if d.tzinfo is None:
        d = d.replace(tzinfo=dt.timezone.utc)
    return d.astimezone(dt.timezone.utc)


def parse_feed(data):
    root = ET.fromstring(data)
    out = []
    for el in root.iter():
        if local(el.tag) not in ("item", "entry"):
            continue
        f = {"title": "", "link": "", "summary": "", "published": None}
        for c in el:
            n = local(c.tag)
            if n == "title":
                f["title"] = clean("".join(c.itertext()))
            elif n == "link":
                href = c.get("href")
                if href and c.get("rel", "alternate") == "alternate":
                    f["link"] = href
                elif not f["link"] and (c.text or "").strip():
                    f["link"] = c.text.strip()
            elif n in ("description", "summary") and not f["summary"]:
                f["summary"] = clean("".join(c.itertext()), 190)
            elif n in ("pubDate", "published", "updated", "date") and not f["published"]:
                f["published"] = parse_date(c.text)
        if f["title"] and f["link"].startswith("http"):
            out.append(f)
    return out


def fetch(url):
    req = urllib.request.Request(url, headers=HEADERS)
    with urllib.request.urlopen(req, timeout=20) as r:
        return r.read()


def toks(t):
    return {w for w in re.findall(r"[a-z0-9']+", t.lower()) if len(w) > 2 and w not in STOP}


def similar(a, b):
    i = len(a & b)
    if not i:
        return False
    j = i / len(a | b)
    return j >= 0.45 or (i >= 4 and j >= 0.3)


def keyword_topic(text, default):
    t = text.lower()
    for topic, pat in KEYWORDS.items():
        if re.search(pat, t):
            return topic
    return default


def main():
    la = dt.datetime.now(ZoneInfo("America/Los_Angeles"))
    if not os.environ.get("FORCE") and la.hour not in (6, 12, 18):
        print(f"Skipping: it is {la:%H:%M} in Los Angeles, not a 6 AM / 12 PM / 6 PM update.")
        return 0
    now = dt.datetime.now(dt.timezone.utc)
    prev = []
    try:
        prev = [toks(s["title"]) for s in json.load(open("news.json"))["top"][:5]]
    except Exception:
        pass

    items = []
    ok = 0
    local_dir = os.environ.get("FEED_DIR")  # for offline tests: files named after the outlet
    for topic, outlet, url, weight, general in FEEDS:
        try:
            if local_dir:
                p = os.path.join(local_dir, outlet.replace(" ", "_") + ".xml")
                if not os.path.exists(p):
                    continue
                data = open(p, "rb").read()
            else:
                data = fetch(url)
            entries = parse_feed(data)
            ok += 1
        except Exception as e:
            print(f"  ! {outlet}: {e}", file=sys.stderr)
            continue
        for rank, e in enumerate(entries[:PER_FEED]):
            age = (now - e["published"]).total_seconds() / 3600 if e["published"] else 12
            if age > MAX_AGE_H:
                continue
            base = weight / (1 + 0.45 * rank) * max(0.35, math.exp(-max(age, 0) / 20))
            items.append({**e, "topic": topic, "outlet": outlet, "general": general, "rank": rank, "base": base, "t": toks(e["title"])})
    if not items:
        print("No headlines fetched; leaving news.json as it was.", file=sys.stderr)
        return 1
    print(f"{ok} feeds, {len(items)} headlines")

    clusters = []
    for it in sorted(items, key=lambda x: -x["base"]):
        for c in clusters:
            if any(similar(it["t"], m["t"]) for m in c):
                c.append(it)
                break
        else:
            clusters.append([it])

    stories = []
    for c in clusters:
        best_by_outlet = {}
        for m in c:
            best_by_outlet[m["outlet"].split(" ")[0]] = max(best_by_outlet.get(m["outlet"].split(" ")[0], 0), m["base"])
        score = sum(best_by_outlet.values())
        if any(similar(c[0]["t"], p) for p in prev):
            score *= 1.3  # stories that were already top 5 hang around while they are still the big news
        sect = [m for m in c if not m["general"]]
        if sect:
            lead = max(sect, key=lambda m: m["base"])
            topic = lead["topic"]
        else:
            lead = max(c, key=lambda m: m["base"])
            topic = keyword_topic(lead["title"] + " " + lead["summary"], lead["topic"])
        pub = max((m["published"] for m in c if m["published"]), default=None)
        stories.append({
            "id": re.sub(r"[^a-z0-9]+", "-", lead["title"].lower())[:60].strip("-"),
            "title": lead["title"], "link": lead["link"], "source": lead["outlet"], "topic": topic,
            "summary": lead["summary"], "published": pub.isoformat() if pub else None,
            "outlets": len(best_by_outlet), "score": round(score, 3),
        })
    stories.sort(key=lambda s: -s["score"])

    top, seen = [], {}
    for s in stories:  # first pass: at most 2 per topic so the top 5 spans the news
        if seen.get(s["topic"], 0) < 2:
            top.append(s)
            seen[s["topic"]] = seen.get(s["topic"], 0) + 1
        if len(top) >= 5:
            break
    for s in stories:  # then fill the candidate list
        if s not in top:
            top.append(s)
        if len(top) >= 25:
            break
    topics = {}
    for s in stories:
        topics.setdefault(s["topic"], [])
        if len(topics[s["topic"]]) < 6:
            topics[s["topic"]].append(s)

    out = {"generated": now.isoformat(timespec="seconds"), "generatedLocal": la.strftime("%Y-%m-%d %H:%M"), "top": top, "topics": topics}
    with open("news.json", "w", encoding="utf-8") as f:
        json.dump(out, f, ensure_ascii=False, indent=1)
    print("Top 5:")
    for s in top[:5]:
        print(f"  [{s['topic']}] {s['title']} ({s['outlets']} outlets)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
