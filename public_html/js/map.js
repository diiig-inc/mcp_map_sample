/**
 * マップシステム統合モジュール
 * Mapbox, MapLibre, GoogleMapsに対応
 */

class MapManager {
    constructor() {
        this.map = null;
        this.mapType = null;
        this.markers = [];
        this.config = null;
        this.currentInfoWindow = null; // Google Maps用（現在開いているInfoWindow）
    }

    /**
     * 設定を読み込んでマップを初期化
     */
    async initialize(mapType, config) {
        this.mapType = mapType;
        this.config = config;

        // マップライブラリを動的に読み込み
        await this.loadMapLibrary();

        // マップを初期化
        this.initMap();
    }

    /**
     * マップライブラリを動的に読み込み
     */
    async loadMapLibrary() {
        const head = document.head;

        switch (this.mapType) {
            case 'mapbox':
                // Mapbox GL JS
                const mapboxCss = document.createElement('link');
                mapboxCss.rel = 'stylesheet';
                mapboxCss.href = 'https://api.mapbox.com/mapbox-gl-js/v3.0.0/mapbox-gl.css';
                head.appendChild(mapboxCss);

                await this.loadScript('https://api.mapbox.com/mapbox-gl-js/v3.0.0/mapbox-gl.js');
                break;

            case 'maplibre':
                // MapLibre GL JS
                const maplibreCss = document.createElement('link');
                maplibreCss.rel = 'stylesheet';
                maplibreCss.href = 'https://unpkg.com/maplibre-gl@3.6.0/dist/maplibre-gl.css';
                head.appendChild(maplibreCss);

                await this.loadScript('https://unpkg.com/maplibre-gl@3.6.0/dist/maplibre-gl.js');
                break;

            case 'googlemaps':
                // Google Maps（標準のMarkerを使用するためlibrariesは不要）
                await this.loadScript(
                    `https://maps.googleapis.com/maps/api/js?key=${this.config.apiKey}`
                );
                break;

            default:
                throw new Error(`Unsupported map type: ${this.mapType}`);
        }
    }

