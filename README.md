# SIRIP Frontend

React and Vite dashboard for monitoring SIRIP yellowfin tuna cold-chain operations. The current single-page demo implements the design direction documented in `../docs/SIRIP AI UIUX.md`.

## Development

```sh
npm install
npm run dev
```

Use `npm run lint` and `npm run build` to verify changes.

Sensor provisioning requires desktop Chrome in a secure context and `VITE_DEVICE_API_URL` set to a backend URL reachable by the ESP32 on the local network. See `../docs/SIRIP BLE Provisioning.md` for the firmware contract.
