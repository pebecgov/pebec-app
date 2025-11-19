# Excel MCP Server Setup Guide

## ✅ Configuration Added

The Excel MCP server has been added to your Cursor settings at:
`~/Library/Application Support/Cursor/User/settings.json`

## Prerequisites

### 1. Install `uvx` (if not already installed)

The Excel MCP server uses `uvx` to run. Install it using one of these methods:

**Option A: Using pip**
```bash
pip install uv
```

**Option B: Using Homebrew (macOS)**
```bash
brew install uv
```

**Option C: Using the official installer**
```bash
curl -LsSf https://astral.sh/uv/install.sh | sh
```

### 2. Verify Installation

After installing, verify `uvx` is available:
```bash
uvx --version
```

## Configuration Details

The server is configured to use **stdio transport** (local use), which means:
- ✅ No need to set `EXCEL_FILES_PATH` environment variable
- ✅ File paths are provided with each tool call
- ✅ Works directly with your local files

### Current Configuration:
```json
{
  "mcpServers": {
    "excel": {
      "command": "uvx",
      "args": ["excel-mcp-server", "stdio"]
    }
  }
}
```

## Restart Cursor

**Important**: After adding the MCP server configuration, you need to:
1. **Restart Cursor completely** (quit and reopen)
2. The MCP server will automatically start when Cursor launches

## Alternative: Streamable HTTP Transport

If you prefer to run the server as a separate process (useful for remote access or debugging), you can use the streamable HTTP transport:

### 1. Start the server manually:
```bash
# Set the Excel files directory (optional, defaults to ./excel_files)
export EXCEL_FILES_PATH="/path/to/your/excel/files"
export FASTMCP_PORT=8017

# Start the server
uvx excel-mcp-server streamable-http
```

### 2. Update Cursor settings:
```json
{
  "mcpServers": {
    "excel": {
      "url": "http://localhost:8017/mcp"
    }
  }
}
```

## Testing the Setup

After restarting Cursor, you can test if the MCP server is working by:

1. Opening the Cursor chat/Composer
2. Asking it to work with Excel files, for example:
   - "Create an Excel file with sample data"
   - "Read data from an Excel file"
   - "Update a cell in an Excel file"

## Available Features

The Excel MCP server provides:
- 📊 Create, read, update workbooks and worksheets
- 📈 Data manipulation: Formulas, formatting, charts, pivot tables
- 🔍 Data validation
- 🎨 Formatting: Font styling, colors, borders, alignment
- 📋 Table operations
- 📊 Chart creation
- 🔄 Pivot Tables
- 🔧 Sheet management

## Troubleshooting

### Issue: "uvx: command not found"
**Solution**: Install `uv` using one of the methods above

### Issue: MCP server not connecting
**Solution**: 
1. Make sure Cursor is fully restarted
2. Check Cursor's developer console for errors
3. Verify the configuration JSON is valid

### Issue: Permission errors
**Solution**: Make sure `uvx` has execute permissions and Python is properly installed

## Documentation

For more details, see:
- [Excel MCP Server GitHub](https://github.com/haris-musa/excel-mcp-server)
- [MCP Protocol Documentation](https://modelcontextprotocol.io/)


