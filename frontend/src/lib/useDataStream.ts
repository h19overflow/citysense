import { useEffect, useRef } from "react";
import { useApp } from "./appContext";
import { connectSseStream, type SseMessage } from "./sseClient";
import { API_BASE } from "./apiConfig";
import { parseFeatureToJob, type GeoJsonFeature } from "./jobService";
import { refreshNewsArticles, fetchNewsArticles } from "./newsService";
import type { NewsArticle, HousingListing } from "./types";

interface HousingGeoJsonFeature {
  type: "Feature";
  geometry: { type: "Point"; coordinates: [number, number] };
  properties: {
    id: string;
    address: string;
    price: number | null;
    price_formatted: string;
    beds: number | null;
    baths: number | null;
    sqft: number | null;
    listing_type: string;
    status: string;
    url: string;
    image_url: string;
    scraped_at: string;
  };
}

function parseFeatureToHousingListing(feature: HousingGeoJsonFeature): HousingListing {
  const p = feature.properties;
  const [lng, lat] = feature.geometry.coordinates;
  return {
    id: p.id,
    address: p.address,
    price: p.price,
    priceFormatted: p.price_formatted,
    beds: p.beds,
    baths: p.baths,
    sqft: p.sqft,
    listingType: p.listing_type,
    status: p.status,
    url: p.url,
    imageUrl: p.image_url,
    lat,
    lng,
    scrapedAt: p.scraped_at,
  };
}

/**
 * Connects to the backend SSE stream and dispatches
 * MERGE_* actions as live data arrives.
 */
export function useDataStream(): void {
  const { dispatch } = useApp();
  const dispatchRef = useRef(dispatch);
  dispatchRef.current = dispatch;

  // Initial housing data load from API
  useEffect(() => {
    fetch(`${API_BASE}/api/housing`)
      .then((r) => (r.ok ? r.json() : { features: [] }))
      .then((geojson: { features: HousingGeoJsonFeature[] }) => {
        const listings = geojson.features.map(parseFeatureToHousingListing);
        dispatchRef.current({ type: "MERGE_HOUSING_LISTINGS", listings });
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    const cleanup = connectSseStream({
      url: `${API_BASE}/api/stream`,
      onMessage: (msg: SseMessage) => {
        handleSseMessage(msg, dispatchRef.current);
      },
    });
    return cleanup;
  }, []);
}

function handleSseMessage(
  msg: SseMessage,
  dispatch: ReturnType<typeof useApp>["dispatch"],
): void {
  const items = msg.data as unknown[];

  switch (msg.type) {
    case "jobs": {
      const features = items as GeoJsonFeature[];
      const listings = features.map(parseFeatureToJob);
      dispatch({ type: "MERGE_JOB_LISTINGS", listings });
      break;
    }
    case "news": {
      const articles = items as NewsArticle[];
      dispatch({ type: "MERGE_NEWS_ARTICLES", articles });
      break;
    }
    case "housing": {
      const features = items as HousingGeoJsonFeature[];
      const listings = features.map(parseFeatureToHousingListing);
      dispatch({ type: "MERGE_HOUSING_LISTINGS", listings });
      break;
    }
    case "news_sentiment": {
      // AI analysis complete — re-fetch news_feed.json to pick up communitySentiment fields
      refreshNewsArticles();
      fetchNewsArticles().then((articles) => {
        if (articles.length > 0) {
          dispatch({ type: "SET_NEWS_ARTICLES", articles });
        }
      });
      break;
    }
    default:
      console.log("[SSE] Unknown event type:", msg.type);
  }
}
