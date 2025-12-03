# Playwright MCP Server Setup

This guide explains how to set up the Playwright MCP server to enable autonomous
browser-based testing via the `/e2e-flow-test` command.

## What is Playwright MCP?

The Playwright Model Context Protocol (MCP) server provides browser automation
capabilities that allow Claude to interact with web applications through a headless or
headed browser. This enables autonomous testing, web scraping, form filling, and UI
interaction.

## Prerequisites

- Node.js 18+ installed
- Claude Desktop or compatible MCP client
- pnpm or npm package manager

## Installation Steps

### Step 1: Install Playwright MCP Server

The recommended Playwright MCP server is maintained by Execute Automation:

```bash
# Clone the repository
cd ~ # or wherever you keep your tools
git clone https://github.com/executeautomation/mcp-playwright.git
cd mcp-playwright

# Install dependencies
npm install

# Build the server
npm run build
```

Alternative: Install via npx (no local installation required):

```bash
# Verify it works
npx @executeautomation/mcp-playwright --version
```

### Step 2: Configure Claude Desktop

Add the Playwright MCP server to your Claude Desktop configuration.

**Configuration file location:**

- macOS: `~/Library/Application Support/Claude/claude_desktop_config.json`
- Windows: `%APPDATA%\Claude\claude_desktop_config.json`
- Linux: `~/.config/claude/claude_desktop_config.json`

**Add this configuration:**

```json
{
  "mcpServers": {
    "playwright": {
      "command": "npx",
      "args": ["@executeautomation/mcp-playwright"],
      "env": {
        "HEADLESS": "false"
      }
    }
  }
}
```

**Configuration options:**

- `HEADLESS`: Set to `"false"` to see the browser during testing (helpful for debugging)
- `HEADLESS`: Set to `"true"` for background execution (faster, uses less resources)

**If you cloned locally instead of using npx:**

```json
{
  "mcpServers": {
    "playwright": {
      "command": "node",
      "args": ["/absolute/path/to/mcp-playwright/build/index.js"],
      "env": {
        "HEADLESS": "false"
      }
    }
  }
}
```

### Step 3: Restart Claude Desktop

After updating the configuration:

1. Quit Claude Desktop completely (Cmd+Q on macOS, not just close the window)
2. Reopen Claude Desktop
3. The Playwright MCP server should connect automatically

### Step 4: Verify Installation

In Claude Code, verify the Playwright MCP is available:

```
> /mcp
```

You should see `playwright` listed as a connected MCP server.

Alternatively, check for Playwright tools:

```
Available Playwright tools:
- playwright_navigate
- playwright_click
- playwright_fill
- playwright_screenshot
- playwright_evaluate
And more...
```

## Alternative MCP Servers

While the Execute Automation server is recommended, other Playwright MCP implementations
exist:

### @modelcontextprotocol/server-playwright

Official MCP Playwright server (simpler but less feature-rich):

```bash
npm install -g @modelcontextprotocol/server-playwright
```

```json
{
  "mcpServers": {
    "playwright": {
      "command": "mcp-server-playwright"
    }
  }
}
```

### @automatalabs/mcp-server-playwright

Another community implementation with additional features:

```bash
npm install -g @automatalabs/mcp-server-playwright
```

Configuration similar to above.

## Usage in Commands

Once installed, the `/e2e-flow-test` command will use Playwright MCP tools to:

1. Launch a browser instance
2. Navigate to your local application (http://localhost:3000)
3. Interact with forms, buttons, and UI elements
4. Take screenshots of errors or important states
5. Verify the complete user flow
6. Generate a detailed test report

## Troubleshooting

### Server Not Connecting

**Symptoms:** `/mcp` doesn't show Playwright, or shows it as disconnected

**Solutions:**

1. Check the configuration file path is correct
2. Verify the `command` and `args` are accurate
3. Check logs in Claude Desktop (Help → View Logs)
4. Ensure Node.js is in your PATH
5. Try absolute paths instead of `npx`

### Browser Doesn't Launch

**Symptoms:** Commands hang or timeout when trying to use browser

**Solutions:**

1. Verify Playwright browsers are installed:
   ```bash
   npx playwright install
   ```
2. Check `HEADLESS` environment variable
3. Look for permission issues (especially on macOS with screen recording)
4. Try headed mode first (`HEADLESS: "false"`) to see what's happening

### Permission Errors on macOS

Playwright may require Screen Recording permissions:

1. System Preferences → Security & Privacy → Privacy
2. Select "Screen Recording"
3. Add Claude Desktop to the list
4. Restart Claude Desktop

### Commands Timeout

If browser operations are slow:

1. Increase timeout in the command (look for `timeout` parameters)
2. Check your application is actually running at http://localhost:3000
3. Try headed mode to see where it's getting stuck
4. Check network tab for slow API calls

## Testing the Setup

Once configured, test the Playwright MCP is working:

### Simple Navigation Test

Ask Claude:

```
Use Playwright to navigate to https://example.com and tell me the page title.
```

Claude should:

1. Launch a browser
2. Navigate to the URL
3. Extract and report the page title

### Local Application Test

Ensure your app is running:

```bash
pnpm dev
```

Then ask Claude:

```
Use Playwright to navigate to http://localhost:3000 and describe what you see.
```

Claude should be able to access your local development server.

### Run the E2E Flow Test

Once confirmed working:

```
> /e2e-flow-test
```

Claude will autonomously navigate through your application's user flow and generate a
comprehensive report.

## Resources

- **Playwright Documentation**: https://playwright.dev/
- **MCP Specification**: https://modelcontextprotocol.io/
- **Execute Automation MCP Server**: https://github.com/executeautomation/mcp-playwright
- **Official MCP Playwright**:
  https://github.com/modelcontextprotocol/servers/tree/main/src/playwright

## Security Considerations

**Important:** Playwright MCP has access to:

- Your browser and cookies
- Any websites you visit during testing
- Local files (if granted permissions)
- Screen recording (on some systems)

**Best practices:**

- Only use on trusted local development environments
- Don't run E2E tests against production with real user credentials
- Review the MCP server code before installation
- Use test accounts, not real user accounts
- Be cautious about what sites you allow Claude to navigate to

## Next Steps

After setup:

1. Run `/e2e-flow-test` to verify your application's core user flow
2. Review the generated test report
3. Fix any issues discovered
4. Consider creating additional test commands for specific flows
5. Integrate into your CI/CD pipeline (future enhancement)
