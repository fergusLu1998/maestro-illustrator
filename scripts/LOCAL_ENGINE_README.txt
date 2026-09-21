Pocket Atlas optional local engine
1. Install and license Schrodinger separately.
2. Start the web workbench with npm ci, then npm run dev.
3. In a second terminal run your Schrodinger run.exe with python3 scripts/schrodinger_bridge.py.
   Or run start_pocket_atlas.cmd and enter the installation directory when asked.
4. Open http://localhost:3000/. The page discovers the loopback service automatically.
5. Keep the engine terminal open while importing native structures or calculating interactions.
The engine binds 127.0.0.1 only and uses a per-session token. Do not commit connection JSON.
The launcher applies PowerShell policy only to its process; it does not change the system policy.
Project JSON stores structures and cached interactions, never the engine token.
Original coordinates, bonds and charges can restore structures after restart.
Schrodinger software and licenses are not redistributed by this repository.
