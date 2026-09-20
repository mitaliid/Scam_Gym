import db

with db._conn() as c:
    rows = c.execute(
        "SELECT id, created_at FROM sessions ORDER BY created_at DESC LIMIT 20"
    ).fetchall()

for r in rows:
    row = db.get_session(r["id"])
    t = row.get("transcript") or {}
    turns = t.get("turns", [])
    user_turns = [x for x in turns if x["speaker"] == "user"]
    print(
        r["id"],
        "turns=%-3d" % len(turns),
        "user=%-3d" % len(user_turns),
        "dur=%-6s" % round(t.get("duration_sec") or 0),
        "quiz=%s" % list((row.get("quiz") or {}).keys()),
    )
