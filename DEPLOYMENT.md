# Vercel Deployment Plan for CFO Pulse

## Overview
This document provides a step-by-step guide to deploy the CFO Pulse React application to Vercel. The application uses Vite, React, Tailwind CSS, and integrates with Anthropic's Claude API for AI-powered financial insights.

## Prerequisites
1. **GitHub Account** - Repository hosting
2. **Vercel Account** - Free tier available at [vercel.com](https://vercel.com)
3. **Anthropic Claude API Key** - From [console.anthropic.com](https://console.anthropic.com/)
4. **Node.js 18+** - For local development (optional)

## Step-by-Step Deployment Guide

### Step 1: Prepare Your Code
1. Ensure all files are in the `cfo-pulse-app/` directory
2. Verify the following critical files exist:
   - `package.json` with correct dependencies and scripts
   - `vite.config.js` with Vite configuration
   - `index.html` entry point
   - `src/` directory with React components
   - `.env.example` for environment variables reference

### Step 2: Push to GitHub
```bash
# Initialize git repository (if not already)
git init
git add .
git commit -m "Initial commit: CFO Pulse React app"

# Create a new repository on GitHub
# Link and push to GitHub
git remote add origin https://github.com/yourusername/cfo-pulse.git
git branch -M main
git push -u origin main
```

### Step 3: Deploy to Vercel

#### Option A: Vercel Dashboard (Recommended)
1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Click "Add New Project"
3. Import your GitHub repository
4. Configure project settings:
   - **Framework Preset**: Vite (auto-detected)
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
   - **Install Command**: `npm install`
5. Click "Deploy"

#### Option B: Vercel CLI
```bash
# Install Vercel CLI globally
npm i -g vercel

# Login to Vercel
vercel login

# Deploy from project directory
cd cfo-pulse-app
vercel

# Follow interactive prompts
# - Link to existing project or create new
# - Set project settings
```

### Step 4: Configure Environment Variables
**Critical**: The Anthropic API key must be configured for the AI features to work.

1. In Vercel Dashboard, go to your project
2. Navigate to **Settings** → **Environment Variables**
3. Add the following variables:

| Variable | Value | Notes |
|----------|-------|-------|
| `VITE_ANTHROPIC_API_KEY` | `your_actual_api_key` | Get from [console.anthropic.com](https://console.anthropic.com/) |
| (Optional) `VITE_APP_ENV` | `production` | For environment-specific logic |

4. **Redeploy**: After adding environment variables, redeploy the application:
   - Go to **Deployments** tab
   - Click "Redeploy" on the latest deployment

### Step 5: Verify Deployment
1. Visit your Vercel deployment URL (e.g., `cfo-pulse.vercel.app`)
2. Test the application:
   - Verify dashboard loads with charts
   - Test AI insights feature with sample query
   - Check responsiveness on different devices

### Step 6: Set Up Custom Domain (Optional)
1. In Vercel project settings, go to **Domains**
2. Add your custom domain (e.g., `cfopulse.yourcompany.com`)
3. Follow DNS configuration instructions

## Environment Variables Reference

| Variable | Required | Description | Example |
|----------|----------|-------------|---------|
| `VITE_ANTHROPIC_API_KEY` | Yes | Anthropic Claude API key | `sk-ant-api-...` |
| `VITE_API_URL` | No | Backend API URL for proxy | `https://api.example.com` |
| `VITE_APP_ENV` | No | Environment flag | `production` |

**Security Note**: Never commit API keys to version control. The `.env` file is gitignored.

## Build Configuration
- **Framework**: Vite 5.x
- **Build Command**: `npm run build`
- **Output Directory**: `dist/`
- **Node Version**: 18.x (auto-detected by Vercel)
- **Install Command**: `npm install`

## Dependencies Installation
Vercel automatically runs `npm install` during build. Key dependencies include:
- `react` & `react-dom` (UI framework)
- `@anthropic-ai/sdk` (Claude API client)
- `recharts` (charting library)
- `tailwindcss` (styling)
- `vite` (build tool)

## Troubleshooting Common Issues

### Build Failures
1. **Node version mismatch**: Ensure Node.js 18+ in `package.json` engines field
2. **Missing dependencies**: Check `package.json` for correct dependencies
3. **Vite configuration**: Verify `vite.config.js` exists and exports correct config

### API Key Issues
1. **"API key not configured"**: Verify `VITE_ANTHROPIC_API_KEY` is set in Vercel environment variables
2. **CORS errors**: Consider using a backend proxy for production
3. **Rate limiting**: Monitor Anthropic API usage and upgrade plan if needed

### Chart Display Problems
1. **Recharts not rendering**: Check browser console for errors
2. **Data format**: Ensure financial data matches expected structure in `App.jsx`

## Post-Deployment Tasks

### 1. Enable Analytics
- Vercel Analytics: Free plan includes basic analytics
- Google Analytics: Add tracking ID to `index.html`

### 2. Set Up Monitoring
- Vercel Logs: View deployment and runtime logs
- Status monitoring: UptimeRobot or similar service

### 3. Implement Backend Proxy (Recommended for Production)
For enhanced security, consider:
1. Creating a serverless function (Vercel Functions) to proxy API calls
2. Storing API key server-side only
3. Implementing rate limiting and caching

### 4. Configure Auto-Deploy
- Connect GitHub repository for automatic deployments on push
- Set up preview deployments for pull requests

## Rollback Procedure
If deployment fails:
1. Go to Vercel Dashboard → Deployments
2. Find last working deployment
3. Click "..." → "Promote to Production"
4. Investigate and fix issues in development

## Cost Considerations
- **Vercel**: Free tier includes 100GB bandwidth, unlimited deployments
- **Anthropic API**: Pay-per-use based on token count (check [pricing](https://www.anthropic.com/pricing))
- **Custom domains**: Free on Vercel

## Support Resources
- [Vercel Documentation](https://vercel.com/docs)
- [Anthropic API Documentation](https://docs.anthropic.com/)
- [Vite Documentation](https://vitejs.dev/guide/)
- [React Documentation](https://react.dev/)

## Quick Start Checklist
- [ ] Code pushed to GitHub
- [ ] Vercel project created
- [ ] Environment variables configured
- [ ] Initial deployment successful
- [ ] AI features tested
- [ ] Custom domain configured (optional)
- [ ] Analytics enabled (optional)

---

**Deployment Complete!** Your CFO Pulse dashboard is now live and accessible via your Vercel URL.