import psycopg2

DSN = 'postgresql://postgres:wil@localhost:5432/evexticket'

conn = psycopg2.connect(DSN)
conn.autocommit = True
cur = conn.cursor()
cur.execute("SELECT pid FROM pg_stat_activity WHERE datname='evexticket' AND pid <> pg_backend_pid();")
rows = cur.fetchall()
if rows:
    pids = [r[0] for r in rows]
    print('Terminating pids:', pids)
    for pid in pids:
        try:
            cur.execute('SELECT pg_terminate_backend(%s);', (pid,))
        except Exception as e:
            print('Failed to terminate', pid, e)
else:
    print('No other connections found.')
cur.close()
conn.close()
