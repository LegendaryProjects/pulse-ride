import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, CircleMarker, Polyline, Tooltip } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

const LiveMap = ({ stops, currentIndex, locations }) => {
  const [segmentPath, setSegmentPath] = useState([]);
  const mapCenter = [13.0125, 74.7940];

  useEffect(() => {
    const fetchCurrentLegRoute = async () => {
      // If we haven't started or the route is finished, clear the active leg path
      if (currentIndex <= 0 || currentIndex >= stops.length) {
        setSegmentPath([]);
        return;
      }

      const prevStopName = stops[currentIndex - 1];
      const currentStopName = stops[currentIndex];

      const startCoord = locations[prevStopName];
      const endCoord = locations[currentStopName];

      if (!startCoord || !endCoord) return;

      try {
        // Fetch route specifically for Current Leg: Previous Stop to Current Target Stop
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
    <div className="w-full flex-1 min-h-[360px] rounded-xl overflow-hidden border border-[#282828] z-0 shadow-xl relative flex flex-col bg-[#121212]">
      <MapContainer 
        center={mapCenter} 
        zoom={15} 
        scrollWheelZoom={true} 
        className="w-full h-full min-h-[360px] bg-[#121212]" 
        zoomControl={false}
      >
        <TileLayer 
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" 
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors' 
        />

        {/* Google Maps style dark and static green route path with crisp casing */}
        {segmentPath.length > 0 && (
          <>
            <Polyline 
              positions={segmentPath} 
              pathOptions={{ 
                color: '#064e3b', 
                weight: 7, 
                opacity: 0.8,
                lineCap: 'round',
                lineJoin: 'round'
              }} 
            />
            <Polyline 
              positions={segmentPath} 
              pathOptions={{ 
                color: '#15803d', 
                weight: 4.5, 
                opacity: 1,
                lineCap: 'round',
                lineJoin: 'round'
              }} 
            />
          </>
        )}
        
        {/* Render filled small dots (diameter bigger than path thickness) */}
        {stops.map((stop, index) => {
          const isCompleted = index < currentIndex;
          const isCurrent = index === currentIndex;
          const loc = locations[stop];

          if (!loc) return null;

          let fillColor = '#52525b'; // Grey for upcoming stops (including final stop)
          let strokeColor = '#a1a1aa';
          let radius = 4.5;
          let weight = 1.5;

          if (isCurrent) {
            fillColor = '#dc2626'; // Red filled dot for immediate next stop
            strokeColor = '#ffffff';
            radius = 6.5;
            weight = 2;
          } else if (isCompleted) {
            fillColor = '#15803d'; // Dark green filled dot for completed stops
            strokeColor = '#ffffff';
            radius = 5.5;
            weight = 1.5;
          }

          return (
            <CircleMarker 
              key={index} 
              center={loc} 
              radius={radius} 
              pathOptions={{ 
                color: strokeColor, 
                fillColor: fillColor, 
                fillOpacity: 1, 
                weight: weight 
              }}
            >
              <Tooltip direction="top" offset={[0, -8]} opacity={1}>
                <span className="font-semibold text-white">{index + 1}. {stop}</span>
              </Tooltip>
            </CircleMarker>
          );
        })}
      </MapContainer>
    </div>
  );
};

export default LiveMap;