import express from 'express';
import fetch from 'node-fetch';

const app = express();
const PORT = process.env.PORT || 8080;
const MCP_API_KEY = process.env.MCP_API_KEY;
const NCAA_API_URL = process.env.NCAA_API_URL || 'https://ncaa-api-production-20d9.up.railway.app';

app.use(express.json());

console.log('🏐 NCAA Women\'s Sports MCP Server');
console.log(`📍 NCAA API URL: ${NCAA_API_URL}`);
console.log(`🚪 Port: ${PORT}`);

// OU team IDs
const OU_TEAM_IDS = {
  softball: 281,
  'basketball-women': 520,
  'volleyball-women': 520,
  'soccer-women': 520
};

// ── OU FILTER HELPER ─────────────────────────────────────────────────
// Filters any NCAA API response down to games/events involving Oklahoma
function filterToOU(data) {
  const OU_KEYWORDS = ['oklahoma', 'sooners', 'ou '];

  function isOU(str) {
    if (!str) return false;
    const lower = str.toLowerCase();
    return OU_KEYWORDS.some(k => lower.includes(k));
  }

  function filterGame(game) {
    return (
      isOU(game.home?.names?.full) ||
      isOU(game.home?.names?.short) ||
      isOU(game.away?.names?.full) ||
      isOU(game.away?.names?.short) ||
      isOU(game.homeTeam) ||
      isOU(game.awayTeam) ||
      isOU(game.home_team) ||
      isOU(game.away_team) ||
      isOU(game.teams?.home?.name) ||
      isOU(game.teams?.away?.name) ||
      isOU(game.competitor1?.name) ||
      isOU(game.competitor2?.name)
    );
  }

  // Handle array at top level
  if (Array.isArray(data)) {
    const filtered = data.filter(filterGame);
    return filtered.length > 0 ? filtered : data; // fall back to all if no OU found
  }

  // Handle object with common wrapper keys
  const wrapperKeys = ['games', 'contests', 'events', 'schedule', 'scoreboard'];
  for (const key of wrapperKeys) {
    if (Array.isArray(data[key])) {
      const filtered = data[key].filter(filterGame);
      return {
        ...data,
        [key]: filtered.length > 0 ? filtered : data[key],
        ouFilter: filtered.length > 0 ? `Showing ${filtered.length} OU game(s)` : 'No OU games found — showing all'
      };
    }
  }

  // Nothing to filter — return as-is
  return data;
}
// ─────────────────────────────────────────────────────────────────────

