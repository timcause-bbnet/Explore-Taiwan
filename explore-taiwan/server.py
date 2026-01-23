import http.server
import socketserver
import json
import os
import sys
import base64
import time
import csv
import io
import requests
from bs4 import BeautifulSoup

# Set port default to 8081, or use argument
PORT = 8081
if len(sys.argv) > 1:
    PORT = int(sys.argv[1])

DB_FILE = 'pms_data.json'
STATIC_ROOT = os.path.join('alishan-portal', 'static')
DATA_ROOT = os.path.join('alishan-portal', 'data')
UPLOAD_ROOT = os.path.join(STATIC_ROOT, 'uploads')

# Ensure directories
os.makedirs(DATA_ROOT, exist_ok=True)
os.makedirs(UPLOAD_ROOT, exist_ok=True)

class PMSHandler(http.server.SimpleHTTPRequestHandler):
    def save_base64_image(self, b64_string):
        if not b64_string:
            return None
        try:
            # Simple header check
            if ',' in b64_string:
                header, encoded = b64_string.split(',', 1)
            else:
                encoded = b64_string
                
            ext = 'jpg'
            if 'png' in b64_string[:20]: ext = 'png'
            
            file_name = f"{int(time.time())}_{os.urandom(2).hex()}.{ext}"
            file_path = os.path.join(UPLOAD_ROOT, file_name)
            
            with open(file_path, "wb") as fh:
                fh.write(base64.b64decode(encoded))
            
            return f"uploads/{file_name}"
        except Exception as e:
            print(f"Image Save Error: {e}")
            return None

    def scrape_metadata(self, url):
        try:
            headers = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'}
            resp = requests.get(url, headers=headers, timeout=5)
            if resp.status_code == 200:
                resp.encoding = 'utf-8' # Force utf-8
                soup = BeautifulSoup(resp.text, 'html.parser')
                
                title = soup.title.string if soup.title else ""
                desc = ""
                meta = soup.find('meta', attrs={'name': 'description'}) or soup.find('meta', attrs={'property': 'og:description'})
                if meta:
                    desc = meta.get('content', '')
                
                return {
                    "fetched_title": title.strip(),
                    "fetched_desc": desc.strip()
                }
        except Exception as e:
            print(f"Scrape Error for {url}: {e}")
        return None

    def handle_crud(self, endpoint, default_file):
        import urllib.parse
        # Parse query params
        query_str = self.path.split('?')[-1] if '?' in self.path else ''
        params = dict(qs.split('=') for qs in query_str.split('&') if '=' in qs)
        
        region = params.get('region')
        if region: region = urllib.parse.unquote(region)
        
        # Determine filename
        if region and region != 'undefined' and region != 'null': 
            # sanitize
            safe_region = "".join([c for c in region if c.isalnum() or c in ['_','-', '.'] if c.isascii() or c.isalnum()]) # Basic sanity
            filename = f"{endpoint}_{safe_region}.json"
        else:
            filename = default_file
            
        file_path = os.path.join(DATA_ROOT, filename)
        
        # READ
        if self.command == 'GET':
            self.send_response(200)
            self.send_header('Content-Type', 'application/json; charset=utf-8')
            # CACHE BUSTING headers
            self.send_header('Cache-Control', 'no-store, no-cache, must-revalidate')
            self.send_header('Pragma', 'no-cache')
            self.send_header('Expires', '0')
            self.end_headers()
            if os.path.exists(file_path):
                with open(file_path, 'rb') as f: self.wfile.write(f.read())
            else:
                self.wfile.write(b'[]')
            return

        # CREATE / UPDATE
        if self.command == 'POST' or self.command == 'PUT':
            try:
                length = int(self.headers['Content-Length'])
                post_data = self.rfile.read(length)
                body = json.loads(post_data)
                
                current_data = []
                if os.path.exists(file_path):
                    with open(file_path, 'r', encoding='utf-8') as f:
                        current_data = json.load(f)
                
                # Handle Images Upload if any
                uploaded = body.pop('uploaded_images', [])
                new_images = []
                if uploaded:
                    for b64 in uploaded:
                        url = self.save_base64_image(b64)
                        if url: new_images.append(url)
                
                # Merge new images
                if 'images' not in body: body['images'] = []
                body['images'].extend(new_images)
                # Fallback single image
                if not body.get('image') and body['images']:
                    body['image'] = body['images'][0]

                # Update Logic
                if self.command == 'POST': # Create
                    if not body.get('id'): body['id'] = str(int(time.time()))
                    current_data.append(body)
                
                elif self.command == 'PUT': # Update
                    target_id = body.get('id')
                    for i, item in enumerate(current_data):
                        if str(item.get('id')) == str(target_id):
                            # Merge fields
                            current_data[i].update(body)
                            break
                            
                with open(file_path, 'w', encoding='utf-8') as f:
                    json.dump(current_data, f, ensure_ascii=False, indent=2)
                    
                self.send_response(200)
                self.end_headers()
                self.wfile.write(json.dumps(body).encode())
            except Exception as e:
                self.send_error(500, str(e))
            return

        # DELETE
        if self.command == 'DELETE':
            try:
                # Extract ID from query
                del_id = params.get('id')
                
                if os.path.exists(file_path):
                    with open(file_path, 'r', encoding='utf-8') as f:
                        data = json.load(f)
                    
                    new_data = [x for x in data if str(x.get('id')) != str(del_id)]
                    
                    with open(file_path, 'w', encoding='utf-8') as f:
                        json.dump(new_data, f, ensure_ascii=False, indent=2)
                        
                self.send_response(200)
                self.end_headers()
            except Exception as e:
                self.send_error(500, str(e))
            return

    def do_GET(self):
        # API Routes for Alishan Portal
        if self.path.startswith('/api/operators'): self.handle_crud('operators', 'operators.json'); return
        if self.path.startswith('/api/attractions'): self.handle_crud('attractions', 'attractions.json'); return
        if self.path.startswith('/api/delicacies'): self.handle_crud('delicacies', 'delicacies.json'); return
        
        # Settings API
        if self.path.startswith('/api/settings'):
            p = os.path.join(DATA_ROOT, 'site_config.json')
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            if os.path.exists(p):
                with open(p, 'rb') as f: self.wfile.write(f.read())
            else: self.wfile.write(b'{}')
            return

        # Generic Data API (Super Admin) - Updated for Office Pulse
        if self.path.startswith('/api/data/'):
            filename = self.path.split('/')[-1]
            if not filename.endswith('.json') or '..' in filename:
                self.send_error(400)
                return
            
            # Allow saving to root if needed, but prefer 'data' dir. 
            # Office Pulse uses 'office-pulse-data.json' at root for simplicity with current AppState logic?
            # Let's keep it in 'data' dir for cleanliness.
            file_path = os.path.join('data', filename) 
            
            self.send_response(200)
            self.send_header('Content-Type', 'application/json; charset=utf-8')
            # Cache Busting
            self.send_header('Cache-Control', 'no-store, no-cache, must-revalidate')
            self.send_header('Pragma', 'no-cache')
            self.send_header('Expires', '0')
            self.end_headers()
            
            if os.path.exists(file_path):
                with open(file_path, 'rb') as f: self.wfile.write(f.read())
            else: 
                self.wfile.write(b'{}')
            return

        # Old PMS Route
        if self.path.startswith('/api/db'):
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            if os.path.exists(DB_FILE):
                with open(DB_FILE, 'rb') as f: self.wfile.write(f.read())
            else: self.wfile.write(b'{}')
            return

        # PMS / General Backend Route (Virtual Path to Root)
        if self.path == '/pms':
            self.send_response(301)
            self.send_header('Location', '/pms/')
            self.end_headers()
            return
            
        if self.path.startswith('/pms/'):
            clean_path = self.path[5:].split('?')[0] # Remove /pms/
            if not clean_path: clean_path = 'index.html'
            
            # Serve from CWD (Root)
            file_path = os.path.join(os.getcwd(), clean_path)
            
            if os.path.exists(file_path) and os.path.isfile(file_path):
                ext = os.path.splitext(file_path)[1]
                mime = {
                    '.html': 'text/html', '.css': 'text/css', '.js': 'application/javascript',
                    '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml'
                }.get(ext, 'application/octet-stream')
                try:
                    with open(file_path, 'rb') as f:
                        self.send_response(200)
                        self.send_header('Content-type', mime)
                        self.end_headers()
                        self.wfile.write(f.read())
                except Exception as e:
                    self.send_error(500, str(e))
            else:
                self.send_error(404)
            return

        # Static Files
        if self.path == '/': self.path = '/office-pulse/index.html' 
        
        try:
            clean_path = self.path.split('?')[0].lstrip('/')
            if '..' in clean_path:
                self.send_error(403); return

            # Priority 1: Check inside office-pulse directory (For js/app.js, css/style.css etc)
            file_path = os.path.join('office-pulse', clean_path)
            
            # Priority 2: Check Static Root (Old Project)
            if not os.path.exists(file_path):
                file_path = os.path.join(STATIC_ROOT, clean_path)
            
            # Priority 3: Check Root (For specific file paths like office-pulse/index.html)
            if not os.path.exists(file_path):
                 file_path = os.path.join(os.getcwd(), clean_path)

            if os.path.exists(file_path) and os.path.isfile(file_path):
                ext = os.path.splitext(file_path)[1]
                mime = {
                    '.html': 'text/html', '.css': 'text/css', '.js': 'application/javascript',
                    '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml'
                }.get(ext, 'application/octet-stream')
                with open(file_path, 'rb') as f:
                    self.send_response(200)
                    self.send_header('Content-type', mime)
                    self.end_headers()
                    self.wfile.write(f.read())
            else:
                self.send_error(404)
        except Exception as e:
            self.send_error(500, str(e))

    def do_POST(self):
        # IMPORTS via CSV
        if self.path.startswith('/api/import'):
            try:
                # Basic Multi-part parser or just assume raw body if simple? 
                # Actually browser upload is multipart/form-data. 
                # Implementing full multipart parser in scratch is hard. 
                # Let's assume the frontend sends JSON with CSV string or Raw Text if we want to be lazy.
                # BUT standard <input type="file"> sends multipart.
                # Let's Use a simpler method: Frontend reads file as Text, sends JSON { 'csv_content': ... }
                
                length = int(self.headers['Content-Length'])
                post_data = self.rfile.read(length)
                body = json.loads(post_data)
                
                csv_content = body.get('csv_content', '')
                target_type = body.get('type', 'operators')
                region = body.get('region') # target region

                # Decide File
                filename = f"{target_type}.json"
                if region and region != 'undefined' and region != 'null':
                     # sanitize
                    safe_region = "".join([c for c in region if c.isalnum() or c in ['_','-', '.'] if c.isascii() or c.isalnum()])
                    filename = f"{target_type}_{safe_region}.json"
                
                file_path = os.path.join(DATA_ROOT, filename)
                
                # Load Existing
                current_data = []
                if os.path.exists(file_path):
                    with open(file_path, 'r', encoding='utf-8') as f: current_data = json.load(f)

                # Parse CSV
                f = io.StringIO(csv_content)
                reader = csv.DictReader(f)
                
                added_count = 0
                for row in reader:
                    # Map CSV columns to Data Model
                    # Expected CSV Headers: name, category, location, address, tel, link, description
                    if not row.get('name'): continue
                    
                    new_item = {
                        "id": str(int(time.time() * 1000) + added_count),
                        "name": row.get('name'),
                        "category": row.get('category', '一般'),
                        "location": row.get('location', ''),
                        "address": row.get('address', ''),
                        "tel": row.get('tel', ''),
                        "link": row.get('link', ''),
                        "description": row.get('description', ''),
                        "tags": row.get('tags', '').split(',') if row.get('tags') else [],
                        "images": [],
                        "image": ""
                    }
                    
                    # Auto Scrape?
                    if new_item['link'] and (not new_item['description'] or len(new_item['description']) < 10):
                        print(f"Auto-scraping for {new_item['name']}...")
                        meta = self.scrape_metadata(new_item['link'])
                        if meta:
                            if meta['fetched_desc']: new_item['description'] = meta['fetched_desc']
                            # if not new_item['location'] and meta['fetched_title']: ...
                    
                    current_data.append(new_item)
                    added_count += 1
                
                with open(file_path, 'w', encoding='utf-8') as f:
                    json.dump(current_data, f, ensure_ascii=False, indent=2)
                
                self.send_response(200); self.end_headers()
                self.wfile.write(json.dumps({"status": "ok", "added": added_count}).encode())
                
            except Exception as e:
                print(e)
                self.send_error(500, str(e))
            return

        # CRUD Routes
        if self.path.startswith('/api/operators'): self.handle_crud('operators', 'operators.json'); return
        if self.path.startswith('/api/attractions'): self.handle_crud('attractions', 'attractions.json'); return
        if self.path.startswith('/api/delicacies'): self.handle_crud('delicacies', 'delicacies.json'); return
        
        # Settings POST
        if self.path.startswith('/api/settings'):
            try:
                length = int(self.headers['Content-Length'])
                body = json.loads(self.rfile.read(length))
                file_path = os.path.join(DATA_ROOT, 'site_config.json')
                
                # Handle Images
                uploaded = body.pop('uploaded_hero_images', [])
                if uploaded:
                    new_imgs = []
                    for b64 in uploaded:
                        url = self.save_base64_image(b64)
                        if url: new_imgs.append(url)
                    if 'hero_images' not in body: body['hero_images'] = []
                    body['hero_images'].extend(new_imgs)
                
                with open(file_path, 'w', encoding='utf-8') as f:
                    json.dump(body, f, indent=2)
                
                self.send_response(200); self.end_headers(); self.wfile.write(b'{"status":"ok"}')
            except Exception as e: self.send_error(500, str(e))
            return

        # Generic Data API (Super Admin)
        if self.path.startswith('/api/data/'):
            filename = self.path.split('/')[-1]
            if not filename.endswith('.json') or '..' in filename:
                self.send_error(400); return
            try:
                length = int(self.headers['Content-Length'])
                body = json.loads(self.rfile.read(length))
                # work/data/
                file_path = os.path.join('data', filename)
                os.makedirs('data', exist_ok=True)
                
                # --- NEW: Image Extraction for Portal Config ---
                
                # 1. Global Hero Images
                if 'uploaded_hero_images' in body:
                    new_imgs = []
                    for b64 in body.pop('uploaded_hero_images'):
                        url = self.save_base64_image(b64)
                        if url: new_imgs.append(url)
                    
                    if 'hero' not in body: body['hero'] = {}
                    if 'images' not in body['hero']: body['hero']['images'] = []
                    body['hero']['images'].extend(new_imgs)
                
                # 2. Region Images
                if 'regions' in body:
                    for region in body['regions']:
                        if 'uploaded_images' in region:
                            new_r_imgs = []
                            for b64 in region.pop('uploaded_images'):
                                url = self.save_base64_image(b64)
                                if url: new_r_imgs.append(url)
                            
                            if 'images' not in region: region['images'] = []
                            region['images'].extend(new_r_imgs)
                            if not region.get('image') and region['images']:
                                region['image'] = region['images'][0]
                # -----------------------------------------------

                with open(file_path, 'w', encoding='utf-8') as f:
                    json.dump(body, f, ensure_ascii=False, indent=2)

                self.send_response(200); self.end_headers(); self.wfile.write(b'{"status":"ok"}')
            except Exception as e: 
                print(e)
                self.send_error(500, str(e))
            return

        # PMS Data
        if self.path.startswith('/api/db'):
            try:
                length = int(self.headers['Content-Length'])
                with open(DB_FILE, 'wb') as f: f.write(self.rfile.read(length))
                self.send_response(200); self.end_headers(); self.wfile.write(b'{"status":"ok"}')
            except Exception as e: self.send_error(500, str(e))
            return
            
        self.send_error(404)

    def do_PUT(self):
        if self.path.startswith('/api/operators'): self.handle_crud('operators', 'operators.json'); return
        if self.path.startswith('/api/attractions'): self.handle_crud('attractions', 'attractions.json'); return
        if self.path.startswith('/api/delicacies'): self.handle_crud('delicacies', 'delicacies.json'); return
        self.send_error(404)

    def do_DELETE(self):
        if self.path.startswith('/api/operators'): self.handle_crud('operators', 'operators.json'); return
        if self.path.startswith('/api/attractions'): self.handle_crud('attractions', 'attractions.json'); return
        if self.path.startswith('/api/delicacies'): self.handle_crud('delicacies', 'delicacies.json'); return
        self.send_error(404)

print("-" * 40)
print(f"Server Running on port {PORT}")
print(f"Data Dir: {DATA_ROOT}")
print(f"Static Dir: {STATIC_ROOT}")
print(f"Local: http://localhost:{PORT}")
try:
    hostname = socket.gethostname()
    local_ip = socket.gethostbyname(hostname)
    print(f"Network: http://{local_ip}:{PORT}")
except: pass
print("-" * 40)

with socketserver.TCPServer(("", PORT), PMSHandler) as httpd:
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        pass
