#!/usr/bin/env node
/**
 * Combined Server - Web App + Admin API
 * Serves both the website AND admin API on port 8000
 * One command to rule them all!
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

const PORT = 8000;
const TRICKS_FILE = path.join(__dirname, 'api', 'tricks');

// ============================================
// FILE SERVER FUNCTIONS
// ============================================

function serveFile(req, res, pathname) {
  // Default to index.html
  if (pathname === '/') {
    pathname = '/index.html';
  }

  // Get file path
  const filePath = path.join(__dirname, pathname);

  // Security: prevent directory traversal
  const realPath = path.resolve(filePath);
  const baseDir = path.resolve(__dirname);
  if (!realPath.startsWith(baseDir)) {
    res.writeHead(403, { 'Content-Type': 'text/plain' });
    res.end('Forbidden');
    return false;
  }

  // Read and serve file
  fs.readFile(filePath, (err, data) => {
    if (err) {
      // Try index.html for directories
      const indexPath = path.join(filePath, 'index.html');
      fs.readFile(indexPath, (err2, data2) => {
        if (err2) {
          res.writeHead(404, { 'Content-Type': 'text/plain' });
          res.end('404 Not Found');
          return;
        }
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(data2);
      });
      return;
    }

    // Determine content type
    let contentType = 'text/html';
    if (filePath.endsWith('.js')) contentType = 'application/javascript';
    else if (filePath.endsWith('.css')) contentType = 'text/css';
    else if (filePath.endsWith('.json')) contentType = 'application/json';
    else if (filePath.endsWith('.png')) contentType = 'image/png';
    else if (filePath.endsWith('.jpg') || filePath.endsWith('.jpeg')) contentType = 'image/jpeg';
    else if (filePath.endsWith('.gif')) contentType = 'image/gif';
    else if (filePath.endsWith('.svg')) contentType = 'image/svg+xml';
    else if (filePath.endsWith('.woff')) contentType = 'font/woff';
    else if (filePath.endsWith('.woff2')) contentType = 'font/woff2';
    else if (filePath.endsWith('.ttf')) contentType = 'font/ttf';

    // Send file
    res.writeHead(200, { 'Content-Type': contentType });
    res.end(data);
  });

  return true;
}

// ============================================
// ADMIN API FUNCTIONS
// ============================================

function readTricks() {
  try {
    const data = fs.readFileSync(TRICKS_FILE, 'utf8');
    return JSON.parse(data);
  } catch (err) {
    return [];
  }
}

function writeTricks(tricks) {
  try {
    fs.writeFileSync(TRICKS_FILE, JSON.stringify(tricks, null, 2), 'utf8');
    return true;
  } catch (err) {
    return false;
  }
}

function parseBody(req, callback) {
  let body = '';
  req.on('data', chunk => {
    body += chunk.toString();
  });
  req.on('end', () => {
    try {
      callback(null, body ? JSON.parse(body) : {});
    } catch (err) {
      callback(err);
    }
  });
}

function sendJSON(res, status, data) {
  res.writeHead(status, { 
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*'
  });
  res.end(JSON.stringify(data));
}

function sendError(res, status, message) {
  sendJSON(res, status, { error: message });
}

// ============================================
// MAIN SERVER
// ============================================

const server = http.createServer((req, res) => {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  const parsedUrl = url.parse(req.url, true);
  const pathname = parsedUrl.pathname;

  // ============================================
  // ADMIN API ROUTES
  // ============================================

  // GET /api/tricks - Get all tricks
  if (req.method === 'GET' && pathname === '/api/tricks') {
    const tricks = readTricks();
    // Sort by level order: Beginner -> Novice -> Intermediate -> Advanced -> Elite
    const levelOrder = { 'Beginner': 1, 'Novice': 2, 'Intermediate': 3, 'Advanced': 4, 'Elite': 5 };
    tricks.sort((a, b) => {
      const levelDiff = (levelOrder[a.level] || 999) - (levelOrder[b.level] || 999);
      if (levelDiff !== 0) return levelDiff;
      return (a.orderIndex || 0) - (b.orderIndex || 0);
    });
    sendJSON(res, 200, { success: true, tricks });
    return;
  }

  // GET /api/tricks/:id - Get single trick
  if (req.method === 'GET' && pathname.startsWith('/api/tricks/') && pathname !== '/api/tricks/import' && pathname !== '/api/tricks/export') {
    const id = parseInt(pathname.split('/')[3]);
    const tricks = readTricks();
    const trick = tricks.find(t => t.id === id);
    if (trick) {
      sendJSON(res, 200, { success: true, trick });
    } else {
      sendError(res, 404, 'Trick not found');
    }
    return;
  }

  // POST /api/tricks - Create new trick
  if (req.method === 'POST' && pathname === '/api/tricks') {
    parseBody(req, (err, data) => {
      if (err) {
        sendError(res, 400, 'Invalid JSON');
        return;
      }

      const tricks = readTricks();
      const newId = Math.max(...tricks.map(t => t.id), 0) + 1;

      const newTrick = {
        id: newId,
        name: data.name || 'Unnamed Trick',
        level: data.level || 'Beginner',
        description: data.description || '',
        tips: data.tips || '',
        orderIndex: data.orderIndex || tricks.length,
        score: data.score || 0
      };

      tricks.push(newTrick);
      if (writeTricks(tricks)) {
        sendJSON(res, 201, { success: true, trick: newTrick });
      } else {
        sendError(res, 500, 'Failed to save trick');
      }
    });
    return;
  }

  // PUT /api/tricks/:id - Update trick
  if (req.method === 'PUT' && pathname.startsWith('/api/tricks/')) {
    const id = parseInt(pathname.split('/')[3]);
    parseBody(req, (err, data) => {
      if (err) {
        sendError(res, 400, 'Invalid JSON');
        return;
      }

      let tricks = readTricks();
      const index = tricks.findIndex(t => t.id === id);

      if (index === -1) {
        sendError(res, 404, 'Trick not found');
        return;
      }

      tricks[index] = {
        ...tricks[index],
        name: data.name !== undefined ? data.name : tricks[index].name,
        level: data.level !== undefined ? data.level : tricks[index].level,
        description: data.description !== undefined ? data.description : tricks[index].description,
        tips: data.tips !== undefined ? data.tips : tricks[index].tips,
        score: data.score !== undefined ? data.score : tricks[index].score,
        orderIndex: data.orderIndex !== undefined ? data.orderIndex : tricks[index].orderIndex
      };

      if (writeTricks(tricks)) {
        sendJSON(res, 200, { success: true, trick: tricks[index] });
      } else {
        sendError(res, 500, 'Failed to update trick');
      }
    });
    return;
  }

  // DELETE /api/tricks/:id - Delete trick
  if (req.method === 'DELETE' && pathname.startsWith('/api/tricks/')) {
    const id = parseInt(pathname.split('/')[3]);
    let tricks = readTricks();
    const index = tricks.findIndex(t => t.id === id);

    if (index === -1) {
      sendError(res, 404, 'Trick not found');
      return;
    }

    const deleted = tricks.splice(index, 1)[0];
    if (writeTricks(tricks)) {
      sendJSON(res, 200, { success: true, deleted });
    } else {
      sendError(res, 500, 'Failed to delete trick');
    }
    return;
  }

  // POST /api/tricks/import - Import tricks from JSON
  if (req.method === 'POST' && pathname === '/api/tricks/import') {
    parseBody(req, (err, data) => {
      if (err) {
        sendError(res, 400, 'Invalid JSON');
        return;
      }

      if (!Array.isArray(data.tricks)) {
        sendError(res, 400, 'Expected tricks to be an array');
        return;
      }

      let tricks = readTricks();
      const imported = [];

      data.tricks.forEach(newTrick => {
        const trickData = {
          id: newTrick.id || Math.max(...tricks.map(t => t.id), 0) + 1,
          name: newTrick.name || 'Unnamed',
          level: newTrick.level || 'Beginner',
          description: newTrick.description || '',
          tips: newTrick.tips || '',
          orderIndex: newTrick.orderIndex || tricks.length,
          score: newTrick.score || 0
        };

        const exists = tricks.find(t => t.id === trickData.id);
        if (!exists) {
          tricks.push(trickData);
          imported.push(trickData);
        }
      });

      if (writeTricks(tricks)) {
        sendJSON(res, 200, { success: true, imported: imported.length, tricks: imported });
      } else {
        sendError(res, 500, 'Failed to import tricks');
      }
    });
    return;
  }

  // GET /api/tricks/export - Export tricks as JSON
  if (req.method === 'GET' && pathname === '/api/tricks/export') {
    const tricks = readTricks();
    res.writeHead(200, {
      'Content-Type': 'application/json',
      'Content-Disposition': `attachment; filename="tricks-${new Date().toISOString().split('T')[0]}.json"`
    });
    res.end(JSON.stringify(tricks, null, 2));
    return;
  }

  // POST /api/trick-ai - AI chat (simple mock response for now)
  if (req.method === 'POST' && pathname === '/api/trick-ai') {
    parseBody(req, body => {
      const { message, history } = body;
      
      // Simple AI-like responses based on keywords
      let response = '';
      const msgLower = message.toLowerCase();
      
      if (msgLower.includes('360') && msgLower.includes('after')) {
        response = "After mastering a 360, great next steps include:\\n\\n1. **540** - Add another half rotation\\n2. **360 with grab** - Add style (safety, mute, or seat grab)\\n3. **Back flip** - Start working on rotation skills\\n4. **Front flip** - Different rotation axis\\n\\nI'd recommend starting with grab variations to build control, then progress to 540 or start flips!";
      } else if (msgLower.includes('back flip') || msgLower.includes('backflip')) {
        response = "Back flip tips:\\n\\n**Progression:**\\n1. Start with back drops to build confidence\\n2. Practice setting (jumping straight up, arms up)\\n3. Look for your feet at the peak\\n4. Spot your landing\\n\\n**Safety:**\\n- Always have a spotter first time\\n- Don't throw your head back\\n- Jump UP first, rotate second\\n- Land with knees slightly bent\\n\\nWant details on any of these steps?";
      } else if (msgLower.includes('front flip') || msgLower.includes('frontflip')) {
        response = "Front flip progression:\\n\\n**Steps:**\\n1. Master front drops first\\n2. Practice the tuck position on ground\\n3. Jump and pull knees to chest\\n4. Look for the mat to spot landing\\n\\n**Common mistakes:**\\n- Jumping forward instead of up\\n- Not tucking tight enough\\n- Opening too early\\n\\nPractice the motion into the pit or with mats first!";
      } else if (msgLower.includes('safety') || msgLower.includes('safe')) {
        response = "**Trampoline Safety Essentials:**\\n\\n✓ Always warm up (5-10 min)\\n✓ One person at a time\\n✓ Clear the area of objects\\n✓ Use pads on springs\\n✓ Learn progressions (don't skip steps)\\n✓ Practice new tricks into pit/foam first\\n✓ Have a spotter for flips\\n\\nWhat specific trick are you working on?";
      } else if (msgLower.includes('grab')) {
        response = "**Grab variations:**\\n\\n- **Safety**: Grab behind knees (easiest)\\n- **Mute**: Grab opposite foot\\n- **Seat/Tail**: Grab behind you\\n- **Nose**: Grab in front\\n\\nStart with safety grabs during seat drops, then add to spins. Grabs add style and control!";
      } else if (msgLower.match(/180|270|540|720|900/)) {
        const degrees = msgLower.match(/\\d+/)[0];
        response = `**${degrees} tips:**\\n\\nProgression from 360:\\n- Practice the spin in parts\\n- Use your arms to generate rotation\\n- Spot your landing earlier\\n- Keep your core tight\\n\\nThe key is commitment and consistent practice. Start on lower bounces and work up!`;
      } else {
        response = "I can help with:\\n\\n- Specific tricks (back flip, 360, etc.)\\n- Progressions (what to learn next)\\n- Safety tips\\n- Grab variations\\n- Flip techniques\\n\\nWhat would you like to know more about?";
      }

      // Stream the response
      res.writeHead(200, {
        'Content-Type': 'text/plain',
        'Access-Control-Allow-Origin': '*'
      });
      res.write(`data: ${JSON.stringify({ content: response })}\n\n`);
      res.end();
    });
    return;
  }

  // ============================================
  // FILE SERVER - Serve all other files
  // ============================================

  serveFile(req, res, pathname);
});

server.listen(PORT, () => {
  console.log(`\n✅ Combined Server running on http://localhost:${PORT}\n`);
  console.log('Features:');
  console.log('  📱 Web App: http://localhost:8000');
  console.log('  🔌 Admin API: http://localhost:8000/api/tricks');
  console.log('\nPress Ctrl+C to stop\n');
});
