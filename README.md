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

1. After installation, go to the plugin settings in Scrypted
2. Enter your camera details:
   - **IP Address**: Your camera's IP (e.g., 10.10.10.68)
   - **Username**: Camera username (default: admin)
   - **Password**: Camera password
   - **ONVIF Port**: Port for ONVIF server (default: 8483)

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

## Supported Cameras

- Amcrest ASH21-B-V2
- May work with other Amcrest/Dahua cameras using DVRIP protocol

## License

MIT

## Author

Joshua Blasbalg
