# Taste Ledger - accessible recipe records tool
Run locally:  `node server.js`  then open http://localhost:3000  (any username/password works). No npm install needed.
Files: server.js (backend, JSON-file database in data/recipes.json) | public/ (HTML, CSS, JS, SVG dish pictures) | make_images.py (generates the pictures)

## Deploy (DigitalOcean droplet + Namecheap domain)
1. Create an Ubuntu droplet; SSH in; `apt install -y nodejs nginx certbot python3-certbot-nginx`; copy this folder to /var/www/taste-ledger.
2. `npm i -g pm2 && cd /var/www/taste-ledger && pm2 start server.js && pm2 save && pm2 startup`
3. nginx: `server_name yourdomain.com; location / { proxy_pass http://127.0.0.1:3000; }` then `nginx -t && systemctl reload nginx`.
4. Namecheap > Domain List > Manage > Advanced DNS: add an A Record, Host `@`, Value = droplet IP (and `www` too).
5. `certbot --nginx -d yourdomain.com -d www.yourdomain.com` for HTTPS. Put the live URL in your report.
