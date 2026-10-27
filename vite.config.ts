import { defineConfig, Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import fs from 'fs';
import path from 'path';

function jsonDbPlugin(): Plugin {
  const dbPath = path.resolve(__dirname, 'data/maps.json');

  const ensureDbExists = () => {
    const dir = path.dirname(dbPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    if (!fs.existsSync(dbPath)) {
      fs.writeFileSync(dbPath, JSON.stringify({ maps: [] }, null, 2), 'utf-8');
    }
  };

  const readDb = () => {
    ensureDbExists();
    try {
      const data = fs.readFileSync(dbPath, 'utf-8');
      return JSON.parse(data);
    } catch {
      return { maps: [] };
    }
  };

  const writeDb = (data: unknown) => {
    ensureDbExists();
    fs.writeFileSync(dbPath, JSON.stringify(data, null, 2), 'utf-8');
  };

  return {
    name: 'json-db-api',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const url = req.url || '';

        if (url.startsWith('/api/maps')) {
          res.setHeader('Content-Type', 'application/json');

          // GET /api/maps
          if (req.method === 'GET') {
            const db = readDb();
            res.statusCode = 200;
            res.end(JSON.stringify(db.maps || []));
            return;
          }

          // POST /api/maps (Save / Update map)
          if (req.method === 'POST') {
            let body = '';
            req.on('data', chunk => { body += chunk; });
            req.on('end', () => {
              try {
                const mapData = JSON.parse(body);
                const db = readDb();
                const existingIndex = db.maps.findIndex((m: { id: string }) => m.id === mapData.id);
                if (existingIndex >= 0) {
                  db.maps[existingIndex] = { ...mapData, updatedAt: Date.now() };
                } else {
                  db.maps.unshift({ ...mapData, updatedAt: Date.now() });
                }
                writeDb(db);
                res.statusCode = 200;
                res.end(JSON.stringify({ success: true, map: mapData }));
              } catch (e: unknown) {
                res.statusCode = 400;
                res.end(JSON.stringify({ error: (e as Error).message }));
              }
            });
            return;
          }

          // DELETE /api/maps/:id
          if (req.method === 'DELETE') {
            const id = url.split('/api/maps/')[1];
            if (id) {
              const db = readDb();
              db.maps = db.maps.filter((m: { id: string }) => m.id !== id);
              writeDb(db);
              res.statusCode = 200;
              res.end(JSON.stringify({ success: true }));
              return;
            }
          }
        }

        next();
      });
    }
  };
}

export default defineConfig({
  plugins: [react(), jsonDbPlugin()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
