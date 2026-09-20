import sys
import db

session_id = sys.argv[1]
row = db.get_session(session_id)
if row is None:
    print("NO SUCH SESSION")
    raise SystemExit

t = row.get("transcript") or {}
turns = t.get("turns", [])
print("turns:", len(turns), "duration:", t.get("duration_sec"))
print("quiz:", row.get("quiz"))
print()
for x in turns:
    print("[%6.1f] %-6s %s" % (x["ts"], x["speaker"], x["text"]))
