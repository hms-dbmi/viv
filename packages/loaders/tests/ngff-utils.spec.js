import test from 'tape';
import {
  coordinateTransformationsToMatrix,
  normalizeCoordinateTransformations,
} from '../src/ngff-utils.js';

const defaultAxes = [
  { type: 'time', name: 't' },
  { type: 'channel', name: 'c' },
  { type: 'space', name: 'z' },
  { type: 'space', name: 'y' },
  { type: 'space', name: 'x' },
];

describe('coordinateTransformationsToMatrix', () => {
it('returns an Array instance', () => {
    const transformations = [
    {
        type: 'translation',
        translation: [0, 0, 0, 1, 1],
    },
    {
        type: 'scale',
        scale: [1, 1, 0.5, 0.5, 0.5],
    },
    ];
    expect(coordinateTransformationsToMatrix(transformations, defaultAxes)).toEqual([
    0.5, 0, 0, 0,
    0, 0.5, 0, 0,
    0, 0, 0.5, 0,
    0.5, 0.5, 0, 1,
    ]);
});
it('returns Identity matrix when coordinateTransformations is null', () => {
    expect(coordinateTransformationsToMatrix(null, defaultAxes)).toEqual([
    1, 0, 0, 0,
    0, 1, 0, 0,
    0, 0, 1, 0,
    0, 0, 0, 1,
    ]);
});
});
describe('normalizeCoordinateTransformations', () => {
it('does nothing for OME-NGFF v0.4 input', () => {
    const datasets = [
    {
        coordinateTransformations: [
        {
            scale: [
            1,
            0.5002025531914894,
            0.3603981534640209,
            0.3603981534640209,
            ],
            type: 'scale',
        },
        ],
        path: '0',
    },
    {
        coordinateTransformations: [
        {
            scale: [
            1,
            0.5002025531914894,
            0.7207963069280418,
            0.7207963069280418,
            ],
            type: 'scale',
        },
        ],
        path: '1',
    },
    {
        coordinateTransformations: [
        {
            scale: [
            1,
            0.5002025531914894,
            1.4415926138560835,
            1.4415926138560835,
            ],
            type: 'scale',
        },
        ],
        path: '2',
    },
    ];
    expect(normalizeCoordinateTransformations(undefined, datasets)).toEqual([
    // Here, we expect only the first dataset to be used.
    // However, we should eventually support transforms
    // specified for each dataset individually,
    // since there could in theory be irregular ways of downsampling.
    {
        scale: [
        1,
        0.5002025531914894,
        0.3603981534640209,
        0.3603981534640209,
        ],
        type: 'scale',
    },
    ]);
});
it('transforms SpatialData input', () => {
    const newCoordinateTransformations = [
    {
        input: {
        axes: [
            {
            name: 'c',
            type: 'channel',
            },
            {
            name: 'y',
            type: 'space',
            unit: 'unit',
            },
            {
            name: 'x',
            type: 'space',
            unit: 'unit',
            },
        ],
        name: 'cyx',
        },
        output: {
        axes: [
            {
            name: 'c',
            type: 'channel',
            },
            {
            name: 'y',
            type: 'space',
            unit: 'unit',
            },
            {
            name: 'x',
            type: 'space',
            unit: 'unit',
            },
        ],
        name: 'ST8059048',
        },
        scale: [
        1.0,
        8.670500183814605,
        8.670500183814605,
        ],
        type: 'scale',
    },
    ];
    const datasets = [
    {
        coordinateTransformations: [
        {
            scale: [
            1.0,
            1.0,
            1.0,
            ],
            type: 'scale',
        },
        ],
        path: '0',
    },
    ];
    expect(normalizeCoordinateTransformations(newCoordinateTransformations, datasets)).toEqual([
    // Here, we expect only the first dataset to be used.
    // However, we should eventually support transforms
    // specified for each dataset individually,
    // since there could in theory be irregular ways of downsampling.
    {
        scale: [
        1.0,
        1.0,
        1.0,
        ],
        type: 'scale',
    },
    // We expect the dataset transform to be prepended
    // to the newCoordinateTransformations items.
    // We do not check the input/output coordinate systems, but we should eventually allow
    // the user to specify this somehow and use that information to filter which transforms
    // are included here.
    {
        scale: [
        1.0,
        8.670500183814605,
        8.670500183814605,
        ],
        type: 'scale',
    },
    ]);
});
});
