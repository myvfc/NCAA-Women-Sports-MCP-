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
function filterToOU(data) {
  const OU_KEYWORDS = ['oklahoma', 'sooners', 'ou '];

  function isOU(str) {
    if (!str) return false;
    const lower = str.toLowerCase();
    return OU_KEYWORDS.some(k => lower.includes(k));
  }

 function filterGame(game) {
  const g = game.game || game; // unwrap the nested game object
  return (
    isOU(g.home?.names?.full) ||
    isOU(g.home?.names?.short) ||
    isOU(g.away?.names?.full) ||
    isOU(g.away?.names?.short) ||
    isOU(g.homeTeam) ||
    isOU(g.awayTeam) ||
    isOU(g.home_team) ||
    isOU(g.away_team) ||
    isOU(g.teams?.home?.name) ||
    isOU(g.teams?.away?.name) ||
    isOU(g.competitor1?.name) ||
    isOU(g.competitor2?.name)
  );
}

  if (Array.isArray(data)) {
    const filtered = data.filter(filterGame);
    return filtered.length > 0 ? filtered : data;
  }

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

  return data;
}

// ── TWO-STEP OU SCHEDULE HELPER ──────────────────────────────────────
async function getOUSchedule(sport, year, month, activeDays) {
  const calUrl = `${NCAA_API_URL}/schedule/${sport}/d1/${year}/${month}`;
  console.log(`  Fetching calendar: ${calUrl}`);

  const calResponse = await fetch(calUrl, { signal: AbortSignal.timeout(10000) });
  if (!calResponse.ok) {
    return { error: `NCAA API error: ${calResponse.status}` };
  }

  const calData = await calResponse.json();
  const gameDates = (calData.gameDates || [])
    .filter(d => d.games > 0 && activeDays.includes(d.weekday))
    .slice(0, 8);

  const ouGames = [];

  for (const d of gameDates) {
    const dateStr = `${year}/${String(month).padStart(2, '0')}/${String(d.day).padStart(2, '0')}`;
    const scoreUrl = `${NCAA_API_URL}/scoreboard/${sport}/d1/${dateStr}/all-conf`;
    console.log(`  Fetching scoreboard: ${scoreUrl}`);
    try {
      const scoreResponse = await fetch(scoreUrl, { signal: AbortSignal.timeout(8000) });
      if (!scoreResponse.ok) continue;
      const scoreData = await scoreResponse.json();
    const filtered = filterToOU(scoreData);
const games = filtered.games || filtered.contests || filtered.events || [];
if (Array.isArray(games) && games.length > 0) {
  const slimGames = games.map(g => {
    const game = g.game || g;
    return {
      gameID: game.gameID,
      date: game.startDate,
      time: game.startTime,
      state: game.gameState,
      home: {
        name: game.home?.names?.short,
        score: game.home?.score,
        winner: game.home?.winner
      },
      away: {
        name: game.away?.names?.short,
        score: game.away?.score,
        winner: game.away?.winner
      },
      url: game.url
    };
  });
  ouGames.push({ date: d.contest_date, weekday: d.weekday, games: slimGames });
}
    } catch (e) {
      console.log(`  Skipping ${dateStr}: ${e.message}`);
    }
  }

  // If nothing found on primary days, try all days with games
  if (ouGames.length === 0) {
    const allGameDates = (calData.gameDates || [])
      .filter(d => d.games > 0 && !activeDays.includes(d.weekday))
      .slice(0, 8);

    for (const d of allGameDates) {
      const dateStr = `${year}/${String(month).padStart(2, '0')}/${String(d.day).padStart(2, '0')}`;
      const scoreUrl = `${NCAA_API_URL}/scoreboard/${sport}/d1/${dateStr}/all-conf`;
      console.log(`  Fetching scoreboard (extended): ${scoreUrl}`);
      try {
        const scoreResponse = await fetch(scoreUrl, { signal: AbortSignal.timeout(8000) });
        if (!scoreResponse.ok) continue;
        const scoreData = await scoreResponse.json();
        const filtered = filterToOU(scoreData);
        const games = filtered.games || filtered.contests || filtered.events || [];
        if (Array.isArray(games) && games.length > 0) {
          const slimGames = games.map(g => {
            const game = g.game || g;
            return {
              gameID: game.gameID,
              date: game.startDate,
              time: game.startTime,
              state: game.gameState,
              home: { name: game.home?.names?.short, score: game.home?.score, winner: game.home?.winner },
              away: { name: game.away?.names?.short, score: game.away?.score, winner: game.away?.winner },
              url: game.url
            };
          });
          ouGames.push({ date: d.contest_date, weekday: d.weekday, games: slimGames });
        }
      } catch (e) {
        console.log(`  Skipping ${dateStr}: ${e.message}`);
      }
    }
  }

  return ouGames.length > 0
    ? { team: 'Oklahoma Sooners', sport, season: year, month, ouGames }
    : { message: `No OU ${sport} games found in ${year}/${month}. Season may be over or not yet started.` };
}
// ─────────────────────────────────────────────────────────────────────

