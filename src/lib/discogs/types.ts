export interface DiscogsPagination {
  per_page: number;
  items: number;
  page: number;
  urls: {
    last?: string;
    next?: string;
  };
  pages: number;
}

export interface DiscogsSearchResult {
  id: number;
  type: "release" | "master" | "artist" | "label";
  title: string;
  uri: string;
  thumb: string;
  cover_image: string;
  resource_url: string;
  year?: string;
  format?: string[];
  label?: string[];
  country?: string;
  barcode?: string[];
  num_for_sale?: number;
  lowest_price?: number;
  community?: {
    want: number;
    have: number;
  };
}

export interface DiscogsSearchResponse {
  pagination: DiscogsPagination;
  results: DiscogsSearchResult[];
}

export type Radar = {
  id: string;
  releaseId: number;
  artist: string;
  release: string;
  thumb?: string;
  year?: string;
  format?: string;
  mediaCondition: string;
  sleeveCondition: string;
  maxPrice: string;
  notes?: string;
  active: boolean;
  lastPrice?: number;
  createdAt: number;
};
