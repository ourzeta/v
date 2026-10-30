#!/usr/bin/env python3
"""Double-fork daemonizer: detach prod-serve.sh completely from the tool session.

Fork 1 → setsid (new session, no controlling tty)
Fork 2 → grandchild immediately reparents to PID 1 (tini) while the parent exits
The final daemon is therefore NOT a descendant of the bash tool session
by the time the tool call ends, and lives in its own session/process group.

Usage: python3 daemonize_prod.py [start|status|stop]
"""
import os
import sys
import time
import signal
import urllib.request

PROJ = "/home/z/my-project"
PIDFILE = "/home/z/my-project/.prod-serve.pid"
LOG = "/home/z/my-project/dev.log"


def http_ok(url):
    try:
        with urllib.request.urlopen(url, timeout=3) as r:
            return r.status == 200
    except Exception:
        return False


def running():
    try:
        with open(PIDFILE) as f:
            pid = int(f.read().strip())
        os.kill(pid, 0)
        return pid
    except Exception:
        return None


def start():
    pid = running()
    if pid and http_ok("http://127.0.0.1:3000/api/health"):
        print(f"already running pid={pid}")
        return
    if os.fork() > 0:
        # original parent: return to caller (readiness polling happens there)
        return
    # --- child 1 ---
    os.setsid()
    if os.fork() > 0:
        os._exit(0)
    # --- child 2 (daemon, parent = init/tini) ---
    with open(LOG, "ab", 0) as f:
        os.dup2(f.fileno(), 1)
        os.dup2(f.fileno(), 2)
        devnull = os.open(os.devnull, os.O_RDONLY)
        os.dup2(devnull, 0)
    os.chdir(PROJ)
    with open(PIDFILE, "w") as pf:
        pf.write(str(os.getpid()))
    os.execvp("bash", ["bash", "scripts/prod-serve.sh"])


def status():
    pid = running()
    alive = bool(pid)
    healthy = http_ok("http://127.0.0.1:3000/api/health")
    listening = http_ok("http://127.0.0.1:3000/")
    print(f"pid={pid} alive={alive} health={'OK' if healthy else 'FAIL'} page={'OK' if listening else 'FAIL'}")


def stop():
    pid = running()
    if pid:
        try:
            os.kill(pid, signal.SIGTERM)
            for _ in range(50):
                time.sleep(0.1)
                os.kill(pid, 0)
            os.kill(pid, signal.SIGKILL)
        except ProcessLookupError:
            pass
        os.remove(PIDFILE)
        print(f"stopped {pid}")
    else:
        print("not running")


if __name__ == "__main__":
    cmd = sys.argv[1] if len(sys.argv) > 1 else "status"
    if cmd == "start":
        start()
        # wait up to 15s for readiness (from the ORIGINAL parent, then exit)
        for _ in range(15):
            if http_ok("http://127.0.0.1:3000/api/health"):
                print("daemon ready: health OK")
                break
            time.sleep(1)
        else:
            print("daemon started but health not OK yet")
    elif cmd == "stop":
        stop()
    else:
        status()
