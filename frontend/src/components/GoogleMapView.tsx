import React, { useEffect, useRef, useState } from 'react';
import { setOptions, importLibrary } from '@googlemaps/js-api-loader';
import { MapPin, AlertCircle } from 'lucide-react';
import apiClient from '../api/client';

export interface MapMarker {
  id: string;
  latitude: number;
  longitude: number;
  title: string;
  description?: string;
  status?: string;
  caseNumber?: string;
}

interface GoogleMapViewProps {
  center?: { lat: number; lng: number };
  zoom?: number;
  markers?: MapMarker[];
  selectedLocation?: { lat: number; lng: number } | null;
  onLocationSelect?: (loc: { lat: number; lng: number }) => void;
  interactive?: boolean;
  height?: string;
  className?: string;
}

// Single loader cache to prevent redundant script injection
let cachedApiKey: string | null = null;
let mapsLoadedPromise: Promise<void> | null = null;

async function getMapsApiKey(): Promise<string> {
  if (cachedApiKey) return cachedApiKey;

  // 1. Check Vite build-time environment variable
  const viteKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
  if (viteKey && typeof viteKey === 'string' && viteKey.trim().length > 0) {
    cachedApiKey = viteKey.trim();
    return cachedApiKey;
  }

  // 2. Fetch from backend config endpoint (populated from server .env / Render environment)
  try {
    const res = await apiClient.get<{ mapsApiKey: string }>('/areas/config/maps');
    if (res.data?.mapsApiKey) {
      cachedApiKey = res.data.mapsApiKey.trim();
      return cachedApiKey;
    }
  } catch (err) {
    console.warn('[GoogleMapView] Unable to fetch maps config from server', err);
  }

  return '';
}

