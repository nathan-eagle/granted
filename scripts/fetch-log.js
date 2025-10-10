const { execSync } = require('node:child_process');
const fetch = require('node-fetch');

if (!process.env.VERCEL_TEAM || !process.env.VERCEL_PROJECT || !process.env.VERCEL_TOKEN || !process.env.DEPLOYMENT_ID) {
  console.error('Set VERCEL_TEAM, VERCEL_PROJECT, VERCEL_TOKEN, DEPLOYMENT_ID');
  process.exit(1);
}

const params = new URLSearchParams({
  projectId: process.env.VERCEL_PROJECT,
  teamId: process.env.VERCEL_TEAM,
  limit: '50',
  direction: 'backward'
});

fetch(`https://api.vercel.com/v2/deployments/${process.env.DEPLOYMENT_ID}/events?${params.toString()}`, {
  headers: {
    Authorization: `Bearer ${process.env.VERCEL_TOKEN}`
  }
})
  .then(res => res.json())
  .then(data => {
    console.log(JSON.stringify(data, null, 2));
  })
  .catch(err => {
    console.error(err);
    process.exit(1);
  });
