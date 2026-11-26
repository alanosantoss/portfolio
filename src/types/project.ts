export type ProjectType = "video" | "design";

export type ProjectCategory = "video" | "design" | "ia";

export type MainCategory = "home" | ProjectCategory | "sobre";

export type AspectRatio = "9:16" | "16:9" | "4:3" | "3:2";

export type RatioClass = "ratio-9-16" | "ratio-16-9" | "ratio-4-3" | "ratio-3-2";

export interface ProjectItem {
  type: ProjectType;
  category: ProjectCategory;
  title: string;
  id?: string;
  image?: string;
  aspect?: AspectRatio;
  ratio?: RatioClass;
  tags?: string[];
  visible?: boolean;
}

export interface SubcategoryOption {
  id: string;
  label: string;
}
