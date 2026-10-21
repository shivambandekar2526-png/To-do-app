import subprocess
import sys
import os
import time
import signal

def main():
    root_dir = os.path.dirname(os.path.abspath(__file__))
    backend_dir = os.path.join(root_dir, 'backend')
    frontend_dir = os.path.join(root_dir, 'frontend')

    print("=" * 60)
    print(">>> Starting Persistent To-Do Application")
    print("   * Backend:  Python Flask (Port 5000)")
    print("   * Frontend: Node.js Express (Port 3000)")
    print("   * Storage:  Supabase Bucket ('To-Do data')")
    print("=" * 60)

    # Launch Python Flask backend
    flask_proc = subprocess.Popen(
        [sys.executable, 'app.py'],
        cwd=backend_dir
    )
    print("[1/2] Started Flask backend process (PID: {})".format(flask_proc.pid))

    # Give Flask a second to initialize
    time.sleep(1.5)

    # Launch Node.js frontend server
    node_proc = subprocess.Popen(
        ['node', 'server.js'],
        cwd=frontend_dir
    )
    print("[2/2] Started Node.js frontend process (PID: {})".format(node_proc.pid))

    print("\n[SUCCESS] Application is LIVE at: http://localhost:3000")
    print("Press Ctrl+C to stop both servers.\n")

    def shutdown(sig, frame):
        print("\nShutting down servers...")
        try:
            node_proc.terminate()
            flask_proc.terminate()
        except Exception:
            pass
        sys.exit(0)

    signal.signal(signal.SIGINT, shutdown)
    signal.signal(signal.SIGTERM, shutdown)

    try:
        while True:
            time.sleep(1)
            # If any process unexpectedly exited, alert
            if flask_proc.poll() is not None:
                print(f"[Warning] Flask backend exited with code {flask_proc.returncode}")
                break
            if node_proc.poll() is not None:
                print(f"[Warning] Node server exited with code {node_proc.returncode}")
                break
    except KeyboardInterrupt:
        shutdown(None, None)

if __name__ == '__main__':
    main()
