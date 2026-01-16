#!/usr/bin/env node
/**
 * Simple HTTP Server for Trick List
 * Serves files from current directory on port 8000
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

const PORT = 8000;

const server = http.createServer((req, res) => {
  // Parse URL
  let pathname = url.parse(req.url).pathname;
  
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
    return;
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
});

server.listen(PORT, () => {
  console.log(`\n✅ Web Server running on http://localhost:${PORT}\n`);
  console.log('Serving files from: ' + __dirname);
  console.log('\nPress Ctrl+C to stop\n');
});
