// Reference: https://github.com/vitessce/vitessce/blob/213939a1d74860583fd7e0bb615cd06bb9871160/packages/utils/spatial-utils/src/spatial.js#L1
import { isEqual } from 'lodash-es';
import { Matrix4 } from 'math.gl';
import { divide, unit } from 'mathjs';
import type { NgffAxis } from './ngff-types.js';

// TODO: implement support for traversal of coordinate transformations as a DAG.


export function physicalSizeToMatrix(xSize, ySize, zSize, xUnit, yUnit, zUnit) {
  const hasZPhyscialSize = Boolean(zSize) && Boolean(zUnit);
  const hasYPhyscialSize = Boolean(ySize) && Boolean(yUnit);
  const hasXPhyscialSize = Boolean(xSize) && Boolean(xUnit);
  if (!hasXPhyscialSize || !hasYPhyscialSize) {
    return (new Matrix4()).identity();
  }
  const sizes = [
    unit(`${xSize} ${xUnit}`.replace('µ', 'u')),
    unit(`${ySize} ${yUnit}`.replace('µ', 'u')),
  ];
  if (hasZPhyscialSize) {
    sizes.push(unit(`${zSize} ${zUnit}`.replace('µ', 'u')));
  }
  // Find the ratio of the sizes to get the scaling factor.
  const scale = sizes.map(i => divide(i, unit('1 um')));

  // TODO: is this still needed
  // sizes are special objects with own equals method - see `unit` in declaration
  // This messess the dimensions when the x & y are little different (e.g., for the geomx data)
  // if (!sizes[0].equals(sizes[1])) {
  //   // Handle scaling in the Y direction for non-square pixels
  //   scale[1] = divide(sizes[1], sizes[0]);
  // }
  // END TODO: is this still needed

  // Add in z dimension needed for Matrix4 scale API.
  if (!scale[2]) {
    scale[2] = 1;
  }
  // no need to store/use identity scaling
  if (isEqual(scale, [1, 1, 1])) {
    return (new Matrix4()).identity();
  }
  return new Matrix4().scale([...scale]);
}

function getDefaultAxisType(name: string): 'time' | 'channel' | 'space' {
  if (name === 't') return 'time';
  if (name === 'c') return 'channel';
  return 'space';
}

// Reference: https://github.com/hms-dbmi/vizarr/blob/ade9d5d71bbedc8c20357c5310557ff9a0c59ac5/src/utils.ts#LL114-L142C2
export function getNgffAxes(firstMultiscalesAxes: NgffAxis[]): NgffAxis[] {
  // Returns axes in the latest v0.4+ format.
  // defaults for v0.1 & v0.2
  const defaultAxes = [
    { type: 'time', name: 't' },
    { type: 'channel', name: 'c' },
    { type: 'space', name: 'z' },
    { type: 'space', name: 'y' },
    { type: 'space', name: 'x' },
  ];
  let axes = defaultAxes;
  // v0.3 & v0.4+
  if (firstMultiscalesAxes) {
    axes = firstMultiscalesAxes.map((axis) => {
      // axis may be string 'x' (v0.3) or object
      if (typeof axis === 'string') {
        return { name: axis, type: getDefaultAxisType(axis) };
      }
      const { name, type } = axis;
      return { name, type: type ?? getDefaultAxisType(name) };
    });
  }
  return axes;
}

export function getNgffAxesForTiff(dimOrder: string) {
  return dimOrder
    .toLowerCase()
    .split('')
    .map(name => ({
      name,
      type: getDefaultAxisType(name),
    }));
}

/**
 * Convert an array of coordinateTransformations objects to a 16-element
 * plain JS array using Matrix4 linear algebra transformation functions.
 * @param {object[]|undefined} coordinateTransformations List of objects matching the
 * OME-NGFF v0.4 coordinateTransformations spec.
 * @param {object[]|undefined} axes Axes in OME-NGFF v0.4 format, objects
 * with { type, name }.
 * @returns {Matrix4} Array of 16 numbers representing the Matrix4.
 */
