import subprocess
import sys
import time
import urllib.request
import json
import os

def test_full_application():
    print(">>> 1. Starting Flask backend and Node.js server...")
    root_dir = os.path.dirname(os.path.abspath(__file__))
    flask_proc = subprocess.Popen([sys.executable, 'app.py'], cwd=os.path.join(root_dir, 'backend'))
    node_env = dict(os.environ, PORT='3000')
    node_proc = subprocess.Popen(['node', 'server.js'], cwd=os.path.join(root_dir, 'frontend'), env=node_env)
    for _ in range(15):
        try:
            with urllib.request.urlopen("http://127.0.0.1:5000/api/status", timeout=1):
                break
        except Exception:
            time.sleep(1)

    try:
        # 1. Test Node serves HTML
        print(">>> 2. Testing Frontend UI server (http://localhost:3000)...")
        with urllib.request.urlopen("http://localhost:3000") as resp:
            html = resp.read().decode('utf-8')
            assert 'TaskFlow' in html, "TaskFlow title not found in HTML"
            print("   [OK] Frontend UI loaded successfully!")

        # 2. Test Supabase status via Node proxy
        print(">>> 3. Testing Supabase Cloud Status via Proxy (http://localhost:3000/api/status)...")
        with urllib.request.urlopen("http://localhost:3000/api/status") as resp:
            data = json.loads(resp.read().decode('utf-8'))
            print("   Status response:", data)
            assert data.get("supabase_connected") is True, "Supabase is not connected!"
            assert data.get("bucket") == "To-Do data", "Bucket mismatch!"
            print("   [OK] Supabase connected to bucket 'To-Do data'!")

        # 3. Create a new task
        print(">>> 4. Testing Task Creation (POST /api/todos)...")
        req_body = json.dumps({
            "title": "Persistent Verification Task",
            "description": "Testing persistence across server restart",
            "priority": "Urgent",
            "category": "Work",
            "due_date": "2026-10-31",
            "tags": ["test", "verification"]
        }).encode('utf-8')
        req = urllib.request.Request("http://localhost:3000/api/todos", data=req_body, headers={"Content-Type": "application/json"}, method="POST")
        with urllib.request.urlopen(req) as resp:
            created = json.loads(resp.read().decode('utf-8'))
            assert created.get("success") is True
            created_todo = created.get("data")
            todo_id = created_todo["id"]
            print(f"   [OK] Created task ID: {todo_id}, Title: {created_todo['title']}")

        # 4. Update task (toggle complete)
        print(">>> 5. Testing Task Update (PUT /api/todos/:id)...")
        upd_body = json.dumps({"completed": True}).encode('utf-8')
        req = urllib.request.Request(f"http://localhost:3000/api/todos/{todo_id}", data=upd_body, headers={"Content-Type": "application/json"}, method="PUT")
        with urllib.request.urlopen(req) as resp:
            updated = json.loads(resp.read().decode('utf-8'))
            assert updated.get("success") is True
            assert updated["data"]["completed"] is True
            print("   [OK] Marked task as completed!")

        # 5. SERVER RESTART TEST
        print(">>> 6. Testing SERVER RESTART PERSISTENCE...")
        print("   Terminating Flask and Node.js servers...")
        flask_proc.terminate()
        node_proc.terminate()
        flask_proc.wait(timeout=5)
        node_proc.wait(timeout=5)
        print("   Servers completely stopped.")

        time.sleep(2)
        print("   Restarting Flask and Node.js servers anew...")
        flask_proc = subprocess.Popen([sys.executable, 'app.py'], cwd=os.path.join(root_dir, 'backend'))
        time.sleep(2)
        node_proc = subprocess.Popen(['node', 'server.js'], cwd=os.path.join(root_dir, 'frontend'), env=node_env)
        for _ in range(15):
            try:
                with urllib.request.urlopen("http://127.0.0.1:5000/api/status", timeout=1):
                    break
            except Exception:
                time.sleep(1)

        # 6. Fetch todos after restart
        print(">>> 7. Fetching tasks after restart to verify persistence from Supabase...")
        with urllib.request.urlopen("http://localhost:3000/api/todos") as resp:
            res = json.loads(resp.read().decode('utf-8'))
            assert res.get("success") is True
            items = res.get("data", [])
            persisted_item = next((item for item in items if item["id"] == todo_id), None)
            assert persisted_item is not None, f"Task {todo_id} was NOT found after server restart!"
            assert persisted_item["completed"] is True, "Task completed state was lost after restart!"
            assert persisted_item["title"] == "Persistent Verification Task"
            print("   [SUCCESS] Verified! Task persisted across server restart from Supabase bucket 'To-Do data'!")

        # 7. Clean up test task
        print(">>> 8. Cleaning up test task...")
        req = urllib.request.Request(f"http://localhost:3000/api/todos/{todo_id}", method="DELETE")
        with urllib.request.urlopen(req) as resp:
            del_res = json.loads(resp.read().decode('utf-8'))
            assert del_res.get("success") is True
            print("   [OK] Test task deleted and synced to Supabase!")

        print("\n=== ALL TESTS PASSED SUCCESSFULLY! The application works seamlessly. ===")

    finally:
        print(">>> Shutting down test servers...")
        try:
            node_proc.terminate()
        except Exception:
            pass
        try:
            flask_proc.terminate()
        except Exception:
            pass

if __name__ == '__main__':
    test_full_application()
