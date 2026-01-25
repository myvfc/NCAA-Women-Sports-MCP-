#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import fetch from 'node-fetch';

// NCAA API base URL from environment variable
const NCAA_API_URL = process.env.NCAA_API_URL || 'https://ncaa-api-production-20d9.up.railway.app';

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
    console.error(`Making NCAA API request to: ${url}`);
    
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`NCAA API returned ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json();
    return data;
  } catch (error) {
    console.error(`NCAA API request failed: ${error.message}`);
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

// Create server instance
const server = new Server(
  {
    name: 'ncaa-womens-sports-mcp',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Tool definitions
const TOOLS = [
  // SOFTBALL TOOLS
  {
    name: 'get_softball_scores',
    description: 'Get softball game scores and results for a specific date. Use for queries about softball games, scores, or results.',
    inputSchema: {
      type: 'object',
      properties: {
        date: {
          type: 'string',
          description: 'Date in YYYY-MM-DD format (e.g., 2024-05-17). Defaults to today if not provided.'
        }
      }
    }
  },
  {
    name: 'get_softball_schedule',
    description: 'Get softball schedule for a specific month. Use for queries about upcoming games or game schedules.',
    inputSchema: {
      type: 'object',
      properties: {
        year: {
          type: 'string',
          description: 'Year (e.g., 2025)'
        },
        month: {
          type: 'string',
          description: 'Month as two digits (e.g., 02 for February, 05 for May)'
        }
      },
      required: ['year', 'month']
    }
  },
  {
    name: 'get_softball_rankings',
    description: 'Get current NCAA Division I softball rankings.',
    inputSchema: {
      type: 'object',
      properties: {}
    }
  },
  {
    name: 'get_softball_stats',
    description: 'Get OU softball team statistics for the current season.',
    inputSchema: {
      type: 'object',
      properties: {
        stat_type: {
          type: 'string',
          description: 'Type of stats to retrieve (e.g., team, batting, pitching). Defaults to team.'
        }
      }
    }
  },
  {
    name: 'get_softball_standings',
    description: 'Get softball conference standings.',
    inputSchema: {
      type: 'object',
      properties: {}
    }
  },

  // WOMEN'S BASKETBALL TOOLS
  {
    name: 'get_womens_basketball_scores',
    description: 'Get women\'s basketball game scores and results for a specific date.',
    inputSchema: {
      type: 'object',
      properties: {
        date: {
          type: 'string',
          description: 'Date in YYYY-MM-DD format (e.g., 2024-12-15). Defaults to today if not provided.'
        }
      }
    }
  },
  {
    name: 'get_womens_basketball_schedule',
    description: 'Get women\'s basketball schedule for a specific month.',
    inputSchema: {
      type: 'object',
      properties: {
        year: {
          type: 'string',
          description: 'Year (e.g., 2025)'
        },
        month: {
          type: 'string',
          description: 'Month as two digits (e.g., 01 for January, 12 for December)'
        }
      },
      required: ['year', 'month']
    }
  },
  {
    name: 'get_womens_basketball_rankings',
    description: 'Get current NCAA Division I women\'s basketball rankings.',
    inputSchema: {
      type: 'object',
      properties: {}
    }
  },
  {
    name: 'get_womens_basketball_stats',
    description: 'Get OU women\'s basketball team statistics for the current season.',
    inputSchema: {
      type: 'object',
      properties: {
        stat_type: {
          type: 'string',
          description: 'Type of stats to retrieve. Defaults to team stats.'
        }
      }
    }
  },
  {
    name: 'get_womens_basketball_standings',
    description: 'Get women\'s basketball conference standings.',
    inputSchema: {
      type: 'object',
      properties: {}
    }
  },

  // VOLLEYBALL TOOLS
  {
    name: 'get_volleyball_scores',
    description: 'Get volleyball game scores and results for a specific date.',
    inputSchema: {
      type: 'object',
      properties: {
        date: {
          type: 'string',
          description: 'Date in YYYY-MM-DD format (e.g., 2024-09-15). Defaults to today if not provided.'
        }
      }
    }
  },
  {
    name: 'get_volleyball_schedule',
    description: 'Get volleyball schedule for a specific month. Note: Volleyball season is August-December.',
    inputSchema: {
      type: 'object',
      properties: {
        year: {
          type: 'string',
          description: 'Year (e.g., 2024)'
        },
        month: {
          type: 'string',
          description: 'Month as two digits (e.g., 09 for September, 10 for October)'
        }
      },
      required: ['year', 'month']
    }
  },
  {
    name: 'get_volleyball_rankings',
    description: 'Get current NCAA Division I volleyball rankings.',
    inputSchema: {
      type: 'object',
      properties: {}
    }
  },
  {
    name: 'get_volleyball_stats',
    description: 'Get OU volleyball team statistics for the current season.',
    inputSchema: {
      type: 'object',
      properties: {
        stat_type: {
          type: 'string',
          description: 'Type of stats to retrieve. Defaults to team stats.'
        }
      }
    }
  },
  {
    name: 'get_volleyball_standings',
    description: 'Get volleyball conference standings.',
    inputSchema: {
      type: 'object',
      properties: {}
    }
  },

  // SOCCER TOOLS
  {
    name: 'get_soccer_scores',
    description: 'Get women\'s soccer game scores and results for a specific date.',
    inputSchema: {
      type: 'object',
      properties: {
        date: {
          type: 'string',
          description: 'Date in YYYY-MM-DD format (e.g., 2024-09-15). Defaults to today if not provided.'
        }
      }
    }
  },
  {
    name: 'get_soccer_schedule',
    description: 'Get women\'s soccer schedule for a specific month. Note: Soccer season is August-November.',
    inputSchema: {
      type: 'object',
      properties: {
        year: {
          type: 'string',
          description: 'Year (e.g., 2024)'
        },
        month: {
          type: 'string',
          description: 'Month as two digits (e.g., 08 for August, 09 for September)'
        }
      },
      required: ['year', 'month']
    }
  },
  {
    name: 'get_soccer_rankings',
    description: 'Get current NCAA Division I women\'s soccer rankings.',
    inputSchema: {
      type: 'object',
      properties: {}
    }
  },
  {
    name: 'get_soccer_stats',
    description: 'Get OU women\'s soccer team statistics for the current season.',
    inputSchema: {
      type: 'object',
      properties: {
        stat_type: {
          type: 'string',
          description: 'Type of stats to retrieve. Defaults to team stats.'
        }
      }
    }
  },
  {
    name: 'get_soccer_standings',
    description: 'Get women\'s soccer conference standings.',
    inputSchema: {
      type: 'object',
      properties: {}
    }
  }
];

// List available tools
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: TOOLS
  };
});

// Handle tool execution
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    // SOFTBALL TOOLS
    if (name === 'get_softball_scores') {
      const date = formatDateForAPI(args.date);
      const data = await makeNCAARequest(`/scoreboard/softball/d1/${date}/all-conf`);
      return {
        content: [{
          type: 'text',
          text: JSON.stringify(data, null, 2)
        }]
      };
    }

    if (name === 'get_softball_schedule') {
      const { year, month } = args;
      const data = await makeNCAARequest(`/schedule/softball/d1/${year}/${month}`);
      return {
        content: [{
          type: 'text',
          text: JSON.stringify(data, null, 2)
        }]
      };
    }

    if (name === 'get_softball_rankings') {
      const data = await makeNCAARequest('/rankings/softball/d1');
      return {
        content: [{
          type: 'text',
          text: JSON.stringify(data, null, 2)
        }]
      };
    }

    if (name === 'get_softball_stats') {
      const teamId = OU_TEAM_IDS.softball;
      const data = await makeNCAARequest(`/stats/softball/d1/current/team/${teamId}`);
      return {
        content: [{
          type: 'text',
          text: JSON.stringify(data, null, 2)
        }]
      };
    }

    if (name === 'get_softball_standings') {
      const data = await makeNCAARequest('/standings/softball/d1');
      return {
        content: [{
          type: 'text',
          text: JSON.stringify(data, null, 2)
        }]
      };
    }

    // WOMEN'S BASKETBALL TOOLS
    if (name === 'get_womens_basketball_scores') {
      const date = formatDateForAPI(args.date);
      const data = await makeNCAARequest(`/scoreboard/basketball-women/d1/${date}/all-conf`);
      return {
        content: [{
          type: 'text',
          text: JSON.stringify(data, null, 2)
        }]
      };
    }

    if (name === 'get_womens_basketball_schedule') {
      const { year, month } = args;
      const data = await makeNCAARequest(`/schedule/basketball-women/d1/${year}/${month}`);
      return {
        content: [{
          type: 'text',
          text: JSON.stringify(data, null, 2)
        }]
      };
    }

    if (name === 'get_womens_basketball_rankings') {
      const data = await makeNCAARequest('/rankings/basketball-women/d1');
      return {
        content: [{
          type: 'text',
          text: JSON.stringify(data, null, 2)
        }]
      };
    }

    if (name === 'get_womens_basketball_stats') {
      const teamId = OU_TEAM_IDS['basketball-women'];
      const data = await makeNCAARequest(`/stats/basketball-women/d1/current/team/${teamId}`);
      return {
        content: [{
          type: 'text',
          text: JSON.stringify(data, null, 2)
        }]
      };
    }

    if (name === 'get_womens_basketball_standings') {
      const data = await makeNCAARequest('/standings/basketball-women/d1');
      return {
        content: [{
          type: 'text',
          text: JSON.stringify(data, null, 2)
        }]
      };
    }

    // VOLLEYBALL TOOLS
    if (name === 'get_volleyball_scores') {
      const date = formatDateForAPI(args.date);
      const data = await makeNCAARequest(`/scoreboard/volleyball-women/d1/${date}/all-conf`);
      return {
        content: [{
          type: 'text',
          text: JSON.stringify(data, null, 2)
        }]
      };
    }

    if (name === 'get_volleyball_schedule') {
      const { year, month } = args;
      const data = await makeNCAARequest(`/schedule/volleyball-women/d1/${year}/${month}`);
      return {
        content: [{
          type: 'text',
          text: JSON.stringify(data, null, 2)
        }]
      };
    }

    if (name === 'get_volleyball_rankings') {
      const data = await makeNCAARequest('/rankings/volleyball-women/d1');
      return {
        content: [{
          type: 'text',
          text: JSON.stringify(data, null, 2)
        }]
      };
    }

    if (name === 'get_volleyball_stats') {
      const teamId = OU_TEAM_IDS['volleyball-women'];
      const data = await makeNCAARequest(`/stats/volleyball-women/d1/current/team/${teamId}`);
      return {
        content: [{
          type: 'text',
          text: JSON.stringify(data, null, 2)
        }]
      };
    }

    if (name === 'get_volleyball_standings') {
      const data = await makeNCAARequest('/standings/volleyball-women/d1');
      return {
        content: [{
          type: 'text',
          text: JSON.stringify(data, null, 2)
        }]
      };
    }

    // SOCCER TOOLS
    if (name === 'get_soccer_scores') {
      const date = formatDateForAPI(args.date);
      const data = await makeNCAARequest(`/scoreboard/soccer-women/d1/${date}/all-conf`);
      return {
        content: [{
          type: 'text',
          text: JSON.stringify(data, null, 2)
        }]
      };
    }

    if (name === 'get_soccer_schedule') {
      const { year, month } = args;
      const data = await makeNCAARequest(`/schedule/soccer-women/d1/${year}/${month}`);
      return {
        content: [{
          type: 'text',
          text: JSON.stringify(data, null, 2)
        }]
      };
    }

    if (name === 'get_soccer_rankings') {
      const data = await makeNCAARequest('/rankings/soccer-women/d1');
      return {
        content: [{
          type: 'text',
          text: JSON.stringify(data, null, 2)
        }]
      };
    }

    if (name === 'get_soccer_stats') {
      const teamId = OU_TEAM_IDS['soccer-women'];
      const data = await makeNCAARequest(`/stats/soccer-women/d1/current/team/${teamId}`);
      return {
        content: [{
          type: 'text',
          text: JSON.stringify(data, null, 2)
        }]
      };
    }

    if (name === 'get_soccer_standings') {
      const data = await makeNCAARequest('/standings/soccer-women/d1');
      return {
        content: [{
          type: 'text',
          text: JSON.stringify(data, null, 2)
        }]
      };
    }

    // Unknown tool
    throw new Error(`Unknown tool: ${name}`);

  } catch (error) {
    return {
      content: [{
        type: 'text',
        text: `Error: ${error.message}`
      }],
      isError: true
    };
  }
});

// Start the server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('NCAA Women\'s Sports MCP server running on stdio');
  console.error(`Using NCAA API at: ${NCAA_API_URL}`);
  console.error('Available sports: Softball, Women\'s Basketball, Volleyball, Soccer');
  console.error('Total tools: 20');
}

main().catch((error) => {
  console.error('Fatal error in main():', error);
  process.exit(1);
});
