/**
 * Leaflet.RadarIPMA
 * A Leaflet control to display IPMA radar imagery (Portugal) with time animation.
 * Based on Leaflet.Rainviewer by mwasil.
 * 
 * @author Pedro Venâncio
 * @license MIT
 */

L.Control.Radaripma = L.Control.extend({
    options: {
        position: 'bottomleft',
        nextButtonText: '>',
        playStopButtonText: 'Play/Stop',
        prevButtonText: '<',
        positionSliderLabelText: "Hour:",
        opacitySliderLabelText: "Opacity:",
        animationInterval: 500,
        opacity: 0.8,
        maxHistoryHours: 12,               // How many hours to go back
        bounds: new L.LatLngBounds(
            new L.LatLng(34.01161, -12.45479),
            new L.LatLng(43.79278, -4.34547)
        ),
        urlTemplate: 'https://www.ipma.pt/resources.www/transf/radar/por/{filename}',
        apiUrl: 'https://www.ipma.pt/resources.www/transf/radar/imgs-radar.json',
        buttonTitle: 'Show radar imagery'   // Tooltip for the button
    },

    onAdd: function (map) {
        this.timestamps = [];           // Array of { filename, datetime }
        this.radarLayers = {};
        this.currentTimestamp = null;
        this.animationPosition = 0;
        this.animationTimer = false;
        this.radaripmaActive = false;
        this._map = map;

        this.container = L.DomUtil.create('div', 'leaflet-control-radaripma leaflet-bar leaflet-control');
        this.link = L.DomUtil.create('a', 'leaflet-control-radaripma-button leaflet-bar-part', this.container);
        this.link.href = '#';
        this.link.title = this.options.buttonTitle;
        L.DomEvent.on(this.link, 'click', this.load, this);
        return this.container;
    },

    load: function (e) {
        L.DomEvent.preventDefault(e);
        if (this.radaripmaActive) return;

        L.DomUtil.addClass(this.container, 'leaflet-control-radaripma-active');
        this.radaripmaActive = true;

        this._buildUI();

        // Try to fetch the list from IPMA API
        this._fetchTimestampsFromAPI()
            .then(apiTimestamps => {
                const allTimestamps = this._mergeWithLocalTimestamps(apiTimestamps);
                this.timestamps = allTimestamps;
                this.positionSlider.max = this.timestamps.length - 1;
                this.positionSlider.value = this.animationPosition;
                this.showFrame(-1);
            })
            .catch(error => {
                console.error('Failed to load IPMA API:', error);
                // Fallback: generate timestamps locally
                this.timestamps = this._generateLocalTimestamps(this.options.maxHistoryHours * 12);
                this.positionSlider.max = this.timestamps.length - 1;
                this.showFrame(-1);
            });

        L.DomEvent.disableClickPropagation(this.controlContainer);
    },

    _buildUI: function () {
        this.controlContainer = L.DomUtil.create('div', 'leaflet-control-radaripma-container', this.container);

        this.prevButton = L.DomUtil.create('input', 'leaflet-control-radaripma-prev leaflet-bar-part btn', this.controlContainer);
        this.prevButton.type = "button";
        this.prevButton.value = this.options.prevButtonText;
        L.DomEvent.on(this.prevButton, 'click', this.prev, this);
        L.DomEvent.disableClickPropagation(this.prevButton);

        this.startstopButton = L.DomUtil.create('input', 'leaflet-control-radaripma-startstop leaflet-bar-part btn', this.controlContainer);
        this.startstopButton.type = "button";
        this.startstopButton.value = this.options.playStopButtonText;
        L.DomEvent.on(this.startstopButton, 'click', this.startstop, this);
        L.DomEvent.disableClickPropagation(this.startstopButton);

        this.nextButton = L.DomUtil.create('input', 'leaflet-control-radaripma-next leaflet-bar-part btn', this.controlContainer);
        this.nextButton.type = "button";
        this.nextButton.value = this.options.nextButtonText;
        L.DomEvent.on(this.nextButton, 'click', this.next, this);
        L.DomEvent.disableClickPropagation(this.nextButton);

        this.positionSliderLabel = L.DomUtil.create('label', 'leaflet-control-radaripma-label leaflet-bar-part', this.controlContainer);
        this.positionSliderLabel.htmlFor = "radaripma-positionslider";
        this.positionSliderLabel.textContent = this.options.positionSliderLabelText;

        this.positionSlider = L.DomUtil.create('input', 'leaflet-control-radaripma-positionslider leaflet-bar-part', this.controlContainer);
        this.positionSlider.type = "range";
        this.positionSlider.id = "radaripma-positionslider";
        this.positionSlider.min = 0;
        this.positionSlider.max = 0;
        this.positionSlider.value = 0;
        L.DomEvent.on(this.positionSlider, 'input', this.setPosition, this);
        L.DomEvent.disableClickPropagation(this.positionSlider);

        this.opacitySliderLabel = L.DomUtil.create('label', 'leaflet-control-radaripma-label leaflet-bar-part', this.controlContainer);
        this.opacitySliderLabel.htmlFor = "radaripma-opacityslider";
        this.opacitySliderLabel.textContent = this.options.opacitySliderLabelText;

        this.opacitySlider = L.DomUtil.create('input', 'leaflet-control-radaripma-opacityslider leaflet-bar-part', this.controlContainer);
        this.opacitySlider.type = "range";
        this.opacitySlider.id = "radaripma-opacityslider";
        this.opacitySlider.min = 0;
        this.opacitySlider.max = 100;
        this.opacitySlider.value = this.options.opacity * 100;
        L.DomEvent.on(this.opacitySlider, 'input', this.setOpacity, this);
        L.DomEvent.disableClickPropagation(this.opacitySlider);

        this.closeButton = L.DomUtil.create('div', 'leaflet-control-radaripma-close', this.container);
        L.DomEvent.on(this.closeButton, 'click', this.unload, this);

        var html = '<div id="timestamp" class="leaflet-control-radaripma-timestamp"></div>';
        this.controlContainer.insertAdjacentHTML('beforeend', html);
    },

    _fetchTimestampsFromAPI: function () {
        return fetch(this.options.apiUrl)
            .then(response => response.json())
            .then(data => {
                const items = data.Portugal || [];
                return items.map(item => ({
                    filename: item.path,
                    datetime: this._parseIPMADate(item.date)
                })).sort((a, b) => a.datetime - b.datetime);
            });
    },

    _parseIPMADate: function (dateStr) {
        const [datePart, timePart] = dateStr.split(' ');
        const [year, month, day] = datePart.split('-').map(Number);
        const [hour, minute] = timePart.split(':').map(Number);
        return new Date(Date.UTC(year, month - 1, day, hour, minute));
    },

    _mergeWithLocalTimestamps: function (apiTimestamps) {
        if (apiTimestamps.length === 0) return this._generateLocalTimestamps(this.options.maxHistoryHours * 12);

        const newestApiDate = apiTimestamps[apiTimestamps.length - 1].datetime;
        const oldestApiDate = apiTimestamps[0].datetime;

        const apiCoverageHours = (newestApiDate - oldestApiDate) / (1000 * 60 * 60);
        const remainingHours = Math.max(0, this.options.maxHistoryHours - apiCoverageHours);

        const localTimestamps = this._generateLocalTimestamps(
            Math.ceil(remainingHours * 12),
            oldestApiDate
        );

        return [...localTimestamps, ...apiTimestamps];
    },

    _generateLocalTimestamps: function (count, endDate = null) {
        const timestamps = [];
        const now = endDate ? new Date(endDate) : new Date();

        const minutes = now.getUTCMinutes();
        const remainder = minutes % 5;
        now.setUTCMinutes(minutes - remainder);
        now.setUTCSeconds(0);
        now.setUTCMilliseconds(0);

        for (let i = count - 1; i >= 0; i--) {
            const d = new Date(now.getTime() - i * 5 * 60000);
            timestamps.push({
                filename: this._formatIPMAFilename(d),
                datetime: d
            });
        }
        return timestamps;
    },

    _formatIPMAFilename: function (date) {
        const year = date.getUTCFullYear();
        const month = (date.getUTCMonth() + 1).toString().padStart(2, '0');
        const day = date.getUTCDate().toString().padStart(2, '0');
        const hour = date.getUTCHours().toString().padStart(2, '0');
        const minute = date.getUTCMinutes().toString().padStart(2, '0');
        return `pcr-${year}-${month}-${day}T${hour}${minute}.png`;
    },

    addLayer: function (timestampObj) {
        const filename = timestampObj.filename;
        if (!this.radarLayers[filename]) {
            const url = this.options.urlTemplate.replace('{filename}', filename);
            this.radarLayers[filename] = L.imageOverlay(url, this.options.bounds, {
                opacity: 0,
                attribution: '&copy; <a href="https://www.ipma.pt/pt/otempo/obs.remote/index.jsp" target="_blank">IPMA</a>'
            });
        }
        if (!this._map.hasLayer(this.radarLayers[filename])) {
            this._map.addLayer(this.radarLayers[filename]);
        }
    },

    changeRadarPosition: function (position, preloadOnly) {
        while (position >= this.timestamps.length) position -= this.timestamps.length;
        while (position < 0) position += this.timestamps.length;

        const nextTs = this.timestamps[position];
        const currentTs = this.timestamps[this.animationPosition];

        this.addLayer(nextTs);

        if (preloadOnly) return;

        this.animationPosition = position;
        this.positionSlider.value = position;

        if (this.radarLayers[currentTs?.filename]) {
            this.radarLayers[currentTs.filename].setOpacity(0);
        }
        this.radarLayers[nextTs.filename].setOpacity(this.options.opacity);

        const date = nextTs.datetime;
        const dateStr = `${date.getUTCFullYear()}-${(date.getUTCMonth()+1).toString().padStart(2,'0')}-${date.getUTCDate().toString().padStart(2,'0')} ${date.getUTCHours().toString().padStart(2,'0')}:${date.getUTCMinutes().toString().padStart(2,'0')} UTC`;
        document.getElementById("timestamp").innerHTML = dateStr;
    },

    showFrame: function (nextPosition) {
        if (nextPosition === -1) nextPosition = this.timestamps.length - 1;
        const direction = nextPosition - this.animationPosition > 0 ? 1 : -1;
        this.changeRadarPosition(nextPosition);
        this.changeRadarPosition(nextPosition + direction, true);
    },

    setOpacity: function (e) {
        this.options.opacity = e.srcElement.value / 100;
        const current = this.timestamps[this.animationPosition];
        if (current && this.radarLayers[current.filename]) {
            this.radarLayers[current.filename].setOpacity(this.options.opacity);
        }
    },

    setPosition: function (e) {
        this.stop();
        this.showFrame(parseInt(e.srcElement.value));
    },

    stop: function () {
        if (this.animationTimer) {
            clearTimeout(this.animationTimer);
            this.animationTimer = false;
            return true;
        }
        return false;
    },

    play: function () {
        this.showFrame(this.animationPosition + 1);
        this.animationTimer = setTimeout(() => this.play(), this.options.animationInterval);
    },

    playStop: function () {
        if (!this.stop()) this.play();
    },

    prev: function (e) {
        L.DomEvent.stopPropagation(e);
        L.DomEvent.preventDefault(e);
        this.stop();
        this.showFrame(this.animationPosition - 1);
    },

    startstop: function (e) {
        L.DomEvent.stopPropagation(e);
        L.DomEvent.preventDefault(e);
        this.playStop();
    },

    next: function (e) {
        L.DomEvent.stopPropagation(e);
        L.DomEvent.preventDefault(e);
        this.stop();
        this.showFrame(this.animationPosition + 1);
    },

    unload: function () {
        L.DomUtil.remove(this.controlContainer);
        L.DomUtil.remove(this.closeButton);
        L.DomUtil.removeClass(this.container, 'leaflet-control-radaripma-active');
        this.radaripmaActive = false;

        Object.values(this.radarLayers).forEach(layer => {
            if (this._map.hasLayer(layer)) this._map.removeLayer(layer);
        });
        this.radarLayers = {};
    }
});

L.control.radaripma = function (opts) {
    return new L.Control.Radaripma(opts);
};