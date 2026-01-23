import json
import os

file_path = r'c:\Users\bbnet-brian\work\data\office-pulse-data.json'

if not os.path.exists(file_path):
    print(f"File not found: {file_path}")
else:
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            data = json.load(f)
        
        users = data.get('users', [])
        brian = next((u for u in users if u.get('username', '').lower() == 'brian'), None)
        
        if brian:
            print("User found: Brian")
            print(f"ID: {brian.get('id')}")
            print(f"Password: '{brian.get('password')}'")
            print(f"Name: {brian.get('name')}")
            print(f"Permissions: {brian.get('permissions')}")
        else:
            print("User 'Brian' not found in JSON.")
            
        # List all users for context
        print("\nAll users:")
        for u in users:
            print(f"- {u.get('username')} (id: {u.get('id')}, pwd: '{u.get('password')}')")
            
    except Exception as e:
        print(f"Error reading JSON: {e}")
