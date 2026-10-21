import os
import json
import uuid
import datetime
from pathlib import Path
from dotenv import load_dotenv
from supabase import create_client, Client

# Load environment variables
dotenv_path = Path(__file__).resolve().parent / '.env'
load_dotenv(dotenv_path=dotenv_path)

SUPABASE_URL = os.getenv('SUPABASE_URL', 'https://umpbqnhegxtwigkstzvv.supabase.co')
SUPABASE_KEY = os.getenv('SUPABASE_KEY', '')
SUPABASE_BUCKET = os.getenv('SUPABASE_BUCKET', 'To-Do data')

FILE_PATH_IN_BUCKET = 'todos.json'
CACHE_DIR = Path(__file__).resolve().parent / 'data'
CACHE_FILE = CACHE_DIR / 'todos_cache.json'

class SupabaseTodoService:
    def __init__(self):
        self.url = SUPABASE_URL
        self.key = SUPABASE_KEY
        self.bucket = SUPABASE_BUCKET
        self.client: Client = None
        self.last_sync_time = None
        self.last_error = None
        
        # Ensure local cache directory exists
        CACHE_DIR.mkdir(parents=True, exist_ok=True)
        
        self._init_client()

    def _init_client(self):
        try:
            self.client = create_client(self.url, self.key)
            self.last_error = None
        except Exception as e:
            self.last_error = str(e)
            print(f"[SupabaseService] Error initializing Supabase client: {e}")

    def _ensure_client(self):
        if not self.client:
            self._init_client()
        return self.client is not None

    def _load_from_cache(self):
        if CACHE_FILE.exists():
            try:
                with open(CACHE_FILE, 'r', encoding='utf-8') as f:
                    return json.load(f)
            except Exception as e:
                print(f"[SupabaseService] Error loading local cache: {e}")
        return []

    def _save_to_cache(self, todos):
        try:
            with open(CACHE_FILE, 'w', encoding='utf-8') as f:
                json.dump(todos, f, indent=2, ensure_ascii=False)
        except Exception as e:
            print(f"[SupabaseService] Error writing local cache: {e}")

    def get_todos(self, force_refresh=False):
        """
        Loads todos from Supabase storage bucket 'To-Do data'.
        Falls back to local cache if offline or on network error.
        """
        if not self._ensure_client():
            return self._load_from_cache()

        try:
            # Download todos.json from the bucket
            data_bytes = self.client.storage.from_(self.bucket).download(FILE_PATH_IN_BUCKET)
            todos = json.loads(data_bytes.decode('utf-8'))
            self.last_sync_time = datetime.datetime.now(datetime.timezone.utc).isoformat()
            self._save_to_cache(todos)
            return todos
        except Exception as e:
            err_msg = str(e)
            # If the file does not exist yet in bucket, initialize an empty list in bucket
            if '404' in err_msg or 'not found' in err_msg.lower() or 'not_found' in err_msg.lower():
                print(f"[SupabaseService] todos.json not found in bucket '{self.bucket}'. Initializing...")
                cached = self._load_from_cache()
                if not cached:
                    # Provide an initial welcome task
                    cached = [{
                        "id": str(uuid.uuid4()),
                        "title": "Welcome to your Persistent To-Do App!",
                        "description": "This task is stored in your Supabase 'To-Do data' bucket and persists across restarts.",
                        "completed": False,
                        "priority": "Medium",
                        "category": "Work",
                        "due_date": "",
                        "tags": ["supabase", "flask", "nodejs"],
                        "created_at": datetime.datetime.now(datetime.timezone.utc).isoformat(),
                        "updated_at": datetime.datetime.now(datetime.timezone.utc).isoformat()
                    }]
                self._save_to_bucket(cached)
                return cached
            else:
                print(f"[SupabaseService] Failed to download from Supabase ({e}). Using cache.")
                self.last_error = err_msg
                return self._load_from_cache()

    def _save_to_bucket(self, todos):
        """
        Persists todos directly into the Supabase storage bucket 'To-Do data'.
        """
        self._save_to_cache(todos)
        
        if not self._ensure_client():
            raise RuntimeError(f"Cannot connect to Supabase: {self.last_error}")

        try:
            payload = json.dumps(todos, indent=2, ensure_ascii=False).encode('utf-8')
            # upload with upsert=true replaces or creates the file
            self.client.storage.from_(self.bucket).upload(
                path=FILE_PATH_IN_BUCKET,
                file=payload,
                file_options={"content-type": "application/json", "upsert": "true"}
            )
            self.last_sync_time = datetime.datetime.now(datetime.timezone.utc).isoformat()
            self.last_error = None
            return True
        except Exception as e:
            self.last_error = str(e)
            print(f"[SupabaseService] Error saving to Supabase bucket: {e}")
            raise e

    def add_todo(self, data):
        todos = self.get_todos()
        now_str = datetime.datetime.now(datetime.timezone.utc).isoformat()
        
        new_todo = {
            "id": str(uuid.uuid4()),
            "title": data.get("title", "").strip(),
            "description": data.get("description", "").strip(),
            "completed": bool(data.get("completed", False)),
            "priority": data.get("priority", "Medium"),
            "category": data.get("category", "General"),
            "due_date": data.get("due_date", ""),
            "tags": data.get("tags", []),
            "created_at": now_str,
            "updated_at": now_str
        }
        
        # Add to beginning of list
        todos.insert(0, new_todo)
        self._save_to_bucket(todos)
        return new_todo

    def update_todo(self, todo_id, updates):
        todos = self.get_todos()
        found = False
        updated_item = None
        
        for item in todos:
            if item.get("id") == todo_id:
                for key, val in updates.items():
                    if key != "id" and key != "created_at":
                        item[key] = val
                item["updated_at"] = datetime.datetime.now(datetime.timezone.utc).isoformat()
                found = True
                updated_item = item
                break
                
        if not found:
            return None
            
        self._save_to_bucket(todos)
        return updated_item

    def delete_todo(self, todo_id):
        todos = self.get_todos()
        initial_len = len(todos)
        todos = [t for t in todos if t.get("id") != todo_id]
        
        if len(todos) == initial_len:
            return False
            
        self._save_to_bucket(todos)
        return True

    def bulk_clear_completed(self):
        todos = self.get_todos()
        active_todos = [t for t in todos if not t.get("completed")]
        removed_count = len(todos) - len(active_todos)
        self._save_to_bucket(active_todos)
        return removed_count

    def get_status(self):
        todos = self._load_from_cache()
        return {
            "status": "online",
            "supabase_connected": self.client is not None and self.last_error is None,
            "bucket": self.bucket,
            "project_url": self.url,
            "file": FILE_PATH_IN_BUCKET,
            "cached_items_count": len(todos),
            "last_sync": self.last_sync_time,
            "last_error": self.last_error
        }
