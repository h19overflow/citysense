import { useEffect, useRef, useCallback } from "react";
import { Marker, Popup, CircleMarker } from "react-leaflet";
import L from "leaflet";
import { useApp } from "@/lib/appContext";
import { fetchNewsComments } from "@/lib/newsService";
import { createNewsMarker, filterGeolocatedArticles, getSentimentColor } from "@/lib/newsMapMarkers";
import { loadStoredReactions, saveReactions } from "@/lib/newsReactionStore";
import { loadStoredComments, saveAllComments } from "@/lib/newsCommentStore";
import { NewsPopupCard } from "./NewsPopupCard";
import type { ReactionType } from "@/lib/types";
import "./news-map.css";

interface NewsMapOverlayProps {
  selectedArticleId?: string | null;
  selectionTs?: number;
}

export function NewsMapOverlay({ selectedArticleId, selectionTs = 0 }: NewsMapOverlayProps) {
  const { state, dispatch } = useApp();
  const markerRefs = useRef<Map<string, L.Marker>>(new Map());
  const geoArticles = filterGeolocatedArticles(state.newsArticles);

  // Load reactions from localStorage on mount
  useEffect(() => {
    const stored = loadStoredReactions();
    if (Object.keys(stored.reactions).length > 0) {
      for (const [articleId, reaction] of Object.entries(stored.userReactions)) {
        dispatch({ type: "SET_ARTICLE_REACTION", articleId, reaction });
      }
    }
  }, []);

  // Load seeded + localStorage comments on mount
  useEffect(() => {
    async function loadComments() {
      const [seeded, stored] = await Promise.all([
        fetchNewsComments(),
        Promise.resolve(loadStoredComments()),
      ]);
      const seen = new Set<string>();
      const merged = [...seeded, ...stored].filter((c) => {
        if (seen.has(c.id)) return false;
        seen.add(c.id);
        return true;
      });
      if (merged.length > 0) {
        dispatch({ type: "SET_NEWS_COMMENTS", comments: merged });
      }
    }
    loadComments();
  }, []);

  // Save reactions to localStorage on change
  useEffect(() => {
    if (Object.keys(state.newsReactions).length > 0) {
      saveReactions({
        reactions: state.newsReactions,
        userReactions: state.userReactions,
      });
    }
  }, [state.newsReactions, state.userReactions]);

  // Save comments to localStorage on change
  useEffect(() => {
    if (state.newsComments.length > 0) {
      saveAllComments(state.newsComments);
    }
  }, [state.newsComments]);

  // Open popup when article is selected from sidebar
  useEffect(() => {
    if (!selectedArticleId || selectionTs === 0) return;
    const marker = markerRefs.current.get(selectedArticleId);
    if (marker) {
      // Delay to let flyTo animation start first
      setTimeout(() => marker.openPopup(), 700);
    }
  }, [selectedArticleId, selectionTs]);

  const setMarkerRef = useCallback((id: string, ref: L.Marker | null) => {
    if (ref) {
      markerRefs.current.set(id, ref);
    } else {
      markerRefs.current.delete(id);
    }
  }, []);

  function handleReaction(articleId: string, reaction: ReactionType) {
    dispatch({ type: "SET_ARTICLE_REACTION", articleId, reaction });
  }

  if (geoArticles.length === 0) return null;

  return (
    <>
      {state.newsMapMode === "pins" &&
        geoArticles.map((article) => (
          <Marker
            key={`news-${article.id}`}
            position={[article.location!.lat, article.location!.lng]}
            icon={createNewsMarker(article.sentiment ?? "neutral", article.communitySentiment)}
            ref={(ref) => setMarkerRef(article.id, ref)}
          >
            <Popup className="news-map-popup" maxWidth={320} minWidth={260}>
              <NewsPopupCard
                article={article}
                reactionCounts={state.newsReactions[article.id] ?? ({} as Record<ReactionType, number>)}
                userReaction={state.userReactions[article.id]}
                onReact={handleReaction}
              />
            </Popup>
          </Marker>
        ))
      }

      {state.newsMapMode === "heat" &&
        geoArticles.map((article) => {
          const color = getSentimentColor(article.sentiment ?? "neutral");
          return (
            <CircleMarker
              key={`news-heat-${article.id}`}
              center={[article.location!.lat, article.location!.lng]}
              radius={30}
              pathOptions={{
                fillColor: color,
                fillOpacity: 0.2,
                color,
                weight: 1.5,
                opacity: 0.4,
              }}
            >
              <Popup className="news-map-popup" maxWidth={320} minWidth={260}>
                <NewsPopupCard
                  article={article}
                  reactionCounts={state.newsReactions[article.id] ?? ({} as Record<ReactionType, number>)}
                  userReaction={state.userReactions[article.id]}
                  onReact={handleReaction}
                />
              </Popup>
            </CircleMarker>
          );
        })
      }
    </>
  );
}
