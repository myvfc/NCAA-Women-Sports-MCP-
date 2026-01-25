# NCAA WOMEN'S SPORTS MCP - FIX REQUIRED

## 🔍 WHAT WENT WRONG

**The Problem:**
The original NCAA Women's Sports MCP was configured for **stdio transport** (standard input/output), but your orchestrator calls MCPs via **HTTP POST requests**.

**Evidence:**
- Orchestrator successfully routed to the MCP ✅
- Request timed out with "operation was aborted" ❌
- No logs from the MCP = it never received the HTTP request ❌

**Root Cause:**
```javascript
// WRONG - Original server.js used stdio:
const transport = new StdioServerTransport();
await server.connect(transport);
```

Your orchestrator does:
```javascript
// Makes HTTP POST to /mcp endpoint
await fetchJson(NCAA_WOMENS_MCP_URL, payload, 7000, "tools/call");
```

**Stdio ≠ HTTP!**

---

## ✅ THE FIX

I've created a new **HTTP-based server** that:
1. Uses Express to listen on HTTP
2. Accepts JSON-RPC requests at `/mcp` endpoint
3. Matches your other MCPs' architecture

---

## 📦 NEW FILES

**1. server-http.js** (NEW - MAIN FILE)
- HTTP server using Express
- Listens on PORT (from environment)
- Responds to POST /mcp with JSON-RPC
- Same 20 tools, different transport

**2. package.json** (UPDATED)
- Added `express` and `cors` dependencies
- Changed main file to `server-http.js`
- Updated start script

**3. README.md** (UPDATED)
- Documents HTTP architecture
- Explains endpoints

---

## 🚀 DEPLOYMENT STEPS

### STEP 1: Update Files in GitHub Repo

Replace these 3 files in your `ncaa-womens-sports-mcp` GitHub repo:
1. **server-http.js** (add this new file)
2. **package.json** (replace with updated version)
3. **README.md** (replace with updated version)

**OR** you can delete `server.js` and rename `server-http.js` to `server.js` if you prefer.

---

### STEP 2: Push to GitHub

```bash
cd /path/to/ncaa-womens-sports-mcp
git add .
git commit -m "Fix: Convert from stdio to HTTP transport for orchestrator compatibility"
git push
```

---

### STEP 3: Redeploy on Railway

**Option A: Automatic**
- Railway will auto-redeploy when you push to GitHub

**Option B: Manual**
- Go to Railway dashboard → NCAA Women's Sports MCP project
- Click "Deploy" or trigger a new deployment

---

### STEP 4: Verify Deployment

**Check logs for:**
```
🏐 NCAA Women's Sports MCP Server
📍 NCAA API URL: https://ncaa-api-production-20d9.up.railway.app
🚪 Port: 8080
✅ NCAA Women's Sports MCP Server running on port 8080
📍 Endpoint: http://0.0.0.0:8080/mcp
🏐 Ready to serve women's sports data!
```

---

### STEP 5: Test Again

Try the query: **"What was OU's softball score?"**

**Expected orchestrator logs:**
```
🔧 Calling function: get_ncaa_womens_sports { query: 'OU softball score' }
🏐 NCAA Women's Sports for: "OU softball score"
🏐 NCAA Women's Sports Request: "OU softball score"
🔗 NCAA_WOMENS_MCP_URL: https://ncaa-women-sports-mcp-production.up.railway.app
🔧 Using NCAA Women's tool: get_softball_scores {}
📡 NCAA API request: https://ncaa-api-production-20d9.up.railway.app/scoreboard/softball/d1/2026/01/25/all-conf
📊 NCAA Women's Result - ok: true, status: 200  ← SUCCESS!
✅ NCAA Women's Response: ...
```

**Expected MCP logs:**
```
📥 MCP Request: tools/call
📦 Params: { name: 'get_softball_scores', arguments: {} }
🔧 Calling tool: get_softball_scores
📡 NCAA API request: https://ncaa-api-production-20d9.up.railway.app/scoreboard/softball/d1/2026/01/25/all-conf
✅ Tool executed successfully
```

---

## 🎯 WHY THIS FIX WORKS

**Before (BROKEN):**
```
Orchestrator → HTTP POST → NCAA MCP (listening on stdio) → ❌ TIMEOUT
```

**After (FIXED):**
```
Orchestrator → HTTP POST → NCAA MCP (listening on HTTP) → ✅ WORKS!
                 ↓
           /mcp endpoint
                 ↓
        JSON-RPC processor
                 ↓
         NCAA API call
                 ↓
            Response
```

---

## 📋 QUICK CHECKLIST

- [ ] Download new `server-http.js`
- [ ] Download updated `package.json`
- [ ] Download updated `README.md`
- [ ] Add/replace files in GitHub repo
- [ ] Commit and push
- [ ] Verify Railway redeploys
- [ ] Check logs for successful startup
- [ ] Test with "OU softball score" query
- [ ] Celebrate! 🎉

---

## 🔧 TECHNICAL DETAILS

**HTTP Transport vs Stdio Transport:**

**Stdio** = Process communication via stdin/stdout (for CLI tools)
**HTTP** = Network communication via HTTP requests (for web services)

Your orchestrator is a **web service** calling other **web services**, so all MCPs need HTTP transport.

Your other MCPs (ESPN, CFBD) already use HTTP transport - that's why they work!

---

## 🎉 ONCE FIXED, YOU'LL HAVE:

```
✅ ESPN MCP - HTTP ✅
✅ CFBD Football MCP - HTTP ✅
✅ CFBD Basketball MCP - HTTP ✅
✅ NCAA Women's Sports MCP - HTTP ✅ (FIXED!)

= ALL 4 MCPs WORKING VIA HTTP
= 47 TOOLS TOTAL
= 6 SPORTS COVERED
= COMPLETE SYSTEM! 🏆
```
