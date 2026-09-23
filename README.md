# Clea 2.0 Device Pairing Demo

A local, interactive prototype of a proposed short-code device pairing experience. **This is a demo concept, not a feature currently available in Clea 2.0.**

The project runs two local browser surfaces that share one in-memory mock backend:

- **Device simulator:** http://localhost:3000
- **Platform simulator:** http://localhost:2001

Start with the [local setup guide](docs/LOCAL_SETUP.md), then use the [presenter walkthrough](docs/DEMO_WALKTHROUGH.md) to show the complete flow.

```sh
npm install
npm run dev
```

The device generates a temporary, single-use code. The platform resolves it, asks the user to confirm the detected device, and displays a simulated provisioning sequence. The device and platform then both show the device online. The device also provides a link to a simulated sign-in that opens the platform directly at the code-entry step.

The boot, sign-in, registration, credentials, and cloud connection are simulated. No real Clea, Astarte, or Edgehog service is contacted, and no real credentials are created or stored. The example login values are presentation text only and are not submitted to an authentication service.

This concept aims to simplify the [manual connection procedure in the SECO Developer Center](https://developer.seco.com/clea-os/scarthgap_2-03-00/iot/connect-to-clea-cloud/). In a future implementation, registration and provisioning would need secure backend-to-device integration with the existing Clea/Astarte/Edgehog stack.

## Development checks

```sh
npm run typecheck
npm test
npm run build
```

For an automated browser walkthrough, install Playwright Chromium, start the demo, and run `npm run test:browser`. Its screenshots are written to the ignored `artifacts/` directory.
