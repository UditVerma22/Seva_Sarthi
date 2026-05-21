import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const useLocationStore = create(
  persist(
    (set) => ({
      city: '',
      fullAddress: '',
      isLocating: false,
      locationError: null,
      
      setCity: (newCity) => set({ city: newCity, fullAddress: newCity, locationError: null }),
      
      setFullLocation: (city, fullAddress) => set({ city, fullAddress, locationError: null }),
      
      detectLocation: async () => {
        set({ isLocating: true, locationError: null });
        
        if (!navigator.geolocation) {
          set({ isLocating: false, locationError: 'Geolocation is not supported by your browser.' });
          return;
        }

        navigator.geolocation.getCurrentPosition(
          async (position) => {
            try {
              const { latitude, longitude } = position.coords;
              // Use zoom=18 for street-level detail
              const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18`);
              
              if (!res.ok) throw new Error('Failed to fetch location data');
              
              const data = await res.json();
              
              const detectedCity = data.address.city || data.address.town || data.address.village || data.address.county || '';
              
              // Construct a premium-looking exact address getting the most specific details
              const addr = data.address || {};
              const poi = addr.amenity || addr.shop || addr.office || addr.building || addr.leisure || addr.historic || addr.tourism || '';
              const house = addr.house_number || '';
              const road = addr.road || addr.pedestrian || addr.residential || '';
              const area = addr.suburb || addr.neighbourhood || addr.village || addr.city_district || '';
              
              const exactParts = [poi, house, road, area].filter(Boolean);
              
              let exactAddress = '';
              if (exactParts.length > 0) {
                exactAddress = exactParts.join(', ');
              } else if (data.display_name) {
                // Fallback to taking the first 3-4 segments of the raw display name
                exactAddress = data.display_name.split(',').slice(0, 3).join(', ');
              }

              if (detectedCity) {
                set({ city: detectedCity, fullAddress: exactAddress || detectedCity, isLocating: false });
              } else {
                set({ isLocating: false, locationError: 'Could not determine your city from coordinates.' });
              }
            } catch {
              set({ isLocating: false, locationError: 'Error fetching location details.' });
            }
          },
          (error) => {
            let errorMsg = 'Unable to retrieve your location.';
            if (error.code === error.PERMISSION_DENIED) errorMsg = 'Location permission denied.';
            set({ isLocating: false, locationError: errorMsg });
          },
          { timeout: 10000, enableHighAccuracy: true }
        );
      },
      
      searchLocation: async (query) => {
        set({ isLocating: true, locationError: null });
        try {
          const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1&addressdetails=1`);
          if (!res.ok) throw new Error('Search failed');
          const results = await res.json();
          
          if (results && results.length > 0) {
            const data = results[0];
            const detectedCity = data.address?.city || data.address?.town || data.address?.village || data.address?.county || query.split(',')[0];
            
            const exactParts = [
              data.address?.road || data.address?.suburb,
              data.address?.city_district || data.address?.state_district
            ].filter(Boolean);
            
            const exactAddress = exactParts.length > 0 ? exactParts.join(', ') : data.display_name.split(',').slice(0, 2).join(',');
            
            set({ city: detectedCity, fullAddress: exactAddress || query, isLocating: false });
            return true;
          } else {
            set({ isLocating: false, locationError: 'Location not found.' });
            return false;
          }
        } catch {
          set({ isLocating: false, locationError: 'Search failed.' });
          return false;
        }
      }
    }),
    {
      name: 'seva-sarthi-location',
    }
  )
);
