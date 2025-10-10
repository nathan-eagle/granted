const https = require('https');

const { VERCEL_TEAM, VERCEL_PROJECT, VERCEL_TOKEN, DEPLOYMENT_ID } = process.env;

if (!VERCEL_TEAM || !VERCEL_PROJECT || !VERCEL_TOKEN || !DEPLOYMENT_ID) {
  console.error('Missing env (VERCEL_TEAM, VERCEL_PROJECT, VERCEL_TOKEN, DEPLOYMENT_ID).');
  process.exit(1);
}

const params = new URLSearchParams({
  since: `${Date.now() - 5 * 60 * 1000}`
});

const url = `https://api.vercel.com/v2/deployments/${DEPLOYMENT_ID}/events?projectId=${VERCEL_PROJECT}&teamId=${VERCEL_TEAM}&${params.toString()}`;

https.get(url, { headers: { Authorization: `Bearer ${VERCEL_TOKEN}` } }, res => {
  let data = '';
  res.on('data', chunk => { data += chunk; });
  res.on('end', () => {
    try {
      const json = JSON.parse(data);
      console.log(JSON.stringify(json, null, 2));
    } catch (err) {
      console.error('Failed to parse response:', data);
      process.exit(1);
    }
  });
}).on('error', err => {
  console.error(err);
  process.exit(1);
});
