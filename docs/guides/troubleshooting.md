# Troubleshooting

## Common Issues

### Clarinet Not Found

Ensure Clarinet is installed:
```bash
curl -sL1 https://hirosystems.z19.web.core.windows.net/clarinet/install.sh | sh
```

### npm Install Fails

Try clearing the cache:
```bash
npm cache clean --force
rm -rf node_modules
npm install
```

### Frontend Build Errors

Ensure you're using Node.js 18+:
```bash
node --version
```
