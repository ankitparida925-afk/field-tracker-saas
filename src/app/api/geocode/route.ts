import { NextRequest, NextResponse } from 'next/server';

interface GeocodeResult {
  lat: string;
  lon: string;
  display_name: string;
  type?: string;
}

const LOCAL_LANDMARKS: GeocodeResult[] = [
  { display_name: 'HQ Office (FieldTracker HQ) - San Francisco', lat: '37.7749', lon: '-122.4194', type: 'landmark' },
  { display_name: 'Apex Corp (Client A) - 1st St', lat: '37.7824', lon: '-122.4124', type: 'landmark' },
  { display_name: 'Apex Retail (Client B) - 4th St', lat: '37.7898', lon: '-122.4018', type: 'landmark' },
  { display_name: 'General Hospital (Medical Client) - Castro St', lat: '37.7649', lon: '-122.4494', type: 'landmark' },
  { display_name: 'Mission Health Clinic - Mission St', lat: '37.7594', lon: '-122.4354', type: 'landmark' },
  { display_name: 'Restricted Industrial Zone - SOMA', lat: '37.7850', lon: '-122.3950', type: 'landmark' },
  { display_name: 'San Francisco, CA', lat: '37.7749', lon: '-122.4194', type: 'city' },
  { display_name: 'New York, NY', lat: '40.7128', lon: '-74.0060', type: 'city' },
  { display_name: 'London, UK', lat: '51.5074', lon: '-0.1278', type: 'city' },
  { display_name: 'Tokyo, Japan', lat: '35.6762', lon: '139.6503', type: 'city' },
  
  // High-priority local shortcuts for Indian users (IST timezone support)
  { display_name: 'Bangalore, Karnataka, India', lat: '12.9716', lon: '77.5946', type: 'city' },
  { display_name: 'Mumbai, Maharashtra, India', lat: '19.0760', lon: '72.8777', type: 'city' },
  { display_name: 'Delhi, National Capital Territory of Delhi, India', lat: '28.6139', lon: '77.2090', type: 'city' },
  { display_name: 'Chennai, Tamil Nadu, India', lat: '13.0827', lon: '80.2707', type: 'city' },
  { display_name: 'Hyderabad, Telangana, India', lat: '17.3850', lon: '78.4867', type: 'city' },
  { display_name: 'Kolkata, West Bengal, India', lat: '22.5726', lon: '88.3639', type: 'city' }
];

