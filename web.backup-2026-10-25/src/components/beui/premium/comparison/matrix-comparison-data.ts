import {
  Boxes,
  CircleDot,
  Hexagon,
  Layers,
  type LucideIcon,
  PanelsTopLeft,
} from "lucide-react";

export type MatrixComparisonProduct = {
  id: string;
  name: string;
  icon?: LucideIcon;
};
export type MatrixComparisonFeature = {
  id: string;
  name: string;
  values: Record<string, boolean | string>;
};

export const MATRIX_PRODUCTS: MatrixComparisonProduct[] = [
  { id: "forma", name: "Forma", icon: Boxes },
  { id: "layer", name: "Layer", icon: Layers },
  { id: "canvas", name: "Canvas", icon: PanelsTopLeft },
  { id: "orbit", name: "Orbit", icon: CircleDot },
  { id: "hive", name: "Hive", icon: Hexagon },
];

export const MATRIX_FEATURES: MatrixComparisonFeature[] = [
  {
    id: "setup",
    name: "Quick workspace setup",
    values: {
      forma: true,
      layer: true,
      canvas: true,
      orbit: false,
      hive: true,
    },
  },
  {
    id: "projects",
    name: "Unlimited projects",
    values: {
      forma: true,
      layer: false,
      canvas: false,
      orbit: true,
      hive: false,
    },
  },
  {
    id: "guests",
    name: "Guest collaboration",
    values: {
      forma: true,
      layer: true,
      canvas: false,
      orbit: false,
      hive: true,
    },
  },
  {
    id: "files",
    name: "Files alongside your work",
    values: {
      forma: true,
      layer: true,
      canvas: true,
      orbit: false,
      hive: false,
    },
  },
  {
    id: "search",
    name: "Search across projects",
    values: {
      forma: true,
      layer: false,
      canvas: true,
      orbit: true,
      hive: false,
    },
  },
  {
    id: "history",
    name: "Complete version history",
    values: {
      forma: true,
      layer: false,
      canvas: false,
      orbit: true,
      hive: false,
    },
  },
  {
    id: "export",
    name: "Export your data",
    values: { forma: true, layer: true, canvas: true, orbit: true, hive: true },
  },
];
