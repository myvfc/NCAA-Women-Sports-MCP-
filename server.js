#!/usr/bin/env node

import express from 'express';
import cors from 'cors';
import fetch from 'node-fetch';

const app = express();
app.use(cors());
app.use(express.json());

// NCAA API base URL from environment variable
const NCAA_API_URL = process.env.NCAA_API_URL || 'https://ncaa-api-production-20d9.up.railway.app';
const PORT = process.env.PORT || 3000;

console.log('🏐 NCAA Women\'s Sports MCP Server');
console.log(`📍 NCAA API URL: ${NCAA_API_URL}`);
console.log(`🚪 Port: ${PORT}`);

// OU team IDs for different sports
const OU_TEAM_IDS = {
  softball: 281,
  'basketball-women': 520,
  'volleyball-women': 520,
  'soccer-women': 520
};

// Helper function to make NCAA API requests
async function makeNCAARequest(endpoint) {
  try {
    const url = `${NCAA_API_URL}${endpoint}`;
    console.log(`📡 NCAA API request: ${url}`);
    
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`NCAA API returned ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json();
    return data;
  } catch (error) {
    console.error(`❌ NCAA API request failed: ${error.message}`);
    throw error;
  }
}

// Helper to get current date in NCAA format
function getCurrentDateString() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}/${month}/${day}`;
}

// Helper to format date for API
function formatDateForAPI(date) {
  if (!date) return getCurrentDateString();
  // Expected format: YYYY-MM-DD, convert to YYYY/MM/DD
  return date.replace(/-/g, '/');
}

// Health check endpoints
app.get('/', (req, res) => {
  res.json({
    service: 'NCAA Women\'s Sports MCP',
    status: 'ok',
    ncaaApiUrl: NCAA_API_URL,
    sports: ['softball', 'womens_basketball', 'volleyball', 'soccer'],
    toolsAvailable: 20
  });
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// MCP JSON-RPC endpoint
app.post('/mcp', async (req, res) => {
  try {
    const { method, params } = req.body;
    
    console.log(`\n📥 MCP Request: ${method}`);
    console.log(`📦 Params:`, JSON.stringify(params, null, 2));
    
    // Handle tools/list
    if (method === 'tools/list') {
      return res.json({
        jsonrpc: '2.0',
        id: req.body.id,
        result: {
          tools: [
            {
              name: 'get_softball_scores',
              description: 'Get softball game scores for a specific date',
              inputSchema: {
                type: 'object',
                properties: {
                  date: { type: 'string', description: 'Date in YYYY-MM-DD format' }
                }
              }
            },
            {
              name: 'get_softball_schedule',
              description: 'Get softball schedule for a specific month',
              inputSchema: {
                type: 'object',
                properties: {
                  year: { type: 'string', description: 'Year (e.g., 2025)' },
                  month: { type: 'string', description: 'Month (e.g., 02)' }
                },
                required: ['year', 'month']
              }
            },
            {
              name: 'get_softball_rankings',
              description: 'Get current softball rankings'
            },
            {
              name: 'get_softball_stats',
              description: 'Get OU softball team statistics'
            },
            {
              name: 'get_softball_standings',
              description: 'Get softball conference standings'
            },
            {
              name: 'get_womens_basketball_scores',
              description: 'Get women\'s basketball scores'
            },
            {
              name: 'get_womens_basketball_schedule',
              description: 'Get women\'s basketball schedule'
            },
            {
              name: 'get_womens_basketball_rankings',
              description: 'Get women\'s basketball rankings'
            },
            {
              name: 'get_womens_basketball_stats',
              description: 'Get women\'s basketball stats'
            },
            {
              name: 'get_womens_basketball_standings',
              description: 'Get women\'s basketball standings'
            },
            {
              name: 'get_volleyball_scores',
              description: 'Get volleyball scores'
            },
            {
              name: 'get_volleyball_schedule',
              description: 'Get volleyball schedule'
            },
            {
              name: 'get_volleyball_rankings',
              description: 'Get volleyball rankings'
            },
            {
              name: 'get_volleyball_stats',
              description: 'Get volleyball stats'
            },
            {
              name: 'get_volleyball_standings',
              description: 'Get volleyball standings'
            },
            {
              name: 'get_soccer_scores',
              description: 'Get soccer scores'
            },
            {
              name: 'get_soccer_schedule',
              description: 'Get soccer schedule'
            },
            {
              name: 'get_soccer_rankings',
              description: 'Get soccer rankings'
            },
            {
              name: 'get_soccer_stats',
              description: 'Get soccer stats'
            },
            {
              name: 'get_soccer_standings',
              description: 'Get soccer standings'
            }
          ]
        }
      });
    }
    
    // Handle tools/call
    if (method === 'tools/call') {
      const { name, arguments: args } = params;
      
      console.log(`🔧 Calling tool: ${name}`);
      console.log(`📋 Arguments:`, JSON.stringify(args, null, 2));
      
      let data;
      
      try {
        // SOFTBALL TOOLS
        if (name === 'get_softball_scores') {
          const date = formatDateForAPI(args.date);
          data = await makeNCAARequest(`/scoreboard/softball/d1/${date}/all-conf`);
        }
        else if (name === 'get_softball_schedule') {
          const { year, month } = args;
          data = await makeNCAARequest(`/schedule/softball/d1/${year}/${month}`);
        }
        else if (name === 'get_softball_rankings') {
          data = await makeNCAARequest('/rankings/softball/d1');
        }
        else if (name === 'get_softball_stats') {
          const teamId = OU_TEAM_IDS.softball;
          data = await makeNCAARequest(`/stats/softball/d1/current/team/${teamId}`);
        }
        else if (name === 'get_softball_standings') {
          data = await makeNCAARequest('/standings/softball/d1');
        }
        
        // WOMEN'S BASKETBALL TOOLS
        else if (name === 'get_womens_basketball_scores') {
          const date = formatDateForAPI(args.date);
          data = await makeNCAARequest(`/scoreboard/basketball-women/d1/${date}/all-conf`);
        }
        else if (name === 'get_womens_basketball_schedule') {
          const { year, month } = args;
          data = await makeNCAARequest(`/schedule/basketball-women/d1/${year}/${month}`);
        }
        else if (name === 'get_womens_basketball_rankings') {
          data = await makeNCAARequest('/rankings/basketball-women/d1');
        }
        else if (name === 'get_womens_basketball_stats') {
          const teamId = OU_TEAM_IDS['basketball-women'];
          data = await makeNCAARequest(`/stats/basketball-women/d1/current/team/${teamId}`);
        }
        else if (name === 'get_womens_basketball_standings') {
          data = await makeNCAARequest('/standings/basketball-women/d1');
        }
        
        // VOLLEYBALL TOOLS
        else if (name === 'get_volleyball_scores') {
          const date = formatDateForAPI(args.date);
          data = await makeNCAARequest(`/scoreboard/volleyball-women/d1/${date}/all-conf`);
        }
        else if (name === 'get_volleyball_schedule') {
          const { year, month } = args;
          data = await makeNCAARequest(`/schedule/volleyball-women/d1/${year}/${month}`);
        }
        else if (name === 'get_volleyball_rankings') {
          data = await makeNCAARequest('/rankings/volleyball-women/d1');
        }
        else if (name === 'get_volleyball_stats') {
          const teamId = OU_TEAM_IDS['volleyball-women'];
          data = await makeNCAARequest(`/stats/volleyball-women/d1/current/team/${teamId}`);
        }
        else if (name === 'get_volleyball_standings') {
          data = await makeNCAARequest('/standings/volleyball-women/d1');
        }
        
        // SOCCER TOOLS
        else if (name === 'get_soccer_scores') {
          const date = formatDateForAPI(args.date);
          data = await makeNCAARequest(`/scoreboard/soccer-women/d1/${date}/all-conf`);
        }
        else if (name === 'get_soccer_schedule') {
          const { year, month } = args;
          data = await makeNCAARequest(`/schedule/soccer-women/d1/${year}/${month}`);
        }
        else if (name === 'get_soccer_rankings') {
          data = await makeNCAARequest('/rankings/soccer-women/d1');
        }
        else if (name === 'get_soccer_stats') {
          const teamId = OU_TEAM_IDS['soccer-women'];
          data = await makeNCAARequest(`/stats/soccer-women/d1/current/team/${teamId}`);
        }
        else if (name === 'get_soccer_standings') {
          data = await makeNCAARequest('/standings/soccer-women/d1');
        }
        
        else {
          throw new Error(`Unknown tool: ${name}`);
        }
        
        console.log(`✅ Tool executed successfully`);
        
        return res.json({
          jsonrpc: '2.0',
          id: req.body.id,
          result: {
            content: [{
              type: 'text',
              text: JSON.stringify(data, null, 2)
            }]
          }
        });
        
      } catch (error) {
        console.error(`❌ Tool execution failed:`, error.message);
        
        return res.json({
          jsonrpc: '2.0',
          id: req.body.id,
          error: {
            code: -32603,
            message: error.message
          }
        });
      }
    }
    
    // Unknown method
    return res.json({
      jsonrpc: '2.0',
      id: req.body.id,
      error: {
        code: -32601,
        message: `Method not found: ${method}`
      }
    });
    
  } catch (error) {
    console.error('❌ MCP request error:', error);
    return res.status(500).json({
      jsonrpc: '2.0',
      id: req.body.id,
      error: {
        code: -32603,
        message: 'Internal server error'
      }
    });
  }
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`\n✅ NCAA Women's Sports MCP Server running on port ${PORT}`);
  console.log(`📍 Endpoint: http://0.0.0.0:${PORT}/mcp`);
  console.log(`🏐 Ready to serve women's sports data!\n`);
});