// Helper to get current date
function getCurrentDateString() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}/${month}/${day}`;
}

// Helper to format date
function formatDateForAPI(date) {
  if (!date) return getCurrentDateString();
  return date.replace(/-/g, '/');
}

// Health check
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'healthy' });
});

// Root
app.get('/', (req, res) => {
  res.json({
    service: 'NCAA Women\'s Sports MCP Server',
    status: 'running',
    tools: 20,
    ncaaApiUrl: NCAA_API_URL
  });
});

// MCP endpoint
app.all('/mcp', async (req, res) => {
  console.log(`${req.method} /mcp`);

  // Handle GET
  if (req.method === 'GET') {
    return res.json({ service: 'NCAA Women\'s Sports MCP', status: 'ready' });
  }

  // Handle POST
  try {
    // Auth check
    if (MCP_API_KEY) {
      const auth = req.headers.authorization;
      if (!auth || auth !== `Bearer ${MCP_API_KEY}`) {
        return res.status(401).json({
          jsonrpc: '2.0',
          error: { code: -32001, message: 'Unauthorized' },
          id: req.body?.id
        });
      }
    }

    const { method, params, id } = req.body;
    console.log(`  Method: ${method}`);

    // Initialize
    if (method === 'initialize') {
      return res.json({
        jsonrpc: '2.0',
        result: {
          protocolVersion: '2025-06-18',
          capabilities: { tools: {} },
          serverInfo: { name: 'ncaa-womens-sports', version: '1.0.0' }
        },
        id
      });
    }

    // List tools
    if (method === 'tools/list') {
      return res.json({
        jsonrpc: '2.0',
        result: {
          tools: [
            // SOFTBALL
            { name: 'get_softball_scores', description: 'Get OU softball scores for a specific date' },
            { name: 'get_softball_schedule', description: 'Get OU softball schedule for a specific month' },
            { name: 'get_softball_rankings', description: 'Get softball rankings' },
            { name: 'get_softball_stats', description: 'Get OU softball stats' },
            { name: 'get_softball_standings', description: 'Get softball standings' },
            // WOMEN'S BASKETBALL
            { name: 'get_womens_basketball_scores', description: 'Get OU women\'s basketball scores' },
            { name: 'get_womens_basketball_schedule', description: 'Get OU women\'s basketball schedule' },
            { name: 'get_womens_basketball_rankings', description: 'Get women\'s basketball rankings' },
            { name: 'get_womens_basketball_stats', description: 'Get OU women\'s basketball stats' },
            { name: 'get_womens_basketball_standings', description: 'Get women\'s basketball standings' },
            // VOLLEYBALL
            { name: 'get_volleyball_scores', description: 'Get OU volleyball scores' },
            { name: 'get_volleyball_schedule', description: 'Get OU volleyball schedule' },
            { name: 'get_volleyball_rankings', description: 'Get volleyball rankings' },
            { name: 'get_volleyball_stats', description: 'Get OU volleyball stats' },
            { name: 'get_volleyball_standings', description: 'Get volleyball standings' },
            // SOCCER
            { name: 'get_soccer_scores', description: 'Get OU soccer scores' },
            { name: 'get_soccer_schedule', description: 'Get OU soccer schedule' },
            { name: 'get_soccer_rankings', description: 'Get soccer rankings' },
            { name: 'get_soccer_stats', description: 'Get OU soccer stats' },
            { name: 'get_soccer_standings', description: 'Get soccer standings' }
          ]
        },
        id
      });
    }

    // Call tool
    if (method === 'tools/call') {
      const { name, arguments: args } = params;
      console.log(`  Tool call: ${name}`, args);

      // ── SOFTBALL ─────────────────────────────────────────────────────

      if (name === 'get_softball_scores') {
        const date = formatDateForAPI(args.date);
        const url = `${NCAA_API_URL}/scoreboard/softball/d1/${date}/all-conf`;
        console.log(`  Fetching: ${url}`);
        try {
          const response = await fetch(url, { signal: AbortSignal.timeout(10000) });
          if (!response.ok) return res.json({ jsonrpc: '2.0', result: { content: [{ type: 'text', text: `NCAA API error: ${response.status}` }] }, id });
          const data = filterToOU(await response.json());
          return res.json({ jsonrpc: '2.0', result: { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] }, id });
        } catch (err) {
          return res.json({ jsonrpc: '2.0', result: { content: [{ type: 'text', text: `Error: ${err.message}` }] }, id });
        }
      }

      if (name === 'get_softball_schedule') {
        const year = args.year;
        const month = args.month;
        const url = `${NCAA_API_URL}/schedule/softball/d1/${year}/${month}`;
        console.log(`  Fetching: ${url}`);
        try {
          const response = await fetch(url, { signal: AbortSignal.timeout(10000) });
          if (!response.ok) return res.json({ jsonrpc: '2.0', result: { content: [{ type: 'text', text: `NCAA API error: ${response.status}` }] }, id });
          const data = filterToOU(await response.json());
          return res.json({ jsonrpc: '2.0', result: { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] }, id });
        } catch (err) {
          return res.json({ jsonrpc: '2.0', result: { content: [{ type: 'text', text: `Error: ${err.message}` }] }, id });
        }
      }

      if (name === 'get_softball_rankings') {
        const url = `${NCAA_API_URL}/rankings/softball/d1`;
        console.log(`  Fetching: ${url}`);
        try {
          const response = await fetch(url, { signal: AbortSignal.timeout(10000) });
          if (!response.ok) return res.json({ jsonrpc: '2.0', result: { content: [{ type: 'text', text: `NCAA API error: ${response.status}` }] }, id });
          const data = await response.json();
          return res.json({ jsonrpc: '2.0', result: { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] }, id });
        } catch (err) {
          return res.json({ jsonrpc: '2.0', result: { content: [{ type: 'text', text: `Error: ${err.message}` }] }, id });
        }
      }

      if (name === 'get_softball_stats') {
        const teamId = OU_TEAM_IDS.softball;
        const url = `${NCAA_API_URL}/stats/softball/d1/current/team/${teamId}`;
        console.log(`  Fetching: ${url}`);
        try {
          const response = await fetch(url, { signal: AbortSignal.timeout(10000) });
          if (!response.ok) return res.json({ jsonrpc: '2.0', result: { content: [{ type: 'text', text: `NCAA API error: ${response.status}` }] }, id });
          const data = await response.json();
          return res.json({ jsonrpc: '2.0', result: { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] }, id });
        } catch (err) {
          return res.json({ jsonrpc: '2.0', result: { content: [{ type: 'text', text: `Error: ${err.message}` }] }, id });
        }
      }

      if (name === 'get_softball_standings') {
        const url = `${NCAA_API_URL}/standings/softball/d1`;
        console.log(`  Fetching: ${url}`);
        try {
          const response = await fetch(url, { signal: AbortSignal.timeout(10000) });
          if (!response.ok) return res.json({ jsonrpc: '2.0', result: { content: [{ type: 'text', text: `NCAA API error: ${response.status}` }] }, id });
          const data = await response.json();
          return res.json({ jsonrpc: '2.0', result: { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] }, id });
        } catch (err) {
          return res.json({ jsonrpc: '2.0', result: { content: [{ type: 'text', text: `Error: ${err.message}` }] }, id });
        }
      }

      // ── WOMEN'S BASKETBALL ───────────────────────────────────────────

      if (name === 'get_womens_basketball_scores') {
        const date = formatDateForAPI(args.date);
        const url = `${NCAA_API_URL}/scoreboard/basketball-women/d1/${date}/all-conf`;
        console.log(`  Fetching: ${url}`);
        try {
          const response = await fetch(url, { signal: AbortSignal.timeout(10000) });
          if (!response.ok) return res.json({ jsonrpc: '2.0', result: { content: [{ type: 'text', text: `NCAA API error: ${response.status}` }] }, id });
          const data = filterToOU(await response.json());
          return res.json({ jsonrpc: '2.0', result: { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] }, id });
        } catch (err) {
          return res.json({ jsonrpc: '2.0', result: { content: [{ type: 'text', text: `Error: ${err.message}` }] }, id });
        }
      }

      if (name === 'get_womens_basketball_schedule') {
        const year = args.year;
        const month = args.month;
        const url = `${NCAA_API_URL}/schedule/basketball-women/d1/${year}/${month}`;
        console.log(`  Fetching: ${url}`);
        try {
          const response = await fetch(url, { signal: AbortSignal.timeout(10000) });
          if (!response.ok) return res.json({ jsonrpc: '2.0', result: { content: [{ type: 'text', text: `NCAA API error: ${response.status}` }] }, id });
          const data = filterToOU(await response.json());
          return res.json({ jsonrpc: '2.0', result: { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] }, id });
        } catch (err) {
          return res.json({ jsonrpc: '2.0', result: { content: [{ type: 'text', text: `Error: ${err.message}` }] }, id });
        }
      }

      if (name === 'get_womens_basketball_rankings') {
        const url = `${NCAA_API_URL}/rankings/basketball-women/d1`;
        console.log(`  Fetching: ${url}`);
        try {
          const response = await fetch(url, { signal: AbortSignal.timeout(10000) });
          if (!response.ok) return res.json({ jsonrpc: '2.0', result: { content: [{ type: 'text', text: `NCAA API error: ${response.status}` }] }, id });
          const data = await response.json();
          return res.json({ jsonrpc: '2.0', result: { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] }, id });
        } catch (err) {
          return res.json({ jsonrpc: '2.0', result: { content: [{ type: 'text', text: `Error: ${err.message}` }] }, id });
        }
      }

      if (name === 'get_womens_basketball_stats') {
        const teamId = OU_TEAM_IDS['basketball-women'];
        const url = `${NCAA_API_URL}/stats/basketball-women/d1/current/team/${teamId}`;
        console.log(`  Fetching: ${url}`);
        try {
          const response = await fetch(url, { signal: AbortSignal.timeout(10000) });
          if (!response.ok) return res.json({ jsonrpc: '2.0', result: { content: [{ type: 'text', text: `NCAA API error: ${response.status}` }] }, id });
          const data = await response.json();
          return res.json({ jsonrpc: '2.0', result: { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] }, id });
        } catch (err) {
          return res.json({ jsonrpc: '2.0', result: { content: [{ type: 'text', text: `Error: ${err.message}` }] }, id });
        }
      }

      if (name === 'get_womens_basketball_standings') {
        const url = `${NCAA_API_URL}/standings/basketball-women/d1`;
        console.log(`  Fetching: ${url}`);
        try {
          const response = await fetch(url, { signal: AbortSignal.timeout(10000) });
          if (!response.ok) return res.json({ jsonrpc: '2.0', result: { content: [{ type: 'text', text: `NCAA API error: ${response.status}` }] }, id });
          const data = await response.json();
          return res.json({ jsonrpc: '2.0', result: { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] }, id });
        } catch (err) {
          return res.json({ jsonrpc: '2.0', result: { content: [{ type: 'text', text: `Error: ${err.message}` }] }, id });
        }
      }

      // ── VOLLEYBALL ───────────────────────────────────────────────────

      if (name === 'get_volleyball_scores') {
        const date = formatDateForAPI(args.date);
        const url = `${NCAA_API_URL}/scoreboard/volleyball-women/d1/${date}/all-conf`;
        console.log(`  Fetching: ${url}`);
        try {
          const response = await fetch(url, { signal: AbortSignal.timeout(10000) });
          if (!response.ok) return res.json({ jsonrpc: '2.0', result: { content: [{ type: 'text', text: `NCAA API error: ${response.status}` }] }, id });
          const data = filterToOU(await response.json());
          return res.json({ jsonrpc: '2.0', result: { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] }, id });
        } catch (err) {
          return res.json({ jsonrpc: '2.0', result: { content: [{ type: 'text', text: `Error: ${err.message}` }] }, id });
        }
      }

      if (name === 'get_volleyball_schedule') {
        const year = args.year;
        const month = args.month;
        const url = `${NCAA_API_URL}/schedule/volleyball-women/d1/${year}/${month}`;
        console.log(`  Fetching: ${url}`);
        try {
          const response = await fetch(url, { signal: AbortSignal.timeout(10000) });
          if (!response.ok) return res.json({ jsonrpc: '2.0', result: { content: [{ type: 'text', text: `NCAA API error: ${response.status}` }] }, id });
          const data = filterToOU(await response.json());
          return res.json({ jsonrpc: '2.0', result: { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] }, id });
        } catch (err) {
          return res.json({ jsonrpc: '2.0', result: { content: [{ type: 'text', text: `Error: ${err.message}` }] }, id });
        }
      }

      if (name === 'get_volleyball_rankings') {
        const url = `${NCAA_API_URL}/rankings/volleyball-women/d1`;
        console.log(`  Fetching: ${url}`);
        try {
          const response = await fetch(url, { signal: AbortSignal.timeout(10000) });
          if (!response.ok) return res.json({ jsonrpc: '2.0', result: { content: [{ type: 'text', text: `NCAA API error: ${response.status}` }] }, id });
          const data = await response.json();
          return res.json({ jsonrpc: '2.0', result: { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] }, id });
        } catch (err) {
          return res.json({ jsonrpc: '2.0', result: { content: [{ type: 'text', text: `Error: ${err.message}` }] }, id });
        }
      }

      if (name === 'get_volleyball_stats') {
        const teamId = OU_TEAM_IDS['volleyball-women'];
        const url = `${NCAA_API_URL}/stats/volleyball-women/d1/current/team/${teamId}`;
        console.log(`  Fetching: ${url}`);
        try {
          const response = await fetch(url, { signal: AbortSignal.timeout(10000) });
          if (!response.ok) return res.json({ jsonrpc: '2.0', result: { content: [{ type: 'text', text: `NCAA API error: ${response.status}` }] }, id });
          const data = await response.json();
          return res.json({ jsonrpc: '2.0', result: { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] }, id });
        } catch (err) {
          return res.json({ jsonrpc: '2.0', result: { content: [{ type: 'text', text: `Error: ${err.message}` }] }, id });
        }
      }

      if (name === 'get_volleyball_standings') {
        const url = `${NCAA_API_URL}/standings/volleyball-women/d1`;
        console.log(`  Fetching: ${url}`);
        try {
          const response = await fetch(url, { signal: AbortSignal.timeout(10000) });
          if (!response.ok) return res.json({ jsonrpc: '2.0', result: { content: [{ type: 'text', text: `NCAA API error: ${response.status}` }] }, id });
          const data = await response.json();
          return res.json({ jsonrpc: '2.0', result: { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] }, id });
        } catch (err) {
          return res.json({ jsonrpc: '2.0', result: { content: [{ type: 'text', text: `Error: ${err.message}` }] }, id });
        }
      }

      // ── SOCCER ───────────────────────────────────────────────────────

      if (name === 'get_soccer_scores') {
        const date = formatDateForAPI(args.date);
        const url = `${NCAA_API_URL}/scoreboard/soccer-women/d1/${date}/all-conf`;
        console.log(`  Fetching: ${url}`);
        try {
          const response = await fetch(url, { signal: AbortSignal.timeout(10000) });
          if (!response.ok) return res.json({ jsonrpc: '2.0', result: { content: [{ type: 'text', text: `NCAA API error: ${response.status}` }] }, id });
          const data = filterToOU(await response.json());
          return res.json({ jsonrpc: '2.0', result: { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] }, id });
        } catch (err) {
          return res.json({ jsonrpc: '2.0', result: { content: [{ type: 'text', text: `Error: ${err.message}` }] }, id });
        }
      }

      if (name === 'get_soccer_schedule') {
        const year = args.year;
        const month = args.month;
        const url = `${NCAA_API_URL}/schedule/soccer-women/d1/${year}/${month}`;
        console.log(`  Fetching: ${url}`);
        try {
          const response = await fetch(url, { signal: AbortSignal.timeout(10000) });
          if (!response.ok) return res.json({ jsonrpc: '2.0', result: { content: [{ type: 'text', text: `NCAA API error: ${response.status}` }] }, id });
          const data = filterToOU(await response.json());
          return res.json({ jsonrpc: '2.0', result: { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] }, id });
        } catch (err) {
          return res.json({ jsonrpc: '2.0', result: { content: [{ type: 'text', text: `Error: ${err.message}` }] }, id });
        }
      }

      if (name === 'get_soccer_rankings') {
        const url = `${NCAA_API_URL}/rankings/soccer-women/d1`;
        console.log(`  Fetching: ${url}`);
        try {
          const response = await fetch(url, { signal: AbortSignal.timeout(10000) });
          if (!response.ok) return res.json({ jsonrpc: '2.0', result: { content: [{ type: 'text', text: `NCAA API error: ${response.status}` }] }, id });
          const data = await response.json();
          return res.json({ jsonrpc: '2.0', result: { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] }, id });
        } catch (err) {
          return res.json({ jsonrpc: '2.0', result: { content: [{ type: 'text', text: `Error: ${err.message}` }] }, id });
        }
      }

      if (name === 'get_soccer_stats') {
        const teamId = OU_TEAM_IDS['soccer-women'];
        const url = `${NCAA_API_URL}/stats/soccer-women/d1/current/team/${teamId}`;
        console.log(`  Fetching: ${url}`);
        try {
          const response = await fetch(url, { signal: AbortSignal.timeout(10000) });
          if (!response.ok) return res.json({ jsonrpc: '2.0', result: { content: [{ type: 'text', text: `NCAA API error: ${response.status}` }] }, id });
          const data = await response.json();
          return res.json({ jsonrpc: '2.0', result: { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] }, id });
        } catch (err) {
          return res.json({ jsonrpc: '2.0', result: { content: [{ type: 'text', text: `Error: ${err.message}` }] }, id });
        }
      }

      if (name === 'get_soccer_standings') {
        const url = `${NCAA_API_URL}/standings/soccer-women/d1`;
        console.log(`  Fetching: ${url}`);
        try {
          const response = await fetch(url, { signal: AbortSignal.timeout(10000) });
          if (!response.ok) return res.json({ jsonrpc: '2.0', result: { content: [{ type: 'text', text: `NCAA API error: ${response.status}` }] }, id });
          const data = await response.json();
          return res.json({ jsonrpc: '2.0', result: { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] }, id });
        } catch (err) {
          return res.json({ jsonrpc: '2.0', result: { content: [{ type: 'text', text: `Error: ${err.message}` }] }, id });
        }
      }

      // Unknown tool
      return res.json({
        jsonrpc: '2.0',
        error: { code: -32601, message: `Unknown tool: ${name}` },
        id
      });
    }

    // Unknown method
    return res.json({
      jsonrpc: '2.0',
      error: { code: -32601, message: `Unknown method: ${method}` },
      id
    });

  } catch (error) {
    console.error('MCP error:', error);
    return res.status(500).json({
      jsonrpc: '2.0',
      error: { code: -32603, message: error.message },
      id: req.body?.id
    });
  }
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`\n🚀 NCAA Women's Sports MCP Server running on port ${PORT}`);
  console.log(`📊 Tools available: 20`);
  console.log(`NCAA API URL: ${NCAA_API_URL}`);
  console.log(`MCP Key: ${MCP_API_KEY ? 'SET ✓' : 'NONE'}\n`);
});

// Keep alive
setInterval(() => {
  fetch(`http://localhost:${PORT}/health`).catch(() => {});
  console.log(`💓 Alive: ${Math.floor(process.uptime())}s`);
}, 30000);
