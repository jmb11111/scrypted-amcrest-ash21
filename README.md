# Scrypted Amcrest ASH21 PTZ Plugin

Full PTZ (Pan-Tilt-Zoom) control for Amcrest ASH21-B-V2 cameras in Scrypted using the DVRIP protocol.

## Features

- Full PTZ control (pan, tilt, zoom)
- Works with Frigate NVR via built-in ONVIF server
- Video streaming via Scrypted Rebroadcast
- HomeKit compatible

## Installation

### Method 1: Scrypted UI (if working)
1. Go to Scrypted web interface
2. Click "Install Plugin"
3. Search for `scrypted-amcrest-ash21`
4. Click Install

### Method 2: Manual Installation
If the UI install fails, use manual installation:

```bash
# SSH into your Scrypted server
ssh user@your-server

# Download and install the plugin
docker exec -it scrypted sh -c "
  cd /tmp && \
  npm pack scrypted-amcrest-ash21 && \
  mkdir -p /server/volume/plugins/scrypted-amcrest-ash21 && \
  tar -xzf scrypted-amcrest-ash21-*.tgz && \
  cp -r package/* /server/volume/plugins/scrypted-amcrest-ash21/ && \
  rm -rf package scrypted-amcrest-ash21-*.tgz
"

# Restart Scrypted
docker restart scrypted
```

## Camera Setup

**Important:** The ASH21-B-V2 does not have a web interface for configuration. All camera settings must be done through the Amcrest mobile app.

### Initial Setup

1. **Connect via Ethernet first** - Plug the camera into your network via ethernet cable
2. **Download Amcrest View Pro** app (iOS/Android)
3. **Add the camera** in the app and complete initial setup
4. **Configure WiFi** (if desired) through the app settings
5. **Note the camera's IP address** from your router or the app

### Camera Settings (via Amcrest App)

You may need to fine-tune these settings in the Amcrest app for optimal performance:

- **Video Settings**:
  - Main Stream: H.264, 1080P, 30fps recommended
  - Sub Stream: H.264, VGA (640x480), 30fps recommended for detection
- **I-Frame Interval**: Set to 1 second (30 frames) for lower latency
- **Network Settings**: Ensure RTSP is enabled

## Plugin Configuration

1. After installation, add a camera via the plugin's **Add Camera** setting (enter its IP)
2. Open the new camera device and enter its details:
   - **IP Address**: Your camera's IP (e.g., 10.10.10.68)
   - **Username**: Camera username (default: admin)
   - **Password**: Camera password
   - **Enable ONVIF Server**: Turn this on if you want PTZ control from Frigate or another ONVIF client
   - **ONVIF Server Port**: Port for the ONVIF server (default: 8483, must be unique per camera)
   - **PTZ Move Duration (ms)**: How long a relative PTZ nudge runs before auto-stopping (default: 300). Lower = finer steps, higher = bigger steps.

## Frigate Integration

This plugin includes a built-in ONVIF server for PTZ control from Frigate:

```yaml
# frigate config.yml
cameras:
  amcrest_ash21:
    onvif:
      host: YOUR_SCRYPTED_IP
      port: 8483
      user: admin
      password: ""
```

## Multiple Cameras

Each camera runs its own ONVIF server inside Scrypted, so **each camera needs its own ONVIF port**. Add each camera through the plugin's **Add Camera** setting, then give every camera a distinct port in its settings.

Worked example — an office camera and a kitchen camera on the same Scrypted host:

| Camera  | Camera IP    | ONVIF Server Port |
|---------|--------------|-------------------|
| office  | 10.10.10.68  | 8483              |
| kitchen | 10.10.10.69  | 8484              |

```yaml
# frigate config.yml
cameras:
  office:
    onvif:
      host: YOUR_SCRYPTED_IP
      port: 8483
      user: admin
      password: ""
  kitchen:
    onvif:
      host: YOUR_SCRYPTED_IP
      port: 8484
      user: admin
      password: ""
```

Notes:
- The host is always your **Scrypted server's IP** (the plugin bridges to the camera), not the camera's IP.
- Each camera is assigned a stable, unique MAC address derived from its IP, so ONVIF clients that identify devices by MAC won't confuse two cameras.
- ONVIF WS-Discovery (UDP 3702) is shared best-effort between cameras; if discovery doesn't find a camera, add it manually by IP and port.

## Troubleshooting

### ONVIF server won't start
- **Port already in use**: another camera or service is using the ONVIF port. Give each camera a unique port (see Multiple Cameras above). Check the device console for `EADDRINUSE`.
- **"Camera IP not configured"**: set the camera's IP Address in the device settings first.
- After changing the ONVIF port or IP the server restarts automatically; check the device console for `[ONVIF] Server started at ...` and use that exact URL in your client.

### PTZ not responding
- Verify the **DVRIP port** (default 37777) is reachable from Scrypted: `nc -vz CAMERA_IP 37777`.
- Check credentials — look for `[DVRIP] Login failed` in the device console.
- Watch the device console while sending a PTZ command; you should see the ONVIF request and the DVRIP command. If a command fails once, the plugin automatically reconnects and retries before giving up.
- If moves are too small/large, tune **PTZ Move Duration (ms)** in the camera settings.

### Connection drops
- The plugin keeps the DVRIP session alive with a keepalive every 25s. If the keepalive fails (camera reboot, WiFi drop), the connection is closed and automatically re-established on the next PTZ command — expect the first command after a drop to be slightly slower.
- Frequent `[DVRIP] Keepalive failed` messages usually indicate an unstable network path to the camera (common on WiFi); consider ethernet.

### Snapshots
- The ONVIF `GetSnapshotUri` endpoint returns the RTSP stream URL (the camera has no HTTP snapshot endpoint). Clients that require an HTTP JPEG snapshot should grab frames from the RTSP stream instead; within Scrypted, snapshots are taken from the substream automatically.

## Supported Cameras

- Amcrest ASH21-B-V2
- May work with other Amcrest/Dahua cameras using DVRIP protocol

## License

MIT

## Author

Joshua Blasbalg