export const GoogleMapView: React.FC<GoogleMapViewProps> = ({
  center = { lat: 12.9784, lng: 77.6408 }, // Ward 82 / Bangalore civic reference
  zoom = 14,
  markers = [],
  selectedLocation,
  onLocationSelect,
  interactive = false,
  height = '320px',
  className = '',
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<google.maps.Map | null>(null);
  const selectedMarkerRef = useRef<google.maps.Marker | null>(null);
  const markersRef = useRef<google.maps.Marker[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function initMap() {
      setLoading(true);
      setError(null);

      try {
        const apiKey = await getMapsApiKey();
        if (!apiKey) {
          setError('Google Maps API key not configured. Please set GOOGLE_MAPS_API or VITE_GOOGLE_MAPS_API_KEY.');
          setLoading(false);
          return;
        }

        if (!mapsLoadedPromise) {
          setOptions({
            key: apiKey,
            v: 'weekly',
          });
          mapsLoadedPromise = (async () => {
            await importLibrary('maps');
            await importLibrary('marker');
          })();
        }

        await mapsLoadedPromise;
        if (!isMounted || !mapContainerRef.current) return;

        const initialCenter = selectedLocation || center;

        const map = new google.maps.Map(mapContainerRef.current, {
          center: initialCenter,
          zoom: selectedLocation ? 16 : zoom,
          mapTypeId: google.maps.MapTypeId.ROADMAP,
          mapTypeControl: true,
          streetViewControl: false,
          fullscreenControl: true,
          zoomControl: true,
          styles: [
            {
              featureType: 'poi.business',
              stylers: [{ visibility: 'off' }],
            },
            {
              featureType: 'transit',
              elementType: 'labels.icon',
              stylers: [{ visibility: 'off' }],
            },
          ],
        });

        mapInstanceRef.current = map;

        // If interactive, allow clicking on map to choose coordinates
        if (interactive && onLocationSelect) {
          map.addListener('click', (e: google.maps.MapMouseEvent) => {
            if (e.latLng) {
              const lat = e.latLng.lat();
              const lng = e.latLng.lng();
              onLocationSelect({ lat, lng });
            }
          });
        }

        setLoading(false);
      } catch (err: any) {
        console.error('[GoogleMapView] Failed to load Google Maps:', err);
        if (isMounted) {
          setError(err.message || 'Failed to initialize Google Maps. Check network or API key referrer restrictions.');
          setLoading(false);
        }
      }
    }

    initMap();

    return () => {
      isMounted = false;
    };
  }, []);

  // Update selected location marker when selectedLocation changes
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || typeof google === 'undefined') return;

    if (selectedLocation && selectedLocation.lat && selectedLocation.lng) {
      if (!selectedMarkerRef.current) {
        const marker = new google.maps.Marker({
          position: selectedLocation,
          map,
          draggable: interactive,
          animation: google.maps.Animation.DROP,
          title: 'Selected Civic Report Location',
          icon: {
            path: google.maps.SymbolPath.BACKWARD_CLOSED_ARROW,
            scale: 6,
            fillColor: '#059669', // Civic emerald
            fillOpacity: 1,
            strokeColor: '#ffffff',
            strokeWeight: 2,
          },
        });

        if (interactive && onLocationSelect) {
          marker.addListener('dragend', (e: google.maps.MapMouseEvent) => {
            if (e.latLng) {
              onLocationSelect({ lat: e.latLng.lat(), lng: e.latLng.lng() });
            }
          });
        }

        selectedMarkerRef.current = marker;
      } else {
        selectedMarkerRef.current.setPosition(selectedLocation);
      }

      // Pan map smoothly to the selected location
      map.panTo(selectedLocation);
    } else if (selectedMarkerRef.current) {
      selectedMarkerRef.current.setMap(null);
      selectedMarkerRef.current = null;
    }
  }, [selectedLocation, interactive, onLocationSelect]);

  // Update additional markers (e.g. nearby cases)
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || typeof google === 'undefined') return;

    // Clear existing auxiliary markers
    markersRef.current.forEach((m) => m.setMap(null));
    markersRef.current = [];

    const infoWindow = new google.maps.InfoWindow();

    markers.forEach((item) => {
      if (!item.latitude || !item.longitude) return;

      const isResolved = item.status === 'VERIFIED_RESOLVED';
      const isProgress = ['IN_PROGRESS', 'RESOLUTION_REPORTED', 'VERIFICATION_PENDING'].includes(item.status || '');
      const markerColor = isResolved ? '#10B981' : isProgress ? '#F59E0B' : '#EF4444';

      const marker = new google.maps.Marker({
        position: { lat: item.latitude, lng: item.longitude },
        map,
        title: item.title,
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          scale: 6,
          fillColor: markerColor,
          fillOpacity: 0.9,
          strokeColor: '#ffffff',
          strokeWeight: 1.5,
        },
      });

      marker.addListener('click', () => {
        const content = `
          <div style="font-family: 'Inter', sans-serif; font-size: 12px; padding: 4px; max-width: 200px;">
            <strong style="color: #0F172A; display: block; margin-bottom: 2px;">${item.caseNumber || item.title}</strong>
            <span style="color: #64748B; font-size: 11px;">${item.description || ''}</span>
          </div>
        `;
        infoWindow.setContent(content);
        infoWindow.open(map, marker);
      });

      markersRef.current.push(marker);
    });
  }, [markers]);

  return (
    <div className={`relative w-full rounded-lg border border-slate-200 overflow-hidden bg-slate-100 ${className}`} style={{ height }}>
      {/* Actual Map Canvas */}
      <div ref={mapContainerRef} className="w-full h-full" />

      {/* Loading State Overlay */}
      {loading && (
        <div className="absolute inset-0 bg-slate-50/90 backdrop-blur-2xs flex flex-col items-center justify-center p-4 text-center z-10">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-emerald-700 border-t-transparent mb-2" />
          <span className="text-xs font-semibold text-slate-800">Loading Google Maps...</span>
          <span className="text-[11px] text-slate-500 font-mono mt-0.5">Initializing GIS Geotag Layer</span>
        </div>
      )}

      {/* Error State Overlay */}
      {error && !loading && (
        <div className="absolute inset-0 bg-slate-50/95 flex flex-col items-center justify-center p-5 text-center z-10 space-y-2">
          <AlertCircle className="h-6 w-6 text-amber-600" />
          <div className="space-y-0.5">
            <h4 className="text-xs font-bold text-slate-900">Map Service Notice</h4>
            <p className="text-[11px] text-slate-600 max-w-xs">{error}</p>
          </div>
          <p className="text-[10px] text-slate-500 font-mono">
            Manual coordinate entry and device GPS detection remain fully operational.
          </p>
        </div>
      )}

      {/* Interactive Helper Banner */}
      {interactive && !loading && !error && (
        <div className="absolute top-2 left-2 z-10 bg-white/95 backdrop-blur-xs px-2.5 py-1 rounded shadow-2xs border border-slate-200 text-[10px] font-medium text-slate-700 flex items-center gap-1.5">
          <MapPin className="h-3 w-3 text-emerald-700" />
          <span>Click anywhere on the map or drag the pin to position report</span>
        </div>
      )}
    </div>
  );
};

export default GoogleMapView;
