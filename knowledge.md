# CLI Publishing

Package is configured as a CLI tool:
- Binary name: `mcpmc`
- Executable: `build/index.js` 
- Global install: `npm install -g @gerred/mcpmc`
- Required files included in npm package:
  - build/index.js (executable)
  - README.md
  - LICENSE
  - package.json

The build script makes the output file executable with `chmod +x`. The shebang line `#!/usr/bin/env node` ensures it runs with Node.js when installed globally.
