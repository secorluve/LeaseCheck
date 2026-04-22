import { MapPin, ExternalLink, CheckCircle2, XCircle } from 'lucide-react';

interface MapCardProps {
  mapData: {
    verified: boolean;
    coordinates?: { lat: number; lng: number };
  };
  address: string;
}

export function MapCard({ mapData, address }: MapCardProps) {
  const openInMaps = () => {
    if (!mapData.coordinates) return;
    window.open(
      `https://www.google.com/maps/search/?api=1&query=${mapData.coordinates.lat},${mapData.coordinates.lng}`,
      '_blank'
    );
  };

  return (
    <div className="group rounded-2xl border border-border/50 bg-card p-6 transition-all hover:border-border hover:shadow-lg hover:shadow-primary/5">
      <div className="mb-6 flex items-center gap-2">
        <MapPin className="h-5 w-5 text-primary" />
        <h3 className="text-xl font-semibold">Проверка на карте</h3>
      </div>

      <div className="space-y-4">
        {/* Map Placeholder */}
        <div className="relative overflow-hidden rounded-lg border border-border/30 bg-muted/20">
          <div className="flex h-48 items-center justify-center bg-gradient-to-br from-primary/10 to-primary/5">
            <div className="text-center">
              <MapPin className="mx-auto mb-2 h-12 w-12 text-primary/50" />
              <p className="text-sm text-muted-foreground">Превью карты</p>
            </div>
          </div>
        </div>

        {/* Verification Status */}
        <div
          className={`flex items-center gap-3 rounded-lg border p-4 ${
            mapData.verified
              ? 'border-primary/30 bg-primary/5'
              : 'border-red-500/30 bg-red-500/5'
          }`}
        >
          {mapData.verified ? (
            <>
              <CheckCircle2 className="h-5 w-5 flex-shrink-0 text-primary" />
              <div className="flex-1">
                <div className="font-medium text-primary">Адрес подтвержден</div>
                <div className="mt-1 text-sm text-muted-foreground">{address}</div>
              </div>
            </>
          ) : (
            <>
              <XCircle className="h-5 w-5 flex-shrink-0 text-red-500" />
              <div className="flex-1">
                <div className="font-medium text-red-500">Адрес не подтвержден</div>
                <div className="mt-1 text-sm text-muted-foreground">
                  Не удалось проверить местоположение
                </div>
              </div>
            </>
          )}
        </div>

        {/* Open in Maps Button */}
        <button
          onClick={openInMaps}
          disabled={!mapData.coordinates}
          className="flex w-full items-center justify-center gap-2 rounded-lg border border-border/50 bg-muted/30 px-4 py-3 transition-all hover:border-primary/30 hover:bg-primary/10"
        >
          <ExternalLink className="h-4 w-4" />
          <span className="text-sm font-medium">Открыть в Google Maps</span>
        </button>

        {/* Coordinates */}
        <div className="rounded-lg border border-border/30 bg-muted/20 p-3">
          <div className="text-xs text-muted-foreground">Координаты</div>
          {mapData.coordinates ? (
            <div className="mt-1 font-mono text-sm">
              {mapData.coordinates.lat.toFixed(4)}, {mapData.coordinates.lng.toFixed(4)}
            </div>
          ) : (
            <div className="mt-1 text-sm text-muted-foreground">Не указаны</div>
          )}
        </div>
      </div>
    </div>
  );
}
