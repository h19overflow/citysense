export interface HousingListing {
  id: string;
  address: string;
  price: number | null;
  priceFormatted: string;
  beds: number | null;
  baths: number | null;
  sqft: number | null;
  listingType: string;
  status: string;
  url: string;
  imageUrl: string;
  lat: number;
  lng: number;
  scrapedAt: string;
}
