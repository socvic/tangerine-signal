# Vercel Deployment

## Automatic Deployments

Vercel automatically deploys:
- Preview deployments on PR creation
- Production deployments on main merge

## Manual Deployment

```bash
npm i -g vercel
vercel --prod
```

## Environment Variables

Set in Vercel dashboard:
- `VITE_CONTRACT_ADDRESS`
- `VITE_API_URL`
