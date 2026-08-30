import React, { useState, useRef, useEffect } from 'react';

const NITK_LOCATIONS = [
  "LHC-C", "LHC-D", "Girls Coop", "Girls Hostel", "Mega Towers", 
  "Karavali Hostel", "NITK Beach Gate", "Main Library", "Adke Circle", "Guest House"
];

const LocationDropdown = ({ placeholder, value, onChange, disabled }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => { if (dropdownRef.current && !dropdownRef.current.contains(event.target)) setIsOpen(false); };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filteredLocations = NITK_LOCATIONS.filter((loc) => loc.toLowerCase().startsWith(searchTerm.toLowerCase()));

  return (
    <div className="relative w-full md:flex-1" ref={dropdownRef}>
      <div className={`border border-[#282828] px-4 py-3 rounded transition-colors flex justify-between items-center ${disabled ? "bg-[#121212]/50 opacity-50 cursor-not-allowed" : "bg-[#181818] cursor-pointer hover:bg-[#282828]"}`} onClick={() => !disabled && setIsOpen(!isOpen)}>
        <span className={value ? "text-white" : "text-[#B3B3B3]"}>{value || placeholder}</span>
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-[#B3B3B3]" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
      </div>
      {isOpen && !disabled && (
        <div className="absolute z-50 w-full mt-2 bg-[#181818] border border-[#282828] rounded shadow-lg">
          <div className="p-2 border-b border-[#282828]"><input type="text" className="w-full bg-[#121212] text-white px-3 py-2 rounded focus:outline-none focus:ring-1 focus:ring-[#1ED760]" placeholder="Search prefix..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} onClick={(e) => e.stopPropagation()} /></div>
          <ul className="max-h-60 overflow-y-auto [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-[#121212] [&::-webkit-scrollbar-thumb]:bg-[#282828] [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-[#3E3E3E] transition-colors">
            {filteredLocations.length > 0 ? filteredLocations.map((loc) => (<li key={loc} className="px-4 py-2 text-[#B3B3B3] hover:bg-[#282828] hover:text-white cursor-pointer transition-colors" onClick={() => { onChange(loc); setIsOpen(false); setSearchTerm(""); }}>{loc}</li>)) : <li className="px-4 py-2 text-[#B3B3B3] italic cursor-default">No locations found</li>}
          </ul>
        </div>
      )}
    </div>
  );
};

const TripSelector = ({ pickup, setPickup, dropoff, setDropoff, isConfirmed, onConfirm }) => {
  const isButtonDisabled = !pickup || !dropoff || isConfirmed;
  return (
    <div className="flex flex-col md:flex-row gap-4 w-full p-4 bg-[#181818] border border-[#282828] rounded-lg shadow-md backdrop-blur-lg">
      <LocationDropdown placeholder="Choose PickUp Point" value={pickup} onChange={setPickup} disabled={isConfirmed} />
      <LocationDropdown placeholder="Choose DropOff Point" value={dropoff} onChange={setDropoff} disabled={isConfirmed} />
      <button onClick={onConfirm} disabled={isButtonDisabled} className={`px-8 py-3 rounded font-bold w-full md:w-auto md:min-w-[150px] transition-all duration-200 focus:outline-none ${isButtonDisabled ? 'bg-[#282828] text-[#555555] cursor-not-allowed' : 'bg-[#1ED760] text-black cursor-pointer hover:scale-105'}`}>
        {isConfirmed ? 'Confirmed' : 'Confirm'}
      </button>
    </div>
  );
};

export default TripSelector;