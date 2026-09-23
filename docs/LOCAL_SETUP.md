# Run the Clea 2.0 Device Pairing Demo Locally

## Requirements

- Node.js 20.9 or newer, with npm.
- A modern desktop browser.
- Ports **3000** and **2001** available on your computer.

The demo runs entirely on your computer. An internet connection is needed only to install npm dependencies the first time.

## Download and start

1. On the GitHub repository page, select **Code → Download ZIP**, then extract the archive. Alternatively, clone the repository with Git.
2. Open a terminal in the extracted project folder, the one containing `package.json`. On macOS, use the **Terminal** app and run `cd "/path/to/extracted-folder"` first, replacing the example path with the folder you extracted.
3. Install dependencies and start the demo:

   ```sh
   npm install
   npm run dev
   ```

   **macOS:** the commands above are all you need; `npm run dev` starts both local servers. There is no separate Mac launcher.

   **Windows:** after `npm install`, you can also run `Avvia-demo.ps1` from PowerShell. If script execution is restricted, use `npm run dev` instead.

4. Wait until the terminal prints both local addresses, then open:

   - **Device simulator:** [http://localhost:3000](http://localhost:3000)
   - **Platform simulator:** [http://localhost:2001](http://localhost:2001)

Keep the terminal open while presenting. Press **Ctrl+C** there to stop both servers.

## Try the pairing flow

The device boots automatically. Open its **Device Pairing** app and generate a code. On the platform, select **Add device → Pair with a code**, enter that code, and follow the modal through confirmation and connection. The device also shows a link that opens a simulated, prefilled sign-in and takes you directly to the code-entry modal.

For a complete presentation script and an explanation of what is mocked, see the [presenter guide](DEMO_WALKTHROUGH.md).

## Reset and troubleshooting

- Select **Reset demo** on either surface to clear the mock pairing state. On the device, this also replays the boot animation.
- If a page is temporarily unavailable during startup, wait a few seconds and refresh it.
- If either address remains unavailable, check that ports **3000** and **2001** are not in use, then restart `npm run dev`.
- The mock state is held in memory. Restarting the server clears it.

Optional checks for developers:

```sh
npm run typecheck
npm test
npm run build
```

The browser walkthrough check also requires Playwright Chromium (`npx playwright install chromium`), two running demo servers, and then `npm run test:browser`.
