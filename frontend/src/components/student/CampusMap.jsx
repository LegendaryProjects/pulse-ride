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
    <div className="w-full h-[400px] rounded-lg overflow-hidden border border-[#282828] z-0 shadow-lg relative">
      <MapContainer center={mapCenter} zoom={16} scrollWheelZoom={true} className="w-full h-full bg-[#121212]" zoomControl={false}>
        <TileLayer 
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" 
          attribution='&copy; OpenStreetMap' 
        />
        
        {/* Render all 10 NITK Nodes */}
        {Object.entries(locations).map(([name, coords]) => {
          const isPickup = pickup === name;
          const isDropoff = dropoff === name;
          
          let color = '#555555'; // Default unselected
          if (isPickup) color = '#1ED760'; // Green for Pickup
          if (isDropoff) color = '#E50914'; // Red for Dropoff

          return (
            <CircleMarker 
              key={name}
              center={coords} 
              radius={isPickup || isDropoff ? 10 : 6} 
              pathOptions={{ color, fillColor: '#121212', fillOpacity: 1, weight: 3 }}
              eventHandlers={{ click: () => handleMarkerClick(name) }}
              className="cursor-pointer"
            >
              <Tooltip direction="top" offset={[0, -10]} opacity={1}>
                <span className="font-bold text-black">{name}</span>
              </Tooltip>
            </CircleMarker>
          );
        })}

        {/* Draw snapped roadway path */}
        {routePath && routePath.length > 0 && (
          <Polyline positions={routePath} pathOptions={{ color: '#1ED760', weight: 4, opacity: 0.8 }} className="animate-pulse" />
        )}
      </MapContainer>
    </div>
  );
};

export default CampusMap;