function getCurrentDateString() {
  const now = new Date();
  return `${now.getFullYear()}/${String(now.getMonth() + 1).padStart(2, '0')}/${String(now.getDate()).padStart(2, '0')}`;
}

function formatDateForAPI(date) {
  if (!date) return getCurrentDateString();
  return date.replace(/-/g, '/');
}

app.get('/health', (req, res) => res.status(200).json({ status: 'healthy' }));

app.get('/', (req, res) => {
  res.json({ service: 'NCAA Women\'s Sports MCP Server', status: 'running', tools: 20, ncaaApiUrl: NCAA_API_URL });
});

app.all('/mcp', async (req, res) => {
  console.log(`${req.method} /mcp`);

  if (req.method === 'GET') {
    return res.json({ service: 'NCAA Women\'s Sports MCP', status: 'ready' });
  }

  try {
    if (MCP_API_KEY) {
      const auth = req.headers.authorization;
      if (!auth || auth !== `Bearer ${MCP_API_KEY}`) {
        return res.status(401).json({ jsonrpc: '2.0', error: { code: -32001, message: 'Unauthorized' }, id: req.body?.id });
      }
    }

    const { method, params, id } = req.body;
    console.log(`  Method: ${method}`);

    if (method === 'initialize') {
      return res.json({
        jsonrpc: '2.0',
        result: { protocolVersion: '2025-06-18', capabilities: { tools: {} }, serverInfo: { name: 'ncaa-womens-sports', version: '1.0.0' } },
        id
      });
    }

    if (method === 'tools/list') {
      return res.json({
        jsonrpc: '2.0',
        result: {
          tools: [
            { name: 'get_softball_scores', description: 'Get OU softball scores for a specific date' },
            { name: 'get_softball_schedule', description: 'Get OU softball schedule for a specific month' },
            { name: 'get_softball_rankings', description: 'Get softball rankings' },
            { name: 'get_softball_stats', description: 'Get OU softball stats' },
            { name: 'get_softball_standings', description: 'Get softball standings' },
            { name: 'get_womens_basketball_scores', description: 'Get OU women\'s basketball scores' },
            { name: 'get_womens_basketball_schedule', description: 'Get OU women\'s basketball schedule' },
            { name: 'get_womens_basketball_rankings', description: 'Get women\'s basketball rankings' },
            { name: 'get_womens_basketball_stats', description: 'Get OU women\'s basketball stats' },
            { name: 'get_womens_basketball_standings', description: 'Get women\'s basketball standings' },
            { name: 'get_volleyball_scores', description: 'Get OU volleyball scores' },
            { name: 'get_volleyball_schedule', description: 'Get OU volleyball schedule' },
            { name: 'get_volleyball_rankings', description: 'Get volleyball rankings' },
            { name: 'get_volleyball_stats', description: 'Get OU volleyball stats' },
            { name: 'get_volleyball_standings', description: 'Get volleyball standings' },
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
        try {
          const data = await getOUSchedule('softball', args.year, args.month, ['Tue', 'Wed', 'Thu', 'Fri', 'Sat']);
          if (data.error) return res.json({ jsonrpc: '2.0', result: { content: [{ type: 'text', text: data.error }] }, id });
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
          return res.json({ jsonrpc: '2.0', result: { content: [{ type: 'text', text: JSON.stringify(await response.json(), null, 2) }] }, id });
        } catch (err) {
          return res.json({ jsonrpc: '2.0', result: { content: [{ type: 'text', text: `Error: ${err.message}` }] }, id });
        }
      }

      if (name === 'get_softball_stats') {
        const url = `${NCAA_API_URL}/stats/softball/d1/current/team/${OU_TEAM_IDS.softball}`;
        console.log(`  Fetching: ${url}`);
        try {
          const response = await fetch(url, { signal: AbortSignal.timeout(10000) });
          if (!response.ok) return res.json({ jsonrpc: '2.0', result: { content: [{ type: 'text', text: `NCAA API error: ${response.status}` }] }, id });
          return res.json({ jsonrpc: '2.0', result: { content: [{ type: 'text', text: JSON.stringify(await response.json(), null, 2) }] }, id });
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
          return res.json({ jsonrpc: '2.0', result: { content: [{ type: 'text', text: JSON.stringify(await response.json(), null, 2) }] }, id });
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
        try {
          const data = await getOUSchedule('basketball-women', args.year, args.month, ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']);
          if (data.error) return res.json({ jsonrpc: '2.0', result: { content: [{ type: 'text', text: data.error }] }, id });
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
          return res.json({ jsonrpc: '2.0', result: { content: [{ type: 'text', text: JSON.stringify(await response.json(), null, 2) }] }, id });
        } catch (err) {
          return res.json({ jsonrpc: '2.0', result: { content: [{ type: 'text', text: `Error: ${err.message}` }] }, id });
        }
      }

      if (name === 'get_womens_basketball_stats') {
        const url = `${NCAA_API_URL}/stats/basketball-women/d1/current/team/${OU_TEAM_IDS['basketball-women']}`;
        console.log(`  Fetching: ${url}`);
        try {
          const response = await fetch(url, { signal: AbortSignal.timeout(10000) });
          if (!response.ok) return res.json({ jsonrpc: '2.0', result: { content: [{ type: 'text', text: `NCAA API error: ${response.status}` }] }, id });
          return res.json({ jsonrpc: '2.0', result: { content: [{ type: 'text', text: JSON.stringify(await response.json(), null, 2) }] }, id });
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
          return res.json({ jsonrpc: '2.0', result: { content: [{ type: 'text', text: JSON.stringify(await response.json(), null, 2) }] }, id });
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
        try {
          const data = await getOUSchedule('volleyball-women', args.year, args.month, ['Fri', 'Sat', 'Sun']);
          if (data.error) return res.json({ jsonrpc: '2.0', result: { content: [{ type: 'text', text: data.error }] }, id });
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
          return res.json({ jsonrpc: '2.0', result: { content: [{ type: 'text', text: JSON.stringify(await response.json(), null, 2) }] }, id });
        } catch (err) {
          return res.json({ jsonrpc: '2.0', result: { content: [{ type: 'text', text: `Error: ${err.message}` }] }, id });
        }
      }

      if (name === 'get_volleyball_stats') {
        const url = `${NCAA_API_URL}/stats/volleyball-women/d1/current/team/${OU_TEAM_IDS['volleyball-women']}`;
        console.log(`  Fetching: ${url}`);
        try {
          const response = await fetch(url, { signal: AbortSignal.timeout(10000) });
          if (!response.ok) return res.json({ jsonrpc: '2.0', result: { content: [{ type: 'text', text: `NCAA API error: ${response.status}` }] }, id });
          return res.json({ jsonrpc: '2.0', result: { content: [{ type: 'text', text: JSON.stringify(await response.json(), null, 2) }] }, id });
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
          return res.json({ jsonrpc: '2.0', result: { content: [{ type: 'text', text: JSON.stringify(await response.json(), null, 2) }] }, id });
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
        try {
          const data = await getOUSchedule('soccer-women', args.year, args.month, ['Thu', 'Fri', 'Sun']);
          if (data.error) return res.json({ jsonrpc: '2.0', result: { content: [{ type: 'text', text: data.error }] }, id });
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
          return res.json({ jsonrpc: '2.0', result: { content: [{ type: 'text', text: JSON.stringify(await response.json(), null, 2) }] }, id });
        } catch (err) {
          return res.json({ jsonrpc: '2.0', result: { content: [{ type: 'text', text: `Error: ${err.message}` }] }, id });
        }
      }

      if (name === 'get_soccer_stats') {
        const url = `${NCAA_API_URL}/stats/soccer-women/d1/current/team/${OU_TEAM_IDS['soccer-women']}`;
        console.log(`  Fetching: ${url}`);
        try {
          const response = await fetch(url, { signal: AbortSignal.timeout(10000) });
          if (!response.ok) return res.json({ jsonrpc: '2.0', result: { content: [{ type: 'text', text: `NCAA API error: ${response.status}` }] }, id });
          return res.json({ jsonrpc: '2.0', result: { content: [{ type: 'text', text: JSON.stringify(await response.json(), null, 2) }] }, id });
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
          return res.json({ jsonrpc: '2.0', result: { content: [{ type: 'text', text: JSON.stringify(await response.json(), null, 2) }] }, id });
        } catch (err) {
          return res.json({ jsonrpc: '2.0', result: { content: [{ type: 'text', text: `Error: ${err.message}` }] }, id });
        }
      }

      return res.json({ jsonrpc: '2.0', error: { code: -32601, message: `Unknown tool: ${name}` }, id });
    }

    return res.json({ jsonrpc: '2.0', error: { code: -32601, message: `Unknown method: ${method}` }, id });

  } catch (error) {
    console.error('MCP error:', error);
    return res.status(500).json({ jsonrpc: '2.0', error: { code: -32603, message: error.message }, id: req.body?.id });
  }
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`\n🚀 NCAA Women's Sports MCP Server running on port ${PORT}`);
  console.log(`📊 Tools available: 20`);
  console.log(`NCAA API URL: ${NCAA_API_URL}`);
  console.log(`MCP Key: ${MCP_API_KEY ? 'SET ✓' : 'NONE'}\n`);
});

setInterval(() => {
  fetch(`http://localhost:${PORT}/health`).catch(() => {});
  console.log(`💓 Alive: ${Math.floor(process.uptime())}s`);
}, 30000);
