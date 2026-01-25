#  NCAA Women's Sports MCP

HTTP-based Model Context Protocol server for NCAA women's sports data, focusing on Oklahoma Sooners coverage.

## Architecture

This is an **HTTP server** (not stdio) that accepts JSON-RPC requests at the `/mcp` endpoint.

Your orchestrator calls this server via HTTP POST requests.

## Supported Sports

- **Softball** - 4x National Champions, Patty Gasso dynasty
- **Women's Basketball** - SEC competitor
- **Volleyball** - Big 12 program
- **Soccer** - Growing program

## Features

### 20 Total Tools (5 per sport)

Each sport provides:
- **Scores** - Game results for specific dates
- **Schedule** - Monthly game schedules
- **Rankings** - Current NCAA Division I rankings
- **Stats** - Team statistics for current season
- **Standings** - Conference standings

## Environment Variables

Set in Railway dashboard (Variables tab):

```
NCAA_API_URL=https://ncaa-api-production-20d9.up.railway.app
```

## Installation

```bash
npm install
```

## Usage

Start the HTTP server:

```bash
npm start
```

The server will listen on the PORT specified by environment variable (default: 3000).

Endpoints:
- `GET /` - Health check and service info
- `GET /health` - Simple health check
- `POST /mcp` - MCP JSON-RPC endpoint

## Deployment to Railway

1. Push this repo to GitHub
2. Create new Railway project
3. Deploy from GitHub repo
4. Set environment variable: `NCAA_API_URL`
5. Done!

## Sport Seasons

- **Softball**: February - June
- **Women's Basketball**: November - March
- **Volleyball**: August - December
- **Soccer**: August - November

## Tools

### Softball
- `get_softball_scores` - Game scores for specific date
- `get_softball_schedule` - Monthly schedule
- `get_softball_rankings` - Current rankings
- `get_softball_stats` - OU team statistics
- `get_softball_standings` - Conference standings

### Women's Basketball
- `get_womens_basketball_scores`
- `get_womens_basketball_schedule`
- `get_womens_basketball_rankings`
- `get_womens_basketball_stats`
- `get_womens_basketball_standings`

### Volleyball
- `get_volleyball_scores`
- `get_volleyball_schedule`
- `get_volleyball_rankings`
- `get_volleyball_stats`
- `get_volleyball_standings`

### Soccer
- `get_soccer_scores`
- `get_soccer_schedule`
- `get_soccer_rankings`
- `get_soccer_stats`
- `get_soccer_standings`

## OU Team IDs

- Softball: 281
- Women's Basketball: 520
- Volleyball: 520
- Soccer: 520

## API Data Source

Data sourced from NCAA.com via self-hosted NCAA API (henrygd/ncaa-api).

## License

MIT
