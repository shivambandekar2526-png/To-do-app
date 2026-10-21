import os
from flask import Flask, request, jsonify
from flask_cors import CORS
from prometheus_flask_exporter import PrometheusMetrics
from supabase_service import SupabaseTodoService

app = Flask(__name__)
# Enable CORS for all routes (allows requests from frontend server)
CORS(app, resources={r"/api/*": {"origins": "*"}})

# Prometheus metrics instrumentation
metrics = PrometheusMetrics(app)
metrics.info('app_info', 'Application info', version='1.0.0')

service = SupabaseTodoService()

@app.route('/api/status', methods=['GET'])
def get_status():
    """Health check and Supabase connectivity status."""
    return jsonify(service.get_status())

@app.route('/api/todos', methods=['GET'])
def get_todos():
    """Fetch all todos, with optional filtering."""
    try:
        force = request.args.get('force', 'false').lower() == 'true'
        todos = service.get_todos(force_refresh=force)
        
        # Filtering options
        category = request.args.get('category')
        priority = request.args.get('priority')
        completed = request.args.get('completed')
        search = request.args.get('search')
        
        filtered = todos
        if category and category != 'All':
            filtered = [t for t in filtered if t.get('category') == category]
            
        if priority and priority != 'All':
            filtered = [t for t in filtered if t.get('priority') == priority]
            
        if completed is not None:
            is_comp = completed.lower() == 'true'
            filtered = [t for t in filtered if t.get('completed') == is_comp]
            
        if search:
            s = search.lower()
            filtered = [
                t for t in filtered 
                if s in t.get('title', '').lower() 
                or s in t.get('description', '').lower()
                or any(s in tag.lower() for tag in t.get('tags', []))
            ]
            
        return jsonify({
            "success": True,
            "count": len(filtered),
            "total": len(todos),
            "data": filtered,
            "last_sync": service.last_sync_time
        })
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

@app.route('/api/todos', methods=['POST'])
def add_todo():
    """Create a new todo item and persist to Supabase bucket."""
    try:
        data = request.get_json(force=True, silent=True) or {}
        title = data.get('title', '').strip()
        if not title:
            return jsonify({"success": False, "error": "Title is required"}), 400
            
        new_item = service.add_todo(data)
        return jsonify({"success": True, "data": new_item}), 201
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

@app.route('/api/todos/<todo_id>', methods=['PUT'])
def update_todo(todo_id):
    """Update a todo item and persist change to Supabase bucket."""
    try:
        data = request.get_json(force=True, silent=True) or {}
        updated_item = service.update_todo(todo_id, data)
        if not updated_item:
            return jsonify({"success": False, "error": "Todo not found"}), 404
        return jsonify({"success": True, "data": updated_item})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

@app.route('/api/todos/<todo_id>', methods=['DELETE'])
def delete_todo(todo_id):
    """Delete a todo item and persist change to Supabase bucket."""
    try:
        success = service.delete_todo(todo_id)
        if not success:
            return jsonify({"success": False, "error": "Todo not found"}), 404
        return jsonify({"success": True, "message": "Deleted successfully"})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

@app.route('/api/todos/bulk-clear', methods=['POST'])
def clear_completed():
    """Delete all completed todos."""
    try:
        cleared_count = service.bulk_clear_completed()
        return jsonify({"success": True, "cleared_count": cleared_count})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

@app.route('/api/sync', methods=['POST'])
def sync():
    """Force fresh pull from Supabase bucket."""
    try:
        todos = service.get_todos(force_refresh=True)
        return jsonify({
            "success": True,
            "message": "Synced successfully from Supabase",
            "count": len(todos),
            "last_sync": service.last_sync_time
        })
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

if __name__ == '__main__':
    port = int(os.getenv('PORT', 5000))
    print(f"Starting Flask backend server on http://localhost:{port}")
    app.run(host='0.0.0.0', port=port, debug=False)
