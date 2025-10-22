// Deprecated: replaced by /api/matches/[id].js
export default function handler(req, res) {
  res.statusCode = 410;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify({ error: 'deprecated route' }));
}
