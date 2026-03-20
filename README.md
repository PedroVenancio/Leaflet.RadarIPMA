# Leaflet.RadarIPMA

A Leaflet plugin that displays Portuguese radar imagery from IPMA (Instituto Português do Mar e da Atmosfera) with an animated timeline. It fetches the latest images from IPMA's API and allows you to browse historical frames, adjust opacity, and play the animation.

This plugin is based on the original [Leaflet.Rainviewer](https://github.com/mwasil/Leaflet.Rainviewer) by mwasil, adapted for the IPMA radar service.

## Features

- Displays IPMA radar images (Portugal coverage) with 5‑minute intervals.
- Provides a control panel with play/pause, previous/next, and timeline slider.
- Automatically fetches available timestamps from the official IPMA API (`imgs-radar.json`).
- Falls back to locally generated timestamps if the API is unreachable or CORS blocks the request.
- Supports custom image bounds and URL template.
- Adjustable opacity and animation speed.
- Lightweight and easy to integrate.

## Dependencies

- [Leaflet](https://leafletjs.com/) (tested with 1.9.4)

## Installation

### Direct download

Download the `leaflet.radaripma.js` and `leaflet.radaripma.css` files and include them in your HTML after Leaflet:

```html
<link rel="stylesheet" href="path/to/leaflet.radaripma.css" />
<script src="path/to/leaflet.radaripma.js"></script>
```

### Via CDN

Example using jsDelivr:

```html
<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/PedroVenancio/Leaflet.RadarIPMA/leaflet.radaripma.css" />
<script src="https://cdn.jsdelivr.net/gh/PedroVenancio/Leaflet.RadarIPMA/leaflet.radaripma.js"></script>
```

## Usage

Create a Leaflet map and add the control:

```javascript
var map = L.map('map').setView([39.5, -8.0], 7);

// Add a basemap (e.g., OpenStreetMap)
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap contributors'
}).addTo(map);

// Add the radar control
L.control.radaripma({
    position: 'bottomleft',
    nextButtonText: '>',
    playStopButtonText: 'Play/Stop',
    prevButtonText: '<',
    positionSliderLabelText: "Hour:",
    opacitySliderLabelText: "Opacity:",
    animationInterval: 500,
    opacity: 0.8,
    maxHistoryHours: 12,               // how many hours back to load
    buttonTitle: 'Show radar imagery'  // tooltip on button
}).addTo(map);
```

## Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `position` | string | `'bottomleft'` | Leaflet control position (`'topleft'`, `'topright'`, `'bottomleft'`, `'bottomright'`). |
| `nextButtonText` | string | `'>'` | Text for the "next" button. |
| `playStopButtonText` | string | `'Play/Stop'` | Text for the play/stop button. |
| `prevButtonText` | string | `'<'` | Text for the "previous" button. |
| `positionSliderLabelText` | string | `'Hour:'` | Label for the timeline slider. |
| `opacitySliderLabelText` | string | `'Opacity:'` | Label for the opacity slider. |
| `animationInterval` | number | `500` | Time between frames in milliseconds. |
| `opacity` | number | `0.8` | Initial opacity of the radar overlay (0-1). |
| `maxHistoryHours` | number | `12` | Number of hours to go back in history (each frame is 5 minutes). |
| `bounds` | `L.LatLngBounds` | `[34.01161, -12.45479] to [43.79278, -4.34547]` | The geographical bounds of the radar image (Portugal coverage). |
| `urlTemplate` | string | `'https://www.ipma.pt/resources.www/transf/radar/por/{filename}'` | URL template; `{filename}` is replaced with the image filename. |
| `apiUrl` | string | `'https://www.ipma.pt/resources.www/transf/radar/imgs-radar.json'` | URL to IPMA's JSON index of available images. |
| `buttonTitle` | string | `'Show radar imagery'` | Tooltip for the control button. |

## How it works

1. When the user clicks the button, the plugin fetches the list of available images from the IPMA API (`imgs-radar.json`).
2. It merges that list with locally generated timestamps to cover the requested number of hours (`maxHistoryHours`), giving priority to the official list.
3. A timeline slider is created with the available frames.
4. Each frame is a `L.ImageOverlay` added to the map. The opacity and visibility are controlled by the user.
5. Animation loops through the frames at the defined interval.

If the API fails (due to CORS or network issues), the plugin automatically falls back to generating timestamps locally (every 5 minutes) for the specified history length.

## Customization

- **Icon**: To replace the button icon, modify the CSS background image (or override it in your own stylesheet).
- **Bounds**: If the radar coverage changes, adjust the `bounds` option.
- **API fallback**: The fallback local generation assumes that images are available every 5 minutes on the server. This is usually true, but you can tweak the generation logic if needed.

## Credits

- Based on the [Leaflet.Rainviewer](https://github.com/mwasil/Leaflet.Rainviewer) plugin by mwasil.
- Radar data provided by [IPMA](https://www.ipma.pt/) / [Radar](https://www.ipma.pt/pt/otempo/obs.remote/).

## License

MIT License. See [LICENSE](LICENSE) file for details.