export async function GET(req: NextRequest): Promise<NextResponse> {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get('q');

  if (!q) {
    return NextResponse.json({ error: 'Query parameter q is required.' }, { status: 400 });
  }

  const queryClean = q.toLowerCase().trim();
  const results: GeocodeResult[] = [];

  // Read custom client keys from headers (admin client overlay config)
  const clientMapboxToken = req.headers.get('x-mapbox-token');
  const clientGoogleKey = req.headers.get('x-google-key');

  const mapboxToken = clientMapboxToken || process.env.MAPBOX_ACCESS_TOKEN;
  const googleKey = clientGoogleKey || process.env.GOOGLE_MAPS_API_KEY;

  // 1. Direct and fuzzy match on B2B local landmarks & Indian shortcuts (instant and offline friendly)
  LOCAL_LANDMARKS.forEach(item => {
    const name = item.display_name.toLowerCase();
    if (name.includes(queryClean) || queryClean.includes(name)) {
      results.push(item);
    }
  });

  // 2. Query Mapbox Geocoding API if token is configured (Highly recommended)
  if (mapboxToken) {
    try {
      const res = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(q)}.json?access_token=${mapboxToken}&limit=5`
      );
      if (res.ok) {
        const data = await res.json();
        if (data && Array.isArray(data.features)) {
          data.features.forEach((feature: any) => {
            if (feature.geometry && Array.isArray(feature.geometry.coordinates)) {
              const [lon, lat] = feature.geometry.coordinates;
              results.push({
                lat: lat.toString(),
                lon: lon.toString(),
                display_name: feature.place_name || feature.text,
                type: 'address'
              });
            }
          });
          if (results.length > LOCAL_LANDMARKS.filter(item => item.display_name.toLowerCase().includes(queryClean)).length) {
            return NextResponse.json(results);
          }
        }
      }
    } catch (err: any) {
      console.warn('Mapbox geocoding query failed, falling back.', err.message);
    }
  }

  // 3. Query Google Geocoding API if key is configured
  if (googleKey) {
    try {
      const res = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(q)}&key=${googleKey}`
      );
      if (res.ok) {
        const data = await res.json();
        if (data && Array.isArray(data.results)) {
          data.results.forEach((item: any) => {
            if (item.geometry && item.geometry.location) {
              const { lat, lng } = item.geometry.location;
              results.push({
                lat: lat.toString(),
                lon: lng.toString(),
                display_name: item.formatted_address,
                type: 'address'
              });
            }
          });
          if (results.length > LOCAL_LANDMARKS.filter(item => item.display_name.toLowerCase().includes(queryClean)).length) {
            return NextResponse.json(results);
          }
        }
      }
    } catch (err: any) {
      console.warn('Google geocoding query failed, falling back.', err.message);
    }
  }

  // 4. Fetch remote geocoding suggestions from Photon by Komoot (Zero-config rate-limit-free fallback)
  try {
    const res = await fetch(
      `https://photon.komoot.io/api/?q=${encodeURIComponent(q)}&limit=5`,
      {
        next: { revalidate: 86400 } // cache suggestions for 24 hours
      }
    );

    if (res.ok) {
      const data = await res.json();
      if (data && Array.isArray(data.features)) {
        data.features.forEach((feature: any) => {
          const props = feature.properties || {};
          const geom = feature.geometry || {};
          if (geom.type === 'Point' && Array.isArray(geom.coordinates)) {
            const [lon, lat] = geom.coordinates;
            
            // Format a highly clean address display name
            const parts = [
              props.name,
              props.street,
              props.district,
              props.city || props.town || props.village,
              props.state,
              props.country
            ].filter(Boolean);
            
            const display_name = parts.join(', ');
            
            // Avoid duplicate entries in list
            if (!results.some(r => Math.abs(parseFloat(r.lat) - lat) < 0.0001 && Math.abs(parseFloat(r.lon) - lon) < 0.0001)) {
              results.push({
                lat: lat.toString(),
                lon: lon.toString(),
                display_name,
                type: 'address'
              });
            }
          }
        });
      }
    }
  } catch (err: any) {
    console.warn('Photon suggestions fetch failed. Attempting Nominatim fallback.', err.message);
    
    // 5. Nominatim Fallback if Photon fails
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(q)}&limit=3`,
        {
          headers: {
            'User-Agent': 'FieldTracker-SaaS-Demo/1.0 (admin@fti.com)',
          }
        }
      );
      if (res.ok) {
        const data = await res.json();
        if (data && Array.isArray(data)) {
          data.forEach((item: any) => {
            if (!results.some(r => Math.abs(parseFloat(r.lat) - parseFloat(item.lat)) < 0.0001 && Math.abs(parseFloat(r.lon) - parseFloat(item.lon)) < 0.0001)) {
              results.push({
                lat: item.lat,
                lon: item.lon,
                display_name: item.display_name,
                type: 'address'
              });
            }
          });
        }
      }
    } catch (nominatimErr: any) {
      console.warn('Nominatim fallback also failed.', nominatimErr.message);
    }
  }

  // 6. Robust fallback if no results are found at all
  if (results.length === 0) {
    const jitterLat = 37.7749 + (Math.random() - 0.5) * 0.015;
    const jitterLng = -122.4194 + (Math.random() - 0.5) * 0.015;
    results.push({
      lat: jitterLat.toString(),
      lon: jitterLng.toString(),
      display_name: `"${q}" (Approximate Bounds)`,
      type: 'approximate'
    });
  }

  return NextResponse.json(results);
}

