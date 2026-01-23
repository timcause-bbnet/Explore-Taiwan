import http.server
import socketserver
import json
import os
import sys
import mimetypes

# Configuration
PORT = 8080
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(BASE_DIR, 'data')
STATIC_DIR = os.path.join(BASE_DIR, 'static')
DB_FILE = os.path.join(DATA_DIR, 'operators.json')
ATTRACTIONS_FILE = os.path.join(DATA_DIR, 'attractions.json')
DELICACIES_FILE = os.path.join(DATA_DIR, 'delicacies.json')

# Ensure data directory exists
os.makedirs(DATA_DIR, exist_ok=True)

class PortalHandler(http.server.SimpleHTTPRequestHandler):
    def get_db_file(self, path):
        if path.startswith('/api/operators'): return DB_FILE
        if path.startswith('/api/attractions'): return ATTRACTIONS_FILE
        if path.startswith('/api/delicacies'): return DELICACIES_FILE
        return None

    def do_GET(self):
        # API Routes
        db_file = self.get_db_file(self.path)
        if db_file:
            self.send_response(200)
            self.send_header('Content-Type', 'application/json; charset=utf-8')
            self.end_headers()
            if os.path.exists(db_file):
                try:
                    with open(db_file, 'rb') as f:
                        self.wfile.write(f.read())
                except Exception:
                    self.wfile.write(b'[]')
            else:
                self.wfile.write(b'[]')
            return

        # Route: /api/settings
        if self.path == '/api/settings':
            self.send_response(200)
            self.send_header('Content-Type', 'application/json; charset=utf-8')
            self.end_headers()
            CONFIG_FILE = os.path.join(DATA_DIR, 'site_config.json')
            if os.path.exists(CONFIG_FILE):
                try:
                    with open(CONFIG_FILE, 'rb') as f:
                        self.wfile.write(f.read())
                except Exception:
                    self.wfile.write(b'{}')
            else:
                self.wfile.write(b'{}')
            return

        # Route: /api/data/portal_config.json
        if self.path == '/api/data/portal_config.json':
            self.send_response(200)
            self.send_header('Content-Type', 'application/json; charset=utf-8')
            self.end_headers()
            CONFIG_FILE = os.path.join(DATA_DIR, 'portal_config.json')
            if os.path.exists(CONFIG_FILE):
                try:
                    with open(CONFIG_FILE, 'rb') as f:
                        self.wfile.write(f.read())
                except Exception:
                    self.wfile.write(b'{}')
            else:
                self.wfile.write(b'{}')
            return

        # Serve static files
        # Default to index.html if path is root
        if self.path == '/':
            self.path = '/index.html'
        
        # Security: Prevent serving files outside static directory
        # We manually construct the path to ensure we only serve from static
        try:
            # Remove leading slash and query strings
            clean_path = self.path.lstrip('/').split('?')[0]
            if not clean_path:
                clean_path = 'index.html'
            
            file_path = os.path.join(STATIC_DIR, clean_path)
            
            # Check if file exists and is within STATIC_DIR
            if os.path.exists(file_path) and os.path.isfile(file_path):
                self.send_response(200)
                # Guess mime type
                mime_type, _ = mimetypes.guess_type(file_path)
                if mime_type:
                    self.send_header('Content-Type', mime_type)
                else:
                    self.send_header('Content-Type', 'application/octet-stream')
                self.end_headers()
                
                with open(file_path, 'rb') as f:
                    self.wfile.write(f.read())
                return
            else:
                self.send_error(404, "File not found")
                return
                
        except Exception as e:
            print(f"Error serving file: {e}")
            self.send_error(500)

    def save_images(self, uploaded_images):
        import base64
        import time
        import random
        
        saved_paths = []
        for img_obj in uploaded_images:
            try:
                # img_obj format: {'name': 'filename.jpg', 'data': 'data:image/jpeg;base64,...'}
                data_url = img_obj.get('data', '')
                if not data_url.startswith('data:image'):
                    continue
                
                header, encoded = data_url.split(',', 1)
                file_ext = header.split(';')[0].split('/')[1]
                if file_ext == 'jpeg': file_ext = 'jpg'
                
                # Create unique filename
                filename = f"{int(time.time())}_{random.randint(1000,9999)}.{file_ext}"
                save_path = os.path.join(STATIC_DIR, 'uploads', filename)
                
                # Decode and save
                with open(save_path, 'wb') as f:
                    f.write(base64.b64decode(encoded))
                
                # Store relative web path
                saved_paths.append(f"uploads/{filename}")
            except Exception as e:
                print(f"Error saving image: {e}")
        return saved_paths

    def do_POST(self):
        # Generic Create for Operators, Attractions, Delicacies
        db_file = self.get_db_file(self.path)
        if db_file:
            try:
                content_length = int(self.headers['Content-Length'])
                post_data = self.rfile.read(content_length)
                new_item = json.loads(post_data)
                
                # Basic Validation
                if 'name' not in new_item:
                    raise ValueError("Name is required")

                # Handle Image Uploads
                final_images = new_item.get('images', [])
                if 'uploaded_images' in new_item:
                    saved_new = self.save_images(new_item['uploaded_images'])
                    final_images.extend(saved_new)
                    del new_item['uploaded_images'] # clean up
                new_item['images'] = final_images

                # Read existing
                items = []
                if os.path.exists(db_file):
                    with open(db_file, 'r', encoding='utf-8') as f:
                        try:
                            items = json.load(f)
                        except:
                            items = []
                
                # Add ID if not present
                import time
                if 'id' not in new_item or not new_item['id']:
                    new_item['id'] = str(int(time.time() * 1000))

                # Append
                items.append(new_item)

                # Save
                with open(db_file, 'w', encoding='utf-8') as f:
                    json.dump(items, f, ensure_ascii=False, indent=2)

                self.send_response(200)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(b'{"status": "success", "message": "Item added"}')
                return
            except Exception as e:
                print(f"Error saving data: {e}")
                self.send_error(500, str(e))
                return

        # Route: /api/settings -> Update site settings
        if self.path == '/api/settings':
             try:
                content_length = int(self.headers['Content-Length'])
                post_data = self.rfile.read(content_length)
                new_settings = json.loads(post_data)
                
                CONFIG_FILE = os.path.join(DATA_DIR, 'site_config.json')

                # Handle Image Uploads
                final_images = new_settings.get('hero_images', [])
                if 'uploaded_hero_images' in new_settings:
                    saved_new = self.save_images(new_settings['uploaded_hero_images'])
                    final_images.extend(saved_new)
                    del new_settings['uploaded_hero_images'] # clean up
                
                new_settings['hero_images'] = final_images

                with open(CONFIG_FILE, 'w', encoding='utf-8') as f:
                    json.dump(new_settings, f, ensure_ascii=False, indent=2)

                self.send_response(200)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(b'{"status": "success", "message": "Settings updated"}')
             except Exception as e:
                self.send_error(500, str(e))
        else:
            self.send_error(404)

    def do_PUT(self):
        # Generic Update for Operators, Attractions, Delicacies
        db_file = self.get_db_file(self.path)
        if db_file:
            try:
                content_length = int(self.headers['Content-Length'])
                post_data = self.rfile.read(content_length)
                updated_item = json.loads(post_data)
                
                if 'id' not in updated_item:
                    self.send_error(400, "ID is required for update")
                    return

                # Handle Image Uploads
                final_images = updated_item.get('images', [])
                if 'uploaded_images' in updated_item:
                    saved_new = self.save_images(updated_item['uploaded_images'])
                    final_images.extend(saved_new)
                    del updated_item['uploaded_images']
                updated_item['images'] = final_images

                # Read existing
                items = []
                if os.path.exists(db_file):
                    with open(db_file, 'r', encoding='utf-8') as f:
                        items = json.load(f)

                # Update
                found = False
                for i, item in enumerate(items):
                    if item['id'] == updated_item['id']:
                        items[i] = updated_item
                        found = True
                        break
                
                if not found:
                    self.send_error(404, "Item not found")
                    return

                # Save
                with open(db_file, 'w', encoding='utf-8') as f:
                    json.dump(items, f, ensure_ascii=False, indent=2)

                self.send_response(200)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(b'{"status": "success", "message": "Item updated"}')
                return
            except Exception as e:
                self.send_error(500, str(e))
                return

        # Route: /api/settings -> Update site settings
        if self.path == '/api/settings':
            try:
                content_length = int(self.headers['Content-Length'])
                post_data = self.rfile.read(content_length)
                new_settings = json.loads(post_data)
                
                CONFIG_FILE = os.path.join(DATA_DIR, 'site_config.json')

                # Handle Image Uploads
                final_images = new_settings.get('hero_images', [])
                if 'uploaded_hero_images' in new_settings:
                    saved_new = self.save_images(new_settings['uploaded_hero_images'])
                    final_images.extend(saved_new)
                    del new_settings['uploaded_hero_images'] # clean up
                
                new_settings['hero_images'] = final_images

                with open(CONFIG_FILE, 'w', encoding='utf-8') as f:
                    json.dump(new_settings, f, ensure_ascii=False, indent=2)

                self.send_response(200)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(b'{"status": "success", "message": "Settings updated"}')
            except Exception as e:
                self.send_error(500, str(e))
        else:
            self.send_error(404)



    def do_DELETE(self):
        # Generic Delete for Operators, Attractions, Delicacies
        # path will look like /api/operators?id=123
        base_path = self.path.split('?')[0]
        db_file = self.get_db_file(base_path)
        
        if db_file:
            try:
                # Simple parsing of ID from query string
                query = self.path.split('?')
                if len(query) < 2:
                    self.send_error(400, "Missing ID")
                    return
                
                # Handling multiple params? Just splitting by & for now
                params = {}
                for qc in query[1].split('&'):
                    if '=' in qc:
                        k, v = qc.split('=')
                        params[k] = v
                
                op_id = params.get('id')

                if not op_id:
                    self.send_error(400, "Missing ID")
                    return

                # Read existing
                items = []
                if os.path.exists(db_file):
                    with open(db_file, 'r', encoding='utf-8') as f:
                        items = json.load(f)

                # Filter out the deleted one
                new_items = [item for item in items if item['id'] != op_id]

                # Save
                with open(db_file, 'w', encoding='utf-8') as f:
                    json.dump(new_items, f, ensure_ascii=False, indent=2)

                self.send_response(200)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(b'{"status": "success", "message": "Item deleted"}')
                return
            except Exception as e:
                self.send_error(500, str(e))
                return

        self.send_error(404)

print("-" * 40)
print(f"Alishan Portal Server Running on port {PORT}")
print(f"Go to: http://localhost:{PORT}")
print("-" * 40)

# Change working directory so SimpleHTTPRequestHandler finds files relative to here if needed
# But we are handling paths manually in do_GET so this is less critical, 
# but good for safety.
os.chdir(BASE_DIR)

with socketserver.TCPServer(("", PORT), PortalHandler) as httpd:
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        pass
