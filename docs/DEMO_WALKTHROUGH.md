# Clea 2.0 Device Pairing Demo — Presenter Guide

## Purpose

This demo illustrates a proposed, simpler way to connect a device to Clea 2.0: power it on, generate a temporary pairing code, enter the code in the platform, verify the detected device, and confirm the pairing.

The [current SECO Developer Center guide](https://developer.seco.com/clea-os/scarthgap_2-03-00/iot/connect-to-clea-cloud/) describes a manual process: register a device in Clea Astarte, copy its Credentials Secret, configure Astarte Message Hub and Edgehog data on the device, restart services, and check the connection. The Developer Center positions that manual procedure as a starting point for demos or trials and recommends automated registration for production.

This prototype explores what a guided experience could look like if those technical steps happened behind the scenes. **Short-code pairing is a concept demonstrated here, not a claim that this capability already exists in Clea 2.0.**

## What the prototype actually does

This is a **working local prototype built solely for demonstration**. Two browser surfaces share a mock backend: a code created on the simulated device can be resolved on the simulated platform, and both surfaces show the resulting state changes. The boot sequence, sign-in, device registration, provisioning, and cloud connection are simulated. No real Clea, Astarte, or Edgehog service is contacted; no physical device is configured or real credentials are created.

The short code identifies a temporary, single-use pairing session. **It is not an Astarte Credentials Secret or a permanent device credential.**

For installation and startup instructions, see [Run the demo locally](LOCAL_SETUP.md).

## Main walkthrough: start from the platform

Open the device at [localhost:3000](http://localhost:3000) and the platform at [localhost:2001](http://localhost:2001), ideally in separate windows so viewers can see both.

| Step                  | What to do                                                                                       | What to explain                                                                                            |
| --------------------- | ------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------- |
| 1. Power on           | Wait for the simulated boot sequence on the device.                                              | This represents a Clea OS device starting; it does not control a physical board.                           |
| 2. Open pairing       | Open **Device Pairing** on the dark device desktop, then select **Generate pairing code**.       | The device prepares a temporary session and displays a code in `XXX-XXX` format.                           |
| 3. Open Devices       | On `localhost:2001`, go to **Devices** and select **Add device**.                                | The device list stays visible while a step-by-step modal guides pairing.                                   |
| 4. Choose a method    | Select **Pair with a code**.                                                                     | Manual setup is shown as an alternative but is outside the scope of this demo.                             |
| 5. Enter the code     | Type the code shown on the device and select **Find device**.                                    | The code locates the waiting session. It expires after 10 minutes and can be used only once.               |
| 6. Confirm the device | Check the hardware and serial number, optionally rename the device, then select **Pair device**. | Explicit confirmation helps prevent pairing the wrong device.                                              |
| 7. Watch connection   | Wait for the steps in the modal and look at the device window.                                   | Registration, configuration, and service startup are simulated; the two views reflect the same mock state. |
| 8. Show the result    | When **Device connected** appears, select **View device list**.                                  | The device now appears **Online** in the list and on the device simulator.                                 |

## Alternative walkthrough: follow the device link

After generating the code, select the link displayed on the device (`localhost:2001/login`). It opens a demonstration sign-in screen with email and password already filled in. Select **Sign in**. The platform opens its **Devices** list with the modal already on **Enter pairing code**. Continue from step 5 above.

This route shows how a device could direct someone to the right place to finish pairing. The sign-in screen does not perform real authentication.

## Suggested presenter narration

> “Today, the Developer Center documents a manual connection: register the device, obtain credentials, configure services on the device, and check that it comes online. This demo explores a simpler experience: I power on the device, obtain a short code, enter it in Clea, verify the device identity, and confirm. The two screens really interact in this local prototype, while registration and provisioning are simulated.”

## Demo boundaries

- **Working in the prototype:** code creation and resolution, expiry and single use, modal steps, explicit confirmation, shared state updates, and reset.
- **Simulated:** device boot, sign-in, credential creation, Clea OS provisioning, service startup, and cloud connection.
- **Needed for a real product:** authentication and authorization, a pairing service, backend integration with Astarte and Edgehog, secure credential delivery to the device, and production error and lifecycle handling.

Use **Reset demo** to return to the starting state and repeat the presentation.
