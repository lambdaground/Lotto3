import { useState, useEffect, useMemo } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import { MapPin, Navigation, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useLanguage } from "@/lib/i18n";
import { lottoStores, type LottoStore } from "@/data/stores";

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

const userIcon = new L.Icon({
  iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

interface StoreWithDistance extends LottoStore {
  distance?: number;
}

function getDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function MapUpdater({ center, zoom }: { center: [number, number]; zoom: number }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, zoom);
  }, [map, center, zoom]);
  return null;
}

export function StoreMap() {
  const { t } = useLanguage();
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const [isLocating, setIsLocating] = useState(false);
  const [mapCenter, setMapCenter] = useState<[number, number]>([36.5, 127.5]);
  const [mapZoom, setMapZoom] = useState(7);

  const storesWithDistance: StoreWithDistance[] = useMemo(() => {
    if (!userLocation) return lottoStores;
    return lottoStores
      .map((store) => ({
        ...store,
        distance: getDistance(userLocation[0], userLocation[1], store.lat, store.lng),
      }))
      .sort((a, b) => (a.distance || 0) - (b.distance || 0));
  }, [userLocation]);

  const nearbyStores = useMemo(() => {
    if (!userLocation) return [];
    return storesWithDistance.slice(0, 5);
  }, [storesWithDistance, userLocation]);

  const handleFindNearby = () => {
    setIsLocating(true);
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const loc: [number, number] = [position.coords.latitude, position.coords.longitude];
          setUserLocation(loc);
          setMapCenter(loc);
          setMapZoom(10);
          setIsLocating(false);
        },
        () => {
          setIsLocating(false);
        }
      );
    } else {
      setIsLocating(false);
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
        <div>
          <CardTitle className="text-lg flex items-center gap-2">
            <MapPin className="w-5 h-5 text-primary" />
            {t("lottoStores")}
          </CardTitle>
          <CardDescription className="mt-1">{t("topStores")}</CardDescription>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleFindNearby}
          disabled={isLocating}
          data-testid="button-find-nearby"
        >
          {isLocating ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <Navigation className="w-4 h-4 mr-2" />
          )}
          {isLocating ? t("gettingLocation") : t("findNearby")}
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="h-[300px] md:h-[400px] rounded-md overflow-hidden border">
          <MapContainer
            center={mapCenter}
            zoom={mapZoom}
            style={{ height: "100%", width: "100%" }}
            scrollWheelZoom={true}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <MapUpdater center={mapCenter} zoom={mapZoom} />
            {userLocation && (
              <Marker position={userLocation} icon={userIcon}>
                <Popup>
                  <div className="text-center font-medium">{t("findNearby")}</div>
                </Popup>
              </Marker>
            )}
            {lottoStores.map((store) => (
              <Marker key={store.id} position={[store.lat, store.lng]}>
                <Popup>
                  <div className="space-y-1">
                    <div className="font-bold">{store.name}</div>
                    <div className="text-sm text-muted-foreground">{store.address}</div>
                    <Badge variant="secondary" className="text-xs">
                      {store.wins}
                    </Badge>
                  </div>
                </Popup>
              </Marker>
            ))}
          </MapContainer>
        </div>

        {nearbyStores.length > 0 && (
          <div className="space-y-2">
            <h3 className="text-sm font-medium text-muted-foreground">{t("nearbyStores")}</h3>
            <div className="grid gap-2">
              {nearbyStores.map((store) => (
                <div
                  key={store.id}
                  className="flex items-center justify-between p-3 rounded-md bg-muted/50"
                  data-testid={`store-nearby-${store.id}`}
                >
                  <div className="space-y-0.5">
                    <div className="font-medium text-sm">{store.name}</div>
                    <div className="text-xs text-muted-foreground">{store.address}</div>
                  </div>
                  <div className="text-right">
                    <Badge variant="outline" className="text-xs">
                      {store.wins}
                    </Badge>
                    {store.distance !== undefined && (
                      <div className="text-xs text-muted-foreground mt-1">
                        {store.distance.toFixed(1)} {t("distanceKm")}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
