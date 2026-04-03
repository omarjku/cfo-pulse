# CFO Pulse - AI-Powered Financial Insights Dashboard

A React-based financial dashboard that provides AI-powered insights using Anthropic's Claude API. Features interactive charts, financial metrics, and natural language analysis of financial data.

## Features

- **Interactive Financial Charts** - Revenue, expenses, and profit visualization using Recharts
- **AI-Powered Insights** - Integration with Anthropic Claude API for natural language financial analysis
- **Responsive Design** - Built with Tailwind CSS for mobile-friendly experience
- **Real-time Data** - Sample financial data with interactive querying
- **Vite Build** - Fast development and optimized production builds

## Tech Stack

- **React 18** - Frontend library
- **Vite** - Build tool and dev server
- **Tailwind CSS** - Utility-first CSS framework
- **Recharts** - Charting library
- **Anthropic Claude SDK** - AI API integration
- **date-fns** - Date formatting

## Prerequisites

- Node.js 18+ and npm/yarn/pnpm
- Anthropic Claude API key ([Get one here](https://console.anthropic.com/))

## Installation

1. Clone the repository:
   ```bash
   git clone <your-repo-url>
   cd cfo-pulse-app
   ```

2. Install dependencies:
   ```bash
   npm install
   # or
   yarn
   # or
   pnpm install
   ```

3. Configure environment variables:
   ```bash
   cp .env.example .env.local
   ```
   Edit `.env.local` and add your Anthropic API key:
   ```
   VITE_ANTHROPIC_API_KEY=your_actual_api_key_here
   ```

## Development

Run the development server:
```bash
npm run dev
```
The app will be available at `http://localhost:3000`.

## Building for Production

Build the app for production:
```bash
npm run build
```
The built files will be in the `dist/` directory.

Preview the production build:
```bash
npm run preview
```

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `VITE_ANTHROPIC_API_KEY` | Your Anthropic Claude API key | Yes |
| `VITE_API_URL` | Optional backend API URL | No |
| `VITE_APP_ENV` | Application environment (development/production) | No |

**Note**: All environment variables must be prefixed with `VITE_` to be accessible in the React app.

## Deployment to Vercel

### Option 1: Deploy via Vercel CLI

1. Install Vercel CLI:
   ```bash
   npm i -g vercel
   ```

2. Deploy:
   ```bash
   vercel
   ```

3. Follow the prompts to link your project.

### Option 2: Deploy via GitHub Integration (Recommended)

1. Push your code to a GitHub repository.

2. Go to [Vercel Dashboard](https://vercel.com/dashboard) and click "Add New Project".

3. Import your GitHub repository.

4. Configure project settings:
   - **Framework Preset**: Vite
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
   - **Install Command**: `npm install`

5. Add environment variables in Vercel project settings:
   - Go to Project Settings → Environment Variables
   - Add `VITE_ANTHROPIC_API_KEY` with your API key
   - (Optional) Add other environment variables

6. Click "Deploy".

### Option 3: Deploy via Vercel Git Integration

1. Connect your Git provider (GitHub, GitLab, Bitbucket) to Vercel.

2. Import the repository.

3. Vercel will automatically detect Vite and configure the build settings.

4. Add environment variables as described above.

## Important Security Notes

1. **Never commit `.env` files** - They are in `.gitignore` for security.
2. **Use Vercel Environment Variables** - Store secrets securely in Vercel project settings.
3. **Consider using a backend proxy** - For production, consider proxying API calls through a backend to avoid exposing API keys in client-side code.

## Project Structure

```
cfo-pulse-app/
├── src/
│   ├── App.jsx           # Main application component
│   ├── main.jsx          # Application entry point
│   └── index.css         # Global styles
├── public/               # Static assets
├── index.html            # HTML template
├── vite.config.js        # Vite configuration
├── tailwind.config.js    # Tailwind CSS configuration
├── postcss.config.js     # PostCSS configuration
├── package.json          # Dependencies and scripts
├── .env.example          # Example environment variables
└── README.md             # This file
```

## Customization

### Changing Charts
Edit the chart configurations in `src/App.jsx`. The app uses Recharts - refer to their [documentation](https://recharts.org/) for advanced chart options.

### Modifying AI Prompts
Update the prompt template in the `getClaudeInsight` function in `src/App.jsx` to customize the AI's financial analysis behavior.

### Adding New Features
- Add new components in `src/components/`
- Add utility functions in `src/utils/`
- Add custom hooks in `src/hooks/`

## Troubleshooting

### Build Errors
- Ensure Node.js version is 18+
- Clear node_modules and reinstall: `rm -rf node_modules && npm install`
- Check Vite configuration in `vite.config.js`

### API Errors
- Verify `VITE_ANTHROPIC_API_KEY` is correctly set
- Check Anthropic API status: [status.anthropic.com](https://status.anthropic.com)
- Ensure your API key has sufficient credits/permissions

### Chart Display Issues
- Verify Recharts is installed: `npm list recharts`
- Check browser console for JavaScript errors

## License

MIT