"""SQLite regression checks for D1-compatible atomic SQL. Runs without dependencies."""
import re
import sqlite3
from concurrent.futures import ThreadPoolExecutor
from threading import Barrier
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
    # Concurrent requests from independent connections: only the final daily slot wins.
    for n in range(14, 26):
        conn.execute('INSERT INTO jobs(id,dedup_key,title,company,city,url,is_linkedin) VALUES(?,?,?,?,?,?,1)',
                     (f'j{n}',f'j{n}','Analyst','Company','Riyadh',f'https://linkedin.com/jobs/view/{n}'))
        conn.execute('INSERT INTO applications(id,job_id) VALUES(?,?)',(f'a{n}',f'j{n}'))
    for n in range(14, 23):
        assert conn.execute(confirm,('proof','2026-11-06T06:00:00Z','2026-11-06',f'a{n}','2026-11-06')).fetchone()
    conn.commit()
    barrier=Barrier(2)
    def race(app_id):
        with sqlite3.connect(db,timeout=15) as other:
            other.execute('PRAGMA busy_timeout=15000')
            barrier.wait(timeout=10)
            return other.execute(confirm,('proof','2026-11-06T06:00:00Z','2026-11-06',app_id,'2026-11-06')).fetchone() is not None
    with ThreadPoolExecutor(max_workers=2) as pool:
        outcomes=list(pool.map(race,['a23','a24']))
    assert sorted(outcomes)==[False,True],f'Concurrent confirmations: {outcomes}'
    assert conn.execute("SELECT COUNT(*) FROM applications a JOIN jobs j ON a.job_id=j.id WHERE a.sent_day='2026-11-06' AND j.is_linkedin=1").fetchone()[0]==10
    conn.close()
print('PASS: migrations + atomic LinkedIn daily cap (including 2-connection race) + other portal unbounded + AI claim')
# Import the owner CV only into a blank profile, preserving existing edits and target roles.
for existing in [False, True]:
    c=sqlite3.connect(':memory:')
    for path in sorted((root/'migrations').glob('*.sql')):
        if path.name=='0005_owner_resume.sql' and existing:
            c.execute("UPDATE profile SET full_name='Edited owner', resume_text='Existing edited resume',target_roles='Owner choice' WHERE id=1")
        c.executescript(path.read_text())
    name,resume,roles,original=c.execute('SELECT full_name,resume_text,target_roles,resume_original_url FROM profile WHERE id=1').fetchone()
    if existing:
        assert (name,resume,roles,original)==('Edited owner','Existing edited resume','Owner choice','')
    else:
        assert name=='Abdulmajeed Alamri' and "Bachelor's Degree in Hebrew Language" in resume and roles=='' and original.endswith('.pdf')
    assert c.execute('SELECT COUNT(*) FROM job_sources').fetchone()[0]==4
    c.close()
print('PASS: factual owner CV seeded once + existing profile preserved + four verified board defaults')
