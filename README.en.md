# AI・MCP Map Integration Demo

[日本語](./README.md) | [English](#)

An interactive web application that combines AI chat with maps, powered by Anthropic Claude API and DCP (DIIIG Cloud Platform) MCP to provide POI information in response to user queries.

![DEMO](docs/screenshot.png)

## Demo Site
- [AI・MCP Map Integration Demo](https://mcpmapdemo.diiig.info/)

## Features

- **AI Chat**: Interactive interface using Claude (Anthropic) API
- **MCP Connector Integration**: Integrates with DCP MCP via Anthropic API to retrieve accurate POI information
- **Multi-Map Support**: Compatible with Mapbox, MapLibre, and Google Maps
- **SSE Streaming**: Real-time display of AI responses
- **Responsive Design**: Optimized for both mobile and desktop
- **Chat History**: LocalStorage-based conversation persistence

## Requirements

### Using Docker (Recommended)

- Docker
- Docker Compose
- API Keys:
  - Anthropic API Key
  - DCP API Key
  - Mapbox / Google Maps API Key (depending on map system)

### Manual Setup

- PHP 8.0 or higher
- Web Server (Apache, Nginx, etc.)
- Same API keys as above

## Quick Start

### Method 1: Docker (Recommended)

#### 1. Clone the repository

```bash
git clone https://github.com/yourusername/aimap.git
cd mcp_map_sample
```

#### 2. Create configuration file

```bash
cp lib/config.example.php lib/config.php
```

#### 3. Configure API keys

Edit `lib/config.php` and set your API keys:

```php
// Anthropic API
define('ANTHROPIC_API_KEY', 'your-anthropic-api-key-here');

// DCP API
define('DCP_MCP_URL', 'your-dcp-mcp-url-here');
define('DCP_API_KEY', 'your-dcp-api-key-here');

// Map System (choose: 'mapbox', 'maplibre', or 'googlemaps')
define('MAP_SYSTEM', 'mapbox'); // 'mapbox', 'maplibre', 'googlemaps'

// Mapbox configuration (if using Mapbox)
define('MAPBOX_ACCESS_TOKEN', 'your-mapbox-access-token-here');

// Google Maps configuration (if using Google Maps)
define('GOOGLE_MAPS_API_KEY', 'your-google-maps-api-key-here');
```

**⚠️ Important: Google Maps Security Configuration**

If using Google Maps, the API key will be exposed to the frontend. **You must configure restrictions**:

1. Open your API key in [Google Cloud Console](https://console.cloud.google.com/)
2. Under "Application restrictions", select **"HTTP referrers"**
3. Add allowed websites:
   - Production: `https://yourdomain.com/*`
   - Development: `http://localhost:*`
4. Under "API restrictions", enable **"Maps JavaScript API" only**

Without these restrictions, your API key could be misused, leading to unexpected charges.

**Recommendation**: For better security, use **MapLibre** which requires no API key.

#### 4. Start Docker containers

```bash
docker-compose up -d
```

#### 5. Access the application

Open your browser and navigate to `http://localhost:8080`

#### Docker Commands

```bash
# Start containers
docker-compose up -d

# View logs
docker-compose logs -f

# Stop containers
docker-compose down

# Rebuild images
docker-compose build
```

### Method 2: Manual Setup

#### For Rental Server (Apache/Nginx)

1. **Upload files** to your web server
2. **Set document root** to `public_html` directory
3. **Create config file**:
   ```bash
   cp lib/config.example.php lib/config.php
   ```
4. **Edit `lib/config.php`** with your API keys
5. **Set permissions** (if needed):
   ```bash
   chmod 755 public_html
   chmod 644 lib/config.php
   ```
6. Access your site URL

## Directory Structure

```
mcp_map_sample/
├── docker/
│   ├── nginx.conf          # Nginx configuration
│   └── start.sh            # Container startup script
├── lib/
│   ├── config.example.php  # Configuration template
│   └── config.php          # Actual config (create from example)
├── public_html/            # Document root
│   ├── index.html          # Main HTML
│   ├── api/
│   │   ├── chat.php        # Chat API (Anthropic + MCP)
│   │   ├── config.php      # Config API
│   │   └── poi-detail.php  # POI detail API
│   ├── js/
│   │   ├── app.js          # Vue.js application
│   │   └── map.js          # Map system integration
│   ├── css/
│   └── img/
├── Dockerfile              # Docker configuration
├── docker-compose.yml      # Docker Compose
└── README.md               # This file
```

## Usage

### Basic Usage

1. **Start Chat**: Enter your question in the chat input at the bottom
2. **Search POI**: Ask questions like "Show me tourist spots in Kyoto"
3. **View Map**: AI-suggested POIs appear as markers on the map
4. **See Details**: Click markers to view detailed POI information

### Side Menu

- **New Chat**: Create a new chat thread from the top-left menu
- **Chat History**: Access past conversations from the sidebar
- **Settings**: Theme selection, language settings, help, etc.

## API Specification

### Chat API (POST /api/chat.php)

Retrieves POI information using Anthropic API and MCP Connector.

**Request:**

```json
{
  "message": "User's message",
  "history": [
    {
      "role": "user",
      "content": "Previous message"
    }
  ]
}
```

**Response (SSE):**

Streamed in real-time.

```
event: message
data: {"text": "Part of the response"}

event: message
data: {"text": "Additional text"}

event: done
data: {"message": "Stream completed"}
```

**POI Data Format:**

POI information is embedded in the AI response in the following format:

```
Regular text response

---POI_DATA---
{
    "pois": [
        {
            "poi_id": "...",
            "name": "...",
            "latitude": ...,
            "longitude": ...,
            "category": "..."
        }
    ]
}
```

### Configuration API (GET /api/config.php)

Provides map configuration to the frontend (excluding API keys).

**Response:**

```json
{
  "type": "maplibre",
  "config": {
    "center": {
      "lat": 34.69364108831769,
      "lng": 135.19343441838353
    },
    "zoom": 12,
    "style": "https://tiles.openfreemap.org/styles/liberty"
  }
}
```

### POI Detail API (GET /api/poi-detail.php)

Retrieves detailed POI information from DCP API.

**Parameters:**
- `poi_id`: POI ID

**Example:**
```
GET /api/poi-detail.php?poi_id=12345
```

## Supported Map Systems

### Mapbox

```php
define('MAP_SYSTEM', 'mapbox');
define('MAPBOX_ACCESS_TOKEN', 'your-token');
define('MAPBOX_STYLE', 'mapbox://styles/mapbox/streets-v12');
```

### MapLibre

```php
define('MAP_SYSTEM', 'maplibre');
define('MAPLIBRE_STYLE', 'https://demotiles.maplibre.org/style.json');
```

### Google Maps

```php
define('MAP_SYSTEM', 'googlemaps');
define('GOOGLE_MAPS_API_KEY', 'your-api-key');
```

**⚠️ Security Notice:**
Google Maps API key is exposed to the frontend. You must take the following measures:

1. Configure **API key restrictions** in **Google Cloud Console**
2. Select "HTTP referrers" under **Application restrictions**
3. Add allowed referrers:
   - Production: `https://yourdomain.com/*`
   - Development: `http://localhost:*`
4. Enable only "Maps JavaScript API" under **API restrictions**

## Troubleshooting

### Chat not working

- Verify API keys in `lib/config.php`
- Check browser console for error messages
- Check PHP error logs

### Map not displaying

- Verify map system API key is correctly configured
- Check `MAP_SYSTEM` value is valid (`mapbox`, `maplibre`, or `googlemaps`)
- Check browser developer tools for network errors

### POIs not showing on map

- Verify DCP API connection
- Check API response in browser console
- Verify POI data format is correct

## Development

### Local Development

Using PHP built-in server:

```bash
cd public_html
php -S localhost:8000
```

### Debug Mode

Enable debug mode in `lib/config.php`:

```php
define('DEBUG_MODE', true);
```

## Contributing

Pull requests are welcome! For major changes, please open an issue first to discuss what you would like to change.

### Development Flow

1. Fork this repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Authors

- Development: DIIIG Inc.

## Acknowledgments

- [Anthropic](https://www.anthropic.com/) - Claude API
- [OpenFreeMap](https://openfreemap.org/) - Free map tiles

## References

- [Anthropic API Documentation](https://docs.anthropic.com/)
- [DIIIG Cloud Platform](https://dcp.diiig.info/)
- [DCP API Documentation](https://dcp.diiig.info/docs/api)
- [Anthropic MCP Connector](https://docs.claude.com/en/docs/agents-and-tools/mcp-connector)
- [Mapbox GL JS](https://docs.mapbox.com/mapbox-gl-js/)
- [MapLibre GL JS](https://maplibre.org/maplibre-gl-js/docs/)
- [Google Maps JavaScript API](https://developers.google.com/maps/documentation/javascript)
