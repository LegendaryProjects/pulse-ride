import React from 'react';
import { MapContainer, TileLayer, CircleMarker, Polyline, Tooltip } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

const CampusMap = ({ locations, pickup, setPickup, dropoff, setDropoff, routePath, isConfirmed }) => {
  const mapCenter = [13.0115, 74.7940]; // Centered on NITK

  const handleMarkerClick = (locationName) => {
    if (isConfirmed) return; // Disable changes if already confirmed
    
    if (!pickup || (pickup && dropoff)) {
      setPickup(locationName);
      setDropoff("");
    } else if (pickup && pickup !== locationName) {
      setDropoff(locationName);
    }
  };

  return (
    <div className="w-full h-[400px] rounded-xl overflow-hidden border border-[#282828] z-0 shadow-xl relative bg-[#121212]">
      <MapContainer 
        center={mapCenter} 
        zoom={16} 
        scrollWheelZoom={true} 
        className="w-full h-full bg-[#121212]" 
        zoomControl={false}
      >
        <TileLayer 
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" 
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors' 
        />

        {/* Google Maps style dark and static green route path with crisp casing */}
        {routePath && routePath.length > 0 && (
          <>
            <Polyline 
              positions={routePath} 
              pathOptions={{ 
                color: '#064e3b', 
                weight: 7, 
                opacity: 0.8,
                lineCap: 'round',
                lineJoin: 'round'
              }} 
            />
            <Polyline 
              positions={routePath} 
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
        {Object.entries(locations).map(([name, coords]) => {
          const isPickup = pickup === name;
          const isDropoff = dropoff === name;
          
          let fillColor = '#52525b'; // Default unselected
          let strokeColor = '#a1a1aa';
          let radius = 4.5;
          let weight = 1.5;

          if (isPickup) {
            fillColor = '#15803d'; // Dark green filled dot for Pickup
            strokeColor = '#ffffff';
            radius = 6.5;
            weight = 2;
          } else if (isDropoff) {
            fillColor = '#dc2626'; // Red filled dot for Dropoff
            strokeColor = '#ffffff';
            radius = 6.5;
            weight = 2;
          }

          return (
            <CircleMarker 
              key={name}
              center={coords} 
              radius={radius} 
              pathOptions={{ 
                color: strokeColor, 
                fillColor: fillColor, 
                fillOpacity: 1, 
                weight: weight 
              }}
              eventHandlers={{ click: () => handleMarkerClick(name) }}
              className="cursor-pointer"
            >
              <Tooltip direction="top" offset={[0, -8]} opacity={1}>
                <span className="font-semibold text-white">{name}</span>
              </Tooltip>
            </CircleMarker>
          );
        })}
      </MapContainer>
    </div>
  );
};

export default CampusMap;