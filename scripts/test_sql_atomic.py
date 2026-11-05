"""SQLite regression checks for D1-compatible atomic SQL. Runs without dependencies."""
import re
import sqlite3
from pathlib import Path
from tempfile import TemporaryDirectory

root=Path(__file__).resolve().parents[1]
js=(root/'src/core.mjs').read_text()
def extract(symbol):
    found=re.search(r'export const '+symbol+r' = `([^`]+)`;',js)
    assert found,symbol
    return found.group(1)

with TemporaryDirectory() as d:
    db=Path(d)/'test.db'
    conn=sqlite3.connect(db)
    conn.execute('PRAGMA foreign_keys=ON')
    for path in sorted((root/'migrations').glob('*.sql')):
        conn.executescript(path.read_text())
    jobs=[]
    for n in range(13):
        job=f'j{n}'
        jobs.append(job)
        conn.execute('INSERT INTO jobs(id,dedup_key,title,company,city,url,is_linkedin) VALUES(?,?,?,?,?,?,?)',
                     (job,job,'Analyst','Company','Riyadh',f'https://linkedin.com/jobs/view/{n}',int(n<12)))
        conn.execute('INSERT INTO applications(id,job_id) VALUES(?,?)',(f'a{n}',job))
    confirm=extract('ATOMIC_CONFIRM_APPLICATION_SQL')
    for n in range(10):
        assert conn.execute(confirm,('test','2026-11-05T06:00:00Z','2026-11-05',f'a{n}','2026-11-05')).fetchone()
    for n in (10,11):
        assert conn.execute(confirm,('test','2026-11-05T06:00:00Z','2026-11-05',f'a{n}','2026-11-05')).fetchone() is None
    assert conn.execute(confirm,('test','2026-11-05T06:00:00Z','2026-11-05','a12','2026-11-05')).fetchone()
    assert conn.execute('SELECT COUNT(*) FROM applications WHERE status="manually_sent"').fetchone()[0]==11
    conn.execute("INSERT INTO jobs(id,dedup_key,title,company,city,url,is_linkedin) VALUES('j13','j13','Analyst','Company','Riyadh','https://example.org/job',0)")
    claim=extract('CLAIM_PREPARATION_SQL')
    assert conn.execute(claim,('lease1','j13')).fetchone() is not None
    assert conn.execute(claim,('lease2','j13')).fetchone() is None
    conn.execute("UPDATE jobs SET prepare_claim='',prepare_claim_at=NULL WHERE id='j13'")
    assert conn.execute(claim,('lease2','j13')).fetchone() is not None
    conn.close()
print('PASS: migrations + D1 SQL atomic daily cap (10 LinkedIn, other portal unbounded) + AI claim')
