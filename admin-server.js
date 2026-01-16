#!/usr/bin/env node
/**
 * Admin API Server for Trick List
 * Handles CRUD operations for tricks and trick management
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

const PORT = 3001;
const TRICKS_FILE = path.join(__dirname, 'api', 'tricks');

// Utility functions
function readTricks() {
  try {
    const data = fs.readFileSync(TRICKS_FILE, 'utf8');
    return JSON.parse(data);
  } catch (err) {
    console.error('Error reading tricks:', err);
    return [];
  }
}

function writeTricks(tricks) {
  try {
    fs.writeFileSync(TRICKS_FILE, JSON.stringify(tricks, null, 2), 'utf8');
    return true;
  } catch (err) {
    console.error('Error writing tricks:', err);
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
  res.writeHead(status, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
  res.end(JSON.stringify(data));
}

function sendError(res, status, message) {
  sendJSON(res, status, { error: message });
}

// Request handler
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
  const query = parsedUrl.query;

  // GET /api/tricks - Get all tricks
  if (req.method === 'GET' && pathname === '/api/tricks') {
    const tricks = readTricks();
    sendJSON(res, 200, { success: true, tricks });
    return;
  }

  // GET /api/tricks/:id - Get single trick
  if (req.method === 'GET' && pathname.startsWith('/api/tricks/')) {
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

      // Update fields
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

  // 404
  sendError(res, 404, 'Endpoint not found');
});

server.listen(PORT, () => {
  console.log(`Admin API Server running on http://localhost:${PORT}`);
  console.log('Available endpoints:');
  console.log('  GET    /api/tricks');
  console.log('  GET    /api/tricks/:id');
  console.log('  POST   /api/tricks');
  console.log('  PUT    /api/tricks/:id');
  console.log('  DELETE /api/tricks/:id');
  console.log('  POST   /api/tricks/import');
  console.log('  GET    /api/tricks/export');
});
