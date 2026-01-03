import json
import os

file_path = r'c:\Users\bbnet-brian\work\data\office-pulse-data.json'

try:
    with open(file_path, 'r', encoding='utf-8') as f:
        data = json.load(f)
    
    users = data.get('users', [])
    updated = False
    for u in users:
        if u.get('username', '').lower() == 'brian':
            print(f"Updating password for {u['username']} (was '{u.get('password')}')")
            u['password'] = '123'
            updated = True
            break
            
    if updated:
        with open(file_path, 'w', encoding='utf-8') as f:
            json.dump(data, f, indent=2, ensure_ascii=False)
        print("Successfully updated Brian's password to '123'")
    else:
        print("User Brian not found")

except Exception as e:
    print(f"Error: {e}")