    /**
     * スクリプトを非同期で読み込み
     */
    loadScript(src) {
        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = src;
            script.onload = resolve;
            script.onerror = reject;
            document.head.appendChild(script);
        });
    }

    /**
     * マップを初期化
     */
    initMap() {
        const container = 'map';
        const center = this.config.center || { lat: 35.6812, lng: 139.7671 };
        const zoom = this.config.zoom || 12;

        switch (this.mapType) {
            case 'mapbox':
                mapboxgl.accessToken = this.config.accessToken;
                this.map = new mapboxgl.Map({
                    container: container,
                    style: this.config.style || 'mapbox://styles/mapbox/streets-v12',
                    center: [center.lng, center.lat],
                    zoom: zoom
                });
                break;

            case 'maplibre':
                this.map = new maplibregl.Map({
                    container: container,
                    style: this.config.style || 'https://demotiles.maplibre.org/style.json',
                    center: [center.lng, center.lat],
                    zoom: zoom
                });
                break;

            case 'googlemaps':
                // Google Maps v3の標準的な初期化
                const mapElement = document.getElementById(container);
                console.log('[MapManager] Map container element:', mapElement);
                console.log('[MapManager] Map container size:', mapElement.offsetWidth, 'x', mapElement.offsetHeight);

                this.map = new google.maps.Map(mapElement, {
                    center: center,
                    zoom: zoom,
                    mapTypeId: google.maps.MapTypeId.ROADMAP,
                    // Map IDは任意（Advanced Markersを使う場合のみ必要）
                    // mapId: this.config.mapId
                });

                console.log('[MapManager] Google Maps initialized:', this.map);

                // 初期化後にリサイズイベントをトリガー
                setTimeout(() => {
                    google.maps.event.trigger(this.map, 'resize');
                    console.log('[MapManager] Triggered resize event');
                }, 100);
                break;
        }
    }

    /**
     * POIマーカーを追加
     */
    addMarker(poi) {
        const { id, name, latitude, longitude } = poi;

        console.log('[MapManager] Adding marker:', name, 'at', latitude, longitude);
        console.log('[MapManager] Map instance:', this.map);
        console.log('[MapManager] Map type:', this.mapType);

        if (!this.map) {
            console.error('[MapManager] Map is not initialized!');
            return;
        }

        switch (this.mapType) {
            case 'mapbox':
            case 'maplibre': {
                const MapGL = this.mapType === 'mapbox' ? mapboxgl : maplibregl;
                console.log('[MapManager] MapGL:', MapGL);

                const marker = new MapGL.Marker({ color: '#00897B' })
                    .setLngLat([longitude, latitude])
                    .setPopup(new MapGL.Popup().setHTML(`<strong>${name}</strong>`))
                    .addTo(this.map);

                console.log('[MapManager] Marker object created:', marker);
                console.log('[MapManager] Marker element:', marker.getElement());

                marker._poiId = id;
                this.markers.push(marker);

                console.log('[MapManager] Marker added, total markers:', this.markers.length);

                marker.getElement().addEventListener('click', () => {
                    this.onMarkerClick(poi);
                });
                break;
            }

            case 'googlemaps': {
                // 標準のMarkerを使用（Advanced Markerよりシンプルで確実）
                const marker = new google.maps.Marker({
                    map: this.map,
                    position: { lat: latitude, lng: longitude },
                    title: name,
                    // カスタムカラー（オプション）
                    icon: {
                        path: google.maps.SymbolPath.CIRCLE,
                        fillColor: '#22c55e',
                        fillOpacity: 1,
                        strokeColor: '#ffffff',
                        strokeWeight: 2,
                        scale: 8
                    }
                });

                // InfoWindowを作成
                const infoWindow = new google.maps.InfoWindow({
                    content: `<strong>${name}</strong>`
                });

                marker.addListener('click', () => {
                    // 他のInfoWindowを閉じる
                    if (this.currentInfoWindow) {
                        this.currentInfoWindow.close();
                    }
                    infoWindow.open(this.map, marker);
                    this.currentInfoWindow = infoWindow;

                    this.onMarkerClick(poi);
                });

                this.markers.push({ id, marker, infoWindow });
                break;
            }
        }
    }

    /**
     * マーカークリックハンドラ（外部から設定）
     */
    onMarkerClick(poi) {
        console.log('Marker clicked:', poi);
    }

    /**
     * 特定のPOIのマーカーのポップアップを開く
     */
    openMarkerPopup(poiId) {
        console.log('[Map] Opening popup for POI:', poiId);

        switch (this.mapType) {
            case 'mapbox':
            case 'maplibre': {
                // すべてのポップアップを閉じる
                this.markers.forEach(m => {
                    const popup = m.getPopup();
                    if (popup && popup.isOpen()) {
                        popup.remove();
                    }
                });

                // IDが一致するマーカーを探す
                const marker = this.markers.find(m => m._poiId === poiId);
                if (marker) {
                    // ポップアップを開く
                    const popup = marker.getPopup();
                    if (popup) {
                        popup.addTo(this.map);
                    }
                    console.log('[Map] Popup opened for marker:', poiId);
                } else {
                    console.warn('[Map] Marker not found for POI:', poiId);
                }
                break;
            }

            case 'googlemaps': {
                const markerObj = this.markers.find(m => m.id === poiId);
                if (markerObj) {
                    // InfoWindowを開く
                    if (this.currentInfoWindow) {
                        this.currentInfoWindow.close();
                    }
                    if (markerObj.infoWindow) {
                        markerObj.infoWindow.open(this.map, markerObj.marker);
                        this.currentInfoWindow = markerObj.infoWindow;
                    }
                    console.log('[Map] InfoWindow opened for marker:', poiId);
                } else {
                    console.warn('[Map] Marker not found for POI:', poiId);
                }
                break;
            }
        }
    }

    /**
     * すべてのマーカーをクリア
     */
    clearMarkers() {
        console.log('[MapManager] Clearing', this.markers.length, 'markers');

        switch (this.mapType) {
            case 'mapbox':
            case 'maplibre':
                this.markers.forEach(marker => {
                    console.log('[MapManager] Removing marker:', marker);
                    marker.remove();
                });
                break;

            case 'googlemaps':
                this.markers.forEach(item => {
                    // InfoWindowを閉じる
                    if (item.infoWindow) {
                        item.infoWindow.close();
                    }
                    // マーカーをマップから削除
                    item.marker.setMap(null);
                });
                break;
        }
        this.markers = [];
        console.log('[MapManager] All markers cleared, count:', this.markers.length);
    }

    /**
     * マップの中心とズームを設定
     */
    flyTo(lat, lng, zoom = 14) {
        switch (this.mapType) {
            case 'mapbox':
            case 'maplibre':
                this.map.flyTo({
                    center: [lng, lat],
                    zoom: zoom
                });
                break;

            case 'googlemaps':
                this.map.setCenter({ lat, lng });
                this.map.setZoom(zoom);
                break;
        }
    }

    /**
     * 複数のPOIが収まるように表示を調整
     */
    fitBounds(pois, customPadding = null) {
        if (pois.length === 0) {
            console.warn('[MapManager] No POIs to fit bounds');
            return;
        }

        console.log('[MapManager] Fitting bounds for', pois.length, 'POIs');

        // デフォルトパディング（カスタムパディングがない場合）
        const defaultPadding = customPadding || {
            top: 80,
            bottom: 80,
            left: 80,
            right: 80
        };

        switch (this.mapType) {
            case 'mapbox':
            case 'maplibre': {
                const MapGL = this.mapType === 'mapbox' ? mapboxgl : maplibregl;
                const bounds = new MapGL.LngLatBounds();

                pois.forEach(poi => {
                    bounds.extend([poi.longitude, poi.latitude]);
                });

                console.log('[MapManager] Bounds:', bounds);
                this.map.fitBounds(bounds, {
                    padding: defaultPadding,
                    duration: 1000
                });
                console.log('[MapManager] fitBounds completed');
                break;
            }

            case 'googlemaps': {
                const bounds = new google.maps.LatLngBounds();

                pois.forEach(poi => {
                    bounds.extend({ lat: poi.latitude, lng: poi.longitude });
                });

                this.map.fitBounds(bounds, defaultPadding);
                break;
            }
        }
    }
}

// グローバルに公開
window.MapManager = MapManager;
