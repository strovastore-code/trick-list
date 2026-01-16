# Quick Reference Card

## 🚀 Getting Started

### Step 1: Start Admin Server
```bash
cd "c:\Users\Zenon\Downloads\Trick List - Replit"
node admin-server.js
```
✅ You'll see: "Admin API Server running on http://localhost:3001"

### Step 2: Start Web Server
```bash
# Terminal 2
python -m http.server 8000
```
✅ You'll see: "Serving HTTP on 0.0.0.0 port 8000"

### Step 3: Open Browser
```
http://localhost:8000
```

### Step 4: Login as Owner
```
Email:    Zenon.beckson.miah@gmail.com
Password: Fluffball7891523!
```

### Step 5: Use Admin Controls
Click the colored buttons in the header!

---

## 📚 Admin Features

| Feature | Button Color | What It Does |
|---------|--------------|-------------|
| Add Trick | Blue | Create new trick with form |
| Edit Tricks | Orange | Modify existing tricks |
| Delete Tricks | Red | Remove tricks from database |
| Import | Green | Upload tricks from JSON file |
| Export | Purple | Download all tricks as JSON |

---

## 🔌 API Endpoints

```bash
# Get all tricks
GET http://localhost:3001/api/tricks

# Get one trick
GET http://localhost:3001/api/tricks/5

# Create trick
POST http://localhost:3001/api/tricks
{
  "name": "Kickflip",
  "level": "Advanced",
  "description": "...",
  "tips": "...",
  "score": 5.5
}

# Update trick
PUT http://localhost:3001/api/tricks/5
{ "name": "New Name", ... }

# Delete trick
DELETE http://localhost:3001/api/tricks/5

# Import tricks
POST http://localhost:3001/api/tricks/import
{ "tricks": [...] }

# Export tricks
GET http://localhost:3001/api/tricks/export
```

---

## 📁 Files Created/Modified

| File | Purpose |
|------|---------|
| `admin-server.js` | REST API server (Node.js) |
| `fake-auth-v2.js` | Updated with modal UI |
| `start-admin.bat` | Windows quick start |
| `start-admin.sh` | Linux/Mac quick start |
| `ADMIN_README.md` | Full documentation |
| `ADMIN_FEATURES.md` | Feature overview |
| `ADMIN_UI_PREVIEW.md` | UI mockups & design |

---

## 🐛 Troubleshooting

### Problem: "Error connecting to API"
**Solution:** Make sure `node admin-server.js` is running

### Problem: "Owner buttons don't show"
**Solution:** 
1. Hard refresh (Ctrl+Shift+R)
2. Check you're logged in as Zenon.beckson.miah@gmail.com
3. Check browser console (F12) for errors

### Problem: Port already in use
```bash
# Find process using port 3001
netstat -ano | findstr :3001

# Kill process (Windows)
taskkill /PID 1234 /F
```

### Problem: "Cannot find tricks file"
**Solution:** Make sure `api/tricks` file exists in project root

---

## 💡 Tips & Tricks

1. **Batch Import** - Export tricks as JSON, edit in Excel/VS Code, import back

2. **Backup Tricks** - Use Export regularly to backup your trick database

3. **Search Missing Endpoints** - Tricks are stored in `/api/tricks` file (JSON)

4. **CORS Issues** - API has CORS enabled, works with any frontend

5. **Production** - Replace `http://localhost:3001` with production API URL

---

## 📋 Trick Data Format

When importing, use this format:

```json
[
  {
    "name": "Kickflip",
    "level": "Advanced",
    "description": "A forward rotation with full body spin",
    "tips": "Snap heel first, then flick",
    "score": 5.5
  },
  {
    "name": "Ollie",
    "level": "Beginner",
    "description": "Basic hop",
    "tips": "Pop the tail",
    "score": 1.0
  }
]
```

**Levels:** Beginner, Novice, Intermediate, Advanced, Elite

---

## 🎯 Common Tasks

### Add a new trick
1. Click **+ Add Trick**
2. Fill in the form
3. Click **Add Trick** button

### Edit a trick
1. Click **Edit Tricks**
2. Click the trick you want to edit
3. Change fields
4. Click **Save Changes**

### Delete a trick
1. Click **Delete Tricks**
2. Click **Delete** on the trick
3. Confirm when prompted

### Backup all tricks
1. Click **Export**
2. File downloads automatically
3. Save somewhere safe!

### Restore tricks
1. Click **Import**
2. Select your JSON file
3. Click Open
4. Tricks are imported!

---

## 🔒 Security Notes

- Owner email/password set in `owner-config.js`
- Only owner can access admin features
- API has CORS enabled (can change if needed)
- All changes saved to `api/tricks` file
- Consider securing API in production (auth tokens, etc.)

---

## 📞 Need Help?

1. Check `ADMIN_README.md` for detailed docs
2. Check browser console (F12) for errors
3. Make sure both servers are running
4. Restart both servers if issues occur
5. Check file permissions on `api/tricks`

---

**Last Updated:** January 15, 2026
**Version:** 1.0
