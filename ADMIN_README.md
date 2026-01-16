# Admin System Setup & Usage

## Overview
The admin system provides a complete trick management interface with a modern modal-based UI and Node.js API backend.

## Features
- ✅ **Add Tricks** - Create new tricks with detailed information
- ✅ **Edit Tricks** - Modify existing tricks
- ✅ **Delete Tricks** - Remove tricks from the database
- ✅ **Import** - Import tricks from JSON files
- ✅ **Export** - Export all tricks as JSON
- ✅ **Modern UI** - Beautiful modal interface with smooth animations
- ✅ **Real-time API** - Full CRUD operations with Node.js backend

## Setup

### 1. Start the Admin API Server
In a terminal, navigate to the project directory and run:

```bash
node admin-server.js
```

This will start the server on `http://localhost:3001`

You should see output like:
```
Admin API Server running on http://localhost:3001
Available endpoints:
  GET    /api/tricks
  GET    /api/tricks/:id
  POST   /api/tricks
  PUT    /api/tricks/:id
  DELETE /api/tricks/:id
  POST   /api/tricks/import
  GET    /api/tricks/export
```

### 2. Start the Web Server
In another terminal:

```bash
python -m http.server 8000
# or
npx http-server -p 8000
```

### 3. Login as Owner
- Open `http://localhost:8000` in your browser
- Click "Sign In"
- Login with owner credentials: `Zenon.beckson.miah@gmail.com` / `Fluffball7891523!`

### 4. Use Admin Controls
Once logged in as the owner, you'll see 5 colored buttons in the header:
- **+ Add Trick** (Blue) - Add a new trick
- **Edit Tricks** (Orange) - Modify existing tricks
- **Delete Tricks** (Red) - Remove tricks
- **Import** (Green) - Import from JSON file
- **Export** (Purple) - Download all tricks as JSON

## API Endpoints

### Get All Tricks
```
GET /api/tricks
Response: { success: true, tricks: [...] }
```

### Get Single Trick
```
GET /api/tricks/:id
Response: { success: true, trick: {...} }
```

### Create Trick
```
POST /api/tricks
Body: {
  name: "Kickflip",
  level: "Advanced",
  description: "...",
  tips: "...",
  score: 5.5
}
```

### Update Trick
```
PUT /api/tricks/:id
Body: { ...updated fields... }
```

### Delete Trick
```
DELETE /api/tricks/:id
```

### Import Tricks
```
POST /api/tricks/import
Body: {
  tricks: [
    { name: "...", level: "...", ... },
    ...
  ]
}
```

### Export Tricks
```
GET /api/tricks/export
Downloads: tricks-YYYY-MM-DD.json
```

## Trick Data Structure

```javascript
{
  id: 1,
  name: "Kickflip",
  level: "Advanced",  // Beginner, Novice, Intermediate, Advanced, Elite
  description: "A forward rotation with full body spin",
  tips: "Snap heel first, then flick...",
  score: 5.5,  // 0-10 difficulty rating
  orderIndex: 0  // Display order
}
```

## Troubleshooting

### "Error connecting to API"
- Make sure `node admin-server.js` is running on port 3001
- Check that there are no other processes using port 3001

### "Owner buttons not showing"
- Make sure you're logged in as `Zenon.beckson.miah@gmail.com`
- Hard refresh the page (Ctrl+Shift+R)
- Check browser console for errors

### "API returns 404"
- Make sure the `api/tricks` file exists in the project root
- Check file permissions

## File Locations

- **Admin Server:** `admin-server.js`
- **Tricks Data:** `api/tricks` (JSON file)
- **Auth Script:** `fake-auth-v2.js`
- **Configuration:** `owner-config.js`

## Notes

- The API stores tricks in the `api/tricks` file as JSON
- All changes are permanent and saved to disk
- Admin features are only available when logged in as owner
- The modal interface is responsive and works on mobile
- CORS is enabled for API requests
