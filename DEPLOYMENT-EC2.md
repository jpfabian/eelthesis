# Step-by-Step: Deploy EEL App on AWS EC2

- **Repo:** https://github.com/jpfabian/eelthesis.git  
- **Key file:** `eel-key.pem`  
- Replace `YOUR_EC2_IP` with your instance public IP (e.g. `54.91.84.96`).

---

## 1. Create and launch an EC2 instance

1. In **AWS Console** → **EC2** → **Launch Instance**.
2. **Name:** e.g. `eel-app`.
3. **AMI:** Ubuntu Server 22.04 LTS.
4. **Instance type:** e.g. `t2.micro` (free tier) or `t3.small`.
5. **Key pair:** Create or select one (e.g. name it `eel-key`); download `eel-key.pem` and keep it safe.
6. **Network / Security group:**
   - Create or use a security group that allows:
     - **SSH (22)** – your IP (or 0.0.0.0/0 only if you understand the risk).
     - **HTTP (80)** – 0.0.0.0/0 (so users can open the app).
     - **HTTPS (443)** – 0.0.0.0/0 if you will use SSL later.
   - Do **not** open port 3000 to the internet; nginx will proxy to it.
7. **Storage:** 8–20 GB is usually enough.
8. Launch the instance and note its **Public IPv4 address** (e.g. `54.91.84.96`).

---

## 2. Allow EC2 to reach RDS (MySQL)

1. **EC2** → **Security Groups** → select the security group used by your **RDS** instance.
2. **Edit inbound rules** → **Add rule:**
   - Type: **MySQL/Aurora (3306)**.
   - Source: the **security group of your EC2 instance** (or the EC2 instance’s private IP if you prefer).
3. Save. Your Node app on EC2 will now be able to connect to the database.

---

## 3. Connect to EC2 via SSH

**Windows (PowerShell):**

```powershell
# Fix key permissions (run once; use the path where you saved eel-key.pem)
icacls eel-key.pem /reset
icacls eel-key.pem /grant:r "$($env:USERNAME):(R)"

ssh -i "C:\path\to\eel-key.pem" ubuntu@YOUR_EC2_IP
```

**Mac/Linux:**

```bash
chmod 400 eel-key.pem
ssh -i eel-key.pem ubuntu@YOUR_EC2_IP
```

---

## 4. Install Node.js (LTS) on the server

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs
node -v   # e.g. v20.x
npm -v
```

---

## 5. Install nginx

```bash
sudo apt-get update
sudo apt-get install -y nginx
sudo systemctl enable nginx
sudo systemctl start nginx
```

---

## 6. Put the project on the server

**Option A – Git (recommended):**

```bash
sudo apt-get install -y git
cd /home/ubuntu
git clone https://github.com/jpfabian/eelthesis.git
cd eelthesis
```

**Option B – Copy from your PC (SCP):**

From your **local machine** (PowerShell, from the folder that contains the project):

```powershell
scp -i "C:\path\to\eel-key.pem" -r "C:\Users\jpfab\OneDrive\Desktop\eel-learning-sample-react\*" ubuntu@YOUR_EC2_IP:/home/ubuntu/eelthesis/
```

Then on EC2:

```bash
cd /home/ubuntu/eelthesis
```

---

## 7. Create `.env` on the server

**Do not** upload your real `.env` over unencrypted channels. Create it on the server:

```bash
cd /home/ubuntu/eelthesis/js-back-end
nano .env
```

Paste the same variables as in your local `.env`, and set the EC2 URL for CORS:

```env
GROQ_API_KEY=your_groq_key
GROQ_API_URL=https://api.groq.com/openai/v1/chat/completions
AWS_ACCESS_KEY_ID=your_aws_key
AWS_SECRET_ACCESS_KEY=your_aws_secret
AWS_REGION=ap-southeast-2
AWS_BUCKET_NAME=eel-service
EEL_SMTP_USER=your_email
EEL_SMTP_PASS=your_app_password
EEL_SMTP_FROM=your_email

ALLOWED_ORIGINS=http://YOUR_EC2_IP
PORT=3000
```

Replace `YOUR_EC2_IP` with the real public IP (e.g. `http://54.91.84.96`). Save and exit (`Ctrl+O`, `Enter`, `Ctrl+X`).

---

## 8. Install backend dependencies and run

```bash
cd /home/ubuntu/eelthesis/js-back-end
npm install
npm start
```

Leave this terminal open and test in the browser: `http://YOUR_EC2_IP:3000` (and open `http://YOUR_EC2_IP:3000/login.html`). If the security group has port 3000 open only for testing, you can close it later and use only nginx.  
Then stop the server with `Ctrl+C` and run it in the background (next step).

---

## 9. Run the Node app in the background (PM2)

```bash
sudo npm install -g pm2
cd /home/ubuntu/eelthesis/js-back-end
pm2 start server.js --name eel-api
pm2 save
pm2 startup
# Run the command that pm2 startup prints (usually a sudo env PATH=... command)
```

Check:

```bash
pm2 status
pm2 logs eel-api
```

---

## 10. Configure nginx as reverse proxy

```bash
sudo nano /etc/nginx/sites-available/eel
```

Paste (replace `YOUR_EC2_IP` with your real IP or use `_` to accept any server name):

```nginx
server {
    listen 80;
    server_name YOUR_EC2_IP;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Save and exit. Then:

```bash
sudo ln -sf /etc/nginx/sites-available/eel /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl reload nginx
```

---

## 11. Open the app in the browser

- **URL:** `http://YOUR_EC2_IP` (port 80, no need to type `:3000`).
- **Login page:** `http://YOUR_EC2_IP/login.html`.

Try signing in. If it works, deployment is complete.

---

## 12. Optional: uploads directory

If the app serves PDFs or other files from `uploads`:

```bash
mkdir -p /home/ubuntu/eelthesis/js-back-end/uploads
# If you have files to copy, upload them here (e.g. via scp)
```

---

## Quick checklist

| Step | Done |
|------|------|
| EC2 security group: 22 (SSH), 80 (HTTP) | ☐ |
| RDS security group: 3306 from EC2 SG | ☐ |
| Node.js & nginx installed | ☐ |
| Project on server (git or scp) | ☐ |
| `.env` in `js-back-end` with `ALLOWED_ORIGINS=http://YOUR_EC2_IP` | ☐ |
| `npm install` and `pm2 start server.js` | ☐ |
| nginx proxy 80 → 3000, `server_name` = YOUR_EC2_IP | ☐ |
| App opens at `http://YOUR_EC2_IP` and login works | ☐ |

---

## Updating the app later

```bash
cd /home/ubuntu/eelthesis
git pull   # if using git
# Or upload changed files via scp

cd js-back-end
npm install
pm2 restart eel-api
```

---

## Troubleshooting

- **502 Bad Gateway:** Node not running or not on port 3000 → `pm2 status` and `pm2 logs eel-api`.
- **CORS / login fails:** Ensure `ALLOWED_ORIGINS=http://YOUR_EC2_IP` in `.env` (no trailing slash, correct IP), then `pm2 restart eel-api`.
- **Cannot connect to database:** Check RDS security group allows 3306 from EC2; check DB host/user/password in your app config (e.g. in `server.js` or env).
- **Static files or PDFs 404:** Ensure `uploads` and other static paths exist under the project directory that Node uses.
