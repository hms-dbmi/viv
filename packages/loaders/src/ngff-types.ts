// Reference: https://github.com/vitessce/vitessce/blob/213939a1d74860583fd7e0bb615cd06bb9871160/packages/types/src/ngff-types.ts#L1
// For v0.5 schemas: https://github.com/ome/ngff/tree/8cbba216e37407bd2d4bd5c7128ab13bd0a6404e/schemas


// Reference: https://github.com/ome/ngff/blob/bc4f395193b63ed671d4e4bdc0d7477c58abada8/latest/schemas/axes.schema
export type NgffAxis = {
  /**
   * Name of the axis
   */
  name: string
  /**
   * Longer name or description of the axis.
   */
  longName?: string
  /**
   * Dimension of the axis
   */
  type?: 'channel' | 'time' | 'space'
  /**
   * Whether the dimension is discrete
   */
  discrete?: boolean
  /**
   * Unit for the axis
   */
  unit?: string
};
export type NgffAxes = NgffAxis[];


// Reference: https://github.com/ome/ngff/blob/bc4f395193b63ed671d4e4bdc0d7477c58abada8/latest/schemas/coordinate_systems.schema
export type NgffCoordinateSystem = {
  name: string;
  axes: NgffAxes;
};
export type NgffCoordinateSystems = NgffCoordinateSystem[];

// Reference: https://github.com/ome/ngff/blob/bc4f395193b63ed671d4e4bdc0d7477c58abada8/latest/schemas/coordinateTransformations.schema
export type ScaleTransformation = {
  type: 'scale';
  scale: number[];
};
export type TranslationTransformation = {
  type: 'translation';
  translation: number[];
};
export type AffineTransformation = {
  type: 'affine';
  matrix: number[] | number[][];
  // Can have a "c" referenced in the affine, but we
  // just throw away and use the x/y parts of the matrix.
};
export type RotationTransformation = {
  // Not supported yet by SpatialData
  type: 'rotation';
  rotation: number[];
};
export type InverseOfTransformation = {
  type: 'inverseOf';
  // eslint-disable-next-line no-use-before-define
  transformation: NgffCoordinateTransformation;
};
export type SequenceTransformation = {
  type: 'sequence';
  // eslint-disable-next-line no-use-before-define
  transformations: NgffCoordinateTransformation[];
  // Sometimes, the axes are not explicitly specified,
  // and instead they are inferred. May need to throw error
  // if ambiguous.
};
export type CoordinatesTransformation = {
  type: 'coordinates';
  path: string;
  interpolation: 'nearest' | 'linear' | 'cubic';
};
export type DisplacementsTransformation = {
  type: 'displacements';
  path: string;
  interpolation: 'nearest' | 'linear' | 'cubic';
};
export type ByDimensionTransformation = {
  // Weird behavior, we can parse and just throw error/warning.
  type: 'byDimension';
  // eslint-disable-next-line no-use-before-define
  transformations: NgffCoordinateTransformation[];
};
export type BijectionTransformation = {
  type: 'bijection';
  forward: object;
  inverse: object;
};
export type NgffCoordinateTransformation = {
  // Note: in the latest version of the NGFF coordinate systems proposal,
  // the `input` and `output` fields are only allowed to be strings referencing
  // coordinate systems within the `coordinateSystems` array.
  // Here, we also support an earlier version in which these coordinate systems
  // are defined inline a bit redundantly (because there is not a
  // `coordinateSystems` property more globally).
  input: string | NgffCoordinateSystem;
  output: string | NgffCoordinateSystem;
} & (
  ScaleTransformation
  | TranslationTransformation
  | AffineTransformation
  | RotationTransformation
  | InverseOfTransformation
  | SequenceTransformation
  | CoordinatesTransformation
  | DisplacementsTransformation
  | ByDimensionTransformation
  | BijectionTransformation
);
export type NgffCoordinateTransformations = NgffCoordinateTransformation[];

// Reference: https://github.com/ome/ngff/blob/bc4f395193b63ed671d4e4bdc0d7477c58abada8/latest/schemas/coordinate_systems_and_transforms.schema
export type NgffCoordinateSystemsAndTransformations = {
  coordinateSystems: NgffCoordinateSystems;
  coordinateTransformations: NgffCoordinateTransformations;
};
