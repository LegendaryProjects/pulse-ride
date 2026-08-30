import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, CircleMarker, Polyline, Tooltip } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

const LiveMap = ({ stops, currentIndex, locations }) => {
  const [segmentPath, setSegmentPath] = useState([]);
  const mapCenter = [13.0125, 74.7940];

  useEffect(() => {
    const fetchCurrentLegRoute = async () => {
      // If the route is finished, clear the active leg path
      if (currentIndex >= stops.length - 1) {
        setSegmentPath([]);
        return;
      }

      const currentStopName = stops[currentIndex];
      const nextStopName = stops[currentIndex + 1];

      const startCoord = locations[currentStopName];
      const endCoord = locations[nextStopName];

      if (!startCoord || !endCoord) return;

      try {
        // Fetch route specifically for Current Leg: Point A to Point B
        const url = `https://router.project-osrm.org/route/v1/driving/${startCoord[1]},${startCoord[0]};${endCoord[1]},${endCoord[0]}?overview=full&geometries=geojson`;
        const response = await fetch(url);
        const data = await response.json();
        
        if (data.routes && data.routes.length > 0) {
          const path = data.routes[0].geometry.coordinates.map(c => [c[1], c[0]]);
          setSegmentPath(path);
        }
      } catch (error) {
        console.error("Failed to fetch current leg route:", error);
      }
    };

    fetchCurrentLegRoute();
  }, [stops, currentIndex, locations]);

  return (
    <div className="w-full flex-1 min-h-[360px] rounded-lg overflow-hidden border border-[#282828] z-0 shadow-lg relative flex flex-col">
      <MapContainer center={mapCenter} zoom={15} scrollWheelZoom={true} className="w-full h-full min-h-[360px] bg-[#121212]" zoomControl={false}>
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution='&copy; OpenStreetMap' />
        
        {stops.map((stop, index) => {
          const isCompleted = index < currentIndex;
          const isCurrent = index === currentIndex;
          const isNext = index === currentIndex + 1;
          const loc = locations[stop];

          if (!loc) return null;

          let color = '#555555'; 
          if (isCompleted) color = '#1ED760'; 
          if (isCurrent || isNext) color = '#1ED760'; 

          return (
            <CircleMarker 
              key={index} 
              center={loc} 
              radius={isCurrent || isNext ? 9 : 5} 
              pathOptions={{ color, fillColor: '#121212', fillOpacity: 1, weight: isCurrent ? 3 : 2 }}
              className={isCurrent ? 'animate-pulse' : ''}
            >
              <Tooltip direction="top" offset={[0, -10]} opacity={1}>
                <span className="font-bold text-black">{index + 1}. {stop}</span>
              </Tooltip>
            </CircleMarker>
          );
        })}

        {/* Display only the active leg path (Point A to Point B) */}
        {segmentPath.length > 0 && (
          <Polyline positions={segmentPath} pathOptions={{ color: '#1ED760', weight: 5, opacity: 0.9 }} />
        )}
      </MapContainer>
    </div>
  );
};

export default LiveMap;