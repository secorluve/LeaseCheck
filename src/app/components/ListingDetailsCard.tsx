import { Home, MapPin, Ruler, Building2, Calendar } from 'lucide-react';

interface ListingDetailsCardProps {
  listing: {
    price?: number;
    city: string;
    district: string;
    street: string;
    rooms: string;
    area: string;
    floor: string;
    totalFloors: string;
    rentalType: string;
  };
}

export function ListingDetailsCard({ listing }: ListingDetailsCardProps) {
  const formatPrice = (price?: number) => {
    if (price === undefined) return 'Не указано';
    return new Intl.NumberFormat('ru-KZ', {
      style: 'currency',
      currency: 'KZT',
      minimumFractionDigits: 0,
    }).format(price);
  };

  const details = [
    { icon: MapPin, label: 'Город', value: listing.city },
    { icon: MapPin, label: 'Район', value: listing.district },
    { icon: MapPin, label: 'Адрес', value: listing.street },
    { icon: Home, label: 'Комнаты', value: listing.rooms },
    { icon: Ruler, label: 'Площадь', value: listing.area },
    { icon: Building2, label: 'Этаж', value: listing.floor !== 'Не указано' || listing.totalFloors !== 'Не указано' ? `${listing.floor} из ${listing.totalFloors}` : 'Не указано' },
    { icon: Calendar, label: 'Тип аренды', value: listing.rentalType },
  ];

  return (
    <div className="group rounded-2xl border border-border/50 bg-card p-6 transition-all hover:border-border hover:shadow-lg hover:shadow-primary/5">
      <div className="mb-6 flex items-center justify-between">
        <h3 className="text-xl font-semibold">Детали объявления</h3>
        <div className="rounded-lg bg-primary/10 px-3 py-1 text-sm font-medium text-primary">
          {formatPrice(listing.price)}
        </div>
      </div>

      <div className="space-y-4">
        {details.map((detail, index) => (
          <div
            key={index}
            className="flex items-start gap-3 rounded-lg border border-border/30 bg-muted/30 p-3 transition-all hover:border-border/50 hover:bg-muted/50"
          >
            <detail.icon className="mt-0.5 h-5 w-5 text-muted-foreground" />
            <div className="flex-1">
              <div className="text-sm text-muted-foreground">{detail.label}</div>
              <div className="font-medium">{detail.value}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