export function coordinateTransformationsToMatrix(coordinateTransformations, axes) {
  let mat = (new Matrix4()).identity();
  if (coordinateTransformations && axes) {
    // Get the indices of the objects corresponding to  X, Y, and Z from `axes`.
    const xyzIndices = ['x', 'y', 'z'].map(name => axes.findIndex(axisObj => axisObj.type === 'space' && axisObj.name === name));
    // Apply each transformation sequentially and in order according to the OME-NGFF v0.4 spec.
    // Reference: https://ngff.openmicroscopy.org/0.4/#trafo-md
    coordinateTransformations.forEach((transform) => {
      if (transform.type === 'translation') {
        const { translation: axisOrderedTranslation } = transform;
        if (axisOrderedTranslation.length !== axes.length) {
          throw new Error('Length of translation array was expected to match length of axes.');
        }
        const defaultValue = 0;
        // Get the translation values for [x, y, z].
        const xyzTranslation = xyzIndices.map(axisIndex => (
          axisIndex >= 0
            ? axisOrderedTranslation[axisIndex]
            : defaultValue
        ));
        const nextMat = (new Matrix4()).translate(xyzTranslation);
        mat = mat.multiplyLeft(nextMat);
      }
      if (transform.type === 'scale') {
        const { scale: axisOrderedScale } = transform;
        // Add in z dimension needed for Matrix4 scale API.
        if (axisOrderedScale.length !== axes.length) {
          throw new Error('Length of scale array was expected to match length of axes.');
        }
        const defaultValue = 1;
        // Get the scale values for [x, y, z].
        const xyzScale = xyzIndices.map(axisIndex => (
          axisIndex >= 0
            ? axisOrderedScale[axisIndex]
            : defaultValue
        ));
        const nextMat = (new Matrix4()).scale(xyzScale);
        mat = mat.multiplyLeft(nextMat);
      }
    });
  }
  return mat;
}

// TODO: is this needed?
// TODO: is this a duplicate of getNgffAxes?
// In the spatialdata metadata the axis name/type/unit info are also listed in
// coordinateTransformations[].input|output.axes[] entries.
export function normalizeAxes(axes: string[] | NgffAxis[]): NgffAxis[] {
  // Normalize axes to OME-NGFF v0.4 format.
  return axes.map((axisInfo) => {
    if (typeof axisInfo === 'string') {
      // If the axis is a string, assume it is a name and set type to 'space'.
      return { name: axisInfo, type: getDefaultAxisType(axisInfo) };
    }
    return axisInfo;
  });
}

/**
 * Normalize coordinate transformations to the OME-NGFF v0.4 format,
 * despite potentially being in the new format proposed in
 * https://github.com/ome/ngff/pull/138 (As of 2023-09-02).
 * @param {object[]|undefined} coordinateTransformations Value of
 * multiscales[0].coordinateTransformations in either OME-NGFF v0.4 format
 * or that proposed in https://github.com/ome/ngff/pull/138.
 * @param {object[]} datasets Value of multiscales[0].datasets in OME-NGFF v0.4 format.
 * @returns {object[]} Array of coordinateTransformations in OME-NGFF v0.4 format.
 */
export function normalizeCoordinateTransformations(coordinateTransformations, datasets) {
  // "The transformations in the list are applied sequentially and in order."
  // Reference: https://ngff.openmicroscopy.org/0.4/index.html#trafo-md
  let result = [];

  if (Array.isArray(coordinateTransformations)) {
    result = coordinateTransformations.flatMap((transform) => {
      if (transform.input && transform.output) {
        // This is a new-style coordinate transformation.
        // (As proposed in https://github.com/ome/ngff/pull/138)
        const { type } = transform;
        if (type === 'translation') {
          return {
            type,
            translation: transform.translation,
          };
        }
        if (type === 'scale') {
          return {
            type,
            scale: transform.scale,
          };
        }
        if (type === 'identity') {
          return { type };
        }
        if (type === 'sequence') {
          return normalizeCoordinateTransformations(transform.transformations, datasets);
        }
        throw new Error(`Coordinate transformation type "${type}" is not supported.`);
      }
      // Assume it was already an old-style (NGFF v0.4) coordinate transformation.
      return transform;
    });
  }

  if (Array.isArray(datasets?.[0]?.coordinateTransformations)) {
    // "Datasets SHOULD define a transformation from array space
    // to their "native physical space."
    // This transformation SHOULD describe physical pixel spacing
    // and origin only, and therefore SHOULD consist of
    // `scale` and/or `translation` types only.""
    // Reference: https://github.com/ome/ngff/blob/b92f540dc95440f2d6b7012185b09c2b862aa744/latest/transform-details.bs#L99

    result = [
      ...datasets[0].coordinateTransformations,
      ...result,
    ];
  }
  return result;
}