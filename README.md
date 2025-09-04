# DevDollar Donation Website

A modern donation website for DevDollar.org with Pesepay payment integration.

## Features

- 🎨 Beautiful, responsive design
- 💳 Seamless Pesepay payment integration
- 🔒 Secure card data handling
- 📱 Mobile-friendly interface
- 🚀 Fast and lightweight

## Local Development

1. Install dependencies:
```bash
npm install
```

2. Create a `.env` file with your Pesepay credentials:
```
PESEPAY_INTEGRATION_KEY=your-integration-key
PESEPAY_ENCRYPTION_KEY=your-encryption-key
PORT=3000
NODE_ENV=development
```

3. Start the development server:
```bash
npm start
```

4. Visit `http://localhost:3000`

## Deployment to Vercel

### Option 1: Deploy via Vercel CLI

1. Install Vercel CLI:
```bash
npm i -g vercel
```

2. Login to Vercel:
```bash
vercel login
```

3. Deploy:
```bash
vercel
```

4. Set environment variables in Vercel dashboard:
   - `PESEPAY_INTEGRATION_KEY`
   - `PESEPAY_ENCRYPTION_KEY`
   - `NODE_ENV=production`

### Option 2: Deploy via GitHub

1. Push your code to GitHub
2. Connect your GitHub repo to Vercel
3. Set environment variables in Vercel dashboard
4. Deploy automatically

## Domain Configuration

To connect your GoDaddy domain (devdollar.org) to Vercel:

1. In Vercel dashboard, go to your project settings
2. Add your domain: `devdollar.org` and `www.devdollar.org`
3. Update your GoDaddy DNS settings:
   - Add A record: `@` → Vercel IP (provided by Vercel)
   - Add CNAME record: `www` → `cname.vercel-dns.com`

## Environment Variables

- `PESEPAY_INTEGRATION_KEY`: Your Pesepay integration key
- `PESEPAY_ENCRYPTION_KEY`: Your Pesepay encryption key
- `NODE_ENV`: Set to `production` for live deployment
- `PORT`: Server port (automatically set by hosting service)

## Tech Stack

- **Backend**: Node.js, Express.js
- **Frontend**: HTML, CSS, JavaScript
- **Payment**: Pesepay API
- **Hosting**: Vercel
- **Domain**: GoDaddy

## Support

For support, email support@devdollar.org