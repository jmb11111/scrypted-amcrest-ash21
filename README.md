# Scrypted Amcrest ASH21 PTZ Plugin

Full PTZ control for **Amcrest ASH21** cameras in [Scrypted](https://scrypted.app),
via the Dahua **DVRIP** protocol, plus a built-in **ONVIF server** so NVRs like
**Frigate** can drive PTZ. Also proxies the camera's native ONVIF events.

## Install

In Scrypted: **Install Scrypted Plugin → `scrypted-amcrest-ash21`**. Updates land
through the normal **Update** button (published to npm via GitHub Actions).

## Add a camera

Open the plugin → add the camera's IP. On add, the plugin automatically:

- enables the **ONVIF server** (`ONVIF Enabled` = on), and
- assigns the **next free ONVIF port** starting at **8483** (so a second camera
  gets 8484, etc. — no manual port juggling, no silent collisions).

Then set the camera's **username/password** in its settings. Default DVRIP port is
`37777`, RTSP `554`.

### Multiple cameras

Each camera runs its own ONVIF server on its own port (8483, 8484, …) and gets a
unique, stable MAC derived from its IP, so they don't collide on ONVIF/HomeKit.

## Frigate PTZ

Point each camera's `onvif` block at that camera's ONVIF port on the Scrypted host:

```yaml
cameras:
  office:
    onvif:
      host: 10.10.10.185   # the Scrypted host
      port: 8483           # this camera's ONVIF port
      user: admin
      password: your_password
```

## Recommended: let your NVR own the video

If **Frigate** (or another NVR) already pulls video from the camera, turn **off**
Scrypted's **Prebuffer** for these cameras (camera → **Stream Management /
Rebroadcast → Prebuffer: off**). The ASH21 is a budget Wi‑Fi camera with a small
limit on simultaneous RTSP connections; letting Scrypted prebuffer *and* your NVR
pull at the same time starves the stream (Frigate "no frames"). This plugin's job
here is PTZ — let the NVR handle video.

## Settings

- **PTZ Move Duration (ms)** (`ptzMoveDurationMs`, default `300`) — how long a
  relative "nudge" moves before auto-stopping.
- PTZ commands are fire-and-forget with automatic reconnect+retry, so a dropped
  control connection doesn't leave the camera running to a limit.

## Troubleshooting

- **PTZ not responding / one camera's ONVIF is down** → check that camera's
  **ONVIF Enabled** toggle is on and it has a unique **ONVIF Port**.
- **Frigate "no frames" / jittery video** → turn off Scrypted Prebuffer for the
  camera (see above); the camera is being over-connected.
- **`[ONVIF Events] Camera does not appear to support ONVIF events`** → harmless;
  the plugin tried the native event proxy, the camera didn't support it, and it
  stopped retrying.
- **Install fails** → make sure you're on a recent version; the package ships a
  `dist/plugin.zip` (older 1.0.x npm builds were mispackaged and won't install).

## License

MIT
