
interface LocationData {
  latitude: number;
  longitude: number;
  accuracy: number | null;
  address: string | null;
  city: string | null;
  region: string | null;
  country: string | null;
  postalCode: string | null;
  timestamp: string; // ISO 8601
}

export {};
