export type TrickStatus = "draft" | "published";
export type RelationType = "prerequisite" | "progression" | "variation" | "combo";
export type MediaType = "video" | "poster";

export type Source = {
  id: string;
  title: string;
  kind: "pdf" | "manual" | "video" | "coach-note";
  url?: string;
  showByDefault: boolean;
};

export type LevelTest = {
  level: number;
  category: string;
  title: string;
  passCondition: string;
  sourceId: string;
  trickNames: string[];
};

export type Trick = {
  id: string;
  slug: string;
  name: string;
  aliases: string[];
  summary: string;
  description: string;
  difficulty: 1 | 2 | 3 | 4 | 5;
  riskLevel: 1 | 2 | 3 | 4 | 5;
  family: string;
  axis: string;
  takeoff: string;
  landing: string;
  ropeContext: string;
  tags: string[];
  level: number;
  levelCategory: string;
  status: TrickStatus;
  sourceId: string;
  showSource: boolean;
};

export type TrickRelation = {
  id: string;
  fromTrickId: string;
  toTrickId: string;
  type: RelationType;
  note: string;
  strength: 1 | 2 | 3 | 4 | 5;
};

export type TrickMapPosition = {
  trickId: string;
  x: number;
  y: number;
};

export type MediaAsset = {
  id: string;
  trickId: string;
  type: MediaType;
  storagePath: string;
  duration?: number;
  credit?: string;
  consentChecked: boolean;
};

export type AtlasData = {
  sources: Source[];
  levels: LevelTest[];
  relations: Array<{
    from: string;
    to: string;
    type: RelationType;
    strength: 1 | 2 | 3 | 4 | 5;
    note: string;
  }>;
  mapPositions?: Array<{
    name: string;
    x: number;
    y: number;
  }>;
  featured: string[];
};
