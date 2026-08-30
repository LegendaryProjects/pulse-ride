import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, CircleMarker, Polyline, Tooltip } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { getRoadRoute, getMultiStopRoadRoute } from '../../services/routing';

const LiveMap = ({ stops = [], currentIndex = 0, locations = {}, isReachedStop = false }) => {
  const [fullRoutePath, setFullRoutePath] = useState([]);
  const [activeLegPath, setActiveLegPath] = useState([]);
  const mapCenter = [13.0120, 74.7935];

  useEffect(() => {
    const fetchRoutes = async () => {
      if (!stops || stops.length === 0) {
        setFullRoutePath([]);
        setActiveLegPath([]);
        return;
      }

      // 1. Calculate Full Multi-Stop Road Network Route
      if (stops.length >= 2) {
        try {
          const fullPath = await getMultiStopRoadRoute(stops, locations);
          if (fullPath && fullPath.length > 0) {
            setFullRoutePath(fullPath);
          }
        } catch (e) {
          console.warn('Could not generate full multi-stop path:', e);
        }
      } else {
        setFullRoutePath([]);
      }

      // 2. Active Leg Determination (Current vehicle progress)
      if (stops.length >= 2 && currentIndex < stops.length) {
        let fromStop = stops[currentIndex];
        let toStop = stops[Math.min(currentIndex + 1, stops.length - 1)];

        if (currentIndex > 0 && !isReachedStop) {
          fromStop = stops[currentIndex - 1];
          toStop = stops[currentIndex];
        }

        const startCoord = locations[fromStop];
        const endCoord = locations[toStop];

        if (startCoord && endCoord && fromStop !== toStop) {
          const legData = await getRoadRoute(startCoord, endCoord);
          if (legData.coordinates && legData.coordinates.length > 0) {
            setActiveLegPath(legData.coordinates);
          }
        }
      }
    };

    fetchRoutes();
  }, [stops, currentIndex, locations, isReachedStop]);

  return (
    <div className="w-full flex-1 min-h-[380px] rounded-2xl overflow-hidden border border-[#282828] z-0 shadow-2xl relative flex flex-col bg-[#121212]">
      <MapContainer 
        center={mapCenter} 
        zoom={15} 
        scrollWheelZoom={true} 
        className="w-full h-full min-h-[380px] bg-[#121212]" 
        zoomControl={false}
      >
        <TileLayer 
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" 
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors' 
        />

        {/* Full Planned Multi-Stop Route Polyline */}
        {fullRoutePath.length > 0 && (
          <>
            <Polyline 
              positions={fullRoutePath} 
              pathOptions={{ 
                color: '#064e3b', 
                weight: 6, 
                opacity: 0.7,
                lineCap: 'round',
                lineJoin: 'round'
              }} 
            />
            <Polyline 
              positions={fullRoutePath} 
              pathOptions={{ 
                color: '#15803d', 
                weight: 3.5, 
                opacity: 0.9,
                dashArray: '6, 6',
                lineCap: 'round',
                lineJoin: 'round'
              }} 
            />
          </>
        )}

        {/* Active Leg Highlighted Polyline */}
        {activeLegPath.length > 0 && (
          <>
            <Polyline 
              positions={activeLegPath} 
              pathOptions={{ 
                color: '#064e3b', 
                weight: 8, 
                opacity: 0.9,
                lineCap: 'round',
                lineJoin: 'round'
              }} 
            />
            <Polyline 
              positions={activeLegPath} 
              pathOptions={{ 
                color: '#1ED760', 
                weight: 5, 
                opacity: 1,
                lineCap: 'round',
                lineJoin: 'round'
              }} 
            />
          </>
        )}
        
        {/* Render filled stop nodes */}
        {stops.map((stopName, index) => {
          const isCompleted = index < currentIndex;
          const isCurrent = index === currentIndex;
          const loc = locations[stopName];

          if (!loc) return null;

          let fillColor = '#52525b';
          let strokeColor = '#a1a1aa';
          let radius = 5.5;
          let weight = 1.5;

          if (isCurrent) {
            fillColor = '#dc2626'; // Vibrant red dot for active target stop
            strokeColor = '#ffffff';
            radius = 8;
            weight = 2.5;
          } else if (isCompleted) {
            fillColor = '#15803d'; // Green dot for completed stops
            strokeColor = '#ffffff';
            radius = 6;
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
                <div className="text-center">
                  <span className="font-extrabold text-xs text-white block">
                    {index + 1}. {stopName}
                  </span>
                  <span className={`text-[10px] font-bold ${isCurrent ? 'text-red-400' : isCompleted ? 'text-emerald-400' : 'text-gray-300'}`}>
                    {isCurrent ? (isReachedStop ? '★ Current Stop (Boarding/Deboarding)' : '▶ En Route to this Stop') : isCompleted ? '✓ Completed' : 'Scheduled Stop'}
                  </span>
                </div>
              </Tooltip>
            </CircleMarker>
          );
        })}
      </MapContainer>
    </div>
  );
};

export default LiveMap;