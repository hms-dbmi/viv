import { LayerExtension, OrthographicView, COORDINATE_SYSTEM, CompositeLayer, Layer, project32, picking, Controller, OrbitView } from '@deck.gl/core';
import { Matrix4 } from '@math.gl/core';
import { GL } from '@luma.gl/constants';
import { BaseDecoder, fromBlob, fromFile, fromUrl, GeoTIFFImage, addDecoder } from 'geotiff';
import { decompress } from 'lzw-tiff-decoder';
import quickselect from 'quickselect';
import * as z from 'zod';
import { KeyError, openGroup, HTTPStore } from 'zarr';
import { BitmapLayer as BitmapLayer$1, PolygonLayer, LineLayer, TextLayer } from '@deck.gl/layers';
import { Model, Geometry } from '@luma.gl/engine';
import { ShaderAssembler } from '@luma.gl/shadertools';
import { TileLayer } from '@deck.gl/geo-layers';
import { Plane } from '@math.gl/culling';
import DeckGL from '@deck.gl/react';
import equal from 'fast-deep-equal';
import * as React from 'react';

const apply_transparent_color = `\
vec4 apply_transparent_color(vec3 color, vec3 transparentColor, bool useTransparentColor, float opacity){
  return vec4(color, (color == transparentColor && useTransparentColor) ? 0. : opacity);
}
`;

// The contents of this file are automatically written by
// `packages/extensions/prepare.mjs`. Do not modify directly.
const alpha = `\
vec4 apply_cmap (float x) {
  const float e0 = 0.0;
  const vec4 v0 = vec4(1,1,1,0);
  const float e1 = 1.0;
  const vec4 v1 = vec4(1,1,1,1);
  float a0 = smoothstep(e0,e1,x);
  return mix(v0,v1,a0)*step(e0,x)*step(x,e1);
}
`;
const autumn = `\
vec4 apply_cmap (float x) {
  const float e0 = 0.0;
  const vec4 v0 = vec4(1,0,0,1);
  const float e1 = 1.0;
  const vec4 v1 = vec4(1,1,0,1);
  float a0 = smoothstep(e0,e1,x);
  return mix(v0,v1,a0)*step(e0,x)*step(x,e1);
}
`;
const bathymetry = `\
vec4 apply_cmap (float x) {
  const float e0 = 0.0;
  const vec4 v0 = vec4(0.1568627450980392,0.10196078431372549,0.17254901960784313,1);
  const float e1 = 0.13;
  const vec4 v1 = vec4(0.23137254901960785,0.19215686274509805,0.35294117647058826,1);
  const float e2 = 0.25;
  const vec4 v2 = vec4(0.25098039215686274,0.2980392156862745,0.5450980392156862,1);
  const float e3 = 0.38;
  const vec4 v3 = vec4(0.24705882352941178,0.43137254901960786,0.592156862745098,1);
  const float e4 = 0.5;
  const vec4 v4 = vec4(0.2823529411764706,0.5568627450980392,0.6196078431372549,1);
  const float e5 = 0.63;
  const vec4 v5 = vec4(0.3333333333333333,0.6823529411764706,0.6392156862745098,1);
  const float e6 = 0.75;
  const vec4 v6 = vec4(0.47058823529411764,0.807843137254902,0.6392156862745098,1);
  const float e7 = 0.88;
  const vec4 v7 = vec4(0.7333333333333333,0.9019607843137255,0.6745098039215687,1);
  const float e8 = 1.0;
  const vec4 v8 = vec4(0.9921568627450981,0.996078431372549,0.8,1);
  float a0 = smoothstep(e0,e1,x);
  float a1 = smoothstep(e1,e2,x);
  float a2 = smoothstep(e2,e3,x);
  float a3 = smoothstep(e3,e4,x);
  float a4 = smoothstep(e4,e5,x);
  float a5 = smoothstep(e5,e6,x);
  float a6 = smoothstep(e6,e7,x);
  float a7 = smoothstep(e7,e8,x);
  return max(mix(v0,v1,a0)*step(e0,x)*step(x,e1),
    max(mix(v1,v2,a1)*step(e1,x)*step(x,e2),
    max(mix(v2,v3,a2)*step(e2,x)*step(x,e3),
    max(mix(v3,v4,a3)*step(e3,x)*step(x,e4),
    max(mix(v4,v5,a4)*step(e4,x)*step(x,e5),
    max(mix(v5,v6,a5)*step(e5,x)*step(x,e6),
    max(mix(v6,v7,a6)*step(e6,x)*step(x,e7),mix(v7,v8,a7)*step(e7,x)*step(x,e8)
  )))))));
}
`;
const blackbody = `\
vec4 apply_cmap (float x) {
  const float e0 = 0.0;
  const vec4 v0 = vec4(0,0,0,1);
  const float e1 = 0.2;
  const vec4 v1 = vec4(0.9019607843137255,0,0,1);
  const float e2 = 0.4;
  const vec4 v2 = vec4(0.9019607843137255,0.8235294117647058,0,1);
  const float e3 = 0.7;
  const vec4 v3 = vec4(1,1,1,1);
  const float e4 = 1.0;
  const vec4 v4 = vec4(0.6274509803921569,0.7843137254901961,1,1);
  float a0 = smoothstep(e0,e1,x);
  float a1 = smoothstep(e1,e2,x);
  float a2 = smoothstep(e2,e3,x);
  float a3 = smoothstep(e3,e4,x);
  return max(mix(v0,v1,a0)*step(e0,x)*step(x,e1),
    max(mix(v1,v2,a1)*step(e1,x)*step(x,e2),
    max(mix(v2,v3,a2)*step(e2,x)*step(x,e3),mix(v3,v4,a3)*step(e3,x)*step(x,e4)
  )));
}
`;
const bluered = `\
vec4 apply_cmap (float x) {
  const float e0 = 0.0;
  const vec4 v0 = vec4(0,0,1,1);
  const float e1 = 1.0;
  const vec4 v1 = vec4(1,0,0,1);
  float a0 = smoothstep(e0,e1,x);
  return mix(v0,v1,a0)*step(e0,x)*step(x,e1);
}
`;
const bone = `\
vec4 apply_cmap (float x) {
  const float e0 = 0.0;
  const vec4 v0 = vec4(0,0,0,1);
  const float e1 = 0.376;
  const vec4 v1 = vec4(0.32941176470588235,0.32941176470588235,0.4549019607843137,1);
  const float e2 = 0.753;
  const vec4 v2 = vec4(0.6627450980392157,0.7843137254901961,0.7843137254901961,1);
  const float e3 = 1.0;
  const vec4 v3 = vec4(1,1,1,1);
  float a0 = smoothstep(e0,e1,x);
  float a1 = smoothstep(e1,e2,x);
  float a2 = smoothstep(e2,e3,x);
  return max(mix(v0,v1,a0)*step(e0,x)*step(x,e1),
    max(mix(v1,v2,a1)*step(e1,x)*step(x,e2),mix(v2,v3,a2)*step(e2,x)*step(x,e3)
  ));
}
`;
const cdom = `\
vec4 apply_cmap (float x) {
  const float e0 = 0.0;
  const vec4 v0 = vec4(0.1843137254901961,0.058823529411764705,0.24313725490196078,1);
  const float e1 = 0.13;
  const vec4 v1 = vec4(0.3411764705882353,0.09019607843137255,0.33725490196078434,1);
  const float e2 = 0.25;
  const vec4 v2 = vec4(0.5098039215686274,0.10980392156862745,0.38823529411764707,1);
  const float e3 = 0.38;
  const vec4 v3 = vec4(0.6705882352941176,0.1607843137254902,0.3764705882352941,1);
  const float e4 = 0.5;
  const vec4 v4 = vec4(0.807843137254902,0.2627450980392157,0.33725490196078434,1);
  const float e5 = 0.63;
  const vec4 v5 = vec4(0.9019607843137255,0.41568627450980394,0.32941176470588235,1);
  const float e6 = 0.75;
  const vec4 v6 = vec4(0.9490196078431372,0.5843137254901961,0.403921568627451,1);
  const float e7 = 0.88;
  const vec4 v7 = vec4(0.9764705882352941,0.7568627450980392,0.5294117647058824,1);
  const float e8 = 1.0;
  const vec4 v8 = vec4(0.996078431372549,0.9294117647058824,0.6901960784313725,1);
  float a0 = smoothstep(e0,e1,x);
  float a1 = smoothstep(e1,e2,x);
  float a2 = smoothstep(e2,e3,x);
  float a3 = smoothstep(e3,e4,x);
  float a4 = smoothstep(e4,e5,x);
  float a5 = smoothstep(e5,e6,x);
  float a6 = smoothstep(e6,e7,x);
  float a7 = smoothstep(e7,e8,x);
  return max(mix(v0,v1,a0)*step(e0,x)*step(x,e1),
    max(mix(v1,v2,a1)*step(e1,x)*step(x,e2),
    max(mix(v2,v3,a2)*step(e2,x)*step(x,e3),
    max(mix(v3,v4,a3)*step(e3,x)*step(x,e4),
    max(mix(v4,v5,a4)*step(e4,x)*step(x,e5),
    max(mix(v5,v6,a5)*step(e5,x)*step(x,e6),
    max(mix(v6,v7,a6)*step(e6,x)*step(x,e7),mix(v7,v8,a7)*step(e7,x)*step(x,e8)
  )))))));
}
`;
const chlorophyll = `\
vec4 apply_cmap (float x) {
  const float e0 = 0.0;
  const vec4 v0 = vec4(0.07058823529411765,0.1411764705882353,0.0784313725490196,1);
  const float e1 = 0.13;
  const vec4 v1 = vec4(0.09803921568627451,0.24705882352941178,0.1607843137254902,1);
  const float e2 = 0.25;
  const vec4 v2 = vec4(0.09411764705882353,0.3568627450980392,0.23137254901960785,1);
  const float e3 = 0.38;
  const vec4 v3 = vec4(0.050980392156862744,0.4666666666666667,0.2823529411764706,1);
  const float e4 = 0.5;
  const vec4 v4 = vec4(0.07058823529411765,0.5803921568627451,0.3137254901960784,1);
  const float e5 = 0.63;
  const vec4 v5 = vec4(0.3137254901960784,0.6784313725490196,0.34901960784313724,1);
  const float e6 = 0.75;
  const vec4 v6 = vec4(0.5176470588235295,0.7686274509803922,0.47843137254901963,1);
  const float e7 = 0.88;
  const vec4 v7 = vec4(0.6862745098039216,0.8666666666666667,0.6352941176470588,1);
  const float e8 = 1.0;
  const vec4 v8 = vec4(0.8431372549019608,0.9764705882352941,0.8156862745098039,1);
  float a0 = smoothstep(e0,e1,x);
  float a1 = smoothstep(e1,e2,x);
  float a2 = smoothstep(e2,e3,x);
  float a3 = smoothstep(e3,e4,x);
  float a4 = smoothstep(e4,e5,x);
  float a5 = smoothstep(e5,e6,x);
  float a6 = smoothstep(e6,e7,x);
  float a7 = smoothstep(e7,e8,x);
  return max(mix(v0,v1,a0)*step(e0,x)*step(x,e1),
    max(mix(v1,v2,a1)*step(e1,x)*step(x,e2),
    max(mix(v2,v3,a2)*step(e2,x)*step(x,e3),
    max(mix(v3,v4,a3)*step(e3,x)*step(x,e4),
    max(mix(v4,v5,a4)*step(e4,x)*step(x,e5),
    max(mix(v5,v6,a5)*step(e5,x)*step(x,e6),
    max(mix(v6,v7,a6)*step(e6,x)*step(x,e7),mix(v7,v8,a7)*step(e7,x)*step(x,e8)
  )))))));
}
`;
const cool = `\
vec4 apply_cmap (float x) {
  const float e0 = 0.0;
  const vec4 v0 = vec4(0.49019607843137253,0,0.7019607843137254,1);
  const float e1 = 0.13;
  const vec4 v1 = vec4(0.4549019607843137,0,0.8549019607843137,1);
  const float e2 = 0.25;
  const vec4 v2 = vec4(0.3843137254901961,0.2901960784313726,0.9294117647058824,1);
  const float e3 = 0.38;
  const vec4 v3 = vec4(0.26666666666666666,0.5725490196078431,0.9058823529411765,1);
  const float e4 = 0.5;
  const vec4 v4 = vec4(0,0.8,0.7725490196078432,1);
  const float e5 = 0.63;
  const vec4 v5 = vec4(0,0.9686274509803922,0.5725490196078431,1);
  const float e6 = 0.75;
  const vec4 v6 = vec4(0,1,0.34509803921568627,1);
  const float e7 = 0.88;
  const vec4 v7 = vec4(0.1568627450980392,1,0.03137254901960784,1);
  const float e8 = 1.0;
  const vec4 v8 = vec4(0.5764705882352941,1,0,1);
  float a0 = smoothstep(e0,e1,x);
  float a1 = smoothstep(e1,e2,x);
  float a2 = smoothstep(e2,e3,x);
  float a3 = smoothstep(e3,e4,x);
  float a4 = smoothstep(e4,e5,x);
  float a5 = smoothstep(e5,e6,x);
  float a6 = smoothstep(e6,e7,x);
  float a7 = smoothstep(e7,e8,x);
  return max(mix(v0,v1,a0)*step(e0,x)*step(x,e1),
    max(mix(v1,v2,a1)*step(e1,x)*step(x,e2),
    max(mix(v2,v3,a2)*step(e2,x)*step(x,e3),
    max(mix(v3,v4,a3)*step(e3,x)*step(x,e4),
    max(mix(v4,v5,a4)*step(e4,x)*step(x,e5),
    max(mix(v5,v6,a5)*step(e5,x)*step(x,e6),
    max(mix(v6,v7,a6)*step(e6,x)*step(x,e7),mix(v7,v8,a7)*step(e7,x)*step(x,e8)
  )))))));
}
`;
const copper = `\
vec4 apply_cmap (float x) {
  const float e0 = 0.0;
  const vec4 v0 = vec4(0,0,0,1);
  const float e1 = 0.804;
  const vec4 v1 = vec4(1,0.6274509803921569,0.4,1);
  const float e2 = 1.0;
  const vec4 v2 = vec4(1,0.7803921568627451,0.4980392156862745,1);
  float a0 = smoothstep(e0,e1,x);
  float a1 = smoothstep(e1,e2,x);
  return max(mix(v0,v1,a0)*step(e0,x)*step(x,e1),mix(v1,v2,a1)*step(e1,x)*step(x,e2)
  );
}
`;
const cubehelix = `\
vec4 apply_cmap (float x) {
  const float e0 = 0.0;
  const vec4 v0 = vec4(0,0,0,1);
  const float e1 = 0.07;
  const vec4 v1 = vec4(0.08627450980392157,0.0196078431372549,0.23137254901960785,1);
  const float e2 = 0.13;
  const vec4 v2 = vec4(0.23529411764705882,0.01568627450980392,0.4117647058823529,1);
  const float e3 = 0.2;
  const vec4 v3 = vec4(0.42745098039215684,0.00392156862745098,0.5294117647058824,1);
  const float e4 = 0.27;
  const vec4 v4 = vec4(0.6313725490196078,0,0.5764705882352941,1);
  const float e5 = 0.33;
  const vec4 v5 = vec4(0.8235294117647058,0.00784313725490196,0.5568627450980392,1);
  const float e6 = 0.4;
  const vec4 v6 = vec4(0.984313725490196,0.043137254901960784,0.4823529411764706,1);
  const float e7 = 0.47;
  const vec4 v7 = vec4(1,0.11372549019607843,0.3803921568627451,1);
  const float e8 = 0.53;
  const vec4 v8 = vec4(1,0.21176470588235294,0.27058823529411763,1);
  const float e9 = 0.6;
  const vec4 v9 = vec4(1,0.3333333333333333,0.1803921568627451,1);
  const float e10 = 0.67;
  const vec4 v10 = vec4(1,0.47058823529411764,0.13333333333333333,1);
  const float e11 = 0.73;
  const vec4 v11 = vec4(1,0.615686274509804,0.1450980392156863,1);
  const float e12 = 0.8;
  const vec4 v12 = vec4(0.9450980392156862,0.7490196078431373,0.2235294117647059,1);
  const float e13 = 0.87;
  const vec4 v13 = vec4(0.8784313725490196,0.8627450980392157,0.36470588235294116,1);
  const float e14 = 0.93;
  const vec4 v14 = vec4(0.8549019607843137,0.9450980392156862,0.5568627450980392,1);
  const float e15 = 1.0;
  const vec4 v15 = vec4(0.8901960784313725,0.9921568627450981,0.7764705882352941,1);
  float a0 = smoothstep(e0,e1,x);
  float a1 = smoothstep(e1,e2,x);
  float a2 = smoothstep(e2,e3,x);
  float a3 = smoothstep(e3,e4,x);
  float a4 = smoothstep(e4,e5,x);
  float a5 = smoothstep(e5,e6,x);
  float a6 = smoothstep(e6,e7,x);
  float a7 = smoothstep(e7,e8,x);
  float a8 = smoothstep(e8,e9,x);
  float a9 = smoothstep(e9,e10,x);
  float a10 = smoothstep(e10,e11,x);
  float a11 = smoothstep(e11,e12,x);
  float a12 = smoothstep(e12,e13,x);
  float a13 = smoothstep(e13,e14,x);
  float a14 = smoothstep(e14,e15,x);
  return max(mix(v0,v1,a0)*step(e0,x)*step(x,e1),
    max(mix(v1,v2,a1)*step(e1,x)*step(x,e2),
    max(mix(v2,v3,a2)*step(e2,x)*step(x,e3),
    max(mix(v3,v4,a3)*step(e3,x)*step(x,e4),
    max(mix(v4,v5,a4)*step(e4,x)*step(x,e5),
    max(mix(v5,v6,a5)*step(e5,x)*step(x,e6),
    max(mix(v6,v7,a6)*step(e6,x)*step(x,e7),
    max(mix(v7,v8,a7)*step(e7,x)*step(x,e8),
    max(mix(v8,v9,a8)*step(e8,x)*step(x,e9),
    max(mix(v9,v10,a9)*step(e9,x)*step(x,e10),
    max(mix(v10,v11,a10)*step(e10,x)*step(x,e11),
    max(mix(v11,v12,a11)*step(e11,x)*step(x,e12),
    max(mix(v12,v13,a12)*step(e12,x)*step(x,e13),
    max(mix(v13,v14,a13)*step(e13,x)*step(x,e14),mix(v14,v15,a14)*step(e14,x)*step(x,e15)
  ))))))))))))));
}
`;
const density = `\
vec4 apply_cmap (float x) {
  const float e0 = 0.0;
  const vec4 v0 = vec4(0.21176470588235294,0.054901960784313725,0.1411764705882353,1);
  const float e1 = 0.13;
  const vec4 v1 = vec4(0.34901960784313724,0.09019607843137255,0.3137254901960784,1);
  const float e2 = 0.25;
  const vec4 v2 = vec4(0.43137254901960786,0.17647058823529413,0.5176470588235295,1);
  const float e3 = 0.38;
  const vec4 v3 = vec4(0.47058823529411764,0.30196078431372547,0.6980392156862745,1);
  const float e4 = 0.5;
  const vec4 v4 = vec4(0.47058823529411764,0.44313725490196076,0.8352941176470589,1);
  const float e5 = 0.63;
  const vec4 v5 = vec4(0.45098039215686275,0.592156862745098,0.8941176470588236,1);
  const float e6 = 0.75;
  const vec4 v6 = vec4(0.5254901960784314,0.7254901960784313,0.8901960784313725,1);
  const float e7 = 0.88;
  const vec4 v7 = vec4(0.6941176470588235,0.8392156862745098,0.8901960784313725,1);
  const float e8 = 1.0;
  const vec4 v8 = vec4(0.9019607843137255,0.9450980392156862,0.9450980392156862,1);
  float a0 = smoothstep(e0,e1,x);
  float a1 = smoothstep(e1,e2,x);
  float a2 = smoothstep(e2,e3,x);
  float a3 = smoothstep(e3,e4,x);
  float a4 = smoothstep(e4,e5,x);
  float a5 = smoothstep(e5,e6,x);
  float a6 = smoothstep(e6,e7,x);
  float a7 = smoothstep(e7,e8,x);
  return max(mix(v0,v1,a0)*step(e0,x)*step(x,e1),
    max(mix(v1,v2,a1)*step(e1,x)*step(x,e2),
    max(mix(v2,v3,a2)*step(e2,x)*step(x,e3),
    max(mix(v3,v4,a3)*step(e3,x)*step(x,e4),
    max(mix(v4,v5,a4)*step(e4,x)*step(x,e5),
    max(mix(v5,v6,a5)*step(e5,x)*step(x,e6),
    max(mix(v6,v7,a6)*step(e6,x)*step(x,e7),mix(v7,v8,a7)*step(e7,x)*step(x,e8)
  )))))));
}
`;
const earth = `\
vec4 apply_cmap (float x) {
  const float e0 = 0.0;
  const vec4 v0 = vec4(0,0,0.5098039215686274,1);
  const float e1 = 0.1;
  const vec4 v1 = vec4(0,0.7058823529411765,0.7058823529411765,1);
  const float e2 = 0.2;
  const vec4 v2 = vec4(0.1568627450980392,0.8235294117647058,0.1568627450980392,1);
  const float e3 = 0.4;
  const vec4 v3 = vec4(0.9019607843137255,0.9019607843137255,0.19607843137254902,1);
  const float e4 = 0.6;
  const vec4 v4 = vec4(0.47058823529411764,0.27450980392156865,0.0784313725490196,1);
  const float e5 = 1.0;
  const vec4 v5 = vec4(1,1,1,1);
  float a0 = smoothstep(e0,e1,x);
  float a1 = smoothstep(e1,e2,x);
  float a2 = smoothstep(e2,e3,x);
  float a3 = smoothstep(e3,e4,x);
  float a4 = smoothstep(e4,e5,x);
  return max(mix(v0,v1,a0)*step(e0,x)*step(x,e1),
    max(mix(v1,v2,a1)*step(e1,x)*step(x,e2),
    max(mix(v2,v3,a2)*step(e2,x)*step(x,e3),
    max(mix(v3,v4,a3)*step(e3,x)*step(x,e4),mix(v4,v5,a4)*step(e4,x)*step(x,e5)
  ))));
}
`;
const electric = `\
vec4 apply_cmap (float x) {
  const float e0 = 0.0;
  const vec4 v0 = vec4(0,0,0,1);
  const float e1 = 0.15;
  const vec4 v1 = vec4(0.11764705882352941,0,0.39215686274509803,1);
  const float e2 = 0.4;
  const vec4 v2 = vec4(0.47058823529411764,0,0.39215686274509803,1);
  const float e3 = 0.6;
  const vec4 v3 = vec4(0.6274509803921569,0.35294117647058826,0,1);
  const float e4 = 0.8;
  const vec4 v4 = vec4(0.9019607843137255,0.7843137254901961,0,1);
  const float e5 = 1.0;
  const vec4 v5 = vec4(1,0.9803921568627451,0.8627450980392157,1);
  float a0 = smoothstep(e0,e1,x);
  float a1 = smoothstep(e1,e2,x);
  float a2 = smoothstep(e2,e3,x);
  float a3 = smoothstep(e3,e4,x);
  float a4 = smoothstep(e4,e5,x);
  return max(mix(v0,v1,a0)*step(e0,x)*step(x,e1),
    max(mix(v1,v2,a1)*step(e1,x)*step(x,e2),
    max(mix(v2,v3,a2)*step(e2,x)*step(x,e3),
    max(mix(v3,v4,a3)*step(e3,x)*step(x,e4),mix(v4,v5,a4)*step(e4,x)*step(x,e5)
  ))));
}
`;
const freesurface_blue = `\
vec4 apply_cmap (float x) {
  const float e0 = 0.0;
  const vec4 v0 = vec4(0.11764705882352941,0.01568627450980392,0.43137254901960786,1);
  const float e1 = 0.13;
  const vec4 v1 = vec4(0.1843137254901961,0.054901960784313725,0.6901960784313725,1);
  const float e2 = 0.25;
  const vec4 v2 = vec4(0.1607843137254902,0.17647058823529413,0.9254901960784314,1);
  const float e3 = 0.38;
  const vec4 v3 = vec4(0.09803921568627451,0.38823529411764707,0.8313725490196079,1);
  const float e4 = 0.5;
  const vec4 v4 = vec4(0.26666666666666666,0.5137254901960784,0.7843137254901961,1);
  const float e5 = 0.63;
  const vec4 v5 = vec4(0.4470588235294118,0.611764705882353,0.7725490196078432,1);
  const float e6 = 0.75;
  const vec4 v6 = vec4(0.615686274509804,0.7098039215686275,0.796078431372549,1);
  const float e7 = 0.88;
  const vec4 v7 = vec4(0.7843137254901961,0.8156862745098039,0.8470588235294118,1);
  const float e8 = 1.0;
  const vec4 v8 = vec4(0.9450980392156862,0.9294117647058824,0.9254901960784314,1);
  float a0 = smoothstep(e0,e1,x);
  float a1 = smoothstep(e1,e2,x);
  float a2 = smoothstep(e2,e3,x);
  float a3 = smoothstep(e3,e4,x);
  float a4 = smoothstep(e4,e5,x);
  float a5 = smoothstep(e5,e6,x);
  float a6 = smoothstep(e6,e7,x);
  float a7 = smoothstep(e7,e8,x);
  return max(mix(v0,v1,a0)*step(e0,x)*step(x,e1),
    max(mix(v1,v2,a1)*step(e1,x)*step(x,e2),
    max(mix(v2,v3,a2)*step(e2,x)*step(x,e3),
    max(mix(v3,v4,a3)*step(e3,x)*step(x,e4),
    max(mix(v4,v5,a4)*step(e4,x)*step(x,e5),
    max(mix(v5,v6,a5)*step(e5,x)*step(x,e6),
    max(mix(v6,v7,a6)*step(e6,x)*step(x,e7),mix(v7,v8,a7)*step(e7,x)*step(x,e8)
  )))))));
}
`;
const freesurface_red = `\
vec4 apply_cmap (float x) {
  const float e0 = 0.0;
  const vec4 v0 = vec4(0.23529411764705882,0.03529411764705882,0.07058823529411765,1);
  const float e1 = 0.13;
  const vec4 v1 = vec4(0.39215686274509803,0.06666666666666667,0.10588235294117647,1);
  const float e2 = 0.25;
  const vec4 v2 = vec4(0.5568627450980392,0.0784313725490196,0.11372549019607843,1);
  const float e3 = 0.38;
  const vec4 v3 = vec4(0.6941176470588235,0.16862745098039217,0.10588235294117647,1);
  const float e4 = 0.5;
  const vec4 v4 = vec4(0.7529411764705882,0.3411764705882353,0.24705882352941178,1);
  const float e5 = 0.63;
  const vec4 v5 = vec4(0.803921568627451,0.49019607843137253,0.4117647058823529,1);
  const float e6 = 0.75;
  const vec4 v6 = vec4(0.8470588235294118,0.6352941176470588,0.5803921568627451,1);
  const float e7 = 0.88;
  const vec4 v7 = vec4(0.8901960784313725,0.7803921568627451,0.7568627450980392,1);
  const float e8 = 1.0;
  const vec4 v8 = vec4(0.9450980392156862,0.9294117647058824,0.9254901960784314,1);
  float a0 = smoothstep(e0,e1,x);
  float a1 = smoothstep(e1,e2,x);
  float a2 = smoothstep(e2,e3,x);
  float a3 = smoothstep(e3,e4,x);
  float a4 = smoothstep(e4,e5,x);
  float a5 = smoothstep(e5,e6,x);
  float a6 = smoothstep(e6,e7,x);
  float a7 = smoothstep(e7,e8,x);
  return max(mix(v0,v1,a0)*step(e0,x)*step(x,e1),
    max(mix(v1,v2,a1)*step(e1,x)*step(x,e2),
    max(mix(v2,v3,a2)*step(e2,x)*step(x,e3),
    max(mix(v3,v4,a3)*step(e3,x)*step(x,e4),
    max(mix(v4,v5,a4)*step(e4,x)*step(x,e5),
    max(mix(v5,v6,a5)*step(e5,x)*step(x,e6),
    max(mix(v6,v7,a6)*step(e6,x)*step(x,e7),mix(v7,v8,a7)*step(e7,x)*step(x,e8)
  )))))));
}
`;
const greens = `\
vec4 apply_cmap (float x) {
  const float e0 = 0.0;
  const vec4 v0 = vec4(0,0.26666666666666666,0.10588235294117647,1);
  const float e1 = 0.125;
  const vec4 v1 = vec4(0,0.42745098039215684,0.17254901960784313,1);
  const float e2 = 0.25;
  const vec4 v2 = vec4(0.13725490196078433,0.5450980392156862,0.27058823529411763,1);
  const float e3 = 0.375;
  const vec4 v3 = vec4(0.2549019607843137,0.6705882352941176,0.36470588235294116,1);
  const float e4 = 0.5;
  const vec4 v4 = vec4(0.4549019607843137,0.7686274509803922,0.4627450980392157,1);
  const float e5 = 0.625;
  const vec4 v5 = vec4(0.6313725490196078,0.8509803921568627,0.6078431372549019,1);
  const float e6 = 0.75;
  const vec4 v6 = vec4(0.7803921568627451,0.9137254901960784,0.7529411764705882,1);
  const float e7 = 0.875;
  const vec4 v7 = vec4(0.8980392156862745,0.9607843137254902,0.8784313725490196,1);
  const float e8 = 1.0;
  const vec4 v8 = vec4(0.9686274509803922,0.9882352941176471,0.9607843137254902,1);
  float a0 = smoothstep(e0,e1,x);
  float a1 = smoothstep(e1,e2,x);
  float a2 = smoothstep(e2,e3,x);
  float a3 = smoothstep(e3,e4,x);
  float a4 = smoothstep(e4,e5,x);
  float a5 = smoothstep(e5,e6,x);
  float a6 = smoothstep(e6,e7,x);
  float a7 = smoothstep(e7,e8,x);
  return max(mix(v0,v1,a0)*step(e0,x)*step(x,e1),
    max(mix(v1,v2,a1)*step(e1,x)*step(x,e2),
    max(mix(v2,v3,a2)*step(e2,x)*step(x,e3),
    max(mix(v3,v4,a3)*step(e3,x)*step(x,e4),
    max(mix(v4,v5,a4)*step(e4,x)*step(x,e5),
    max(mix(v5,v6,a5)*step(e5,x)*step(x,e6),
    max(mix(v6,v7,a6)*step(e6,x)*step(x,e7),mix(v7,v8,a7)*step(e7,x)*step(x,e8)
  )))))));
}
`;
const greys = `\
vec4 apply_cmap (float x) {
  const float e0 = 0.0;
  const vec4 v0 = vec4(0,0,0,1);
  const float e1 = 1.0;
  const vec4 v1 = vec4(1,1,1,1);
  float a0 = smoothstep(e0,e1,x);
  return mix(v0,v1,a0)*step(e0,x)*step(x,e1);
}
`;
const hot = `\
vec4 apply_cmap (float x) {
  const float e0 = 0.0;
  const vec4 v0 = vec4(0,0,0,1);
  const float e1 = 0.3;
  const vec4 v1 = vec4(0.9019607843137255,0,0,1);
  const float e2 = 0.6;
  const vec4 v2 = vec4(1,0.8235294117647058,0,1);
  const float e3 = 1.0;
  const vec4 v3 = vec4(1,1,1,1);
  float a0 = smoothstep(e0,e1,x);
  float a1 = smoothstep(e1,e2,x);
  float a2 = smoothstep(e2,e3,x);
  return max(mix(v0,v1,a0)*step(e0,x)*step(x,e1),
    max(mix(v1,v2,a1)*step(e1,x)*step(x,e2),mix(v2,v3,a2)*step(e2,x)*step(x,e3)
  ));
}
`;
const hsv = `\
vec4 apply_cmap (float x) {
  const float e0 = 0.0;
  const vec4 v0 = vec4(1,0,0,1);
  const float e1 = 0.169;
  const vec4 v1 = vec4(0.9921568627450981,1,0.00784313725490196,1);
  const float e2 = 0.173;
  const vec4 v2 = vec4(0.9686274509803922,1,0.00784313725490196,1);
  const float e3 = 0.337;
  const vec4 v3 = vec4(0,0.9882352941176471,0.01568627450980392,1);
  const float e4 = 0.341;
  const vec4 v4 = vec4(0,0.9882352941176471,0.0392156862745098,1);
  const float e5 = 0.506;
  const vec4 v5 = vec4(0.00392156862745098,0.9764705882352941,1,1);
  const float e6 = 0.671;
  const vec4 v6 = vec4(0.00784313725490196,0,0.9921568627450981,1);
  const float e7 = 0.675;
  const vec4 v7 = vec4(0.03137254901960784,0,0.9921568627450981,1);
  const float e8 = 0.839;
  const vec4 v8 = vec4(1,0,0.984313725490196,1);
  const float e9 = 0.843;
  const vec4 v9 = vec4(1,0,0.9607843137254902,1);
  const float e10 = 1.0;
  const vec4 v10 = vec4(1,0,0.023529411764705882,1);
  float a0 = smoothstep(e0,e1,x);
  float a1 = smoothstep(e1,e2,x);
  float a2 = smoothstep(e2,e3,x);
  float a3 = smoothstep(e3,e4,x);
  float a4 = smoothstep(e4,e5,x);
  float a5 = smoothstep(e5,e6,x);
  float a6 = smoothstep(e6,e7,x);
  float a7 = smoothstep(e7,e8,x);
  float a8 = smoothstep(e8,e9,x);
  float a9 = smoothstep(e9,e10,x);
  return max(mix(v0,v1,a0)*step(e0,x)*step(x,e1),
    max(mix(v1,v2,a1)*step(e1,x)*step(x,e2),
    max(mix(v2,v3,a2)*step(e2,x)*step(x,e3),
    max(mix(v3,v4,a3)*step(e3,x)*step(x,e4),
    max(mix(v4,v5,a4)*step(e4,x)*step(x,e5),
    max(mix(v5,v6,a5)*step(e5,x)*step(x,e6),
    max(mix(v6,v7,a6)*step(e6,x)*step(x,e7),
    max(mix(v7,v8,a7)*step(e7,x)*step(x,e8),
    max(mix(v8,v9,a8)*step(e8,x)*step(x,e9),mix(v9,v10,a9)*step(e9,x)*step(x,e10)
  )))))))));
}
`;
const inferno = `\
vec4 apply_cmap (float x) {
  const float e0 = 0.0;
  const vec4 v0 = vec4(0,0,0.01568627450980392,1);
  const float e1 = 0.13;
  const vec4 v1 = vec4(0.12156862745098039,0.047058823529411764,0.2823529411764706,1);
  const float e2 = 0.25;
  const vec4 v2 = vec4(0.3333333333333333,0.058823529411764705,0.42745098039215684,1);
  const float e3 = 0.38;
  const vec4 v3 = vec4(0.5333333333333333,0.13333333333333333,0.41568627450980394,1);
  const float e4 = 0.5;
  const vec4 v4 = vec4(0.7294117647058823,0.21176470588235294,0.3333333333333333,1);
  const float e5 = 0.63;
  const vec4 v5 = vec4(0.8901960784313725,0.34901960784313724,0.2,1);
  const float e6 = 0.75;
  const vec4 v6 = vec4(0.9764705882352941,0.5490196078431373,0.0392156862745098,1);
  const float e7 = 0.88;
  const vec4 v7 = vec4(0.9764705882352941,0.788235294117647,0.19607843137254902,1);
  const float e8 = 1.0;
  const vec4 v8 = vec4(0.9882352941176471,1,0.6431372549019608,1);
  float a0 = smoothstep(e0,e1,x);
  float a1 = smoothstep(e1,e2,x);
  float a2 = smoothstep(e2,e3,x);
  float a3 = smoothstep(e3,e4,x);
  float a4 = smoothstep(e4,e5,x);
  float a5 = smoothstep(e5,e6,x);
  float a6 = smoothstep(e6,e7,x);
  float a7 = smoothstep(e7,e8,x);
  return max(mix(v0,v1,a0)*step(e0,x)*step(x,e1),
    max(mix(v1,v2,a1)*step(e1,x)*step(x,e2),
    max(mix(v2,v3,a2)*step(e2,x)*step(x,e3),
    max(mix(v3,v4,a3)*step(e3,x)*step(x,e4),
    max(mix(v4,v5,a4)*step(e4,x)*step(x,e5),
    max(mix(v5,v6,a5)*step(e5,x)*step(x,e6),
    max(mix(v6,v7,a6)*step(e6,x)*step(x,e7),mix(v7,v8,a7)*step(e7,x)*step(x,e8)
  )))))));
}
`;
const jet = `\
vec4 apply_cmap (float x) {
  const float e0 = 0.0;
  const vec4 v0 = vec4(0,0,0.5137254901960784,1);
  const float e1 = 0.125;
  const vec4 v1 = vec4(0,0.23529411764705882,0.6666666666666666,1);
  const float e2 = 0.375;
  const vec4 v2 = vec4(0.0196078431372549,1,1,1);
  const float e3 = 0.625;
  const vec4 v3 = vec4(1,1,0,1);
  const float e4 = 0.875;
  const vec4 v4 = vec4(0.9803921568627451,0,0,1);
  const float e5 = 1.0;
  const vec4 v5 = vec4(0.5019607843137255,0,0,1);
  float a0 = smoothstep(e0,e1,x);
  float a1 = smoothstep(e1,e2,x);
  float a2 = smoothstep(e2,e3,x);
  float a3 = smoothstep(e3,e4,x);
  float a4 = smoothstep(e4,e5,x);
  return max(mix(v0,v1,a0)*step(e0,x)*step(x,e1),
    max(mix(v1,v2,a1)*step(e1,x)*step(x,e2),
    max(mix(v2,v3,a2)*step(e2,x)*step(x,e3),
    max(mix(v3,v4,a3)*step(e3,x)*step(x,e4),mix(v4,v5,a4)*step(e4,x)*step(x,e5)
  ))));
}
`;
const magma = `\
vec4 apply_cmap (float x) {
  const float e0 = 0.0;
  const vec4 v0 = vec4(0,0,0.01568627450980392,1);
  const float e1 = 0.13;
  const vec4 v1 = vec4(0.10980392156862745,0.06274509803921569,0.26666666666666666,1);
  const float e2 = 0.25;
  const vec4 v2 = vec4(0.30980392156862746,0.07058823529411765,0.4823529411764706,1);
  const float e3 = 0.38;
  const vec4 v3 = vec4(0.5058823529411764,0.1450980392156863,0.5058823529411764,1);
  const float e4 = 0.5;
  const vec4 v4 = vec4(0.7098039215686275,0.21176470588235294,0.47843137254901963,1);
  const float e5 = 0.63;
  const vec4 v5 = vec4(0.8980392156862745,0.3137254901960784,0.39215686274509803,1);
  const float e6 = 0.75;
  const vec4 v6 = vec4(0.984313725490196,0.5294117647058824,0.3803921568627451,1);
  const float e7 = 0.88;
  const vec4 v7 = vec4(0.996078431372549,0.7607843137254902,0.5294117647058824,1);
  const float e8 = 1.0;
  const vec4 v8 = vec4(0.9882352941176471,0.9921568627450981,0.7490196078431373,1);
  float a0 = smoothstep(e0,e1,x);
  float a1 = smoothstep(e1,e2,x);
  float a2 = smoothstep(e2,e3,x);
  float a3 = smoothstep(e3,e4,x);
  float a4 = smoothstep(e4,e5,x);
  float a5 = smoothstep(e5,e6,x);
  float a6 = smoothstep(e6,e7,x);
  float a7 = smoothstep(e7,e8,x);
  return max(mix(v0,v1,a0)*step(e0,x)*step(x,e1),
    max(mix(v1,v2,a1)*step(e1,x)*step(x,e2),
    max(mix(v2,v3,a2)*step(e2,x)*step(x,e3),
    max(mix(v3,v4,a3)*step(e3,x)*step(x,e4),
    max(mix(v4,v5,a4)*step(e4,x)*step(x,e5),
    max(mix(v5,v6,a5)*step(e5,x)*step(x,e6),
    max(mix(v6,v7,a6)*step(e6,x)*step(x,e7),mix(v7,v8,a7)*step(e7,x)*step(x,e8)
  )))))));
}
`;
const oxygen = `\
vec4 apply_cmap (float x) {
  const float e0 = 0.0;
  const vec4 v0 = vec4(0.25098039215686274,0.0196078431372549,0.0196078431372549,1);
  const float e1 = 0.13;
  const vec4 v1 = vec4(0.41568627450980394,0.023529411764705882,0.058823529411764705,1);
  const float e2 = 0.25;
  const vec4 v2 = vec4(0.5647058823529412,0.10196078431372549,0.027450980392156862,1);
  const float e3 = 0.38;
  const vec4 v3 = vec4(0.6588235294117647,0.25098039215686274,0.011764705882352941,1);
  const float e4 = 0.5;
  const vec4 v4 = vec4(0.7372549019607844,0.39215686274509803,0.01568627450980392,1);
  const float e5 = 0.63;
  const vec4 v5 = vec4(0.807843137254902,0.5333333333333333,0.043137254901960784,1);
  const float e6 = 0.75;
  const vec4 v6 = vec4(0.8627450980392157,0.6823529411764706,0.09803921568627451,1);
  const float e7 = 0.88;
  const vec4 v7 = vec4(0.9058823529411765,0.8431372549019608,0.17254901960784313,1);
  const float e8 = 1.0;
  const vec4 v8 = vec4(0.9725490196078431,0.996078431372549,0.4117647058823529,1);
  float a0 = smoothstep(e0,e1,x);
  float a1 = smoothstep(e1,e2,x);
  float a2 = smoothstep(e2,e3,x);
  float a3 = smoothstep(e3,e4,x);
  float a4 = smoothstep(e4,e5,x);
  float a5 = smoothstep(e5,e6,x);
  float a6 = smoothstep(e6,e7,x);
  float a7 = smoothstep(e7,e8,x);
  return max(mix(v0,v1,a0)*step(e0,x)*step(x,e1),
    max(mix(v1,v2,a1)*step(e1,x)*step(x,e2),
    max(mix(v2,v3,a2)*step(e2,x)*step(x,e3),
    max(mix(v3,v4,a3)*step(e3,x)*step(x,e4),
    max(mix(v4,v5,a4)*step(e4,x)*step(x,e5),
    max(mix(v5,v6,a5)*step(e5,x)*step(x,e6),
    max(mix(v6,v7,a6)*step(e6,x)*step(x,e7),mix(v7,v8,a7)*step(e7,x)*step(x,e8)
  )))))));
}
`;
const par = `\
vec4 apply_cmap (float x) {
  const float e0 = 0.0;
  const vec4 v0 = vec4(0.2,0.0784313725490196,0.09411764705882353,1);
  const float e1 = 0.13;
  const vec4 v1 = vec4(0.35294117647058826,0.12549019607843137,0.13725490196078433,1);
  const float e2 = 0.25;
  const vec4 v2 = vec4(0.5058823529411764,0.17254901960784313,0.13333333333333333,1);
  const float e3 = 0.38;
  const vec4 v3 = vec4(0.6235294117647059,0.26666666666666666,0.09803921568627451,1);
  const float e4 = 0.5;
  const vec4 v4 = vec4(0.7137254901960784,0.38823529411764707,0.07450980392156863,1);
  const float e5 = 0.63;
  const vec4 v5 = vec4(0.7803921568627451,0.5254901960784314,0.08627450980392157,1);
  const float e6 = 0.75;
  const vec4 v6 = vec4(0.8313725490196079,0.6705882352941176,0.13725490196078433,1);
  const float e7 = 0.88;
  const vec4 v7 = vec4(0.8666666666666667,0.8235294117647058,0.21176470588235294,1);
  const float e8 = 1.0;
  const vec4 v8 = vec4(0.8823529411764706,0.9921568627450981,0.29411764705882354,1);
  float a0 = smoothstep(e0,e1,x);
  float a1 = smoothstep(e1,e2,x);
  float a2 = smoothstep(e2,e3,x);
  float a3 = smoothstep(e3,e4,x);
  float a4 = smoothstep(e4,e5,x);
  float a5 = smoothstep(e5,e6,x);
  float a6 = smoothstep(e6,e7,x);
  float a7 = smoothstep(e7,e8,x);
  return max(mix(v0,v1,a0)*step(e0,x)*step(x,e1),
    max(mix(v1,v2,a1)*step(e1,x)*step(x,e2),
    max(mix(v2,v3,a2)*step(e2,x)*step(x,e3),
    max(mix(v3,v4,a3)*step(e3,x)*step(x,e4),
    max(mix(v4,v5,a4)*step(e4,x)*step(x,e5),
    max(mix(v5,v6,a5)*step(e5,x)*step(x,e6),
    max(mix(v6,v7,a6)*step(e6,x)*step(x,e7),mix(v7,v8,a7)*step(e7,x)*step(x,e8)
  )))))));
}
`;
const phase = `\
vec4 apply_cmap (float x) {
  const float e0 = 0.0;
  const vec4 v0 = vec4(0.5686274509803921,0.4117647058823529,0.07058823529411765,1);
  const float e1 = 0.13;
  const vec4 v1 = vec4(0.7215686274509804,0.2784313725490196,0.14901960784313725,1);
  const float e2 = 0.25;
  const vec4 v2 = vec4(0.7294117647058823,0.22745098039215686,0.45098039215686275,1);
  const float e3 = 0.38;
  const vec4 v3 = vec4(0.6274509803921569,0.2784313725490196,0.7254901960784313,1);
  const float e4 = 0.5;
  const vec4 v4 = vec4(0.43137254901960786,0.3803921568627451,0.8549019607843137,1);
  const float e5 = 0.63;
  const vec4 v5 = vec4(0.19607843137254902,0.4823529411764706,0.6431372549019608,1);
  const float e6 = 0.75;
  const vec4 v6 = vec4(0.12156862745098039,0.5137254901960784,0.43137254901960786,1);
  const float e7 = 0.88;
  const vec4 v7 = vec4(0.30196078431372547,0.5058823529411764,0.13333333333333333,1);
  const float e8 = 1.0;
  const vec4 v8 = vec4(0.5686274509803921,0.4117647058823529,0.07058823529411765,1);
  float a0 = smoothstep(e0,e1,x);
  float a1 = smoothstep(e1,e2,x);
  float a2 = smoothstep(e2,e3,x);
  float a3 = smoothstep(e3,e4,x);
  float a4 = smoothstep(e4,e5,x);
  float a5 = smoothstep(e5,e6,x);
  float a6 = smoothstep(e6,e7,x);
  float a7 = smoothstep(e7,e8,x);
  return max(mix(v0,v1,a0)*step(e0,x)*step(x,e1),
    max(mix(v1,v2,a1)*step(e1,x)*step(x,e2),
    max(mix(v2,v3,a2)*step(e2,x)*step(x,e3),
    max(mix(v3,v4,a3)*step(e3,x)*step(x,e4),
    max(mix(v4,v5,a4)*step(e4,x)*step(x,e5),
    max(mix(v5,v6,a5)*step(e5,x)*step(x,e6),
    max(mix(v6,v7,a6)*step(e6,x)*step(x,e7),mix(v7,v8,a7)*step(e7,x)*step(x,e8)
  )))))));
}
`;
const picnic = `\
vec4 apply_cmap (float x) {
  const float e0 = 0.0;
  const vec4 v0 = vec4(0,0,1,1);
  const float e1 = 0.1;
  const vec4 v1 = vec4(0.2,0.6,1,1);
  const float e2 = 0.2;
  const vec4 v2 = vec4(0.4,0.8,1,1);
  const float e3 = 0.3;
  const vec4 v3 = vec4(0.6,0.8,1,1);
  const float e4 = 0.4;
  const vec4 v4 = vec4(0.8,0.8,1,1);
  const float e5 = 0.5;
  const vec4 v5 = vec4(1,1,1,1);
  const float e6 = 0.6;
  const vec4 v6 = vec4(1,0.8,1,1);
  const float e7 = 0.7;
  const vec4 v7 = vec4(1,0.6,1,1);
  const float e8 = 0.8;
  const vec4 v8 = vec4(1,0.4,0.8,1);
  const float e9 = 0.9;
  const vec4 v9 = vec4(1,0.4,0.4,1);
  const float e10 = 1.0;
  const vec4 v10 = vec4(1,0,0,1);
  float a0 = smoothstep(e0,e1,x);
  float a1 = smoothstep(e1,e2,x);
  float a2 = smoothstep(e2,e3,x);
  float a3 = smoothstep(e3,e4,x);
  float a4 = smoothstep(e4,e5,x);
  float a5 = smoothstep(e5,e6,x);
  float a6 = smoothstep(e6,e7,x);
  float a7 = smoothstep(e7,e8,x);
  float a8 = smoothstep(e8,e9,x);
  float a9 = smoothstep(e9,e10,x);
  return max(mix(v0,v1,a0)*step(e0,x)*step(x,e1),
    max(mix(v1,v2,a1)*step(e1,x)*step(x,e2),
    max(mix(v2,v3,a2)*step(e2,x)*step(x,e3),
    max(mix(v3,v4,a3)*step(e3,x)*step(x,e4),
    max(mix(v4,v5,a4)*step(e4,x)*step(x,e5),
    max(mix(v5,v6,a5)*step(e5,x)*step(x,e6),
    max(mix(v6,v7,a6)*step(e6,x)*step(x,e7),
    max(mix(v7,v8,a7)*step(e7,x)*step(x,e8),
    max(mix(v8,v9,a8)*step(e8,x)*step(x,e9),mix(v9,v10,a9)*step(e9,x)*step(x,e10)
  )))))))));
}
`;
const plasma = `\
vec4 apply_cmap (float x) {
  const float e0 = 0.0;
  const vec4 v0 = vec4(0.050980392156862744,0.03137254901960784,0.5294117647058824,1);
  const float e1 = 0.13;
  const vec4 v1 = vec4(0.29411764705882354,0.011764705882352941,0.6313725490196078,1);
  const float e2 = 0.25;
  const vec4 v2 = vec4(0.49019607843137253,0.011764705882352941,0.6588235294117647,1);
  const float e3 = 0.38;
  const vec4 v3 = vec4(0.6588235294117647,0.13333333333333333,0.5882352941176471,1);
  const float e4 = 0.5;
  const vec4 v4 = vec4(0.796078431372549,0.27450980392156865,0.4745098039215686,1);
  const float e5 = 0.63;
  const vec4 v5 = vec4(0.8980392156862745,0.4196078431372549,0.36470588235294116,1);
  const float e6 = 0.75;
  const vec4 v6 = vec4(0.9725490196078431,0.5803921568627451,0.2549019607843137,1);
  const float e7 = 0.88;
  const vec4 v7 = vec4(0.9921568627450981,0.7647058823529411,0.1568627450980392,1);
  const float e8 = 1.0;
  const vec4 v8 = vec4(0.9411764705882353,0.9764705882352941,0.12941176470588237,1);
  float a0 = smoothstep(e0,e1,x);
  float a1 = smoothstep(e1,e2,x);
  float a2 = smoothstep(e2,e3,x);
  float a3 = smoothstep(e3,e4,x);
  float a4 = smoothstep(e4,e5,x);
  float a5 = smoothstep(e5,e6,x);
  float a6 = smoothstep(e6,e7,x);
  float a7 = smoothstep(e7,e8,x);
  return max(mix(v0,v1,a0)*step(e0,x)*step(x,e1),
    max(mix(v1,v2,a1)*step(e1,x)*step(x,e2),
    max(mix(v2,v3,a2)*step(e2,x)*step(x,e3),
    max(mix(v3,v4,a3)*step(e3,x)*step(x,e4),
    max(mix(v4,v5,a4)*step(e4,x)*step(x,e5),
    max(mix(v5,v6,a5)*step(e5,x)*step(x,e6),
    max(mix(v6,v7,a6)*step(e6,x)*step(x,e7),mix(v7,v8,a7)*step(e7,x)*step(x,e8)
  )))))));
}
`;
const portland = `\
vec4 apply_cmap (float x) {
  const float e0 = 0.0;
  const vec4 v0 = vec4(0.047058823529411764,0.2,0.5137254901960784,1);
  const float e1 = 0.25;
  const vec4 v1 = vec4(0.0392156862745098,0.5333333333333333,0.7294117647058823,1);
  const float e2 = 0.5;
  const vec4 v2 = vec4(0.9490196078431372,0.8274509803921568,0.2196078431372549,1);
  const float e3 = 0.75;
  const vec4 v3 = vec4(0.9490196078431372,0.5607843137254902,0.2196078431372549,1);
  const float e4 = 1.0;
  const vec4 v4 = vec4(0.8509803921568627,0.11764705882352941,0.11764705882352941,1);
  float a0 = smoothstep(e0,e1,x);
  float a1 = smoothstep(e1,e2,x);
  float a2 = smoothstep(e2,e3,x);
  float a3 = smoothstep(e3,e4,x);
  return max(mix(v0,v1,a0)*step(e0,x)*step(x,e1),
    max(mix(v1,v2,a1)*step(e1,x)*step(x,e2),
    max(mix(v2,v3,a2)*step(e2,x)*step(x,e3),mix(v3,v4,a3)*step(e3,x)*step(x,e4)
  )));
}
`;
const rainbow_soft = `\
vec4 apply_cmap (float x) {
  const float e0 = 0.0;
  const vec4 v0 = vec4(0.49019607843137253,0,0.7019607843137254,1);
  const float e1 = 0.1;
  const vec4 v1 = vec4(0.7803921568627451,0,0.7058823529411765,1);
  const float e2 = 0.2;
  const vec4 v2 = vec4(1,0,0.4745098039215686,1);
  const float e3 = 0.3;
  const vec4 v3 = vec4(1,0.4235294117647059,0,1);
  const float e4 = 0.4;
  const vec4 v4 = vec4(0.8705882352941177,0.7607843137254902,0,1);
  const float e5 = 0.5;
  const vec4 v5 = vec4(0.5882352941176471,1,0,1);
  const float e6 = 0.6;
  const vec4 v6 = vec4(0,1,0.21568627450980393,1);
  const float e7 = 0.7;
  const vec4 v7 = vec4(0,0.9647058823529412,0.5882352941176471,1);
  const float e8 = 0.8;
  const vec4 v8 = vec4(0.19607843137254902,0.6549019607843137,0.8705882352941177,1);
  const float e9 = 0.9;
  const vec4 v9 = vec4(0.403921568627451,0.2,0.9215686274509803,1);
  const float e10 = 1.0;
  const vec4 v10 = vec4(0.48627450980392156,0,0.7294117647058823,1);
  float a0 = smoothstep(e0,e1,x);
  float a1 = smoothstep(e1,e2,x);
  float a2 = smoothstep(e2,e3,x);
  float a3 = smoothstep(e3,e4,x);
  float a4 = smoothstep(e4,e5,x);
  float a5 = smoothstep(e5,e6,x);
  float a6 = smoothstep(e6,e7,x);
  float a7 = smoothstep(e7,e8,x);
  float a8 = smoothstep(e8,e9,x);
  float a9 = smoothstep(e9,e10,x);
  return max(mix(v0,v1,a0)*step(e0,x)*step(x,e1),
    max(mix(v1,v2,a1)*step(e1,x)*step(x,e2),
    max(mix(v2,v3,a2)*step(e2,x)*step(x,e3),
    max(mix(v3,v4,a3)*step(e3,x)*step(x,e4),
    max(mix(v4,v5,a4)*step(e4,x)*step(x,e5),
    max(mix(v5,v6,a5)*step(e5,x)*step(x,e6),
    max(mix(v6,v7,a6)*step(e6,x)*step(x,e7),
    max(mix(v7,v8,a7)*step(e7,x)*step(x,e8),
    max(mix(v8,v9,a8)*step(e8,x)*step(x,e9),mix(v9,v10,a9)*step(e9,x)*step(x,e10)
  )))))))));
}
`;
const rainbow = `\
vec4 apply_cmap (float x) {
  const float e0 = 0.0;
  const vec4 v0 = vec4(0.5882352941176471,0,0.35294117647058826,1);
  const float e1 = 0.125;
  const vec4 v1 = vec4(0,0,0.7843137254901961,1);
  const float e2 = 0.25;
  const vec4 v2 = vec4(0,0.09803921568627451,1,1);
  const float e3 = 0.375;
  const vec4 v3 = vec4(0,0.596078431372549,1,1);
  const float e4 = 0.5;
  const vec4 v4 = vec4(0.17254901960784313,1,0.5882352941176471,1);
  const float e5 = 0.625;
  const vec4 v5 = vec4(0.592156862745098,1,0,1);
  const float e6 = 0.75;
  const vec4 v6 = vec4(1,0.9176470588235294,0,1);
  const float e7 = 0.875;
  const vec4 v7 = vec4(1,0.43529411764705883,0,1);
  const float e8 = 1.0;
  const vec4 v8 = vec4(1,0,0,1);
  float a0 = smoothstep(e0,e1,x);
  float a1 = smoothstep(e1,e2,x);
  float a2 = smoothstep(e2,e3,x);
  float a3 = smoothstep(e3,e4,x);
  float a4 = smoothstep(e4,e5,x);
  float a5 = smoothstep(e5,e6,x);
  float a6 = smoothstep(e6,e7,x);
  float a7 = smoothstep(e7,e8,x);
  return max(mix(v0,v1,a0)*step(e0,x)*step(x,e1),
    max(mix(v1,v2,a1)*step(e1,x)*step(x,e2),
    max(mix(v2,v3,a2)*step(e2,x)*step(x,e3),
    max(mix(v3,v4,a3)*step(e3,x)*step(x,e4),
    max(mix(v4,v5,a4)*step(e4,x)*step(x,e5),
    max(mix(v5,v6,a5)*step(e5,x)*step(x,e6),
    max(mix(v6,v7,a6)*step(e6,x)*step(x,e7),mix(v7,v8,a7)*step(e7,x)*step(x,e8)
  )))))));
}
`;
const rdbu = `\
vec4 apply_cmap (float x) {
  const float e0 = 0.0;
  const vec4 v0 = vec4(0.0196078431372549,0.0392156862745098,0.6745098039215687,1);
  const float e1 = 0.35;
  const vec4 v1 = vec4(0.41568627450980394,0.5372549019607843,0.9686274509803922,1);
  const float e2 = 0.5;
  const vec4 v2 = vec4(0.7450980392156863,0.7450980392156863,0.7450980392156863,1);
  const float e3 = 0.6;
  const vec4 v3 = vec4(0.8627450980392157,0.6666666666666666,0.5176470588235295,1);
  const float e4 = 0.7;
  const vec4 v4 = vec4(0.9019607843137255,0.5686274509803921,0.35294117647058826,1);
  const float e5 = 1.0;
  const vec4 v5 = vec4(0.6980392156862745,0.0392156862745098,0.10980392156862745,1);
  float a0 = smoothstep(e0,e1,x);
  float a1 = smoothstep(e1,e2,x);
  float a2 = smoothstep(e2,e3,x);
  float a3 = smoothstep(e3,e4,x);
  float a4 = smoothstep(e4,e5,x);
  return max(mix(v0,v1,a0)*step(e0,x)*step(x,e1),
    max(mix(v1,v2,a1)*step(e1,x)*step(x,e2),
    max(mix(v2,v3,a2)*step(e2,x)*step(x,e3),
    max(mix(v3,v4,a3)*step(e3,x)*step(x,e4),mix(v4,v5,a4)*step(e4,x)*step(x,e5)
  ))));
}
`;
const salinity = `\
vec4 apply_cmap (float x) {
  const float e0 = 0.0;
  const vec4 v0 = vec4(0.16470588235294117,0.09411764705882353,0.4235294117647059,1);
  const float e1 = 0.13;
  const vec4 v1 = vec4(0.12941176470588237,0.19607843137254902,0.6352941176470588,1);
  const float e2 = 0.25;
  const vec4 v2 = vec4(0.058823529411764705,0.35294117647058826,0.5686274509803921,1);
  const float e3 = 0.38;
  const vec4 v3 = vec4(0.1568627450980392,0.4627450980392157,0.5372549019607843,1);
  const float e4 = 0.5;
  const vec4 v4 = vec4(0.23137254901960785,0.5725490196078431,0.5294117647058824,1);
  const float e5 = 0.63;
  const vec4 v5 = vec4(0.30980392156862746,0.6862745098039216,0.49411764705882355,1);
  const float e6 = 0.75;
  const vec4 v6 = vec4(0.47058823529411764,0.796078431372549,0.40784313725490196,1);
  const float e7 = 0.88;
  const vec4 v7 = vec4(0.7568627450980392,0.8666666666666667,0.39215686274509803,1);
  const float e8 = 1.0;
  const vec4 v8 = vec4(0.9921568627450981,0.9372549019607843,0.6039215686274509,1);
  float a0 = smoothstep(e0,e1,x);
  float a1 = smoothstep(e1,e2,x);
  float a2 = smoothstep(e2,e3,x);
  float a3 = smoothstep(e3,e4,x);
  float a4 = smoothstep(e4,e5,x);
  float a5 = smoothstep(e5,e6,x);
  float a6 = smoothstep(e6,e7,x);
  float a7 = smoothstep(e7,e8,x);
  return max(mix(v0,v1,a0)*step(e0,x)*step(x,e1),
    max(mix(v1,v2,a1)*step(e1,x)*step(x,e2),
    max(mix(v2,v3,a2)*step(e2,x)*step(x,e3),
    max(mix(v3,v4,a3)*step(e3,x)*step(x,e4),
    max(mix(v4,v5,a4)*step(e4,x)*step(x,e5),
    max(mix(v5,v6,a5)*step(e5,x)*step(x,e6),
    max(mix(v6,v7,a6)*step(e6,x)*step(x,e7),mix(v7,v8,a7)*step(e7,x)*step(x,e8)
  )))))));
}
`;
const spring = `\
vec4 apply_cmap (float x) {
  const float e0 = 0.0;
  const vec4 v0 = vec4(1,0,1,1);
  const float e1 = 1.0;
  const vec4 v1 = vec4(1,1,0,1);
  float a0 = smoothstep(e0,e1,x);
  return mix(v0,v1,a0)*step(e0,x)*step(x,e1);
}
`;
const summer = `\
vec4 apply_cmap (float x) {
  const float e0 = 0.0;
  const vec4 v0 = vec4(0,0.5019607843137255,0.4,1);
  const float e1 = 1.0;
  const vec4 v1 = vec4(1,1,0.4,1);
  float a0 = smoothstep(e0,e1,x);
  return mix(v0,v1,a0)*step(e0,x)*step(x,e1);
}
`;
const temperature = `\
vec4 apply_cmap (float x) {
  const float e0 = 0.0;
  const vec4 v0 = vec4(0.01568627450980392,0.13725490196078433,0.2,1);
  const float e1 = 0.13;
  const vec4 v1 = vec4(0.09019607843137255,0.2,0.47843137254901963,1);
  const float e2 = 0.25;
  const vec4 v2 = vec4(0.3333333333333333,0.23137254901960785,0.615686274509804,1);
  const float e3 = 0.38;
  const vec4 v3 = vec4(0.5058823529411764,0.30980392156862746,0.5607843137254902,1);
  const float e4 = 0.5;
  const vec4 v4 = vec4(0.6862745098039216,0.37254901960784315,0.5098039215686274,1);
  const float e5 = 0.63;
  const vec4 v5 = vec4(0.8705882352941177,0.4392156862745098,0.396078431372549,1);
  const float e6 = 0.75;
  const vec4 v6 = vec4(0.9764705882352941,0.5725490196078431,0.25882352941176473,1);
  const float e7 = 0.88;
  const vec4 v7 = vec4(0.9764705882352941,0.7686274509803922,0.2549019607843137,1);
  const float e8 = 1.0;
  const vec4 v8 = vec4(0.9098039215686274,0.9803921568627451,0.3568627450980392,1);
  float a0 = smoothstep(e0,e1,x);
  float a1 = smoothstep(e1,e2,x);
  float a2 = smoothstep(e2,e3,x);
  float a3 = smoothstep(e3,e4,x);
  float a4 = smoothstep(e4,e5,x);
  float a5 = smoothstep(e5,e6,x);
  float a6 = smoothstep(e6,e7,x);
  float a7 = smoothstep(e7,e8,x);
  return max(mix(v0,v1,a0)*step(e0,x)*step(x,e1),
    max(mix(v1,v2,a1)*step(e1,x)*step(x,e2),
    max(mix(v2,v3,a2)*step(e2,x)*step(x,e3),
    max(mix(v3,v4,a3)*step(e3,x)*step(x,e4),
    max(mix(v4,v5,a4)*step(e4,x)*step(x,e5),
    max(mix(v5,v6,a5)*step(e5,x)*step(x,e6),
    max(mix(v6,v7,a6)*step(e6,x)*step(x,e7),mix(v7,v8,a7)*step(e7,x)*step(x,e8)
  )))))));
}
`;
const turbidity = `\
vec4 apply_cmap (float x) {
  const float e0 = 0.0;
  const vec4 v0 = vec4(0.13333333333333333,0.12156862745098039,0.10588235294117647,1);
  const float e1 = 0.13;
  const vec4 v1 = vec4(0.2549019607843137,0.19607843137254902,0.1607843137254902,1);
  const float e2 = 0.25;
  const vec4 v2 = vec4(0.3843137254901961,0.27058823529411763,0.20392156862745098,1);
  const float e3 = 0.38;
  const vec4 v3 = vec4(0.5137254901960784,0.34901960784313724,0.2235294117647059,1);
  const float e4 = 0.5;
  const vec4 v4 = vec4(0.6313725490196078,0.4392156862745098,0.23137254901960785,1);
  const float e5 = 0.63;
  const vec4 v5 = vec4(0.7254901960784313,0.5490196078431373,0.25882352941176473,1);
  const float e6 = 0.75;
  const vec4 v6 = vec4(0.792156862745098,0.6823529411764706,0.34509803921568627,1);
  const float e7 = 0.88;
  const vec4 v7 = vec4(0.8470588235294118,0.8196078431372549,0.49411764705882355,1);
  const float e8 = 1.0;
  const vec4 v8 = vec4(0.9137254901960784,0.9647058823529412,0.6705882352941176,1);
  float a0 = smoothstep(e0,e1,x);
  float a1 = smoothstep(e1,e2,x);
  float a2 = smoothstep(e2,e3,x);
  float a3 = smoothstep(e3,e4,x);
  float a4 = smoothstep(e4,e5,x);
  float a5 = smoothstep(e5,e6,x);
  float a6 = smoothstep(e6,e7,x);
  float a7 = smoothstep(e7,e8,x);
  return max(mix(v0,v1,a0)*step(e0,x)*step(x,e1),
    max(mix(v1,v2,a1)*step(e1,x)*step(x,e2),
    max(mix(v2,v3,a2)*step(e2,x)*step(x,e3),
    max(mix(v3,v4,a3)*step(e3,x)*step(x,e4),
    max(mix(v4,v5,a4)*step(e4,x)*step(x,e5),
    max(mix(v5,v6,a5)*step(e5,x)*step(x,e6),
    max(mix(v6,v7,a6)*step(e6,x)*step(x,e7),mix(v7,v8,a7)*step(e7,x)*step(x,e8)
  )))))));
}
`;
const velocity_blue = `\
vec4 apply_cmap (float x) {
  const float e0 = 0.0;
  const vec4 v0 = vec4(0.06666666666666667,0.12549019607843137,0.25098039215686274,1);
  const float e1 = 0.13;
  const vec4 v1 = vec4(0.13725490196078433,0.20392156862745098,0.4549019607843137,1);
  const float e2 = 0.25;
  const vec4 v2 = vec4(0.11372549019607843,0.3176470588235294,0.611764705882353,1);
  const float e3 = 0.38;
  const vec4 v3 = vec4(0.12156862745098039,0.44313725490196076,0.6352941176470588,1);
  const float e4 = 0.5;
  const vec4 v4 = vec4(0.19607843137254902,0.5647058823529412,0.6627450980392157,1);
  const float e5 = 0.63;
  const vec4 v5 = vec4(0.3411764705882353,0.6784313725490196,0.6901960784313725,1);
  const float e6 = 0.75;
  const vec4 v6 = vec4(0.5843137254901961,0.7686274509803922,0.7411764705882353,1);
  const float e7 = 0.88;
  const vec4 v7 = vec4(0.796078431372549,0.8666666666666667,0.8274509803921568,1);
  const float e8 = 1.0;
  const vec4 v8 = vec4(0.996078431372549,0.984313725490196,0.9019607843137255,1);
  float a0 = smoothstep(e0,e1,x);
  float a1 = smoothstep(e1,e2,x);
  float a2 = smoothstep(e2,e3,x);
  float a3 = smoothstep(e3,e4,x);
  float a4 = smoothstep(e4,e5,x);
  float a5 = smoothstep(e5,e6,x);
  float a6 = smoothstep(e6,e7,x);
  float a7 = smoothstep(e7,e8,x);
  return max(mix(v0,v1,a0)*step(e0,x)*step(x,e1),
    max(mix(v1,v2,a1)*step(e1,x)*step(x,e2),
    max(mix(v2,v3,a2)*step(e2,x)*step(x,e3),
    max(mix(v3,v4,a3)*step(e3,x)*step(x,e4),
    max(mix(v4,v5,a4)*step(e4,x)*step(x,e5),
    max(mix(v5,v6,a5)*step(e5,x)*step(x,e6),
    max(mix(v6,v7,a6)*step(e6,x)*step(x,e7),mix(v7,v8,a7)*step(e7,x)*step(x,e8)
  )))))));
}
`;
const velocity_green = `\
vec4 apply_cmap (float x) {
  const float e0 = 0.0;
  const vec4 v0 = vec4(0.09019607843137255,0.13725490196078433,0.07450980392156863,1);
  const float e1 = 0.13;
  const vec4 v1 = vec4(0.09411764705882353,0.25098039215686274,0.14901960784313725,1);
  const float e2 = 0.25;
  const vec4 v2 = vec4(0.043137254901960784,0.37254901960784315,0.17647058823529413,1);
  const float e3 = 0.38;
  const vec4 v3 = vec4(0.15294117647058825,0.4823529411764706,0.13725490196078433,1);
  const float e4 = 0.5;
  const vec4 v4 = vec4(0.37254901960784315,0.5725490196078431,0.047058823529411764,1);
  const float e5 = 0.63;
  const vec4 v5 = vec4(0.596078431372549,0.6470588235294118,0.07058823529411765,1);
  const float e6 = 0.75;
  const vec4 v6 = vec4(0.788235294117647,0.7294117647058823,0.27058823529411763,1);
  const float e7 = 0.88;
  const vec4 v7 = vec4(0.9137254901960784,0.8470588235294118,0.5372549019607843,1);
  const float e8 = 1.0;
  const vec4 v8 = vec4(1,0.9921568627450981,0.803921568627451,1);
  float a0 = smoothstep(e0,e1,x);
  float a1 = smoothstep(e1,e2,x);
  float a2 = smoothstep(e2,e3,x);
  float a3 = smoothstep(e3,e4,x);
  float a4 = smoothstep(e4,e5,x);
  float a5 = smoothstep(e5,e6,x);
  float a6 = smoothstep(e6,e7,x);
  float a7 = smoothstep(e7,e8,x);
  return max(mix(v0,v1,a0)*step(e0,x)*step(x,e1),
    max(mix(v1,v2,a1)*step(e1,x)*step(x,e2),
    max(mix(v2,v3,a2)*step(e2,x)*step(x,e3),
    max(mix(v3,v4,a3)*step(e3,x)*step(x,e4),
    max(mix(v4,v5,a4)*step(e4,x)*step(x,e5),
    max(mix(v5,v6,a5)*step(e5,x)*step(x,e6),
    max(mix(v6,v7,a6)*step(e6,x)*step(x,e7),mix(v7,v8,a7)*step(e7,x)*step(x,e8)
  )))))));
}
`;
const viridis = `\
vec4 apply_cmap (float x) {
  const float e0 = 0.0;
  const vec4 v0 = vec4(0.26666666666666666,0.00392156862745098,0.32941176470588235,1);
  const float e1 = 0.13;
  const vec4 v1 = vec4(0.2784313725490196,0.17254901960784313,0.47843137254901963,1);
  const float e2 = 0.25;
  const vec4 v2 = vec4(0.23137254901960785,0.3176470588235294,0.5450980392156862,1);
  const float e3 = 0.38;
  const vec4 v3 = vec4(0.17254901960784313,0.44313725490196076,0.5568627450980392,1);
  const float e4 = 0.5;
  const vec4 v4 = vec4(0.12941176470588237,0.5647058823529412,0.5529411764705883,1);
  const float e5 = 0.63;
  const vec4 v5 = vec4(0.15294117647058825,0.6784313725490196,0.5058823529411764,1);
  const float e6 = 0.75;
  const vec4 v6 = vec4(0.3607843137254902,0.7843137254901961,0.38823529411764707,1);
  const float e7 = 0.88;
  const vec4 v7 = vec4(0.6666666666666666,0.8627450980392157,0.19607843137254902,1);
  const float e8 = 1.0;
  const vec4 v8 = vec4(0.9921568627450981,0.9058823529411765,0.1450980392156863,1);
  float a0 = smoothstep(e0,e1,x);
  float a1 = smoothstep(e1,e2,x);
  float a2 = smoothstep(e2,e3,x);
  float a3 = smoothstep(e3,e4,x);
  float a4 = smoothstep(e4,e5,x);
  float a5 = smoothstep(e5,e6,x);
  float a6 = smoothstep(e6,e7,x);
  float a7 = smoothstep(e7,e8,x);
  return max(mix(v0,v1,a0)*step(e0,x)*step(x,e1),
    max(mix(v1,v2,a1)*step(e1,x)*step(x,e2),
    max(mix(v2,v3,a2)*step(e2,x)*step(x,e3),
    max(mix(v3,v4,a3)*step(e3,x)*step(x,e4),
    max(mix(v4,v5,a4)*step(e4,x)*step(x,e5),
    max(mix(v5,v6,a5)*step(e5,x)*step(x,e6),
    max(mix(v6,v7,a6)*step(e6,x)*step(x,e7),mix(v7,v8,a7)*step(e7,x)*step(x,e8)
  )))))));
}
`;
const warm = `\
vec4 apply_cmap (float x) {
  const float e0 = 0.0;
  const vec4 v0 = vec4(0.49019607843137253,0,0.7019607843137254,1);
  const float e1 = 0.13;
  const vec4 v1 = vec4(0.6745098039215687,0,0.7333333333333333,1);
  const float e2 = 0.25;
  const vec4 v2 = vec4(0.8588235294117647,0,0.6666666666666666,1);
  const float e3 = 0.38;
  const vec4 v3 = vec4(1,0,0.5098039215686274,1);
  const float e4 = 0.5;
  const vec4 v4 = vec4(1,0.24705882352941178,0.2901960784313726,1);
  const float e5 = 0.63;
  const vec4 v5 = vec4(1,0.4823529411764706,0,1);
  const float e6 = 0.75;
  const vec4 v6 = vec4(0.9176470588235294,0.6901960784313725,0,1);
  const float e7 = 0.88;
  const vec4 v7 = vec4(0.7450980392156863,0.8941176470588236,0,1);
  const float e8 = 1.0;
  const vec4 v8 = vec4(0.5764705882352941,1,0,1);
  float a0 = smoothstep(e0,e1,x);
  float a1 = smoothstep(e1,e2,x);
  float a2 = smoothstep(e2,e3,x);
  float a3 = smoothstep(e3,e4,x);
  float a4 = smoothstep(e4,e5,x);
  float a5 = smoothstep(e5,e6,x);
  float a6 = smoothstep(e6,e7,x);
  float a7 = smoothstep(e7,e8,x);
  return max(mix(v0,v1,a0)*step(e0,x)*step(x,e1),
    max(mix(v1,v2,a1)*step(e1,x)*step(x,e2),
    max(mix(v2,v3,a2)*step(e2,x)*step(x,e3),
    max(mix(v3,v4,a3)*step(e3,x)*step(x,e4),
    max(mix(v4,v5,a4)*step(e4,x)*step(x,e5),
    max(mix(v5,v6,a5)*step(e5,x)*step(x,e6),
    max(mix(v6,v7,a6)*step(e6,x)*step(x,e7),mix(v7,v8,a7)*step(e7,x)*step(x,e8)
  )))))));
}
`;
const winter = `\
vec4 apply_cmap (float x) {
  const float e0 = 0.0;
  const vec4 v0 = vec4(0,0,1,1);
  const float e1 = 1.0;
  const vec4 v1 = vec4(0,1,0.5019607843137255,1);
  float a0 = smoothstep(e0,e1,x);
  return mix(v0,v1,a0)*step(e0,x)*step(x,e1);
}
`;
const yignbu = `\
vec4 apply_cmap (float x) {
  const float e0 = 0.0;
  const vec4 v0 = vec4(0.03137254901960784,0.11372549019607843,0.34509803921568627,1);
  const float e1 = 0.125;
  const vec4 v1 = vec4(0.1450980392156863,0.20392156862745098,0.5803921568627451,1);
  const float e2 = 0.25;
  const vec4 v2 = vec4(0.13333333333333333,0.3686274509803922,0.6588235294117647,1);
  const float e3 = 0.375;
  const vec4 v3 = vec4(0.11372549019607843,0.5686274509803921,0.7529411764705882,1);
  const float e4 = 0.5;
  const vec4 v4 = vec4(0.2549019607843137,0.7137254901960784,0.7686274509803922,1);
  const float e5 = 0.625;
  const vec4 v5 = vec4(0.4980392156862745,0.803921568627451,0.7333333333333333,1);
  const float e6 = 0.75;
  const vec4 v6 = vec4(0.7803921568627451,0.9137254901960784,0.7058823529411765,1);
  const float e7 = 0.875;
  const vec4 v7 = vec4(0.9294117647058824,0.9725490196078431,0.8509803921568627,1);
  const float e8 = 1.0;
  const vec4 v8 = vec4(1,1,0.8509803921568627,1);
  float a0 = smoothstep(e0,e1,x);
  float a1 = smoothstep(e1,e2,x);
  float a2 = smoothstep(e2,e3,x);
  float a3 = smoothstep(e3,e4,x);
  float a4 = smoothstep(e4,e5,x);
  float a5 = smoothstep(e5,e6,x);
  float a6 = smoothstep(e6,e7,x);
  float a7 = smoothstep(e7,e8,x);
  return max(mix(v0,v1,a0)*step(e0,x)*step(x,e1),
    max(mix(v1,v2,a1)*step(e1,x)*step(x,e2),
    max(mix(v2,v3,a2)*step(e2,x)*step(x,e3),
    max(mix(v3,v4,a3)*step(e3,x)*step(x,e4),
    max(mix(v4,v5,a4)*step(e4,x)*step(x,e5),
    max(mix(v5,v6,a5)*step(e5,x)*step(x,e6),
    max(mix(v6,v7,a6)*step(e6,x)*step(x,e7),mix(v7,v8,a7)*step(e7,x)*step(x,e8)
  )))))));
}
`;
const yiorrd = `\
vec4 apply_cmap (float x) {
  const float e0 = 0.0;
  const vec4 v0 = vec4(0.5019607843137255,0,0.14901960784313725,1);
  const float e1 = 0.125;
  const vec4 v1 = vec4(0.7411764705882353,0,0.14901960784313725,1);
  const float e2 = 0.25;
  const vec4 v2 = vec4(0.8901960784313725,0.10196078431372549,0.10980392156862745,1);
  const float e3 = 0.375;
  const vec4 v3 = vec4(0.9882352941176471,0.3058823529411765,0.16470588235294117,1);
  const float e4 = 0.5;
  const vec4 v4 = vec4(0.9921568627450981,0.5529411764705883,0.23529411764705882,1);
  const float e5 = 0.625;
  const vec4 v5 = vec4(0.996078431372549,0.6980392156862745,0.2980392156862745,1);
  const float e6 = 0.75;
  const vec4 v6 = vec4(0.996078431372549,0.8509803921568627,0.4627450980392157,1);
  const float e7 = 0.875;
  const vec4 v7 = vec4(1,0.9294117647058824,0.6274509803921569,1);
  const float e8 = 1.0;
  const vec4 v8 = vec4(1,1,0.8,1);
  float a0 = smoothstep(e0,e1,x);
  float a1 = smoothstep(e1,e2,x);
  float a2 = smoothstep(e2,e3,x);
  float a3 = smoothstep(e3,e4,x);
  float a4 = smoothstep(e4,e5,x);
  float a5 = smoothstep(e5,e6,x);
  float a6 = smoothstep(e6,e7,x);
  float a7 = smoothstep(e7,e8,x);
  return max(mix(v0,v1,a0)*step(e0,x)*step(x,e1),
    max(mix(v1,v2,a1)*step(e1,x)*step(x,e2),
    max(mix(v2,v3,a2)*step(e2,x)*step(x,e3),
    max(mix(v3,v4,a3)*step(e3,x)*step(x,e4),
    max(mix(v4,v5,a4)*step(e4,x)*step(x,e5),
    max(mix(v5,v6,a5)*step(e5,x)*step(x,e6),
    max(mix(v6,v7,a6)*step(e6,x)*step(x,e7),mix(v7,v8,a7)*step(e7,x)*step(x,e8)
  )))))));
}
`;

var cmaps = /*#__PURE__*/Object.freeze({
  __proto__: null,
  alpha: alpha,
  autumn: autumn,
  bathymetry: bathymetry,
  blackbody: blackbody,
  bluered: bluered,
  bone: bone,
  cdom: cdom,
  chlorophyll: chlorophyll,
  cool: cool,
  copper: copper,
  cubehelix: cubehelix,
  density: density,
  earth: earth,
  electric: electric,
  freesurface_blue: freesurface_blue,
  freesurface_red: freesurface_red,
  greens: greens,
  greys: greys,
  hot: hot,
  hsv: hsv,
  inferno: inferno,
  jet: jet,
  magma: magma,
  oxygen: oxygen,
  par: par,
  phase: phase,
  picnic: picnic,
  plasma: plasma,
  portland: portland,
  rainbow: rainbow,
  rainbow_soft: rainbow_soft,
  rdbu: rdbu,
  salinity: salinity,
  spring: spring,
  summer: summer,
  temperature: temperature,
  turbidity: turbidity,
  velocity_blue: velocity_blue,
  velocity_green: velocity_green,
  viridis: viridis,
  warm: warm,
  winter: winter,
  yignbu: yignbu,
  yiorrd: yiorrd
});

function _optionalChain$l(ops) { let lastAccessLHS = undefined; let value = ops[0]; let i = 1; while (i < ops.length) { const op = ops[i]; const fn = ops[i + 1]; i += 2; if ((op === 'optionalAccess' || op === 'optionalCall') && value == null) { return undefined; } if (op === 'access' || op === 'optionalAccess') { lastAccessLHS = value; value = fn(value); } else if (op === 'call' || op === 'optionalCall') { value = fn((...args) => value.call(lastAccessLHS, ...args)); lastAccessLHS = undefined; } } return value; }
/**
 * A utility to create a Deck.gl shader module for a `glsl-colormap`.
 *
 * The colormap implemenation must be named `apply_cmap` and take the form,
 *
 * ```glsl
 * vec4 apply_cmap (float x) {
 *   // implementation
 * }
 * ```
 *
 * @param {string} name colormap function name
 * @param {string} apply_cmap glsl colormap function implementation
 *
 */
function colormapModuleFactory(name, apply_cmap) {
  return {
    name: `additive-colormap-${name}`,
    fs: `\
uniform float opacity;
uniform bool useTransparentColor;

${apply_transparent_color}
${apply_cmap}

vec4 colormap(float intensity) {
  return vec4(apply_transparent_color(apply_cmap(min(1.,intensity)).xyz, apply_cmap(0.).xyz, useTransparentColor, opacity));
}`,
    inject: {
      'fs:DECKGL_MUTATE_COLOR': `\
  float intensityCombo = 0.;
  intensityCombo += max(0.,intensity0);
  intensityCombo += max(0.,intensity1);
  intensityCombo += max(0.,intensity2);
  intensityCombo += max(0.,intensity3);
  intensityCombo += max(0.,intensity4);
  intensityCombo += max(0.,intensity5);
  rgba = colormap(intensityCombo);`
    }
  };
}

const defaultProps$d = {
  colormap: { type: 'string', value: 'viridis', compare: true },
  opacity: { type: 'number', value: 1.0, compare: true },
  useTransparentColor: { type: 'boolean', value: false, compare: true }
};

/**
 * This deck.gl extension allows for an additive colormap like viridis or jet to be used for pseudo-coloring channels.
 * @typedef LayerProps
 * @type {object}
 * @property {number=} opacity Opacity of the layer.
 * @property {string=} colormap String indicating a colormap (default: 'viridis').  The full list of options is here: https://github.com/glslify/glsl-colormap#glsl-colormap
 * @property {boolean=} useTransparentColor Indicates whether the shader should make the output of colormap_function(0) color transparent
 * */
const AdditiveColormapExtension = class extends LayerExtension {
  getShaders() {
    const name = _optionalChain$l([this, 'optionalAccess', _ => _.props, 'optionalAccess', _2 => _2.colormap]) || defaultProps$d.colormap.value;
    const apply_cmap = cmaps[name];
    if (!apply_cmap) {
      throw Error(`No colormap named ${name} found in registry`);
    }
    return { modules: [colormapModuleFactory(name, apply_cmap)] };
  }

  updateState({ props, oldProps, changeFlags, ...rest }) {
    super.updateState({ props, oldProps, changeFlags, ...rest });
    if (props.colormap !== oldProps.colormap) {
      const { device } = this.context;
      if (this.state.model) {
        this.state.model.destroy();
        this.setState({ model: this._getModel(device) });
      }
    }
  }

  draw() {
    const {
      useTransparentColor = defaultProps$d.useTransparentColor.value,
      opacity = defaultProps$d.opacity.value
    } = this.props;
    const uniforms = {
      opacity,
      useTransparentColor
    };
    _optionalChain$l([this, 'access', _3 => _3.state, 'access', _4 => _4.model, 'optionalAccess', _5 => _5.setUniforms, 'call', _6 => _6(uniforms)]);
  }
};

AdditiveColormapExtension.extensionName = 'AdditiveColormapExtension';
AdditiveColormapExtension.defaultProps = defaultProps$d;

const MAX_COLOR_INTENSITY = 255;

const DEFAULT_COLOR_OFF = [0, 0, 0];

const MAX_CHANNELS = 6;

const DEFAULT_FONT_FAMILY =
  "-apple-system, 'Helvetica Neue', Arial, sans-serif";

/**
 * @deprecated We plan to remove `DTYPE_VALUES` as a part of Viv's public API as it
 * leaks internal implementation details. If this is something your project relies
 * on, please open an issue for further discussion.
 *
 * More info can be found here: https://github.com/hms-dbmi/viv/pull/372#discussion_r571707517
 */
const DTYPE_VALUES = {
  Uint8: {
    format: 'r8uint',
    dataFormat: GL.RED_INTEGER,
    type: GL.UNSIGNED_BYTE,
    max: 2 ** 8 - 1,
    sampler: 'usampler2D'
  },
  Uint16: {
    format: 'r16uint',
    dataFormat: GL.RED_INTEGER,
    type: GL.UNSIGNED_SHORT,
    max: 2 ** 16 - 1,
    sampler: 'usampler2D'
  },
  Uint32: {
    format: 'r32uint',
    dataFormat: GL.RED_INTEGER,
    type: GL.UNSIGNED_INT,
    max: 2 ** 32 - 1,
    sampler: 'usampler2D'
  },
  Float32: {
    format: 'r32float',
    dataFormat: GL.RED,
    type: GL.FLOAT,
    // Not sure what to do about this one - a good use case for channel stats, I suppose:
    // https://en.wikipedia.org/wiki/Single-precision_floating-point_format.
    max: 3.4 * 10 ** 38,
    sampler: 'sampler2D'
  },
  Int8: {
    format: 'r8sint',
    dataFormat: GL.RED_INTEGER,
    type: GL.BYTE,
    max: 2 ** (8 - 1) - 1,
    sampler: 'isampler2D'
  },
  Int16: {
    format: 'r16sint',
    dataFormat: GL.RED_INTEGER,
    type: GL.SHORT,
    max: 2 ** (16 - 1) - 1,
    sampler: 'isampler2D'
  },
  Int32: {
    format: 'r32sint',
    dataFormat: GL.RED_INTEGER,
    type: GL.INT,
    max: 2 ** (32 - 1) - 1,
    sampler: 'isampler2D'
  },
  // Cast Float64 as 32 bit float point so it can be rendered.
  Float64: {
    format: 'r32float',
    dataFormat: GL.RED,
    type: GL.FLOAT,
    // Not sure what to do about this one - a good use case for channel stats, I suppose:
    // https://en.wikipedia.org/wiki/Single-precision_floating-point_format.
    max: 3.4 * 10 ** 38,
    sampler: 'sampler2D',
    cast: (data) => new Float32Array(data)
  }
} ;

const COLORMAPS = [
  'jet',
  'hsv',
  'hot',
  'cool',
  'spring',
  'summer',
  'autumn',
  'winter',
  'bone',
  'copper',
  'greys',
  'yignbu',
  'greens',
  'yiorrd',
  'bluered',
  'rdbu',
  'picnic',
  'rainbow',
  'portland',
  'blackbody',
  'earth',
  'electric',
  'alpha',
  'viridis',
  'inferno',
  'magma',
  'plasma',
  'warm',
  'rainbow-soft',
  'bathymetry',
  'cdom',
  'chlorophyll',
  'density',
  'freesurface-blue',
  'freesurface-red',
  'oxygen',
  'par',
  'phase',
  'salinity',
  'temperature',
  'turbidity',
  'velocity-blue',
  'velocity-green',
  'cubehelix'
] ;

var RENDERING_MODES; (function (RENDERING_MODES) {
  const MAX_INTENSITY_PROJECTION = 'Maximum Intensity Projection'; RENDERING_MODES["MAX_INTENSITY_PROJECTION"] = MAX_INTENSITY_PROJECTION;
  const MIN_INTENSITY_PROJECTION = 'Minimum Intensity Projection'; RENDERING_MODES["MIN_INTENSITY_PROJECTION"] = MIN_INTENSITY_PROJECTION;
  const ADDITIVE = 'Additive'; RENDERING_MODES["ADDITIVE"] = ADDITIVE;
})(RENDERING_MODES || (RENDERING_MODES = {}));

/** @typedef {import('@vivjs/types').Color} Color */

/**
 * @template T
 * @param {T[]} arr
 * @param {T} defaultValue
 * @param {number} padWidth
 *
 * @TODO copied from `@vivjs/layers` to avoid circular deps
 */
function padWithDefault$1(arr, defaultValue, padWidth) {
  for (let i = 0; i < padWidth; i += 1) {
    arr.push(defaultValue);
  }
  return arr;
}

/** @type {Color[]} */
// biome-ignore format: Nicely formatted color palette
const COLOR_PALETTE = [
  [  0,   0, 255], // blue
  [  0, 255,   0], // green
  [255,   0, 255], // magenta
  [255, 255,   0], // yellow
  [255, 128,   0], // orange
  [  0, 255, 255], // cyan
  [255, 255, 255], // white
  [255,   0,   0], // red
];

/** @param {number} n */
function getDefaultPalette(n) {
  if (n > COLOR_PALETTE.length) {
    throw new Error('Too many colors');
  }
  return COLOR_PALETTE.slice(0, n);
}

/** @param {{ colors: Color[], channelsVisible: boolean[] }} */
function padColors({ colors, channelsVisible }) {
  /** @type {Color[]} */
  const newColors = colors.map((color, i) =>
    channelsVisible[i]
      ? color.map(c => c / MAX_COLOR_INTENSITY)
      : DEFAULT_COLOR_OFF
  );
  const padSize = MAX_CHANNELS - newColors.length;
  const paddedColors = padWithDefault$1(
    newColors,
    /** @type {Color} */ (DEFAULT_COLOR_OFF),
    padSize
  ).reduce((acc, val) => acc.concat(val), []);
  return paddedColors;
}

const fs$4 = `\
uniform vec3 transparentColor;
uniform bool useTransparentColor;
uniform float opacity;

uniform vec3 colors[6];

${apply_transparent_color}

void mutate_color(inout vec3 rgb, float intensity0, float intensity1, float intensity2, float intensity3, float intensity4, float intensity5) { 
  rgb += max(0.0, min(1.0, intensity0)) * vec3(colors[0]);
  rgb += max(0.0, min(1.0, intensity1)) * vec3(colors[1]);
  rgb += max(0.0, min(1.0, intensity2)) * vec3(colors[2]);
  rgb += max(0.0, min(1.0, intensity3)) * vec3(colors[3]);
  rgb += max(0.0, min(1.0, intensity4)) * vec3(colors[4]);
  rgb += max(0.0, min(1.0, intensity5)) * vec3(colors[5]);
}

vec4 apply_opacity(vec3 rgb) {
  return vec4(apply_transparent_color(rgb, transparentColor, useTransparentColor, opacity));
}
`;

const DECKGL_MUTATE_COLOR = `\
vec3 rgb = rgba.rgb;
mutate_color(rgb, intensity0, intensity1, intensity2, intensity3, intensity4, intensity5);
rgba = apply_opacity(rgb);
`;

var colorPalette = {
  name: 'color-palette-module',
  fs: fs$4,
  inject: {
    'fs:DECKGL_MUTATE_COLOR': DECKGL_MUTATE_COLOR
  }
};

function _optionalChain$k(ops) { let lastAccessLHS = undefined; let value = ops[0]; let i = 1; while (i < ops.length) { const op = ops[i]; const fn = ops[i + 1]; i += 2; if ((op === 'optionalAccess' || op === 'optionalCall') && value == null) { return undefined; } if (op === 'access' || op === 'optionalAccess') { lastAccessLHS = value; value = fn(value); } else if (op === 'call' || op === 'optionalCall') { value = fn((...args) => value.call(lastAccessLHS, ...args)); lastAccessLHS = undefined; } } return value; }
const defaultProps$c = {
  colors: { type: 'array', value: null, compare: true },
  opacity: { type: 'number', value: 1.0, compare: true },
  transparentColor: { type: 'array', value: null, compare: true },
  useTransparentColor: { type: 'boolean', value: false, compare: true }
};
/**
 * This deck.gl extension allows for a color palette to be used for pseudo-coloring channels.
 * @typedef LayerProps
 * @type {object}
 * @property {Array<Array<number>>=} colors Array of colors to map channels to (RGB).
 * @property {number=} opacity Opacity of the layer.
 * @property {Array.<number>=} transparentColor An RGB (0-255 range) color to be considered "transparent" if provided.
 * In other words, any fragment shader output equal transparentColor (before applying opacity) will have opacity 0.
 * @property {Boolean=} useTransparentColor Whether or not to use the value provided to transparentColor.
 */
const ColorPaletteExtension = class extends LayerExtension {
  getShaders() {
    return {
      ...super.getShaders(),
      modules: [colorPalette]
    };
  }

  draw() {
    const {
      colors,
      channelsVisible,
      opacity = defaultProps$c.opacity.value,
      transparentColor = defaultProps$c.transparentColor.value,
      useTransparentColor = defaultProps$c.useTransparentColor.value
    } = this.props;
    const paddedColors = padColors({
      channelsVisible: channelsVisible || this.selections.map(() => true),
      colors: colors || getDefaultPalette(this.props.selections.length)
    });
    const uniforms = {
      colors: paddedColors,
      opacity,
      transparentColor: (transparentColor || [0, 0, 0]).map(i => i / 255),
      useTransparentColor: Boolean(useTransparentColor)
    };
    _optionalChain$k([this, 'access', _ => _.state, 'access', _2 => _2.model, 'optionalAccess', _3 => _3.setUniforms, 'call', _4 => _4(uniforms)]);
  }
};

ColorPaletteExtension.extensionName = 'ColorPaletteExtension';
ColorPaletteExtension.defaultProps = defaultProps$c;

const fs$3 = `\
// lens bounds for ellipse
uniform float majorLensAxis;
uniform float minorLensAxis;
uniform vec2 lensCenter;

// lens uniforms
uniform bool lensEnabled;
uniform int lensSelection;
uniform vec3 lensBorderColor;
uniform float lensBorderRadius;

// color palette
uniform vec3 colors[6];

bool frag_in_lens_bounds(vec2 vTexCoord) {
  // Check membership in what is (not visually, but effectively) an ellipse.
  // Since the fragment space is a unit square and the real coordinates could be longer than tall,
  // to get a circle visually we have to treat the check as that of an ellipse to get the effect of a circle.

  // Check membership in ellipse.
  return pow((lensCenter.x - vTexCoord.x) / majorLensAxis, 2.) + pow((lensCenter.y - vTexCoord.y) / minorLensAxis, 2.) < (1. - lensBorderRadius);
}

bool frag_on_lens_bounds(vec2 vTexCoord) {
  // Same as the above, except this checks the boundary.

  float ellipseDistance = pow((lensCenter.x - vTexCoord.x) / majorLensAxis, 2.) + pow((lensCenter.y - vTexCoord.y) / minorLensAxis, 2.);

  // Check membership on "bourndary" of ellipse.
  return ellipseDistance <= 1. && ellipseDistance >= (1. - lensBorderRadius);
}
// Return a float for boolean arithmetic calculation.
float get_use_color_float(vec2 vTexCoord, int channelIndex) {
  bool isFragInLensBounds = frag_in_lens_bounds(vTexCoord);
  bool inLensAndUseLens = lensEnabled && isFragInLensBounds;
  return float(int((inLensAndUseLens && channelIndex == lensSelection) || (!inLensAndUseLens)));
 
}
void mutate_color(inout vec3 rgb, float intensity0, float intensity1, float intensity2, float intensity3, float intensity4, float intensity5, vec2 vTexCoord){
  float useColorValue = 0.;

  useColorValue = get_use_color_float(vTexCoord, 0);
  rgb += max(0., min(1., intensity0)) * max(vec3(colors[0]), (1. - useColorValue) * vec3(1., 1., 1.));

  useColorValue = get_use_color_float(vTexCoord, 1);
  rgb += max(0., min(1., intensity1)) * max(vec3(colors[1]), (1. - useColorValue) * vec3(1., 1., 1.));

  useColorValue = get_use_color_float(vTexCoord, 2);
  rgb += max(0., min(1., intensity2)) * max(vec3(colors[2]), (1. - useColorValue) * vec3(1., 1., 1.));

  useColorValue = get_use_color_float(vTexCoord, 3);
  rgb += max(0., min(1., intensity3)) * max(vec3(colors[3]), (1. - useColorValue) * vec3(1., 1., 1.));

  useColorValue = get_use_color_float(vTexCoord, 4);
  rgb += max(0., min(1., intensity4)) * max(vec3(colors[4]), (1. - useColorValue) * vec3(1., 1., 1.));

  useColorValue = get_use_color_float(vTexCoord, 5);
  rgb += max(0., min(1., intensity5)) * max(vec3(colors[5]), (1. - useColorValue) * vec3(1., 1., 1.));
}
`;

var lens = {
  name: 'lens-module',
  fs: fs$3,
  inject: {
    'fs:DECKGL_MUTATE_COLOR': `
   vec3 rgb = rgba.rgb;
   mutate_color(rgb, intensity0, intensity1, intensity2, intensity3, intensity4, intensity5, vTexCoord);
   rgba = vec4(rgb, 1.);
  `,
    'fs:#main-end': `
      bool isFragOnLensBounds = frag_on_lens_bounds(vTexCoord);
      fragColor = (lensEnabled && isFragOnLensBounds) ? vec4(lensBorderColor, 1.) : fragColor;
  `
  }
};

function _optionalChain$j(ops) { let lastAccessLHS = undefined; let value = ops[0]; let i = 1; while (i < ops.length) { const op = ops[i]; const fn = ops[i + 1]; i += 2; if ((op === 'optionalAccess' || op === 'optionalCall') && value == null) { return undefined; } if (op === 'access' || op === 'optionalAccess') { lastAccessLHS = value; value = fn(value); } else if (op === 'call' || op === 'optionalCall') { value = fn((...args) => value.call(lastAccessLHS, ...args)); lastAccessLHS = undefined; } } return value; }
const defaultProps$b = {
  lensEnabled: { type: 'boolean', value: false, compare: true },
  lensSelection: { type: 'number', value: 0, compare: true },
  lensRadius: { type: 'number', value: 100, compare: true },
  lensBorderColor: { type: 'array', value: [255, 255, 255], compare: true },
  lensBorderRadius: { type: 'number', value: 0.02, compare: true },
  colors: { type: 'array', value: null, compare: true }
};

/**
 * This deck.gl extension allows for a lens that selectively shows one channel in its chosen color and then the others in white.
 * @typedef LayerProps
 * @type {Object}
 * @property {boolean=} lensEnabled Whether or not to use the lens.
 * @property {number=} lensSelection Numeric index of the channel to be focused on by the lens.
 * @property {number=} lensRadius Pixel radius of the lens (default: 100).
 * @property {Array.<number>=} lensBorderColor RGB color of the border of the lens (default [255, 255, 255]).
 * @property {number=} lensBorderRadius Percentage of the radius of the lens for a border (default 0.02).
 * @property {Array<Array.<number>>=} colors Color palette to pseudo-color channels as.
 * */
const LensExtension = class extends LayerExtension {
  getShaders() {
    return {
      ...super.getShaders(),
      modules: [lens]
    };
  }

  initializeState() {
    const layer = this.getCurrentLayer();
    // No need to run this on layers that don't have a `draw` call.
    if (layer.isComposite) {
      return;
    }
    const onMouseMove = () => {
      const { viewportId } = layer.props;
      const { lensRadius = defaultProps$b.lensRadius.value } = this.props;
      // If there is no viewportId, don't try to do anything.
      if (!viewportId) {
        layer.setState({ unprojectLensBounds: [0, 0, 0, 0] });
        return;
      }
      const { mousePosition } = layer.context;
      const layerView = layer.context.deck.viewManager.views.filter(
        view => view.id === viewportId
      )[0];
      const viewState = layer.context.deck.viewManager.viewState[viewportId];
      const viewport = layerView.makeViewport({
        ...viewState,
        viewState
      });
      // If the mouse is in the viewport and the mousePosition exists, set
      // the state with the bounding box of the circle that will render as a lens.
      if (mousePosition && viewport.containsPixel(mousePosition)) {
        const offsetMousePosition = {
          x: mousePosition.x - viewport.x,
          y: mousePosition.y - viewport.y
        };
        const mousePositionBounds = [
          // left
          [offsetMousePosition.x - lensRadius, offsetMousePosition.y],
          // bottom
          [offsetMousePosition.x, offsetMousePosition.y + lensRadius],
          // right
          [offsetMousePosition.x + lensRadius, offsetMousePosition.y],
          // top
          [offsetMousePosition.x, offsetMousePosition.y - lensRadius]
        ];
        // Unproject from screen to world coordinates.
        const unprojectLensBounds = mousePositionBounds.map(
          (bounds, i) => viewport.unproject(bounds)[i % 2]
        );
        layer.setState({ unprojectLensBounds });
      } else {
        layer.setState({ unprojectLensBounds: [0, 0, 0, 0] });
      }
    };
    if (this.context.deck) {
      this.context.deck.eventManager.on({
        pointermove: onMouseMove,
        pointerleave: onMouseMove,
        wheel: onMouseMove
      });
    }
    this.setState({ onMouseMove, unprojectLensBounds: [0, 0, 0, 0] });
  }

  draw() {
    const { unprojectLensBounds = [0, 0, 0, 0] } = this.state;
    const {
      bounds,
      lensEnabled = defaultProps$b.lensEnabled.value,
      lensSelection = defaultProps$b.lensSelection.value,
      lensBorderColor = defaultProps$b.lensBorderColor.value,
      lensBorderRadius = defaultProps$b.lensBorderRadius.value,
      colors,
      channelsVisible
    } = this.props;
    // Creating a unit-square scaled intersection box for rendering the lens.
    // It is ok if these coordinates are outside the unit square since
    // we check membership in or out of the lens on the fragment shader.
    const [leftMouseBound, bottomMouseBound, rightMouseBound, topMouseBound] =
      unprojectLensBounds;
    const [left, bottom, right, top] = bounds;
    const leftMouseBoundScaled = (leftMouseBound - left) / (right - left);
    const bottomMouseBoundScaled = (bottomMouseBound - top) / (bottom - top);
    const rightMouseBoundScaled = (rightMouseBound - left) / (right - left);
    const topMouseBoundScaled = (topMouseBound - top) / (bottom - top);
    const paddedColors = padColors({
      channelsVisible: channelsVisible || this.selections.map(() => true),
      colors: colors || getDefaultPalette(this.props.selections.length)
    });
    const uniforms = {
      majorLensAxis: (rightMouseBoundScaled - leftMouseBoundScaled) / 2,
      minorLensAxis: (bottomMouseBoundScaled - topMouseBoundScaled) / 2,
      lensCenter: [
        (rightMouseBoundScaled + leftMouseBoundScaled) / 2,
        (bottomMouseBoundScaled + topMouseBoundScaled) / 2
      ],
      lensEnabled,
      lensSelection,
      lensBorderColor,
      lensBorderRadius,
      colors: paddedColors
    };
    _optionalChain$j([this, 'access', _ => _.state, 'access', _2 => _2.model, 'optionalAccess', _3 => _3.setUniforms, 'call', _4 => _4(uniforms)]);
  }

  finalizeState() {
    // Remove event listeners
    if (this.context.deck) {
      this.context.deck.eventManager.off({
        pointermove: _optionalChain$j([this, 'access', _5 => _5.state, 'optionalAccess', _6 => _6.onMouseMove]),
        pointerleave: _optionalChain$j([this, 'access', _7 => _7.state, 'optionalAccess', _8 => _8.onMouseMove]),
        wheel: _optionalChain$j([this, 'access', _9 => _9.state, 'optionalAccess', _10 => _10.onMouseMove])
      });
    }
  }
};

LensExtension.extensionName = 'LensExtension';
LensExtension.defaultProps = defaultProps$b;

function _optionalChain$i(ops) { let lastAccessLHS = undefined; let value = ops[0]; let i = 1; while (i < ops.length) { const op = ops[i]; const fn = ops[i + 1]; i += 2; if ((op === 'optionalAccess' || op === 'optionalCall') && value == null) { return undefined; } if (op === 'access' || op === 'optionalAccess') { lastAccessLHS = value; value = fn(value); } else if (op === 'call' || op === 'optionalCall') { value = fn((...args) => value.call(lastAccessLHS, ...args)); lastAccessLHS = undefined; } } return value; }
/**
 * A utility to create a Deck.gl shader module for a `glsl-colormap`.
 *
 * The colormap implemenation must be named `apply_cmap` and take the form,
 *
 * ```glsl
 * vec4 apply_cmap (float x) {
 *   // implementation
 * }
 * ```
 *
 * @param {string} name colormap function name
 * @param {string} apply_cmap glsl colormap function implementation
 *
 */
function colormapModuleFactory3D(name, apply_cmap) {
  const fs = `\
${apply_cmap}

vec4 colormap(float intensity, float opacity) {
  return vec4(apply_cmap(min(1.,intensity)).xyz, opacity);
}`;
  return {
    name: `additive-colormap-3d-${name}`,
    fs
  };
}

const defaultProps$a = {
  colormap: { type: 'string', value: 'viridis', compare: true }
};

/**
 * This deck.gl extension allows for an additive colormap like viridis or jet to be used for pseudo-coloring channels in 3D.
 * @typedef LayerProps
 * @type {object}
 * @property {string=} colormap String indicating a colormap (default: 'viridis').  The full list of options is here: https://github.com/glslify/glsl-colormap#glsl-colormap
 * */
const BaseExtension$1 = class BaseExtension extends LayerExtension {
  constructor(...args) {
    super(args);
    // After deck.gl 8.8, it does not seem like this is always initialized.
    this.opts = this.opts || {};
  }

  getShaders() {
    const name = _optionalChain$i([this, 'optionalAccess', _ => _.props, 'optionalAccess', _2 => _2.colormap]) || defaultProps$a.colormap.value;
    const apply_cmap = cmaps[name];
    return {
      ...super.getShaders(),
      modules: [colormapModuleFactory3D(name, apply_cmap)]
    };
  }

  updateState({ props, oldProps, changeFlags, ...rest }) {
    super.updateState({ props, oldProps, changeFlags, ...rest });
    if (props.colormap !== oldProps.colormap) {
      const { device } = this.context;
      if (this.state.model) {
        this.state.model.destroy();
        this.setState({ model: this._getModel(device) });
      }
    }
  }
};

BaseExtension$1.extensionName = 'BaseExtension';
BaseExtension$1.defaultProps = defaultProps$a;

const _BEFORE_RENDER$5 = '';

const _RENDER$5 = `\
  float intensityArray[6] = float[6](intensityValue0, intensityValue1, intensityValue2, intensityValue3, intensityValue4, intensityValue5);
  float total = 0.0;

  for(int i = 0; i < 6; i++) {
    total += intensityArray[i];
  }
  // Do not go past 1 in opacity/colormap value.
  total = min(total, 1.0);

  vec4 val_color = colormap(total, total);

  // Opacity correction
  val_color.a = 1.0 - pow(1.0 - val_color.a, 1.0);
  color.rgb += (1.0 - color.a) * val_color.a * val_color.rgb;
  color.a += (1.0 - color.a) * val_color.a;
  if (color.a >= 0.95) {
    break;
  }
  p += ray_dir * dt;
`;

const _AFTER_RENDER$5 = '';

/**
 * This deck.gl extension allows for an additive colormap like viridis or jet to be used for pseudo-coloring channels with Additive Blending in 3D.
 * */
const AdditiveBlendExtension$1 = class AdditiveBlendExtension extends BaseExtension$1 {
  constructor(args) {
    super(args);
    this.rendering = { _BEFORE_RENDER: _BEFORE_RENDER$5, _RENDER: _RENDER$5, _AFTER_RENDER: _AFTER_RENDER$5 };
  }
};

AdditiveBlendExtension$1.extensionName = 'AdditiveBlendExtension';

const _BEFORE_RENDER$4 = `\
  float maxVals[6] = float[6](-1.0, -1.0, -1.0, -1.0, -1.0, -1.0);
`;

const _RENDER$4 = `\
  float intensityArray[6] = float[6](intensityValue0, intensityValue1, intensityValue2, intensityValue3, intensityValue4, intensityValue5);

  for(int i = 0; i < 6; i++) {
    if(intensityArray[i] > maxVals[i]) {
      maxVals[i] = intensityArray[i];
    }
  }
`;

const _AFTER_RENDER$4 = `\
  float total = 0.0;
  for(int i = 0; i < 6; i++) {
    total += maxVals[i];
  }
  // Do not go past 1 in opacity/colormap value.
  total = min(total, 1.0);
  color = colormap(total, total);
`;

/**
 * This deck.gl extension allows for an additive colormap like viridis or jet to be used for pseudo-coloring channels with Maximum Intensity Projection in 3D.
 */
const MaximumIntensityProjectionExtension$1 = class MaximumIntensityProjectionExtension extends BaseExtension$1 {
  constructor(args) {
    super(args);
    this.rendering = { _BEFORE_RENDER: _BEFORE_RENDER$4, _RENDER: _RENDER$4, _AFTER_RENDER: _AFTER_RENDER$4 };
  }
};

MaximumIntensityProjectionExtension$1.extensionName =
  'MaximumIntensityProjectionExtension';

const _BEFORE_RENDER$3 = `\
  float minVals[6] = float[6](1. / 0., 1. / 0., 1. / 0., 1. / 0., 1. / 0., 1. / 0.);
`;

const _RENDER$3 = `\
  float intensityArray[6] = float[6](intensityValue0, intensityValue1, intensityValue2, intensityValue3, intensityValue4, intensityValue5);

  for(int i = 0; i < 6; i++) {
    if(intensityArray[i] < minVals[i]) {
      minVals[i] = intensityArray[i];
    }
  }
`;

const _AFTER_RENDER$3 = `\
  float total = 0.0;
  for(int i = 0; i < 6; i++) {
    total += minVals[i];
  }
  // Do not go past 1 in opacity/colormap value.
  total = min(total, 1.0);
  color = colormap(total, total);
`;

/**
 * This deck.gl extension allows for an additive colormap like viridis or jet to be used for pseudo-coloring channels with Minimum Intensity Projection in 3D.
 */
const MinimumIntensityProjectionExtension$1 = class MinimumIntensityProjectionExtension extends BaseExtension$1 {
  constructor(args) {
    super(args);
    this.rendering = { _BEFORE_RENDER: _BEFORE_RENDER$3, _RENDER: _RENDER$3, _AFTER_RENDER: _AFTER_RENDER$3 };
  }
};

MinimumIntensityProjectionExtension$1.extensionName =
  'MinimumIntensityProjectionExtension';

/**
 * This object contains the BaseExtension, which can be extended for other additive colormap-style (i.e viridis, jet etc.) rendering, as well
 * implementations of three ray casting algorithms as extensions.
 * @typedef Extension3D
 * @type {object}
 * @property {object} BaseExtension
 * @property {object} AdditiveBlendExtension
 * @property {object} MaximumIntensityProjectionExtension
 * @property {object} MinimumIntensityProjectionExtension
 */
const AdditiveColormap3DExtensions = {
  BaseExtension: BaseExtension$1,
  AdditiveBlendExtension: AdditiveBlendExtension$1,
  MaximumIntensityProjectionExtension: MaximumIntensityProjectionExtension$1,
  MinimumIntensityProjectionExtension: MinimumIntensityProjectionExtension$1
};

function _optionalChain$h(ops) { let lastAccessLHS = undefined; let value = ops[0]; let i = 1; while (i < ops.length) { const op = ops[i]; const fn = ops[i + 1]; i += 2; if ((op === 'optionalAccess' || op === 'optionalCall') && value == null) { return undefined; } if (op === 'access' || op === 'optionalAccess') { lastAccessLHS = value; value = fn(value); } else if (op === 'call' || op === 'optionalCall') { value = fn((...args) => value.call(lastAccessLHS, ...args)); lastAccessLHS = undefined; } } return value; }
const defaultProps$9 = {
  colors: { type: 'array', value: null, compare: true }
};

/**
 * This deck.gl extension allows for a color palette to be used for rendering in 3D.
 * @typedef LayerProps
 * @type {object}
 * @property {Array<Array<number>>=} colors Array of colors to map channels to (RGB).
 * */
const BaseExtension = class extends LayerExtension {
  constructor(...args) {
    super(args);
    // After deck.gl 8.8, it does not seem like this is always initialized.
    this.opts = this.opts || {};
  }

  draw() {
    const { colors, channelsVisible } = this.props;
    const paddedColors = padColors({
      channelsVisible: channelsVisible || this.selections.map(() => true),
      colors: colors || getDefaultPalette(this.props.selections.length)
    });
    const uniforms = {
      colors: paddedColors
    };
    _optionalChain$h([this, 'access', _ => _.state, 'access', _2 => _2.model, 'optionalAccess', _3 => _3.setUniforms, 'call', _4 => _4(uniforms)]);
  }
};

BaseExtension.extensionName = 'BaseExtension';
BaseExtension.defaultProps = defaultProps$9;

const _BEFORE_RENDER$2 = '';

const _RENDER$2 = `\
  vec3 rgbCombo = vec3(0.0);
  vec3 hsvCombo = vec3(0.0);
  float intensityArray[6] = float[6](intensityValue0, intensityValue1, intensityValue2, intensityValue3, intensityValue4, intensityValue5);
  float total = 0.0;
  for(int i = 0; i < 6; i++) {
    float intensityValue = intensityArray[i];
    rgbCombo += max(0.0, min(1.0, intensityValue)) * colors[i];
    total += intensityValue;
  }
  // Do not go past 1 in opacity.
  total = min(total, 1.0);
  vec4 val_color = vec4(rgbCombo, total);
  // Opacity correction
  val_color.a = 1.0 - pow(1.0 - val_color.a, 1.0);
  color.rgb += (1.0 - color.a) * val_color.a * val_color.rgb;
  color.a += (1.0 - color.a) * val_color.a;
  if (color.a >= 0.95) {
    break;
  }
`;

const _AFTER_RENDER$2 = '';

/**
 * This deck.gl extension allows for a color palette to be used for rendering in 3D with additive blending.
 * */
const AdditiveBlendExtension = class extends BaseExtension {
  constructor(args) {
    super(args);
    this.rendering = { _BEFORE_RENDER: _BEFORE_RENDER$2, _RENDER: _RENDER$2, _AFTER_RENDER: _AFTER_RENDER$2 };
  }
};

AdditiveBlendExtension.extensionName = 'AdditiveBlendExtension';

const _BEFORE_RENDER$1 = `\
  float maxVals[6] = float[6](-1.0, -1.0, -1.0, -1.0, -1.0, -1.0);
`;

const _RENDER$1 = `\
  float intensityArray[6] = float[6](intensityValue0, intensityValue1, intensityValue2, intensityValue3, intensityValue4, intensityValue5);

  for(int i = 0; i < 6; i++) {
    if(intensityArray[i] > maxVals[i]) {
      maxVals[i] = intensityArray[i];
    }
  }
`;

const _AFTER_RENDER$1 = `\
  vec3 rgbCombo = vec3(0.0);
  for(int i = 0; i < 6; i++) {
    rgbCombo += max(0.0, min(1.0, maxVals[i])) * vec3(colors[i]);
  }
  color = vec4(rgbCombo, 1.0);
`;

/**
 * This deck.gl extension allows for a color palette to be used for rendering in 3D with Maximum Intensity Projection.
 * */
const MaximumIntensityProjectionExtension = class extends BaseExtension {
  constructor(args) {
    super(args);
    this.rendering = { _BEFORE_RENDER: _BEFORE_RENDER$1, _RENDER: _RENDER$1, _AFTER_RENDER: _AFTER_RENDER$1 };
  }
};

MaximumIntensityProjectionExtension.extensionName =
  'MaximumIntensityProjectionExtension';

const _BEFORE_RENDER = `\
  float minVals[6] = float[6](1. / 0., 1. / 0., 1. / 0., 1. / 0., 1. / 0., 1. / 0.);
`;

const _RENDER = `\
  float intensityArray[6] = float[6](intensityValue0, intensityValue1, intensityValue2, intensityValue3, intensityValue4, intensityValue5);

  for(int i = 0; i < 6; i++) {
    if(intensityArray[i] < minVals[i]) {
      minVals[i] = intensityArray[i];
    }
  }
`;

const _AFTER_RENDER = `\
  vec3 rgbCombo = vec3(0.0);
  for(int i = 0; i < 6; i++) {
    rgbCombo += max(0.0, min(1.0, minVals[i])) * vec3(colors[i]);
  }
  color = vec4(rgbCombo, 1.0);
`;

/**
 * This deck.gl extension allows for a color palette to be used for rendering in 3D with Minimum Intensity Projection.
 * */
const MinimumIntensityProjectionExtension = class extends BaseExtension {
  constructor(args) {
    super(args);
    this.rendering = { _BEFORE_RENDER, _RENDER, _AFTER_RENDER };
  }
};

MinimumIntensityProjectionExtension.extensionName =
  'MinimumIntensityProjectionExtension';

/**
 * This object contains the BaseExtension, which can be extended for other color palette-style rendering, as well
 * implementations of three ray casting algorithms as extensions.
 * @typedef Extension3D
 * @type {object}
 * @property {object} BaseExtension
 * @property {object} AdditiveBlendExtension
 * @property {object} MaximumIntensityProjectionExtension
 * @property {object} MinimumIntensityProjectionExtension
 */
const ColorPalette3DExtensions = {
  BaseExtension,
  AdditiveBlendExtension,
  MaximumIntensityProjectionExtension,
  MinimumIntensityProjectionExtension
};

class LZWDecoder extends BaseDecoder {
  

  constructor(fileDirectory) {
    super();
    const width = fileDirectory.TileWidth || fileDirectory.ImageWidth;
    const height = fileDirectory.TileLength || fileDirectory.ImageLength;
    const nbytes = fileDirectory.BitsPerSample[0] / 8;
    this.maxUncompressedSize = width * height * nbytes;
  }

  async decodeBlock(buffer) {
    const bytes = new Uint8Array(buffer);
    const decoded = await decompress(bytes, this.maxUncompressedSize);
    return decoded.buffer;
  }
}

function _nullishCoalesce$8(lhs, rhsFn) { if (lhs != null) { return lhs; } else { return rhsFn(); } } function _optionalChain$g(ops) { let lastAccessLHS = undefined; let value = ops[0]; let i = 1; while (i < ops.length) { const op = ops[i]; const fn = ops[i + 1]; i += 2; if ((op === 'optionalAccess' || op === 'optionalCall') && value == null) { return undefined; } if (op === 'access' || op === 'optionalAccess') { lastAccessLHS = value; value = fn(value); } else if (op === 'call' || op === 'optionalCall') { value = fn((...args) => value.call(lastAccessLHS, ...args)); lastAccessLHS = undefined; } } return value; }



const DTYPE_LOOKUP$1 = {
  uint8: 'Uint8',
  uint16: 'Uint16',
  uint32: 'Uint32',
  float: 'Float32',
  double: 'Float64',
  int8: 'Int8',
  int16: 'Int16',
  int32: 'Int32'
} ;

/**
 * Computes statics from pixel data.
 *
 * This is helpful for generating histograms
 * or scaling contrastLimits to reasonable range. Also provided are
 * "contrastLimits" which are slider bounds that should give a
 * good initial image.
 * @param {TypedArray} arr
 * @return {{ mean: number, sd: number, q1: number, q3: number, median: number, domain: number[], contrastLimits: number[] }}
 */
function getChannelStats(arr) {
  let len = arr.length;
  let min = Number.POSITIVE_INFINITY;
  let max = Number.NEGATIVE_INFINITY;
  let total = 0;
  // Range (min/max).
  while (len--) {
    if (arr[len] < min) {
      min = arr[len];
    }
    if (arr[len] > max) {
      max = arr[len];
    }
    total += arr[len];
  }

  // Mean.
  const mean = total / arr.length;

  // Standard Deviation.
  len = arr.length;
  let sumSquared = 0;
  while (len--) {
    sumSquared += (arr[len] - mean) ** 2;
  }
  const sd = (sumSquared / arr.length) ** 0.5;

  // Median, and quartiles via quickselect: https://en.wikipedia.org/wiki/Quickselect.
  // Odd number lengths should round down the index.
  const mid = Math.floor(arr.length / 2);
  const firstQuartileLocation = Math.floor(arr.length / 4);
  const thirdQuartileLocation = 3 * Math.floor(arr.length / 4);

  quickselect(arr, mid);
  const median = arr[mid];
  quickselect(arr, firstQuartileLocation, 0, mid);
  const q1 = arr[firstQuartileLocation];
  quickselect(arr, thirdQuartileLocation, mid, arr.length - 1);
  const q3 = arr[thirdQuartileLocation];

  // Used for "auto" settings.  This is the best parameter I've found experimentally.
  // I don't think there is a right answer and this feature is common in Fiji.
  // Also it's best to use a non-zero array for this.
  const cutoffArr = arr.filter((i) => i > 0);
  const cutoffPercentile = 0.0005;
  const topCutoffLocation = Math.floor(
    cutoffArr.length * (1 - cutoffPercentile)
  );
  const bottomCutoffLocation = Math.floor(cutoffArr.length * cutoffPercentile);
  quickselect(cutoffArr, topCutoffLocation);
  quickselect(cutoffArr, bottomCutoffLocation, 0, topCutoffLocation);
  const contrastLimits = [
    cutoffArr[bottomCutoffLocation] || 0,
    cutoffArr[topCutoffLocation] || 0
  ];
  return {
    mean,
    sd,
    q1,
    q3,
    median,
    domain: [min, max],
    contrastLimits
  };
}

/*
 * Converts 32-bit integer color representation to RGBA tuple.
 * Used to serialize colors from OME-XML metadata.
 *
 * > console.log(intToRgba(100100));
 * > // [0, 1, 135, 4]
 */
function intToRgba(int) {
  if (!Number.isInteger(int)) {
    throw Error('Not an integer.');
  }

  // Write number to int32 representation (4 bytes).
  const buffer = new ArrayBuffer(4);
  const view = new DataView(buffer);
  view.setInt32(0, int, false); // offset === 0, littleEndian === false

  // Take u8 view and extract number for each byte (1 byte for R/G/B/A).
  const bytes = new Uint8Array(buffer);
  return Array.from(bytes) ;
}

/*
 * Helper method to determine whether pixel data is interleaved or not.
 * > isInterleaved([1, 24, 24]) === false;
 * > isInterleaved([1, 24, 24, 3]) === true;
 */
function isInterleaved(shape) {
  const lastDimSize = shape[shape.length - 1];
  return lastDimSize === 3 || lastDimSize === 4;
}

/*
 * Creates typed labels from DimensionOrder.
 * > imgMeta.Pixels.DimensionOrder === 'XYCZT'
 * > getLabels(imgMeta.Pixels) === ['t', 'z', 'c', 'y', 'x']
 */




function getLabels(dimOrder) {
  return dimOrder.toLowerCase().split('').reverse() 

;
}

function getImageSize(source) {
  const interleaved = isInterleaved(source.shape);
  const [height, width] = source.shape.slice(interleaved ? -3 : -2);
  return { height, width };
}

function prevPowerOf2(x) {
  return 2 ** Math.floor(Math.log2(x));
}

const SIGNAL_ABORTED = '__vivSignalAborted';

function isElement(node) {
  return node.nodeType === 1;
}

function isText(node) {
  return node.nodeType === 3;
}



function xmlToJson(
  xmlNode,
  options
) {
  if (isText(xmlNode)) {
    // If the node is a text node
    return _nullishCoalesce$8(_optionalChain$g([xmlNode, 'access', _ => _.nodeValue, 'optionalAccess', _2 => _2.trim, 'call', _3 => _3()]), () => ( ''));
  }

  // If the node has no attributes and no children, return an empty string
  if (
    xmlNode.childNodes.length === 0 &&
    (!xmlNode.attributes || xmlNode.attributes.length === 0)
  ) {
    return '';
  }

  const xmlObj = {};

  if (xmlNode.attributes && xmlNode.attributes.length > 0) {
    const attrsObj = {};
    for (let i = 0; i < xmlNode.attributes.length; i++) {
      const attr = xmlNode.attributes[i];
      attrsObj[attr.name] = attr.value;
    }
    xmlObj[options.attrtibutesKey] = attrsObj;
  }

  for (let i = 0; i < xmlNode.childNodes.length; i++) {
    const childNode = xmlNode.childNodes[i];
    if (!isElement(childNode)) {
      continue;
    }
    const childXmlObj = xmlToJson(childNode, options);
    if (childXmlObj !== undefined && childXmlObj !== '') {
      if (childNode.nodeName === '#text' && xmlNode.childNodes.length === 1) {
        return childXmlObj;
      }
      if (xmlObj[childNode.nodeName]) {
        if (!Array.isArray(xmlObj[childNode.nodeName])) {
          xmlObj[childNode.nodeName] = [xmlObj[childNode.nodeName]];
        }
        (xmlObj[childNode.nodeName] ).push(childXmlObj);
      } else {
        xmlObj[childNode.nodeName] = childXmlObj;
      }
    }
  }

  return xmlObj;
}

function parseXML(xmlString) {
  const parser = new DOMParser();
  // Remove trailing null character, which can break XML parsing in Firefox
  const doc = parser.parseFromString(
    // biome-ignore lint/suspicious/noControlCharactersInRegex: Necessary for parsing XML
    xmlString.replace(/\u0000$/, ''),
    'application/xml'
  );
  return xmlToJson(doc.documentElement, { attrtibutesKey: 'attr' });
}

/** Asserts the condition. */
function assert(
  condition,
  message
) {
  if (!condition) {
    throw new Error(`Assert failed${message ? `: ${message}` : ''}`);
  }
}

const VIV_PROXY_KEY = '__viv';
const OFFSETS_PROXY_KEY = `${VIV_PROXY_KEY}-offsets` ;

/*
 * Creates an ES6 Proxy that wraps a GeoTIFF object. The proxy
 * handler intercepts calls to `tiff.getImage` and uses our custom
 * pre-computed offsets to pre-fetch the correct file directory.
 *
 * This is a bit of a hack. Internally GeoTIFF inspects `this.ifdRequests`
 * to see which fileDirectories need to be traversed. By adding the
 * ifdRequest for an 'index' manually, GeoTIFF will await that request
 * rather than traversing the file system remotely.
 */
function createOffsetsProxy(tiff, offsets) {
  const get = (target, key) => {
    // Intercept `tiff.getImage`
    if (key === 'getImage') {
      return (index) => {
        // Manually add ifdRequest to tiff if missing and we have an offset.
        if (!(index in target.ifdRequests) && index in offsets) {
          const offset = offsets[index];
          target.ifdRequests[index] = target.parseFileDirectoryAt(offset);
        }
        return target.getImage(index);
      };
    }

    // tiff['__viv-offsets'] === true
    if (key === OFFSETS_PROXY_KEY) {
      return true;
    }

    // @ts-expect-error Just forwarding the key
    return Reflect.get(target, key);
  };
  return new Proxy(tiff, { get });
}

function _nullishCoalesce$7(lhs, rhsFn) { if (lhs != null) { return lhs; } else { return rhsFn(); } } function _optionalChain$f(ops) { let lastAccessLHS = undefined; let value = ops[0]; let i = 1; while (i < ops.length) { const op = ops[i]; const fn = ops[i + 1]; i += 2; if ((op === 'optionalAccess' || op === 'optionalCall') && value == null) { return undefined; } if (op === 'access' || op === 'optionalAccess') { lastAccessLHS = value; value = fn(value); } else if (op === 'call' || op === 'optionalCall') { value = fn((...args) => value.call(lastAccessLHS, ...args)); lastAccessLHS = undefined; } } return value; }
// TODO: Remove the fancy label stuff
 
























function extractPhysicalSizesfromPixels(
  d
) {
  if (
    !d['PhysicalSizeX'] ||
    !d['PhysicalSizeY'] ||
    !d['PhysicalSizeXUnit'] ||
    !d['PhysicalSizeYUnit']
  ) {
    return undefined;
  }
  const physicalSizes = {
    x: { size: d['PhysicalSizeX'], unit: d['PhysicalSizeXUnit'] },
    y: { size: d['PhysicalSizeY'], unit: d['PhysicalSizeYUnit'] }
  };
  if (d['PhysicalSizeZ'] && d['PhysicalSizeZUnit']) {
    physicalSizes.z = {
      size: d['PhysicalSizeZ'],
      unit: d['PhysicalSizeZUnit']
    };
  }
  return physicalSizes;
}

function parsePixelDataType(dtype) {
  assert(dtype in DTYPE_LOOKUP$1, `Pixel type ${dtype} not supported.`);
  return DTYPE_LOOKUP$1[dtype ];
}

function extractAxesFromPixels(d) {
  // e.g. 'XYZCT' -> ['t', 'c', 'z', 'y', 'x']
  const labels = getLabels(d['DimensionOrder']);

  // Compute "shape" of image
  const shape = Array(labels.length).fill(0);
  shape[labels.indexOf('t')] = d['SizeT'];
  shape[labels.indexOf('c')] = d['SizeC'];
  shape[labels.indexOf('z')] = d['SizeZ'];
  shape[labels.indexOf('y')] = d['SizeY'];
  shape[labels.indexOf('x')] = d['SizeX'];

  // Push extra dimension if data are interleaved.
  if (d['Interleaved']) {
    // @ts-expect-error private, unused dim name for selection
    labels.push('_c');
    shape.push(3);
  }

  return { labels, shape };
}

/**
 * Compute the shape of the image at a given resolution level.
 *
 * Assumes that the image is downsampled by a factor of 2 for each
 * pyramid level.
 */
function getShapeForBinaryDownsampleLevel(options


) {
  const { axes, level } = options;
  const xIndex = axes.labels.indexOf('x');
  assert(xIndex !== -1, 'x dimension not found');
  const yIndex = axes.labels.indexOf('y');
  assert(yIndex !== -1, 'y dimension not found');
  const resolutionShape = axes.shape.slice();
  resolutionShape[xIndex] = axes.shape[xIndex] >> level;
  resolutionShape[yIndex] = axes.shape[yIndex] >> level;
  return resolutionShape;
}

function getTiffTileSize(image) {
  const tileWidth = image.getTileWidth();
  const tileHeight = image.getTileHeight();
  const size = Math.min(tileWidth, tileHeight);
  // deck.gl requirement for power-of-two tile size.
  return prevPowerOf2(size);
}

// Inspired by/borrowed from https://geotiffjs.github.io/geotiff.js/geotiffimage.js.html#line297
function guessImageDataType(image) {
  // Assuming these are flat TIFFs, just grab the info for the first image/sample.
  const sampleIndex = 0;
  const format = _nullishCoalesce$7(_optionalChain$f([image, 'access', _ => _.fileDirectory, 'optionalAccess', _2 => _2.SampleFormat, 'optionalAccess', _3 => _3[sampleIndex]]), () => ( 1));
  const bitsPerSample = image.fileDirectory.BitsPerSample[sampleIndex];
  switch (format) {
    case 1: // unsigned integer data
      if (bitsPerSample <= 8) {
        return DTYPE_LOOKUP$1.uint8;
      }
      if (bitsPerSample <= 16) {
        return DTYPE_LOOKUP$1.uint16;
      }
      if (bitsPerSample <= 32) {
        return DTYPE_LOOKUP$1.uint32;
      }
      break;
    case 2: // twos complement signed integer data
      if (bitsPerSample <= 8) {
        return DTYPE_LOOKUP$1.int8;
      }
      if (bitsPerSample <= 16) {
        return DTYPE_LOOKUP$1.int16;
      }
      if (bitsPerSample <= 32) {
        return DTYPE_LOOKUP$1.int32;
      }
      break;
    case 3:
      switch (bitsPerSample) {
        case 16:
          // Should be float 16, maybe 32 will work?
          // Or should we raise an error?
          return DTYPE_LOOKUP$1.float;
        case 32:
          return DTYPE_LOOKUP$1.float;
        case 64:
          return DTYPE_LOOKUP$1.double;
      }
      break;
  }
  throw Error('Unsupported data format/bitsPerSample');
}

function getMultiTiffShapeMap(tiffs)

 {
  let [c, z, t] = [0, 0, 0];
  for (const tiff of tiffs) {
    c = Math.max(c, tiff.selection.c);
    z = Math.max(z, tiff.selection.z);
    t = Math.max(t, tiff.selection.t);
  }

  const firstTiff = tiffs[0].tiff;
  return {
    x: firstTiff.getWidth(),
    y: firstTiff.getHeight(),
    z: z + 1,
    c: c + 1,
    t: t + 1
  };
}

// If a channel has multiple z or t slices with different samples per pixel
// this function will just use the samples per pixel from a random slice.
function getChannelSamplesPerPixel(
  tiffs,
  numChannels
) {
  const channelSamplesPerPixel = Array(numChannels).fill(0);
  for (const tiff of tiffs) {
    const curChannel = tiff.selection.c;
    const curSamplesPerPixel = tiff.tiff.getSamplesPerPixel();
    const existingSamplesPerPixel = channelSamplesPerPixel[curChannel];
    if (
      existingSamplesPerPixel &&
      existingSamplesPerPixel !== curSamplesPerPixel
    ) {
      throw Error('Channel samples per pixel mismatch');
    }
    channelSamplesPerPixel[curChannel] = curSamplesPerPixel;
  }
  return channelSamplesPerPixel;
}

function getMultiTiffMeta(
  dimensionOrder,
  tiffs
) {
  const firstTiff = tiffs[0].tiff;
  const shapeMap = getMultiTiffShapeMap(tiffs);
  const shape = [];
  for (const dim of dimensionOrder.toLowerCase()) {
    shape.unshift(shapeMap[dim]);
  }

  const labels = getLabels(dimensionOrder);
  const dtype = guessImageDataType(firstTiff);
  return { shape, labels, dtype };
}

function getMultiTiffPixelMedatata(
  imageNumber,
  dimensionOrder,
  shapeMap,
  dType,
  tiffs,
  channelNames,
  channelSamplesPerPixel
) {
  const channelMetadata = [];
  for (let i = 0; i < shapeMap.c; i += 1) {
    channelMetadata.push({
      ID: `Channel:${imageNumber}:${i}`,
      Name: channelNames[i],
      SamplesPerPixel: channelSamplesPerPixel[i]
    });
  }
  return {
    BigEndian: !tiffs[0].tiff.littleEndian,
    DimensionOrder: dimensionOrder,
    ID: `Pixels:${imageNumber}`,
    SizeC: shapeMap.c,
    SizeT: shapeMap.t,
    SizeX: shapeMap.x,
    SizeY: shapeMap.y,
    SizeZ: shapeMap.z,
    Type: dType,
    Channels: channelMetadata
  };
}

function getMultiTiffMetadata(
  imageName,
  tiffImages,
  channelNames,
  dimensionOrder,
  dType
) {
  const imageNumber = 0;
  const id = `Image:${imageNumber}`;
  const date = '';
  const description = '';
  const shapeMap = getMultiTiffShapeMap(tiffImages);
  const channelSamplesPerPixel = getChannelSamplesPerPixel(
    tiffImages,
    shapeMap.c
  );

  if (channelNames.length !== shapeMap.c)
    throw Error(
      'Wrong number of channel names for number of channels provided'
    );

  const pixels = getMultiTiffPixelMedatata(
    imageNumber,
    dimensionOrder,
    shapeMap,
    dType,
    tiffImages,
    channelNames,
    channelSamplesPerPixel
  );

  const format = () => {
    return {
      'Acquisition Date': date,
      'Dimensions (XY)': `${shapeMap.x} x ${shapeMap.y}`,
      PixelsType: dType,
      'Z-sections/Timepoints': `${shapeMap.z} x ${shapeMap.t}`,
      Channels: shapeMap.c
    };
  };
  return {
    ID: id,
    Name: imageName,
    AcquisitionDate: date,
    Description: description,
    Pixels: pixels,
    format
  };
}

function parseFilename(path) {
  const parsedFilename = {};
  const filename = path.split('/').pop();
  const splitFilename = _optionalChain$f([filename, 'optionalAccess', _4 => _4.split, 'call', _5 => _5('.')]);
  if (splitFilename) {
    parsedFilename.name = splitFilename.slice(0, -1).join('.');
    [, parsedFilename.extension] = splitFilename;
  }
  return parsedFilename;
}

/**
 * Creates a GeoTIFF object from a URL, File, or Blob.
 *
 * @param source - URL, File, or Blob
 * @param options
 * @param options.headers - HTTP headers to use when fetching a URL
 */
function createGeoTiffObject(
  source,
  { headers }
) {
  if (source instanceof Blob) {
    return fromBlob(source);
  }
  const url = typeof source === 'string' ? new URL(source) : source;
  if (url.protocol === 'file:') {
    return fromFile(url.pathname);
  }
  // https://github.com/ilan-gold/geotiff.js/tree/viv#abortcontroller-support
  // https://www.npmjs.com/package/lru-cache#options
  // Cache size needs to be infinite due to consistency issues.
  return fromUrl(url.href, { headers, cacheSize: Number.POSITIVE_INFINITY });
}

/**
 * Creates a GeoTIFF object from a URL, File, or Blob.
 *
 * If `offsets` are provided, a proxy is returned that
 * intercepts calls to `tiff.getImage` and injects the
 * pre-computed offsets. This is a performance enhancement.
 *
 * @param source - URL, File, or Blob
 * @param options
 * @param options.headers - HTTP headers to use when fetching a URL
 */
async function createGeoTiff(
  source,
  options


 = {}
) {
  const tiff = await createGeoTiffObject(source, options);
  /*
   * Performance enhancement. If offsets are provided, we
   * create a proxy that intercepts calls to `tiff.getImage`
   * and injects the pre-computed offsets.
   */
  return options.offsets ? createOffsetsProxy(tiff, options.offsets) : tiff;
}

/*
 * An "indexer" for a GeoTIFF-based source is a function that takes a
 * "selection" (e.g. { z, t, c }) and returns a Promise for the GeoTIFFImage
 * object corresponding to that selection.
 *
 * For OME-TIFF images, the "selection" object is the same regardless of
 * the format version. However, modern version of Bioformats have a different
 * memory layout for pyramidal resolutions. Thus, we have different "indexers"
 * depending on which format version is detected.
 */
function createOmeImageIndexerFromResolver(
  resolveBaseResolutionImageLocation,
  image


) {
  const ifdCache = [];
  return async (sel, pyramidLevel) => {
    const { tiff, ifdIndex } = await resolveBaseResolutionImageLocation(sel);
    const baseImage = await tiff.getImage(ifdIndex);

    // It's the highest resolution, no need to look up SubIFDs.
    if (pyramidLevel === 0) {
      return baseImage;
    }

    let index;
    if (baseImage.fileDirectory.SubIFDs) {
      index = baseImage.fileDirectory.SubIFDs[pyramidLevel - 1];
    } else {
      // Legacy Bioformats OME-TIFFs don't have SubIFDs, and instead
      // store each resolution level in a separate IFD at the end
      // of the base image.
      const resolutionOffset =
        pyramidLevel * image.size.z * image.size.t * image.size.c;
      index = ifdIndex + resolutionOffset;
    }

    if (!ifdCache[index]) {
      ifdCache[index] = await tiff.parseFileDirectoryAt(index);
    }
    const ifd = ifdCache[index];

    // Create a new image object manually from IFD
    return new GeoTIFFImage(
      ifd.fileDirectory,
      ifd.geoKeyDirectory,
      baseImage.dataView,
      tiff.littleEndian,
      tiff.cache,
      tiff.source
    );
  };
}

function getMultiTiffIndexer(tiffs) {
  function selectionToKey({ c = 0, t = 0, z = 0 }) {
    return `${c}-${t}-${z}`;
  }
  const lookup = new Map(
    tiffs.map(({ selection, tiff }) => [selectionToKey(selection), tiff])
  );
  return async (sel) => {
    const key = selectionToKey(sel);
    const img = lookup.get(key);
    if (!img) throw new Error(`No image available for selection ${key}`);
    return img;
  };
}

function _optionalChain$e(ops) { let lastAccessLHS = undefined; let value = ops[0]; let i = 1; while (i < ops.length) { const op = ops[i]; const fn = ops[i + 1]; i += 2; if ((op === 'optionalAccess' || op === 'optionalCall') && value == null) { return undefined; } if (op === 'access' || op === 'optionalAccess') { lastAccessLHS = value; value = fn(value); } else if (op === 'call' || op === 'optionalCall') { value = fn((...args) => value.call(lastAccessLHS, ...args)); lastAccessLHS = undefined; } } return value; }

















class TiffPixelSource {
  

  constructor(
    indexer,
     dtype,
     tileSize,
     shape,
     labels,
     meta,
     pool
  ) {this.dtype = dtype;this.tileSize = tileSize;this.shape = shape;this.labels = labels;this.meta = meta;this.pool = pool;
    this._indexer = indexer;
  }

  async getRaster({ selection, signal }) {
    const image = await this._indexer(selection);
    return this._readRasters(image, { signal });
  }

  async getTile({ x, y, selection, signal }) {
    const { height, width } = this._getTileExtent(x, y);
    const x0 = x * this.tileSize;
    const y0 = y * this.tileSize;
    const window = [x0, y0, x0 + width, y0 + height];

    const image = await this._indexer(selection);
    return this._readRasters(image, { window, width, height, signal });
  }

   async _readRasters(image, props) {
    const interleave = isInterleaved(this.shape);
    const raster = await image.readRasters({
      interleave,
      ...props,
      pool: this.pool
    });

    if (_optionalChain$e([props, 'optionalAccess', _ => _.signal, 'optionalAccess', _2 => _2.aborted])) {
      throw SIGNAL_ABORTED;
    }

    /*
     * geotiff.js returns objects with different structure
     * depending on `interleave`. It's weird, but this seems to work.
     */
    const data = (interleave ? raster : raster[0]) ;
    return {
      data,
      width: (raster ).width,
      height: (raster ).height
    } ;
  }

  /*
   * Computes tile size given x, y coord.
   */
   _getTileExtent(x, y) {
    const { height: zoomLevelHeight, width: zoomLevelWidth } =
      getImageSize(this);
    let height = this.tileSize;
    let width = this.tileSize;
    const maxXTileCoord = Math.floor(zoomLevelWidth / this.tileSize);
    const maxYTileCoord = Math.floor(zoomLevelHeight / this.tileSize);
    if (x === maxXTileCoord) {
      width = zoomLevelWidth % this.tileSize;
    }
    if (y === maxYTileCoord) {
      height = zoomLevelHeight % this.tileSize;
    }
    return { height, width };
  }

  onTileError(err) {
    console.error(err);
  }
}

function assertSameResolution(images) {
  const width = images[0].tiff.getWidth();
  const height = images[0].tiff.getHeight();
  for (const image of images) {
    if (image.tiff.getWidth() !== width || image.tiff.getHeight() !== height) {
      throw new Error('All images must have the same width and height');
    }
  }
}

async function assertCompleteStack(
  images,
  indexer
) {
  for (let t = 0; t <= Math.max(...images.map(i => i.selection.t)); t += 1) {
    for (let c = 0; c <= Math.max(...images.map(i => i.selection.c)); c += 1) {
      for (
        let z = 0;
        z <= Math.max(...images.map(i => i.selection.z));
        z += 1
      ) {
        await indexer({ t, c, z }); // should throw error is missing dimension
      }
    }
  }
}

async function load$2(
  imageName,
  images,
  channelNames,
  pool
) {
  // Before doing any work make sure all of the images have the same resolution
  assertSameResolution(images);

  const firstImage = images[0].tiff;
  const { PhotometricInterpretation: photometricInterpretation } =
    firstImage.fileDirectory;
  // Not sure if we need this or if the order matters for this use case.
  const dimensionOrder = 'XYZCT';
  const tileSize = getTiffTileSize(firstImage);
  const meta = { photometricInterpretation };
  const indexer = getMultiTiffIndexer(images);
  const { shape, labels, dtype } = getMultiTiffMeta(dimensionOrder, images);
  const metadata = getMultiTiffMetadata(
    imageName,
    images,
    channelNames,
    dimensionOrder,
    dtype
  );

  // Make sure all of the images make a complete stack.
  await assertCompleteStack(images, indexer);

  const source = new TiffPixelSource(
    indexer,
    dtype,
    tileSize,
    shape,
    labels,
    meta,
    pool
  );
  return {
    data: [source],
    metadata
  };
}

function _nullishCoalesce$6(lhs, rhsFn) { if (lhs != null) { return lhs; } else { return rhsFn(); } }
// Main API type: full metadata structure
 









function flattenAttributes({
  attr,
  ...rest
}) {
  // @ts-expect-error - TS doesn't like the prettify type
  return { ...attr, ...rest };
}

function ensureArray(x) {
  return Array.isArray(x) ? x : [x];
}

 
const DimensionOrderSchema = z.enum([
  'XYZCT',
  'XYZTC',
  'XYCTZ',
  'XYCZT',
  'XYTCZ',
  'XYTZC'
]);

const PixelTypeSchema = z.enum([
  'int8',
  'int16',
  'int32',
  'uint8',
  'uint16',
  'uint32',
  'float',
  'bit',
  'double',
  'complex',
  'double-complex'
]);

 
const PhysicalUnitSchema = z.enum([
  'Ym',
  'Zm',
  'Em',
  'Pm',
  'Tm',
  'Gm',
  'Mm',
  'km',
  'hm',
  'dam',
  'm',
  'dm',
  'cm',
  'mm',
  'µm',
  'nm',
  'pm',
  'fm',
  'am',
  'zm',
  'ym',
  'Å',
  'thou',
  'li',
  'in',
  'ft',
  'yd',
  'mi',
  'ua',
  'ly',
  'pc',
  'pt',
  'pixel',
  'reference frame'
]);

/**
 * ROI Shape Types (OME-XML 2016-06 Schema Compliant)
 * 
 * All shapes inherit common attributes from the base Shape entity:
 * - ID: Unique identifier (required)
 * - Label: Optional label (OME-XML standard attribute)
 * - Name: Optional name (alternative naming attribute)
 * - FillColor, StrokeColor, StrokeWidth, StrokeDashArray, LineCap: Visual styling
 * - TheC, TheT, TheZ: Channel/time/z-slice association
 * - Text, FontFamily, FontSize, FontStyle: Text attributes
 * - Locked, Visible: Interaction state
 * - Transform: Optional affine transformation matrix
 * 
 * Each shape type adds its own specific attributes:
 * - Rectangle: X, Y, Width, Height (top-left corner + dimensions)
 * - Ellipse: X, Y, RadiusX, RadiusY (center + radii)
 * - Point: X, Y (point coordinates)
 * - Line: X1, Y1, X2, Y2 (start and end points)
 * - Polyline: Points (space-separated coordinate pairs: "x1,y1 x2,y2 ...")
 * - Polygon: Points (space-separated coordinate pairs: "x1,y1 x2,y2 ...")
 * - Label: X, Y (label position)
 * 
 * @see https://www.openmicroscopy.org/Schemas/Documentation/Generated/OME-2016-06/ome.html
 */
 
z.enum([
  'Rectangle',
  'Ellipse',
  'Polygon',
  'Polyline',
  'Line',
  'Point',
  'Label'
]);

// Transform schema for affine transformations
const TransformSchema = z
  .object({})
  .extend({
    attr: z.object({
      A00: z.coerce.number(),
      A01: z.coerce.number(),
      A02: z.coerce.number(),
      A10: z.coerce.number(),
      A11: z.coerce.number(),
      A12: z.coerce.number()
    })
  })
  .transform(flattenAttributes);

// Helper function to create shape schemas with common attributes
function createShapeSchema(specificAttrs, shapeType) {
  return z
    .object({
      Transform: TransformSchema.optional()
    })
    .extend({
      attr: z.object({
        // Common Shape attributes (inherited by all shapes)
        ID: z.string(),
        Label: z.string().optional(),      // OME-XML uses "Label" 
        Name: z.string().optional(),       // Some implementations also use "Name"

        // Visual styling attributes
        FillColor: z.coerce.number().transform(intToRgba).optional(),
        StrokeColor: z.coerce.number().transform(intToRgba).optional(),
        StrokeWidth: z.coerce.number().optional(),
        StrokeDashArray: z.string().optional(),
        LineCap: z.enum(['Butt', 'Round', 'Square']).optional(),

        // Spatial/temporal context attributes
        TheC: z.coerce.number().optional(),
        TheT: z.coerce.number().optional(),
        TheZ: z.coerce.number().optional(),

        // Text and font attributes
        Text: z.string().optional(),
        FontFamily: z.string().optional(),
        FontSize: z.coerce.number().optional(),
        FontStyle: z.enum(['Normal', 'Italic', 'Bold', 'BoldItalic']).optional(),

        // Interaction and state attributes
        Locked: z
          .string()
          .transform(v => v.toLowerCase() === 'true')
          .optional(),
        Visible: z
          .string()
          .transform(v => v.toLowerCase() === 'true')
          .optional(),

        // Shape-specific attributes
        ...specificAttrs
      })
    })
    .transform(flattenAttributes)
    .transform(data => ({ ...data, type: shapeType }));
}

const RectangleSchema = createShapeSchema({
  X: z.coerce.number(),        // Top-left X coordinate
  Y: z.coerce.number(),        // Top-left Y coordinate
  Width: z.coerce.number(),    // Rectangle width
  Height: z.coerce.number()    // Rectangle height
}, 'rectangle');
 

const EllipseSchema = createShapeSchema({
  X: z.coerce.number(),        // Center X coordinate
  Y: z.coerce.number(),        // Center Y coordinate
  RadiusX: z.coerce.number(),  // Horizontal radius
  RadiusY: z.coerce.number()   // Vertical radius
}, 'ellipse');
 

const LineSchema = createShapeSchema({
  X1: z.coerce.number(),       // Start point X coordinate
  Y1: z.coerce.number(),       // Start point Y coordinate
  X2: z.coerce.number(),       // End point X coordinate
  Y2: z.coerce.number()        // End point Y coordinate
}, 'line');
 

const PointSchema = createShapeSchema({
  X: z.coerce.number(),        // Point X coordinate
  Y: z.coerce.number()         // Point Y coordinate
}, 'point');
 

const PolygonSchema = createShapeSchema({
  Points: z.string()           // Format: "x1,y1 x2,y2 x3,y3 ..." (space-separated coordinate pairs)
}, 'polygon');
 

const PolylineSchema = createShapeSchema({
  Points: z.string()           // Format: "x1,y1 x2,y2 x3,y3 ..." (space-separated coordinate pairs)
}, 'polyline');
 

const LabelSchema = createShapeSchema({
  X: z.coerce.number(),        // Label X coordinate
  Y: z.coerce.number()         // Label Y coordinate
}, 'label');
 




// Union schema to contain shapes
// Support BOTH standard OME-XML element names (capitalized singular)
// and alternative lowercase plural keys observed in some generators
const UnionSchema = z.object({
  // Standard OME-XML element names
  Rectangle: z.preprocess(ensureArray, RectangleSchema.array()).optional(),
  Ellipse: z.preprocess(ensureArray, EllipseSchema.array()).optional(),
  Line: z.preprocess(ensureArray, LineSchema.array()).optional(),
  Point: z.preprocess(ensureArray, PointSchema.array()).optional(),
  Polygon: z.preprocess(ensureArray, PolygonSchema.array()).optional(),
  Polyline: z.preprocess(ensureArray, PolylineSchema.array()).optional(),
  Label: z.preprocess(ensureArray, LabelSchema.array()).optional(),

  // Lowercase plural variants
  rectangles: z.preprocess(ensureArray, RectangleSchema.array()).optional(),
  ellipses: z.preprocess(ensureArray, EllipseSchema.array()).optional(),
  lines: z.preprocess(ensureArray, LineSchema.array()).optional(),
  points: z.preprocess(ensureArray, PointSchema.array()).optional(),
  polygons: z.preprocess(ensureArray, PolygonSchema.array()).optional(),
  polylines: z.preprocess(ensureArray, PolylineSchema.array()).optional(),
  labels: z.preprocess(ensureArray, LabelSchema.array()).optional()
});

// ROI schema - transforms Union into a flat array of shapes
const ROISchema = z
  .object({
    Union: UnionSchema.optional()
  })
  .extend({
    attr: z.object({
      ID: z.string(),
      Name: z.string().optional(),
      Description: z.string().optional()
    })
  })
  .transform(flattenAttributes)
  .transform(data => {
    // Flatten Union into a simple array of shapes
    const shapes = [];
    if (data.Union) {
      // Capitalized singular (standard OME-XML)
      if (data.Union.Rectangle) shapes.push(...data.Union.Rectangle);
      if (data.Union.Ellipse) shapes.push(...data.Union.Ellipse);
      if (data.Union.Line) shapes.push(...data.Union.Line);
      if (data.Union.Point) shapes.push(...data.Union.Point);
      if (data.Union.Polygon) shapes.push(...data.Union.Polygon);
      if (data.Union.Polyline) shapes.push(...data.Union.Polyline);
      if (data.Union.Label) shapes.push(...data.Union.Label);

      // Lowercase plural variants
      if (data.Union.rectangles) shapes.push(...data.Union.rectangles);
      if (data.Union.ellipses) shapes.push(...data.Union.ellipses);
      if (data.Union.lines) shapes.push(...data.Union.lines);
      if (data.Union.points) shapes.push(...data.Union.points);
      if (data.Union.polygons) shapes.push(...data.Union.polygons);
      if (data.Union.polylines) shapes.push(...data.Union.polylines);
      if (data.Union.labels) shapes.push(...data.Union.labels);
    }

    // Return ROI with shapes as a flat array instead of nested Union
    const { Union, ...rest } = data;
    return { ...rest, shapes };
  });
 

// ROIRef schema
const ROIRefSchema = z
  .object({})
  .extend({
    attr: z.object({
      ID: z.string()
    })
  })
  .transform(flattenAttributes);

const ChannelSchema = z
  .object({})
  .extend({
    attr: z.object({
      ID: z.string(),
      SamplesPerPixel: z.coerce.number().optional(),
      Name: z.string().optional(),
      Color: z.coerce.number().transform(intToRgba).optional()
    })
  })
  .transform(flattenAttributes);

const UuidSchema = z
  .object({})
  .extend({
    attr: z.object({
      FileName: z.string()
    })
  })
  .transform(flattenAttributes);

const TiffDataSchema = z
  .object({ UUID: UuidSchema.optional() })
  .extend({
    attr: z.object({
      IFD: z.coerce.number().default(0),
      PlaneCount: z.coerce.number().default(1),
      FirstT: z.coerce.number().optional(),
      FirstC: z.coerce.number().optional(),
      FirstZ: z.coerce.number().optional()
    })
  })
  .transform(flattenAttributes);

const PixelsSchema = z
  .object({
    Channel: z.preprocess(ensureArray, ChannelSchema.array()),
    TiffData: z.preprocess(ensureArray, TiffDataSchema.array()).optional()
  })
  .extend({
    attr: z.object({
      ID: z.string(),
      DimensionOrder: DimensionOrderSchema,
      Type: PixelTypeSchema,
      SizeT: z.coerce.number(),
      SizeC: z.coerce.number(),
      SizeZ: z.coerce.number(),
      SizeY: z.coerce.number(),
      SizeX: z.coerce.number(),
      PhysicalSizeX: z.coerce.number().optional(),
      PhysicalSizeY: z.coerce.number().optional(),
      PhysicalSizeZ: z.coerce.number().optional(),
      SignificantBits: z.coerce.number().optional(),
      PhysicalSizeXUnit: PhysicalUnitSchema.optional().default('µm'),
      PhysicalSizeYUnit: PhysicalUnitSchema.optional().default('µm'),
      PhysicalSizeZUnit: PhysicalUnitSchema.optional().default('µm'),
      BigEndian: z
        .string()
        .transform(v => v.toLowerCase() === 'true')
        .optional(),
      Interleaved: z
        .string()
        .transform(v => v.toLowerCase() === 'true')
        .optional()
    })
  })
  .transform(flattenAttributes)
  // Rename the `Channel` key to `Channels` for backwards compatibility
  .transform(({ Channel, ...rest }) => ({ Channels: Channel, ...rest }));

const ImageSchema = z
  .object({
    AquisitionDate: z.string().optional().default(''),
    Description: z.unknown().optional().default(''),
    Pixels: PixelsSchema,
    ROIRef: z.preprocess(ensureArray, ROIRefSchema.array()).optional()
  })
  .extend({
    attr: z.object({
      ID: z.string(),
      Name: z.string().optional()
    })
  })
  .transform(flattenAttributes);

const OmeSchema = z
  .object({
    Image: z.preprocess(ensureArray, ImageSchema.array()).optional(),
    ROI: z.preprocess(ensureArray, ROISchema.array()).optional(),
    ROIRef: z.preprocess(ensureArray, ROIRefSchema.array()).optional()
  })
  // Normalize/augment at the schema level to simplify parseOmeXml
  .transform(raw => {
    const images = _nullishCoalesce$6(raw.Image, () => ( []));
    const rootRefs = _nullishCoalesce$6(raw.ROIRef, () => ( []));
    const imageRefs = images.flatMap(img => _nullishCoalesce$6(img.ROIRef, () => ( [])));
    const ROIRefCombined = [...rootRefs, ...imageRefs];
    return { ...raw, ROIRefCombined };
  });
// TODO: Verify that these attributes are always present
// .extend({
//   attr: z.object({
//     'xmlns': z.string(),
//     'xmlns:xsi': z.string(),
//     'xsi:schemaLocation': z.string()
//   })
// })
// .transform(flattenAttributes);

// Main API: return full metadata structure
function fromString(str) {
  const raw = parseXML(str);
  const omeXml = OmeSchema.parse(raw);
  console.log('simon', omeXml);
  // With schema-level normalization, parsing is a simple projection
  return {
    images: _nullishCoalesce$6(omeXml.Image, () => ( [])),
    rois: _nullishCoalesce$6(omeXml.ROI, () => ( [])),
    roiRefs: _nullishCoalesce$6((omeXml ).ROIRefCombined, () => ( []))
  };
}

function _nullishCoalesce$5(lhs, rhsFn) { if (lhs != null) { return lhs; } else { return rhsFn(); } }








function isCompleteTiffDataItem(
  item
) {
  return (
    'FirstC' in item &&
    'FirstT' in item &&
    'FirstZ' in item &&
    'IFD' in item &&
    'UUID' in item
  );
}

function createMultifileImageDataLookup(
  tiffData
) {
  
  const lookup = new Map();
  function keyFor({ t, c, z }) {
    return `t${t}.c${c}.z${z}`;
  }
  assert(tiffData, 'No TiffData in OME-XML');
  for (const imageData of tiffData) {
    assert(isCompleteTiffDataItem(imageData), 'Incomplete TiffData item');
    const key = keyFor({
      t: imageData['FirstT'],
      c: imageData['FirstC'],
      z: imageData['FirstZ']
    });
    const imageDataPointer = {
      ifd: imageData['IFD'],
      filename: imageData['UUID']['FileName']
    };
    lookup.set(key, imageDataPointer);
  }
  return {
    getImageDataPointer(selection) {
      const entry = lookup.get(keyFor(selection));
      assert(entry, `No image for selection: ${JSON.stringify(selection)}`);
      return entry;
    }
  };
}

function createMultifileOmeTiffResolver(options



) {
  // Mapping of filename -> GeoTIFF
  const tiffs = new Map();
  const lookup = createMultifileImageDataLookup(options.tiffData);
  return async (selection) => {
    const entry = lookup.getImageDataPointer(selection);
    if (!tiffs.has(entry.filename)) {
      const url = new URL(entry.filename, options.baseUrl);
      const tiff = await createGeoTiff(url, options);
      tiffs.set(entry.filename, tiff);
    }
    const tiff = tiffs.get(entry.filename);
    assert(tiff, `No GeoTIFF for ${entry.filename}`);
    return { tiff, ifdIndex: entry.ifd };
  };
}

/**
 * Load a multifile OME-TIFF from a URL
 *
 * Creates pyramidal indexer from the companion OME-XML and
 * determines the number of levels based on the SubIFDs of
 * the first image.
 *
 * Extracts other TiffPixelSource options.
 */
async function getPixelSourceOptionsForImage(
  metadata,
  config



) {
  const resolveOmeSelection = createMultifileOmeTiffResolver({
    tiffData: metadata['Pixels']['TiffData'],
    baseUrl: config.baseUrl,
    headers: config.headers
  });
  const { tiff, ifdIndex } = await resolveOmeSelection({ c: 0, t: 0, z: 0 });
  const baseImage = await tiff.getImage(ifdIndex);
  const pyramidIndexer = createOmeImageIndexerFromResolver(
    resolveOmeSelection,
    {
      size: {
        z: metadata['Pixels']['SizeZ'],
        t: metadata['Pixels']['SizeT'],
        c: metadata['Pixels']['SizeC']
      }
    }
  );
  return {
    pyramidIndexer,
    levels: baseImage.fileDirectory.SubIFDs
      ? baseImage.fileDirectory.SubIFDs.length + 1
      : 1,
    tileSize: getTiffTileSize(baseImage),
    axes: extractAxesFromPixels(metadata['Pixels']),
    dtype: parsePixelDataType(metadata['Pixels']['Type']),
    meta: {
      physicalSizes: extractPhysicalSizesfromPixels(metadata['Pixels']),
      photometricInterpretation:
        baseImage.fileDirectory.PhotometricInterpretation
    }
  };
}

async function loadMultifileOmeTiff(
  source,
  options


 = {}
) {
  assert(
    !(source instanceof File),
    'File or Blob not supported for multifile OME-TIFF'
  );
  const url = new URL(source);
  const text = await fetch(url).then(res => res.text());
  const parsed = fromString(text);
  const rois = parsed.rois || [];
  const roiRefs = parsed.roiRefs || [];

  // Create a map of ROI IDs to ROI objects for quick lookup
  const roiMap = new Map(rois.map(roi => [roi.ID, roi]));

  // Add ROIs to images based on ROIRefs
  const images = (parsed.images || []).map(image => {
    // Find ROIRefs that reference this image (if any)
    const imageROIRefs = roiRefs.filter(roiRef => {
      // ROIRefs might have an ImageRef or be associated with the image
      // For now, we'll include all ROIRefs since we don't have explicit image association
      return true; // TODO: Add proper image-ROI association logic
    });

    // Get the actual ROI objects referenced by the ROIRefs
    const imageROIs = imageROIRefs
      .map(roiRef => roiMap.get(roiRef.ID))
      .filter(Boolean);

    const { ROIRef, ...imageWithoutRefs } = image;
    return {
      ...imageWithoutRefs,
      ROIs: imageROIs
    };
  });

  const tiffImages = [];

  for (const metadata of images) {
    const opts = await getPixelSourceOptionsForImage(metadata, {
      baseUrl: url,
      headers: options.headers || {}
    });
    const data = Array.from(
      { length: opts.levels },
      (_, level) =>
        new TiffPixelSource(
          sel => opts.pyramidIndexer({ t: _nullishCoalesce$5(sel.t, () => ( 0)), c: _nullishCoalesce$5(sel.c, () => ( 0)), z: _nullishCoalesce$5(sel.z, () => ( 0)) }, level),
          opts.dtype,
          opts.tileSize,
          getShapeForBinaryDownsampleLevel({ axes: opts.axes, level }),
          opts.axes.labels,
          opts.meta,
          options.pool
        )
    );
    tiffImages.push({ data: data , metadata });
  }
  return tiffImages;
}

function _nullishCoalesce$4(lhs, rhsFn) { if (lhs != null) { return lhs; } else { return rhsFn(); } }
function resolveMetadata(omexml, SubIFDs) {
  const rois = omexml.rois || [];
  const roiRefs = omexml.roiRefs || [];

  // Create a map of ROI IDs to ROI objects for quick lookup
  const roiMap = new Map(rois.map(roi => [roi.ID, roi]));

  // Add ROIs to images based on ROIRefs
  const images = (omexml.images || []).map(image => {
    // Find ROIRefs that reference this image (if any)
    const imageROIRefs = roiRefs.filter(roiRef => {
      // ROIRefs might have an ImageRef or be associated with the image
      // For now, we'll include all ROIRefs since we don't have explicit image association
      return true; // TODO: Add proper image-ROI association logic
    });

    // Get the actual ROI objects referenced by the ROIRefs
    const imageROIs = imageROIRefs
      .map(roiRef => roiMap.get(roiRef.ID))
      .filter(Boolean);

    const { ROIRef, ...imageWithoutRefs } = image;
    return {
      ...imageWithoutRefs,
      ROIs: imageROIs
    };
  });

  if (SubIFDs) {
    // Image is >= Bioformats 6.0 and resolutions are stored using SubIFDs.
    return { levels: SubIFDs.length + 1, rootMeta: images };
  }
  // Image is legacy format; resolutions are stored as separate images.
  // We do not allow multi-images for legacy format.
  const firstImageMetadata = images[0];
  return { levels: images.length, rootMeta: [firstImageMetadata] };
}

/*
 * Returns the relative IFD index given the selection and the size of the image.
 *
 * This is is necessary because the IFD ordering is implicitly defined by the
 * dimension order.
 *
 * @param sel - The desired plane selection.
 * @param size - The size of each (z, t, c) dimension from the OME-XML.
 * @param dimensionOrder - The dimension order of the image from the OME-XML.
 */
function getRelativeOmeIfdIndex(
  { z, t, c },
  image



) {
  const { size, dimensionOrder } = image;
  switch (image.dimensionOrder) {
    case 'XYZCT':
      return z + size.z * c + size.z * size.c * t;
    case 'XYZTC':
      return z + size.z * t + size.z * size.t * c;
    case 'XYCTZ':
      return c + size.c * t + size.c * size.t * z;
    case 'XYCZT':
      return c + size.c * z + size.c * size.z * t;
    case 'XYTCZ':
      return t + size.t * c + size.t * size.c * z;
    case 'XYTZC':
      return t + size.t * z + size.t * size.z * c;
    default:
      throw new Error(`Invalid dimension order: ${dimensionOrder}`);
  }
}

/**
 * Creates an OmeTiffResolver for a single-file OME-TIFF.
 *
 * The tiff always resolves to the same file. The IFD index is calculated
 * based on the selection and.
 */
function createSingleFileOmeTiffPyramidalIndexer(
  tiff,
  image







) {
  return createOmeImageIndexerFromResolver(sel => {
    const withinImageIndex = getRelativeOmeIfdIndex(sel, image);
    const ifdIndex = withinImageIndex + image.ifdOffset;
    return { tiff, ifdIndex };
  }, image);
}






async function loadSingleFileOmeTiff(
  source,
  options



 = {}
) {
  const { offsets, headers, pool } = options;
  const tiff = await createGeoTiff(source, { headers, offsets });
  const firstImage = await tiff.getImage();
  const { rootMeta, levels } = resolveMetadata(
    fromString(firstImage.fileDirectory.ImageDescription),
    firstImage.fileDirectory.SubIFDs
  );

  const images = [];
  let imageIfdOffset = 0;

  for (const metadata of rootMeta) {
    const imageSize = {
      z: metadata['Pixels']['SizeZ'],
      c: metadata['Pixels']['SizeC'],
      t: metadata['Pixels']['SizeT']
    };
    const axes = extractAxesFromPixels(metadata['Pixels']);
    const pyramidIndexer = createSingleFileOmeTiffPyramidalIndexer(tiff, {
      size: imageSize,
      ifdOffset: imageIfdOffset,
      dimensionOrder: metadata['Pixels']['DimensionOrder']
    });
    const dtype = parsePixelDataType(metadata['Pixels']['Type']);
    const tileSize = getTiffTileSize(
      await pyramidIndexer({ c: 0, t: 0, z: 0 }, 0)
    );
    const meta = {
      physicalSizes: extractPhysicalSizesfromPixels(metadata['Pixels']),
      photometricInterpretation:
        firstImage.fileDirectory.PhotometricInterpretation
    };
    const data = Array.from(
      { length: levels },
      (_, level) => {
        return new TiffPixelSource(
          sel => pyramidIndexer({ t: _nullishCoalesce$4(sel.t, () => ( 0)), c: _nullishCoalesce$4(sel.c, () => ( 0)), z: _nullishCoalesce$4(sel.z, () => ( 0)) }, level),
          dtype,
          tileSize,
          getShapeForBinaryDownsampleLevel({ axes, level }),
          axes.labels,
          meta,
          pool
        );
      }
    );
    images.push({ data: data , metadata });
    imageIfdOffset += imageSize.t * imageSize.z * imageSize.c;
  }
  return images;
}

function _optionalChain$d(ops) { let lastAccessLHS = undefined; let value = ops[0]; let i = 1; while (i < ops.length) { const op = ops[i]; const fn = ops[i + 1]; i += 2; if ((op === 'optionalAccess' || op === 'optionalCall') && value == null) { return undefined; } if (op === 'access' || op === 'optionalAccess') { lastAccessLHS = value; value = fn(value); } else if (op === 'call' || op === 'optionalCall') { value = fn((...args) => value.call(lastAccessLHS, ...args)); lastAccessLHS = undefined; } } return value; }
addDecoder(5, () => LZWDecoder);























function isSupportedCompanionOmeTiffFile(source) {
  return typeof source === 'string' && source.endsWith('.companion.ome');
}

/** @ignore */
















/**
 * Opens an OME-TIFF via URL and returns data source and associated metadata for first or all images in files.
 *
 * @param {(string | File)} source url or File object. If the url is prefixed with file:// will attempt to load with GeoTIFF's 'fromFile',
 * which requires access to Node's fs module.
 * @param {Object} opts
 * @param {Headers=} opts.headers - Headers passed to each underlying fetch request.
 * @param {Array<number>=} opts.offsets - [Indexed-Tiff](https://github.com/hms-dbmi/generate-tiff-offsets) IFD offsets.
 * @param {GeoTIFF.Pool} [opts.pool] - A geotiff.js [Pool](https://geotiffjs.github.io/geotiff.js/module-pool-Pool.html) for decoding image chunks.
 * @param {("first" | "all")} [opts.images='first'] - Whether to return 'all' or only the 'first' image in the OME-TIFF.
 * Promise<{ data: TiffPixelSource[], metadata: ImageMeta }>[] is returned.
 * @return {Promise<{ data: TiffPixelSource[], metadata: ImageMeta }> | Promise<{ data: TiffPixelSource[], metadata: ImageMeta }>[]} data source and associated OME-Zarr metadata.
 */
async function loadOmeTiff(
  source,
  opts = {}
) {
  const load = isSupportedCompanionOmeTiffFile(source)
    ? loadMultifileOmeTiff
    : loadSingleFileOmeTiff;
  const loaders = await load(source, opts);
  return opts.images === 'all' ? loaders : loaders[0];
}

function getImageSelectionName(
  imageName,
  imageNumber,
  imageSelections
) {
  return imageSelections.length === 1
    ? imageName
    : `${imageName}_${imageNumber.toString()}`;
}

/**
 * Opens multiple tiffs as a multidimensional "stack" of 2D planes.
 * Also supports loading multiple slickes of a stack from a stacked tiff.
 * Returns the data source and OME-TIFF-like metadata.
 *
 * @example
 * const { data, metadata } = await loadMultiTiff([
 *  [{ c: 0, t: 0, z: 0 }, 'https://example.com/channel_0.tif'],
 *  [{ c: 1, t: 0, z: 0 }, 'https://example.com/channel_1.tif'],
 *  [{ c: 2, t: 0, z: 0 }, undefined, { c: 3, t: 0, z: 0 }], 'https://example.com/channels_2-3.tif'],
 * ]);
 *
 * await data.getRaster({ selection: { c: 0, t: 0, z: 0 } });
 * // { data: Uint16Array[...], width: 500, height: 500 }
 *
 * @param {Array<[OmeTiffSelection | (OmeTiffSelection | undefined)[], (string | File)]>} sources
 * Pairs of `[Selection | (OmeTiffSelection | undefined)[], string | File]` entries indicating the multidimensional selection in the virtual stack in image source (url string, or `File`).
 * If the url is prefixed with file:// will attempt to load with GeoTIFF's 'fromFile', which requires access to Node's fs module.
 * You should only provide (OmeTiffSelection | undefined)[] when loading from stacked tiffs. In this case the array index corresponds to the image index in the stack, and the selection is the
 * selection that image corresponds to. Undefined selections are for images that should not be loaded.
 * @param {Object} opts
 * @param {GeoTIFF.Pool} [opts.pool] - A geotiff.js [Pool](https://geotiffjs.github.io/geotiff.js/module-pool-Pool.html) for decoding image chunks.
 * @param {string} [opts.name='MultiTiff'] - a name for the "virtual" image stack.
 * @param {Headers=} opts.headers - Headers passed to each underlying fetch request.
 * @return {Promise<{ data: TiffPixelSource[], metadata: ImageMeta }>} data source and associated metadata.
 */
async function loadMultiTiff(
  sources


,
  opts = {}
) {
  const { pool, headers = {}, name = 'MultiTiff' } = opts;
  const tiffImage = [];
  const channelNames = [];

  for (const source of sources) {
    const [s, file] = source;
    const imageSelections = Array.isArray(s) ? s : [s];
    if (typeof file === 'string') {
      // If the file is a string then we're dealing with loading from a URL.
      const parsedFilename = parseFilename(file);
      const extension = _optionalChain$d([parsedFilename, 'access', _ => _.extension, 'optionalAccess', _2 => _2.toLowerCase, 'call', _3 => _3()]);
      if (extension === 'tif' || extension === 'tiff') {
        const tiffImageName = parsedFilename.name;
        if (tiffImageName) {
          const curImage = await createGeoTiff(file, {
            headers
          });
          for (let i = 0; i < imageSelections.length; i++) {
            const curSelection = imageSelections[i];

            if (curSelection) {
              const tiff = await curImage.getImage(i);
              tiffImage.push({ selection: curSelection, tiff });
              channelNames[curSelection.c] = getImageSelectionName(
                tiffImageName,
                i,
                imageSelections
              );
            }
          }
        }
      }
    } else {
      // If the file is not a string then we're loading from a File/Blob.
      const { name } = parseFilename(file.path);
      if (name) {
        const curImage = await fromBlob(file);
        for (let i = 0; i < imageSelections.length; i++) {
          const curSelection = imageSelections[i];
          if (curSelection) {
            const tiff = await curImage.getImage(i);
            if (tiff.fileDirectory.SamplesPerPixel > 1) {
              throw new Error(
                `Multiple samples per pixel in tiff not supported as part of a multi-tiff, found ${tiff.fileDirectory.SamplesPerPixel} samples per pixel`
              );
            }
            tiffImage.push({ selection: curSelection, tiff });
            channelNames[curSelection.c] = getImageSelectionName(
              name,
              i,
              imageSelections
            );
          }
        }
      }
    }
  }

  if (tiffImage.length > 0) {
    return load$2(name, tiffImage, opts.channelNames || channelNames, pool);
  }

  throw new Error('Unable to load image from provided TiffFolder source.');
}

/**
 * Preserves (double) slashes earlier in the path, so this works better
 * for URLs. From https://stackoverflow.com/a/46427607/4178400
 * @param args parts of a path or URL to join.
 */
function joinUrlParts(...args) {
  return args
    .map((part, i) => {
      if (i === 0) return part.trim().replace(/[/]*$/g, '');
      return part.trim().replace(/(^[/]*|[/]*$)/g, '');
    })
    .filter(x => x.length)
    .join('/');
}

class ReadOnlyStore {
  async keys() {
    return [];
  }

  async deleteItem() {
    return false;
  }

  async setItem() {
    console.warn('Cannot write to read-only store.');
    return false;
  }
}

class FileStore
  extends ReadOnlyStore
  
{
  
  

  constructor(fileMap, rootPrefix = '') {
    super();
    this._map = fileMap;
    this._rootPrefix = rootPrefix;
  }

   _key(key) {
    return joinUrlParts(this._rootPrefix, key);
  }

  async getItem(key) {
    const file = this._map.get(this._key(key));
    if (!file) {
      throw new KeyError(key);
    }
    const buffer = await file.arrayBuffer();
    return buffer;
  }

  async containsItem(key) {
    const path = this._key(key);
    return this._map.has(path);
  }
}

/*
 * Returns true if data shape is that expected for OME-Zarr.
 */
function isOmeZarr(dataShape, Pixels) {
  const { SizeT, SizeC, SizeZ, SizeY, SizeX } = Pixels;
  // OME-Zarr dim order is always ['t', 'c', 'z', 'y', 'x']
  const omeZarrShape = [SizeT, SizeC, SizeZ, SizeY, SizeX];
  return dataShape.every((size, i) => omeZarrShape[i] === size);
}

/*
 * Specifying different dimension orders form the METADATA.ome.xml is
 * possible and necessary for creating an OME-Zarr precursor.
 *
 * e.g. `bioformats2raw --file_type=zarr --dimension-order='XYZCT'`
 *
 * This is fragile code, and will only be executed if someone
 * tries to specify different dimension orders.
 */
function guessBioformatsLabels(
  { shape },
  { Pixels }
) {
  if (isOmeZarr(shape, Pixels)) {
    // It's an OME-Zarr Image,
    return getLabels('XYZCT');
  }

  // Guess labels derived from OME-XML
  const labels = getLabels(Pixels.DimensionOrder);
  labels.forEach((lower, i) => {
    const label = lower.toUpperCase();
    // @ts-expect-error - FIXME: safer type access
    const xmlSize = Pixels[`Size${label}`];
    if (!xmlSize) {
      throw Error(`Dimension ${label} is invalid for OME-XML.`);
    }
    if (shape[i] !== xmlSize) {
      throw Error('Dimension mismatch between zarr source and OME-XML.');
    }
  });

  return labels;
}

/*
 * Looks for the first file with root path and returns the full path prefix.
 *
 * > const files = [
 * >  { path: '/some/long/path/to/data.zarr/.zattrs' },
 * >  { path: '/some/long/path/to/data.zarr/.zgroup' },
 * >  { path: '/some/long/path/to/data.zarr/0/.zarray' },
 * >  { path: '/some/long/path/to/data.zarr/0/0.0' },
 * > ];
 * > getRootPrefix(files, 'data.zarr') === '/some/long/path/to/data.zarr'
 */
function getRootPrefix(files, rootName) {
  const first = files.find(f => f.path.indexOf(rootName) > 0);
  if (!first) {
    throw Error('Could not find root in store.');
  }
  const prefixLength = first.path.indexOf(rootName) + rootName.length;
  return first.path.slice(0, prefixLength);
}

function isAxis(axisOrLabel) {
  return typeof axisOrLabel[0] !== 'string';
}

function castLabels(dimnames) {
  return dimnames ;
}

async function loadMultiscales(store, path = '') {
  const grp = await openGroup(store, path);
  const rootAttrs = (await grp.attrs.asObject()) ;

  let paths = ['0'];
  // Default axes used for v0.1 and v0.2.
  let labels = castLabels(['t', 'c', 'z', 'y', 'x']);
  if ('multiscales' in rootAttrs) {
    const { datasets, axes } = rootAttrs.multiscales[0];
    paths = datasets.map(d => d.path);
    if (axes) {
      if (isAxis(axes)) {
        labels = castLabels(axes.map(axis => axis.name));
      } else {
        labels = castLabels(axes);
      }
    }
  }

  const data = paths.map(path => grp.getItem(path));
  return {
    data: (await Promise.all(data)) ,
    rootAttrs,
    labels
  };
}

function guessTileSize(arr) {
  const interleaved = isInterleaved(arr.shape);
  const [yChunk, xChunk] = arr.chunks.slice(interleaved ? -3 : -2);
  const size = Math.min(yChunk, xChunk);
  // deck.gl requirement for power-of-two tile size.
  return prevPowerOf2(size);
}

/**
 * The 'indexer' for a Zarr-based source translates
 * a 'selection' to an array of indices that align to
 * the labeled dimensions.
 *
 * > const labels = ['a', 'b', 'y', 'x'];
 * > const indexer = getIndexer(labels);
 * > console.log(indexer({ a: 10, b: 20 }));
 * > // [10, 20, 0, 0]
 */
function getIndexer(labels) {
  const labelSet = new Set(labels);
  if (labelSet.size !== labels.length) {
    throw new Error('Labels must be unique');
  }
  return (sel) => {
    if (Array.isArray(sel)) {
      return [...sel];
    }
    const selection = Array(labels.length).fill(0);
    for (const [key, value] of Object.entries(sel)) {
      const index = labels.indexOf(key );
      if (index === -1) {
        throw new Error(`Invalid indexer key: ${key}`);
      }
      selection[index] = value ;
    }
    return selection;
  };
}

const DTYPE_LOOKUP = {
  u1: 'Uint8',
  u2: 'Uint16',
  u4: 'Uint32',
  f4: 'Float32',
  f8: 'Float64',
  i1: 'Int8',
  i2: 'Int16',
  i4: 'Int32'
} ;
























function slice(start, stop) {
  return { start, stop, step: 1, _slice: true };
}



class BoundsCheckError extends Error {}

class ZarrPixelSource {
  
  

  constructor(
    data,
     labels,
     tileSize
  ) {this.labels = labels;this.tileSize = tileSize;
    this._indexer = getIndexer(labels);
    this._data = data;
  }

  get shape() {
    return this._data.shape;
  }

  get dtype() {
    const suffix = this._data.dtype.slice(1) ;
    if (!(suffix in DTYPE_LOOKUP)) {
      throw Error(`Zarr dtype not supported, got ${suffix}.`);
    }
    return DTYPE_LOOKUP[suffix];
  }

   get _xIndex() {
    const interleave = isInterleaved(this._data.shape);
    return this._data.shape.length - (interleave ? 2 : 1);
  }

   _chunkIndex(
    selection,
    { x, y }
  ) {
    const sel = this._indexer(selection);
    sel[this._xIndex] = x;
    sel[this._xIndex - 1] = y;
    return sel;
  }

  /**
   * Converts x, y tile indices to zarr dimension Slices within image bounds.
   */
   _getSlices(x, y) {
    const { height, width } = getImageSize(this);
    const [xStart, xStop] = [
      x * this.tileSize,
      Math.min((x + 1) * this.tileSize, width)
    ];
    const [yStart, yStop] = [
      y * this.tileSize,
      Math.min((y + 1) * this.tileSize, height)
    ];
    // Deck.gl can sometimes request edge tiles that don't exist. We throw
    // a BoundsCheckError which is picked up in `ZarrPixelSource.onTileError`
    // and ignored by deck.gl.
    if (xStart === xStop || yStart === yStop) {
      throw new BoundsCheckError('Tile slice is zero-sized.');
    }
    if (xStart < 0 || yStart < 0 || xStop > width || yStop > height) {
      throw new BoundsCheckError('Tile slice is out of bounds.');
    }

    return [slice(xStart, xStop), slice(yStart, yStop)];
  }

   async _getRaw(
    selection,
    // biome-ignore lint/suspicious/noExplicitAny: any is used to pass through storeOptions
    getOptions
  ) {
    const result = await this._data.getRaw(selection, getOptions);
    if (typeof result !== 'object') {
      throw new Error('Expected object from getRaw');
    }
    return result;
  }

  async getRaster({
    selection,
    signal
  }) {
    const sel = this._chunkIndex(selection, { x: null, y: null });
    const result = await this._getRaw(sel, { storeOptions: { signal } });
    const {
      data,
      shape: [height, width]
    } = result;
    return { data, width, height } ;
  }

  async getTile(props) {
    const { x, y, selection, signal } = props;
    const [xSlice, ySlice] = this._getSlices(x, y);
    const sel = this._chunkIndex(selection, { x: xSlice, y: ySlice });
    const tile = await this._getRaw(sel, { storeOptions: { signal } });
    const {
      data,
      shape: [height, width]
    } = tile;
    return { data, height, width } ;
  }

  onTileError(err) {
    if (!(err instanceof BoundsCheckError)) {
      // Rethrow error if something other than tile being requested is out of bounds.
      throw err;
    }
  }
}

async function load$1(
  root,
  xmlSource
) {
  let xmlSourceText;
  // If 'File' or 'Response', read as text.
  if (typeof xmlSource !== 'string') {
    xmlSourceText = await xmlSource.text();
  } else {
    xmlSourceText = xmlSource;
  }

  // Get metadata and multiscale data for _first_ image.
  const parsed = fromString(xmlSourceText);
  const images = parsed.images || [];
  const rois = parsed.rois || [];
  const roiRefs = parsed.roiRefs || [];
  
  // Create a map of ROI IDs to ROI objects for quick lookup
  const roiMap = new Map(rois.map(roi => [roi.ID, roi]));
  
  // Add ROIs to the first image based on ROIRefs
  let imgMeta = images[0];
  if (imgMeta) {
    const imageROIRefs = roiRefs.filter(roiRef => {
      // ROIRefs might have an ImageRef or be associated with the image
      // For now, we'll include all ROIRefs since we don't have explicit image association
      return true; // TODO: Add proper image-ROI association logic
    });
    
    // Get the actual ROI objects referenced by the ROIRefs
    const imageROIs = imageROIRefs
      .map(roiRef => roiMap.get(roiRef.ID))
      .filter(Boolean);
    
    const { ROIRef: _omitROIRef, ...imgWithoutRefs } = imgMeta ;
    imgMeta = { ...imgWithoutRefs, ROIs: imageROIs };
  }
  const { data } = await loadMultiscales(root, '0');

  const labels = guessBioformatsLabels(data[0], imgMeta);
  const tileSize = guessTileSize(data[0]);
  const pyramid = data.map(arr => new ZarrPixelSource(arr, labels, tileSize));

  return {
    data: pyramid,
    metadata: imgMeta
  };
}

async function load(store) {
  const { data, rootAttrs, labels } = await loadMultiscales(store);
  const tileSize = guessTileSize(data[0]);
  const pyramid = data.map(arr => new ZarrPixelSource(arr, labels, tileSize));
  return {
    data: pyramid,
    metadata: rootAttrs
  };
}

function _optionalChain$c(ops) { let lastAccessLHS = undefined; let value = ops[0]; let i = 1; while (i < ops.length) { const op = ops[i]; const fn = ops[i + 1]; i += 2; if ((op === 'optionalAccess' || op === 'optionalCall') && value == null) { return undefined; } if (op === 'access' || op === 'optionalAccess') { lastAccessLHS = value; value = fn(value); } else if (op === 'call' || op === 'optionalCall') { value = fn((...args) => value.call(lastAccessLHS, ...args)); lastAccessLHS = undefined; } } return value; }




/**
 * Opens root directory generated via `bioformats2raw --file_type=zarr`. Uses OME-XML metadata,
 * and assumes first image. This function is the zarr-equivalent to using loadOmeTiff.
 *
 * @param {string} source url
 * @param {{ fetchOptions: (undefined | RequestInit) }} options
 * @return {Promise<{ data: ZarrPixelSource[], metadata: ImageMeta }>} data source and associated OMEXML metadata.
 */
async function loadBioformatsZarr(
  source,
  options = {}
) {
  const METADATA = 'METADATA.ome.xml';
  const ZARR_DIR = 'data.zarr';

  if (typeof source === 'string') {
    const url = source.endsWith('/') ? source.slice(0, -1) : source;
    const store = new HTTPStore(`${url}/${ZARR_DIR}`, options);
    const xmlSource = await fetch(`${url}/${METADATA}`, options.fetchOptions);
    if (!xmlSource.ok) {
      throw Error('No OME-XML metadata found for store.');
    }
    return load$1(store, xmlSource);
  }

  /*
   * You can't randomly access files from a directory by path name
   * without the Native File System API, so we need to get objects for _all_
   * the files right away for Zarr. This is unfortunate because we need to iterate
   * over all File objects and create an in-memory index.
   *
   * fMap is simple key-value mapping from 'some/file/path' -> File
   */
  const fMap = new Map();

  let xmlFile;
  for (const file of source) {
    if (file.name === METADATA) {
      xmlFile = file;
    } else {
      fMap.set(file.path, file);
    }
  }

  if (!xmlFile) {
    throw Error('No OME-XML metadata found for store.');
  }

  const store = new FileStore(fMap, getRootPrefix(source, ZARR_DIR));
  return load$1(store, xmlFile);
}

/**
 * Opens root of multiscale OME-Zarr via URL.
 *
 * @param {string} source url
 * @param {{ fetchOptions: (undefined | RequestInit) }} options
 * @return {Promise<{ data: ZarrPixelSource[], metadata: RootAttrs }>} data source and associated OME-Zarr metadata.
 */
async function loadOmeZarr(
  source,
  options = {}
) {
  const store = new HTTPStore(source, options);

  if (_optionalChain$c([options, 'optionalAccess', _ => _.type]) !== 'multiscales') {
    throw Error('Only multiscale OME-Zarr is supported.');
  }

  return load(store);
}

function _nullishCoalesce$3(lhs, rhsFn) { if (lhs != null) { return lhs; } else { return rhsFn(); } } function _optionalChain$b(ops) { let lastAccessLHS = undefined; let value = ops[0]; let i = 1; while (i < ops.length) { const op = ops[i]; const fn = ops[i + 1]; i += 2; if ((op === 'optionalAccess' || op === 'optionalCall') && value == null) { return undefined; } if (op === 'access' || op === 'optionalAccess') { lastAccessLHS = value; value = fn(value); } else if (op === 'call' || op === 'optionalCall') { value = fn((...args) => value.call(lastAccessLHS, ...args)); lastAccessLHS = undefined; } } return value; }
function range(len) {
  return [...Array(len).keys()];
}

/**
 * @template T
 * @param {T[]} arr
 * @param {T} defaultValue
 * @param {number} padWidth
 */
function padWithDefault(arr, defaultValue, padWidth) {
  for (let i = 0; i < padWidth; i += 1) {
    arr.push(defaultValue);
  }
  return arr;
}

/**
 * (Safely) get GL values for associated dtype.
 * @param {keyof typeof DTYPE_VALUES} dtype
 */
function getDtypeValues(dtype) {
  const values = DTYPE_VALUES[dtype];
  if (!values) {
    const valid = Object.keys(DTYPE_VALUES);
    throw Error(`Dtype not supported, got ${dtype}. Must be one of ${valid}.`);
  }
  return values;
}

/**
 * @param {{
 *   contrastLimits?: [min: number, max: number][],
 *   channelsVisible: boolean[],
 *   domain?: [min: number, max: number],
 *   dtype: keyof typeof DTYPE_VALUES,
 * }}
 */
function padContrastLimits({
  contrastLimits = [],
  channelsVisible,
  domain,
  dtype
}) {
  const maxSliderValue = _optionalChain$b([domain, 'optionalAccess', _ => _[1]]) || getDtypeValues(dtype).max;
  const newContrastLimits = contrastLimits.map((slider, i) =>
    channelsVisible[i]
      ? slider
      : /** @type {[number, number]} */ ([maxSliderValue, maxSliderValue])
  );
  // Need to pad contrastLimits and colors with default values (required by shader)
  const padSize = MAX_CHANNELS - newContrastLimits.length;
  if (padSize < 0) {
    throw Error(
      `${newContrastLimits.lengths} channels passed in, but only 6 are allowed.`
    );
  }

  const paddedContrastLimits = padWithDefault(
    newContrastLimits,
    [maxSliderValue, maxSliderValue],
    padSize
  ).reduce((acc, val) => acc.concat(val), []);

  return paddedContrastLimits;
}

/**
 * Get physical size scaling Matrix4
 * @param {Object} loader PixelSource
 */
function getPhysicalSizeScalingMatrix(loader) {
  const { x, y, z } = _nullishCoalesce$3(_optionalChain$b([loader, 'optionalAccess', _2 => _2.meta, 'optionalAccess', _3 => _3.physicalSizes]), () => ( {}));
  if (_optionalChain$b([x, 'optionalAccess', _4 => _4.size]) && _optionalChain$b([y, 'optionalAccess', _5 => _5.size]) && _optionalChain$b([z, 'optionalAccess', _6 => _6.size])) {
    const min = Math.min(z.size, x.size, y.size);
    const ratio = [x.size / min, y.size / min, z.size / min];
    return new Matrix4().scale(ratio);
  }
  return new Matrix4().identity();
}

/**
 * Create a bounding box from a viewport based on passed-in viewState.
 * @param {Object} viewState The viewState for a certain viewport.
 * @returns {View} The DeckGL View for this viewport.
 */
function makeBoundingBox(viewState) {
  const viewport = new OrthographicView().makeViewport({
    // From the current `detail` viewState, we need its projection matrix (actually the inverse).
    viewState,
    height: viewState.height,
    width: viewState.width
  });
  // Use the inverse of the projection matrix to map screen to the view space.
  return [
    viewport.unproject([0, 0]),
    viewport.unproject([viewport.width, 0]),
    viewport.unproject([viewport.width, viewport.height]),
    viewport.unproject([0, viewport.height])
  ];
}

const TARGETS = [1, 2, 3, 4, 5, 10, 20, 25, 50, 100, 200, 250, 500, 1000];
const MIN_TARGET = TARGETS[0];
const MAX_TARGET = TARGETS[TARGETS.length - 1];

const SI_PREFIXES = [
  { symbol: 'Y', exponent: 24 },
  { symbol: 'Z', exponent: 21 },
  { symbol: 'E', exponent: 18 },
  { symbol: 'P', exponent: 15 },
  { symbol: 'T', exponent: 12 },
  { symbol: 'G', exponent: 9 },
  { symbol: 'M', exponent: 6 },
  { symbol: 'k', exponent: 3 },
  { symbol: 'h', exponent: 2 },
  { symbol: 'da', exponent: 1 },
  { symbol: '', exponent: 0 },
  { symbol: 'd', exponent: -1 },
  { symbol: 'c', exponent: -2 },
  { symbol: 'm', exponent: -3 },
  { symbol: 'µ', exponent: -6 },
  { symbol: 'n', exponent: -9 },
  { symbol: 'p', exponent: -12 },
  { symbol: 'f', exponent: -15 },
  { symbol: 'a', exponent: -18 },
  { symbol: 'z', exponent: -21 },
  { symbol: 'y', exponent: -24 }
];

/**
 * Convert a size value to meters.
 * @param {number} size Size in original units.
 * @param {string} unit String like 'mm', 'cm', 'dam', 'm', 'km', etc.
 * @returns {number} Size in meters.
 */
function sizeToMeters(size, unit) {
  if (!unit || unit === 'm') {
    // Already in meters.
    return size;
  }
  if (unit.length > 1) {
    // We remove the trailing 'm' from the unit, so 'cm' becomes 'c' and 'dam' becomes 'da'.
    let unitPrefix = unit.substring(0, unit.length - 1);
    // Support 'u' as a prefix for micrometers.
    if (unitPrefix === 'u') {
      unitPrefix = 'µ';
    }
    const unitObj = SI_PREFIXES.find(p => p.symbol === unitPrefix);
    if (unitObj) {
      return size * 10 ** unitObj.exponent;
    }
  }
  throw new Error('Received unknown unit');
}

/**
 * Snap any scale bar value to a "nice" value
 * like 1, 5, 10, 20, 25, 50, 100, 200, 250, 500.
 * If needed, will use different units.
 * @param {number} value Intended value for scale bar,
 * not necessarily a "nice" value. Assumed
 * to be in meters.
 * @returns {[number, number, string]} Tuple like
 * [nice value in meters, nice value in new units, SI prefix for new units].
 * The value in original units (meters) can be used to compute the size
 * in pixels for the scale bar. The value in new units can be
 * displayed in the text label of the scale bar.
 */
function snapValue(value) {
  let magnitude = 0;

  // If the value is outside the range of our "nice" targets,
  // we compute the magnitude of change needed to bring it
  // into this range.
  if (value < MIN_TARGET || value > MAX_TARGET) {
    magnitude = Math.floor(Math.log10(value));
  }

  // While the magnitude will re-scale the value correctly,
  // it might not be a multiple of 3, so we use the nearest
  // SI prefix exponent. For example, if the magnitude is 4 or 5,
  // we would want to use an exponent of 3 (for 10 or 100 km),
  // since there is not an SI unit for exponents 4 nor 5.
  let snappedUnit = SI_PREFIXES.find(
    p => p.exponent % 3 === 0 && p.exponent <= magnitude
  );

  // We re-scale the original value so it is in the range of our
  // "nice" targets (between 1 and 1000).
  let adjustedValue = value / 10 ** snappedUnit.exponent;

  // The problem is that a value between 500 and 1000 will be snapped
  // to 1000, which is not what we want. We check for this here, and
  // snap to the next SI prefix if necessary. This will result in an adjusted
  // value of 1 (in the next SI unit) rather than 1000 (in the previous one).
  if (adjustedValue > 500 && adjustedValue <= 1000) {
    snappedUnit = SI_PREFIXES.find(
      p => p.exponent % 3 === 0 && p.exponent <= magnitude + 3
    );
    adjustedValue = value / 10 ** snappedUnit.exponent;
  }

  // We snap to the nearest target value. This will be the
  // number used in the text label.
  const targetNewUnits = TARGETS.find(t => t > adjustedValue);

  // We use the "nice" target value to re-compute the value in the
  // original units, which will be used to compute the size in pixels.
  const targetOrigUnits = targetNewUnits * 10 ** snappedUnit.exponent;

  return [targetOrigUnits, targetNewUnits, snappedUnit.symbol];
}

function addAlpha(array) {
  if (!(array instanceof Uint8Array)) {
    throw new Error('Expected Uint8Array');
  }
  const alphaArray = new Uint8Array(array.length + array.length / 3);
  for (let i = 0; i < array.length / 3; i += 1) {
    alphaArray[i * 4] = array[i * 3];
    alphaArray[i * 4 + 1] = array[i * 3 + 1];
    alphaArray[i * 4 + 2] = array[i * 3 + 2];
    alphaArray[i * 4 + 3] = 255;
  }
  return alphaArray;
}

const PHOTOMETRIC_INTERPRETATIONS = {
  WhiteIsZero: 0,
  BlackIsZero: 1,
  RGB: 2,
  Palette: 3,
  TransparencyMask: 4,
  CMYK: 5,
  YCbCr: 6,
  CIELab: 8,
  ICCLab: 9
};

const defaultProps$8 = {
  ...BitmapLayer$1.defaultProps,
  pickable: { type: 'boolean', value: true, compare: true },
  coordinateSystem: COORDINATE_SYSTEM.CARTESIAN
};

const getPhotometricInterpretationShader = (
  photometricInterpretation,
  transparentColorInHook
) => {
  const useTransparentColor = transparentColorInHook ? 'true' : 'false';
  const transparentColorVector = `vec3(${(transparentColorInHook || [0, 0, 0])
    .map(i => String(i / 255))
    .join(',')})`;
  switch (photometricInterpretation) {
    case PHOTOMETRIC_INTERPRETATIONS.RGB:
      return `color[3] = (${useTransparentColor} && (color.rgb == ${transparentColorVector})) ? 0.0 : color.a;`;
    case PHOTOMETRIC_INTERPRETATIONS.WhiteIsZero:
      return `\
          float value = 1.0 - (color.r / 256.0);
          color = vec4(value, value, value, (${useTransparentColor} && vec3(value, value, value) == ${transparentColorVector}) ? 0.0 : color.a);
        `;
    case PHOTOMETRIC_INTERPRETATIONS.BlackIsZero:
      return `\
          float value = (color.r / 256.0);
          color = vec4(value, value, value, (${useTransparentColor} && vec3(value, value, value) == ${transparentColorVector}) ? 0.0 : color.a);
        `;
    case PHOTOMETRIC_INTERPRETATIONS.YCbCr:
      // We need to use an epsilon because the conversion to RGB is not perfect.
      return `\
          float y = color[0];
          float cb = color[1];
          float cr = color[2];
          color[0] = (y + (1.40200 * (cr - .5)));
          color[1] = (y - (0.34414 * (cb - .5)) - (0.71414 * (cr - .5)));
          color[2] = (y + (1.77200 * (cb - .5)));
          color[3] = (${useTransparentColor} && distance(color.rgb, ${transparentColorVector}) < 0.01) ? 0.0 : color.a;
        `;
    default:
      console.error(
        'Unsupported photometric interpretation or none provided.  No transformation will be done to image data'
      );
      return '';
  }
};

const getTransparentColor = photometricInterpretation => {
  switch (photometricInterpretation) {
    case PHOTOMETRIC_INTERPRETATIONS.RGB:
      return [0, 0, 0, 0];
    case PHOTOMETRIC_INTERPRETATIONS.WhiteIsZero:
      return [255, 255, 255, 0];
    case PHOTOMETRIC_INTERPRETATIONS.BlackIsZero:
      return [0, 0, 0, 0];
    case PHOTOMETRIC_INTERPRETATIONS.YCbCr:
      return [16, 128, 128, 0];
    default:
      console.error(
        'Unsupported photometric interpretation or none provided.  No transformation will be done to image data'
      );
      return [0, 0, 0, 0];
  }
};

class BitmapLayerWrapper extends BitmapLayer$1 {
  _getModel(gl) {
    const { photometricInterpretation, transparentColorInHook } = this.props;
    // This is a port to the GPU of a subset of https://github.com/geotiffjs/geotiff.js/blob/master/src/rgb.js
    // Safari was too slow doing this off of the GPU and it is noticably faster on other browsers as well.
    const photometricInterpretationShader = getPhotometricInterpretationShader(
      photometricInterpretation,
      transparentColorInHook
    );
    return new Model(this.context.device, {
      ...this.getShaders(),
      id: this.props.id,
      bufferLayout: this.getAttributeManager().getBufferLayouts(),
      topology: 'triangle-list',
      isInstanced: false,
      inject: {
        'fs:DECKGL_FILTER_COLOR': photometricInterpretationShader
      }
    });
  }
}

/**
 * @typedef LayerProps
 * @type {object}
 * @property {number=} opacity Opacity of the layer.
 * @property {function=} onClick Hook function from deck.gl to handle clicked-on objects.
 * @property {Object=} modelMatrix Math.gl Matrix4 object containing an affine transformation to be applied to the image.
 * @property {number=} photometricInterpretation One of WhiteIsZero BlackIsZero YCbCr or RGB (default)
 * @property {Array.<number>=} transparentColor An RGB (0-255 range) color to be considered "transparent" if provided.
 * In other words, any fragment shader output equal transparentColor (before applying opacity) will have opacity 0.
 * This parameter only needs to be a truthy value when using colormaps because each colormap has its own transparent color that is calculated on the shader.
 * Thus setting this to a truthy value (with a colormap set) indicates that the shader should make that color transparent.
 * @property {String=} id Unique identifier for this layer.
 */
/**
 * @type {{ new (...props: import('@vivjs/types').Viv<LayerProps>[]) }}
 * @ignore
 */
const BitmapLayer = class extends CompositeLayer {
  initializeState(args) {
    const { device } = this.context;
    // This tells WebGL how to read row data from the texture.  For example, the default here is 4 (i.e for RGBA, one byte per channel) so
    // each row of data is expected to be a multiple of 4.  This setting (i.e 1) allows us to have non-multiple-of-4 row sizes.  For example, for 2 byte (16 bit data),
    // we could use 2 as the value and it would still work, but 1 also works fine (and is more flexible for 8 bit - 1 byte - textures as well).
    // https://stackoverflow.com/questions/42789896/webgl-error-arraybuffer-not-big-enough-for-request-in-case-of-gl-luminance
    // This needs to be called here and not in the BitmapLayerWrapper because the `image` prop is converted to a texture outside of the layer, as controlled by the `image` type.
    // See: https://github.com/visgl/deck.gl/pull/5197
    device.setParametersWebGL({
      [GL.UNPACK_ALIGNMENT]: 1,
      [GL.PACK_ALIGNMENT]: 1
    });
    super.initializeState(args);
  }

  renderLayers() {
    const {
      photometricInterpretation,
      transparentColor: transparentColorInHook
    } = this.props;
    const transparentColor = getTransparentColor(photometricInterpretation);
    this.props.image.data = addAlpha(this.props.image.data);
    return new BitmapLayerWrapper(this.props, {
      // transparentColor is a prop applied to the original image data by deck.gl's
      // BitmapLayer and needs to be in the original colorspace.  It is used to determine
      // what color is "transparent" in the original color space (i.e what shows when opacity is 0).
      transparentColor,
      // This is our transparentColor props which needs to be applied in the hook that converts to the RGB space.
      transparentColorInHook,
      id: `${this.props.id}-wrapped`
    });
  }
};

BitmapLayer.layerName = 'BitmapLayer';
// From https://github.com/geotiffjs/geotiff.js/blob/8ef472f41b51d18074aece2300b6a8ad91a21ae1/src/globals.js#L202-L213
BitmapLayer.PHOTOMETRIC_INTERPRETATIONS = PHOTOMETRIC_INTERPRETATIONS;
BitmapLayer.defaultProps = {
  ...defaultProps$8,
  // We don't want this layer to bind the texture so the type should not be `image`.
  image: { type: 'object', value: {}, compare: true },
  transparentColor: { type: 'array', value: [0, 0, 0], compare: true },
  photometricInterpretation: { type: 'number', value: 2, compare: true }
};
BitmapLayerWrapper.defaultProps = defaultProps$8;
BitmapLayerWrapper.layerName = 'BitmapLayerWrapper';

const fs$2 = `\
float apply_contrast_limits(float intensity, vec2 contrastLimits) {
    return  max(0., (intensity - contrastLimits[0]) / max(0.0005, (contrastLimits[1] - contrastLimits[0])));
}
`;

var channels = {
  name: 'channel-intensity',
  defines: {
    SAMPLER_TYPE: 'usampler2D',
    COLORMAP_FUNCTION: ''
  },
  fs: fs$2
};

var fs$1 = `\
#version 300 es
#define SHADER_NAME xr-layer-fragment-shader

precision highp float;
precision highp int;
precision highp SAMPLER_TYPE;

// our texture
uniform SAMPLER_TYPE channel0;
uniform SAMPLER_TYPE channel1;
uniform SAMPLER_TYPE channel2;
uniform SAMPLER_TYPE channel3;
uniform SAMPLER_TYPE channel4;
uniform SAMPLER_TYPE channel5;

in vec2 vTexCoord;

// range
uniform vec2 contrastLimits[6];

out vec4 fragColor;

void main() {

  float intensity0 = float(texture(channel0, vTexCoord).r);
  DECKGL_PROCESS_INTENSITY(intensity0, contrastLimits[0], 0);
  float intensity1 = float(texture(channel1, vTexCoord).r);
  DECKGL_PROCESS_INTENSITY(intensity1, contrastLimits[1], 1);
  float intensity2 = float(texture(channel2, vTexCoord).r);
  DECKGL_PROCESS_INTENSITY(intensity2, contrastLimits[2], 2);
  float intensity3 = float(texture(channel3, vTexCoord).r);
  DECKGL_PROCESS_INTENSITY(intensity3, contrastLimits[3], 3);
  float intensity4 = float(texture(channel4, vTexCoord).r);
  DECKGL_PROCESS_INTENSITY(intensity4, contrastLimits[4], 4);
  float intensity5 = float(texture(channel5, vTexCoord).r);
  DECKGL_PROCESS_INTENSITY(intensity5, contrastLimits[5], 5);

  DECKGL_MUTATE_COLOR(fragColor, intensity0, intensity1, intensity2, intensity3, intensity4, intensity5, vTexCoord);


  geometry.uv = vTexCoord;
  DECKGL_FILTER_COLOR(fragColor, geometry);
}
`;

var vs$1 = `\
#version 300 es
#define SHADER_NAME xr-layer-vertex-shader

in vec2 texCoords;
in vec3 positions;
in vec3 positions64Low;
in vec3 instancePickingColors;
out vec2 vTexCoord;

void main(void) {
  geometry.worldPosition = positions;
  geometry.uv = texCoords;
  geometry.pickingColor = instancePickingColors;
  gl_Position = project_position_to_clipspace(positions, positions64Low, vec3(0.), geometry.position);
  DECKGL_FILTER_GL_POSITION(gl_Position, geometry);
  vTexCoord = texCoords;
  vec4 color = vec4(0.);
  DECKGL_FILTER_COLOR(color, geometry);
}
`;

const coreShaderModule = { fs: fs$1, vs: vs$1 };

function getRenderingAttrs$1(dtype, interpolation) {
  /// - WebGL1 is no longer supported by lumagl etc.
  /// 'device' is no longer used, possible in future we want to distinguish between WebGL and WebGPU?
  // Linear filtering only works when the data type is cast to Float32.
  const isLinear = interpolation === 'linear';
  const values = getDtypeValues(isLinear ? 'Float32' : dtype);
  return {
    shaderModule: coreShaderModule,
    filter: interpolation,
    cast: isLinear ? data => new Float32Array(data) : data => data,
    ...values
  };
}

function _nullishCoalesce$2(lhs, rhsFn) { if (lhs != null) { return lhs; } else { return rhsFn(); } } function _optionalChain$a(ops) { let lastAccessLHS = undefined; let value = ops[0]; let i = 1; while (i < ops.length) { const op = ops[i]; const fn = ops[i + 1]; i += 2; if ((op === 'optionalAccess' || op === 'optionalCall') && value == null) { return undefined; } if (op === 'access' || op === 'optionalAccess') { lastAccessLHS = value; value = fn(value); } else if (op === 'call' || op === 'optionalCall') { value = fn((...args) => value.call(lastAccessLHS, ...args)); lastAccessLHS = undefined; } } return value; }
const defaultProps$7 = {
  pickable: { type: 'boolean', value: true, compare: true },
  coordinateSystem: COORDINATE_SYSTEM.CARTESIAN,
  channelData: { type: 'object', value: {}, compare: true },
  bounds: { type: 'array', value: [0, 0, 1, 1], compare: true },
  contrastLimits: { type: 'array', value: [], compare: true },
  channelsVisible: { type: 'array', value: [], compare: true },
  dtype: { type: 'string', value: 'Uint16', compare: true },
  interpolation: {
    type: 'string',
    value: 'nearest',
    compare: true
  }
};

/**
 * @typedef LayerProps
 * @type {object}
 * @property {Array.<Array.<number>>} contrastLimits List of [begin, end] values to control each channel's ramp function.
 * @property {Array.<boolean>} channelsVisible List of boolean values for each channel for whether or not it is visible.
 * @property {string} dtype Dtype for the layer.
 * @property {Array.<number>=} domain Override for the possible max/min values (i.e something different than 65535 for uint16/'<u2').
 * @property {String=} id Unique identifier for this layer.
 * @property {function=} onHover Hook function from deck.gl to handle hover objects.
 * @property {function=} onClick Hook function from deck.gl to handle clicked-on objects.
 * @property {Object=} modelMatrix Math.gl Matrix4 object containing an affine transformation to be applied to the image.
 * Thus setting this to a truthy value (with a colormap set) indicates that the shader should make that color transparent.
 * @property {'nearest'|'linear'=} interpolation The `minFilter` and `magFilter` for luma.gl rendering (see https://luma.gl/docs/api-reference/core/resources/sampler#texture-magnification-filter) - default is 'nearest'
 */
/**
 * @type {{ new (...props: import('@vivjs/types').Viv<LayerProps>[]) }}
 * @ignore
 */
const XRLayer = class extends Layer {
  /**
   * This function replaces `usampler` with `sampler` if the data is not an unsigned integer
   * and adds a standard ramp function default for DECKGL_PROCESS_INTENSITY.
   */
  getShaders() {
    const { dtype, interpolation } = this.props;
    const { shaderModule, sampler } = getRenderingAttrs$1(dtype, interpolation);
    const extensionDefinesDeckglProcessIntensity =
      this._isHookDefinedByExtensions('fs:DECKGL_PROCESS_INTENSITY');
    const newChannelsModule = { ...channels, inject: {} };
    if (!extensionDefinesDeckglProcessIntensity) {
      newChannelsModule.inject['fs:DECKGL_PROCESS_INTENSITY'] = `
        intensity = apply_contrast_limits(intensity, contrastLimits);
      `;
    }
    return super.getShaders({
      ...shaderModule,
      defines: {
        SAMPLER_TYPE: sampler
      },
      modules: [project32, picking, newChannelsModule]
    });
  }

  _isHookDefinedByExtensions(hookName) {
    const { extensions } = this.props;
    return _optionalChain$a([extensions, 'optionalAccess', _ => _.some, 'call', _2 => _2(e => {
      const shaders = e.getShaders();
      const { inject = {}, modules = [] } = shaders;
      const definesInjection = inject[hookName];
      const moduleDefinesInjection = modules.some(m => _optionalChain$a([m, 'optionalAccess', _3 => _3.inject, 'access', _4 => _4[hookName]]));
      return definesInjection || moduleDefinesInjection;
    })]);
  }

  /**
   * This function initializes the internal state.
   */
  initializeState() {
    const { device } = this.context;
    // This tells WebGL how to read row data from the texture.  For example, the default here is 4 (i.e for RGBA, one byte per channel) so
    // each row of data is expected to be a multiple of 4.  This setting (i.e 1) allows us to have non-multiple-of-4 row sizes.  For example, for 2 byte (16 bit data),
    // we could use 2 as the value and it would still work, but 1 also works fine (and is more flexible for 8 bit - 1 byte - textures as well).
    // https://stackoverflow.com/questions/42789896/webgl-error-arraybuffer-not-big-enough-for-request-in-case-of-gl-luminance
    // -- this way of setting parameters is now deprecated and will be subject to further changes moving towards later luma.gl versions & WebGPU.
    device.setParametersWebGL({
      [GL.UNPACK_ALIGNMENT]: 1,
      [GL.PACK_ALIGNMENT]: 1
    });
    const attributeManager = this.getAttributeManager();
    attributeManager.add({
      positions: {
        size: 3,
        type: 'float64',
        fp64: this.use64bitPositions(),
        update: this.calculatePositions,
        noAlloc: true
      }
    });
    this.setState({
      numInstances: 1,
      positions: new Float64Array(12)
    });
    const shaderAssembler = ShaderAssembler.getDefaultShaderAssembler();

    const mutateStr =
      'fs:DECKGL_MUTATE_COLOR(inout vec4 rgba, float intensity0, float intensity1, float intensity2, float intensity3, float intensity4, float intensity5, vec2 vTexCoord)';
    const processStr =
      'fs:DECKGL_PROCESS_INTENSITY(inout float intensity, vec2 contrastLimits, int channelIndex)';
    // Only initialize shader hook functions _once globally_
    // Since the program manager is shared across all layers, but many layers
    // might be created, this solves the performance issue of always adding new
    // hook functions.
    // See https://github.com/kylebarron/deck.gl-raster/blob/2eb91626f0836558f0be4cd201ea18980d7f7f2d/src/deckgl/raster-layer/raster-layer.js#L21-L40
    // Note: _hookFunctions is private, not sure if there's an appropriate way to check if a hook function is already added.
    // it may be better to add these hooks somewhere else rather than in initializeState of a layer?
    if (!shaderAssembler._hookFunctions.includes(mutateStr)) {
      shaderAssembler.addShaderHook(mutateStr);
    }
    if (!shaderAssembler._hookFunctions.includes(processStr)) {
      shaderAssembler.addShaderHook(processStr);
    }
  }

  /**
   * This function finalizes state by clearing all textures from the WebGL context
   */
  finalizeState() {
    super.finalizeState();

    if (this.state.textures) {
      Object.values(this.state.textures).forEach(tex => _optionalChain$a([tex, 'optionalAccess', _5 => _5.delete, 'call', _6 => _6()]));
    }
  }

  /**
   * This function updates state by retriggering model creation (shader compilation and attribute binding)
   * and loading any textures that need be loading.
   */
  updateState({ props, oldProps, changeFlags, ...rest }) {
    super.updateState({ props, oldProps, changeFlags, ...rest });
    // setup model first
    if (
      changeFlags.extensionsChanged ||
      props.interpolation !== oldProps.interpolation
    ) {
      const { device } = this.context;
      if (this.state.model) {
        this.state.model.destroy();
      }
      this.setState({ model: this._getModel(device) });

      this.getAttributeManager().invalidateAll();
    }
    if (
      (props.channelData !== oldProps.channelData &&
        _optionalChain$a([props, 'access', _7 => _7.channelData, 'optionalAccess', _8 => _8.data]) !== _optionalChain$a([oldProps, 'access', _9 => _9.channelData, 'optionalAccess', _10 => _10.data])) ||
      props.interpolation !== oldProps.interpolation
    ) {
      this.loadChannelTextures(props.channelData);
    }
    const attributeManager = this.getAttributeManager();
    if (props.bounds !== oldProps.bounds) {
      attributeManager.invalidate('positions');
    }
  }

  /**
   * This function creates the luma.gl model.
   */
  _getModel(gl) {
    if (!gl) {
      return null;
    }

    /*
       0,0 --- 1,0
        |       |
       0,1 --- 1,1
     */
    return new Model(gl, {
      ...this.getShaders(),
      id: this.props.id,
      geometry: new Geometry({
        topology: 'triangle-list',
        vertexCount: 6,
        indices: new Uint16Array([0, 1, 3, 1, 2, 3]),
        attributes: {
          texCoords: {
            value: new Float32Array([0, 1, 0, 0, 1, 0, 1, 1]),
            size: 2
          }
        }
      }),
      bufferLayout: this.getAttributeManager().getBufferLayouts(),
      isInstanced: false
    });
  }

  /**
   * This function generates view positions for use as a vec3 in the shader
   */
  calculatePositions(attributes) {
    const { positions } = this.state;
    const { bounds } = this.props;
    // bounds as [minX, minY, maxX, maxY]
    /*
      (minX0, maxY3) ---- (maxX2, maxY3)
             |                  |
             |                  |
             |                  |
      (minX0, minY1) ---- (maxX2, minY1)
   */
    positions[0] = bounds[0];
    positions[1] = bounds[1];
    positions[2] = 0;

    positions[3] = bounds[0];
    positions[4] = bounds[3];
    positions[5] = 0;

    positions[6] = bounds[2];
    positions[7] = bounds[3];
    positions[8] = 0;

    positions[9] = bounds[2];
    positions[10] = bounds[1];
    positions[11] = 0;

    attributes.value = positions;
  }

  /**
   * This function runs the shaders and draws to the canvas
   */
  draw(opts) {
    const { uniforms } = opts;
    const { textures, model } = this.state;
    if (textures && model) {
      const { contrastLimits, domain, dtype, channelsVisible } = this.props;
      // Check number of textures not null.
      const numTextures = Object.values(textures).filter(t => t).length;
      // Slider values and color values can come in before textures since their data is async.
      // Thus we pad based on the number of textures bound.
      const paddedContrastLimits = padContrastLimits({
        contrastLimits: contrastLimits.slice(0, numTextures),
        channelsVisible: channelsVisible.slice(0, numTextures),
        domain,
        dtype
      });
      model.setUniforms(
        {
          ...uniforms,
          contrastLimits: paddedContrastLimits
        },
        { disableWarnings: false }
      );
      model.setBindings(textures);
      model.draw(this.context.renderPass);
    }
  }

  /**
   * This function loads all channel textures from incoming resolved promises/data from the loaders by calling `dataToTexture`
   */
  loadChannelTextures(channelData) {
    const textures = {
      channel0: null,
      channel1: null,
      channel2: null,
      channel3: null,
      channel4: null,
      channel5: null
    };
    if (this.state.textures) {
      Object.values(this.state.textures).forEach(tex => _optionalChain$a([tex, 'optionalAccess', _11 => _11.delete, 'call', _12 => _12()]));
    }
    if (
      channelData &&
      Object.keys(channelData).length > 0 &&
      channelData.data
    ) {
      channelData.data.forEach((d, i) => {
        textures[`channel${i}`] = this.dataToTexture(
          d,
          channelData.width,
          channelData.height
        );
      }, this);
      // null textures will throw errors, so we just set unused channels to the first texture for now.
      for (const key in textures) {
        if (!textures.channel0) throw new Error('Bad texture state!');
        if (!textures[key]) textures[key] = textures.channel0;
      }
      this.setState({ textures });
    }
  }

  /**
   * This function creates textures from the data
   */
  dataToTexture(data, width, height) {
    const { interpolation } = this.props;
    const attrs = getRenderingAttrs$1(this.props.dtype, interpolation);

    return this.context.device.createTexture({
      width,
      height,
      dimension: '2d',
      data: _nullishCoalesce$2(_optionalChain$a([attrs, 'access', _13 => _13.cast, 'optionalCall', _14 => _14(data)]), () => ( data)),
      // we don't want or need mimaps
      mipmaps: false,
      sampler: {
        // NEAREST for integer data
        minFilter: attrs.filter,
        magFilter: attrs.filter,
        // CLAMP_TO_EDGE to remove tile artifacts
        addressModeU: 'clamp-to-edge',
        addressModeV: 'clamp-to-edge'
      },
      format: attrs.format
    });
  }
};

XRLayer.layerName = 'XRLayer';
XRLayer.defaultProps = defaultProps$7;

function _optionalChain$9(ops) { let lastAccessLHS = undefined; let value = ops[0]; let i = 1; while (i < ops.length) { const op = ops[i]; const fn = ops[i + 1]; i += 2; if ((op === 'optionalAccess' || op === 'optionalCall') && value == null) { return undefined; } if (op === 'access' || op === 'optionalAccess') { lastAccessLHS = value; value = fn(value); } else if (op === 'call' || op === 'optionalCall') { value = fn((...args) => value.call(lastAccessLHS, ...args)); lastAccessLHS = undefined; } } return value; }
const defaultProps$6 = {
  pickable: { type: 'boolean', value: true, compare: true },
  coordinateSystem: COORDINATE_SYSTEM.CARTESIAN,
  contrastLimits: { type: 'array', value: [], compare: true },
  channelsVisible: { type: 'array', value: [], compare: true },
  selections: { type: 'array', value: [], compare: true },
  domain: { type: 'array', value: [], compare: true },
  viewportId: { type: 'string', value: '', compare: true },
  loader: {
    type: 'object',
    value: {
      getRaster: async () => ({ data: [], height: 0, width: 0 }),
      dtype: 'Uint16',
      shape: []
    },
    compare: true
  },
  onClick: { type: 'function', value: null, compare: true },
  onViewportLoad: { type: 'function', value: null, compare: true },
  interpolation: {
    type: 'number',
    value: 'nearest',
    compare: true
  },
  extensions: {
    type: 'array',
    value: [new ColorPaletteExtension()],
    compare: true
  }
};

/**
 * @typedef LayerProps
 * @type {Object}
 * @property {Array.<Array.<number>>} contrastLimits List of [begin, end] values to control each channel's ramp function.
 * @property {Array.<boolean>} channelsVisible List of boolean values for each channel for whether or not it is visible.
 * @property {Object} loader PixelSource. Represents an N-dimensional image.
 * @property {Array} selections Selection to be used for fetching data.
 * @property {Array.<Array.<number>>=} domain Override for the possible max/min values (i.e something different than 65535 for uint16/'<u2').
 * @property {string=} viewportId Id for the current view.  This needs to match the viewState id in deck.gl and is necessary for the lens.
 * @property {function=} onHover Hook function from deck.gl to handle hover objects.
 * @property {function=} onClick Hook function from deck.gl to handle clicked-on objects.
 * @property {Object=} modelMatrix Math.gl Matrix4 object containing an affine transformation to be applied to the image.
 * @property {function=} onViewportLoad Function that gets called when the data in the viewport loads.
 * @property {String=} id Unique identifier for this layer.
 * @property {Array=} extensions [deck.gl extensions](https://deck.gl/docs/developer-guide/custom-layers/layer-extensions) to add to the layers.
 */

/**
 * @type {{ new <S extends string[]>(...props: import('@vivjs/types').Viv<LayerProps, S>[]) }}
 * @ignore
 */
const ImageLayer = class extends CompositeLayer {
  finalizeState() {
    this.state.abortController.abort();
  }

  updateState({ props, oldProps }) {
    const loaderChanged = props.loader !== oldProps.loader;
    const selectionsChanged = props.selections !== oldProps.selections;

    if (loaderChanged || selectionsChanged) {
      // Only fetch new data to render if loader has changed
      const { loader, selections = [], onViewportLoad } = this.props;
      const abortController = new AbortController();
      this.setState({ abortController });
      const { signal } = abortController;
      const getRaster = selection => loader.getRaster({ selection, signal });
      const dataPromises = selections.map(getRaster);

      Promise.all(dataPromises)
        .then(rasters => {
          const raster = {
            data: rasters.map(d => d.data),
            width: _optionalChain$9([rasters, 'access', _ => _[0], 'optionalAccess', _2 => _2.width]),
            height: _optionalChain$9([rasters, 'access', _3 => _3[0], 'optionalAccess', _4 => _4.height])
          };

          if (isInterleaved(loader.shape)) {
            // data is for BitmapLayer and needs to be of form { data: Uint8Array, width, height };
            raster.data = raster.data[0];
            if (raster.data.length === raster.width * raster.height * 3) {
              // Previously there was a rgb format, but now we only convert to rgba in BitmapLater
              raster.format = 'rgba8unorm';
            }
          }

          if (onViewportLoad) {
            onViewportLoad(raster);
          }
          this.setState({ ...raster });
        })
        .catch(e => {
          if (e !== SIGNAL_ABORTED) {
            throw e; // re-throws error if not our signal
          }
        });
    }
  }

  getPickingInfo({ info, sourceLayer }) {
    info.sourceLayer = sourceLayer;
    info.tile = sourceLayer.props.tile;
    return info;
  }

  renderLayers() {
    const { loader, id } = this.props;
    const { dtype } = loader;
    const { width, height, data } = this.state;
    if (!(width && height)) return null;

    const bounds = [0, height, width, 0];
    if (isInterleaved(loader.shape)) {
      const { photometricInterpretation = 2 } = loader.meta;
      return new BitmapLayer(this.props, {
        image: this.state,
        photometricInterpretation,
        // Shared props with XRLayer:
        bounds,
        id: `image-sub-layer-${bounds}-${id}`,
        extensions: []
      });
    }
    return new XRLayer(this.props, {
      channelData: { data, height, width },
      // Shared props with BitmapLayer:
      bounds,
      id: `image-sub-layer-${bounds}-${id}`,
      dtype
    });
  }
};

ImageLayer.layerName = 'ImageLayer';
ImageLayer.defaultProps = defaultProps$6;

function renderSubLayers(props) {
  const {
    bbox: { left, top, right, bottom },
    index: { x, y, z }
  } = props.tile;
  const { data, id, loader, maxZoom } = props;
  // Only render in positive coorinate system
  if ([left, bottom, right, top].some(v => v < 0) || !data) {
    return null;
  }
  const base = loader[0];
  const { height, width } = getImageSize(base);
  // Tiles are exactly fitted to have height and width such that their bounds match that of the actual image (not some padded version).
  // Thus the right/bottom given by deck.gl are incorrect since they assume tiles are of uniform sizes, which is not the case for us.
  const bounds = [
    left,
    data.height < base.tileSize ? height : bottom,
    data.width < base.tileSize ? width : right,
    top
  ];
  if (isInterleaved(base.shape)) {
    const { photometricInterpretation = 2 } = base.meta;
    return new BitmapLayer(props, {
      image: data,
      photometricInterpretation,
      // Shared props with XRLayer:
      bounds,
      id: `tile-sub-layer-${bounds}-${id}`,
      tileId: { x, y, z },
      extensions: []
    });
  }
  return new XRLayer(props, {
    channelData: data,
    // Uncomment to help debugging - shades the tile being hovered over.
    // autoHighlight: true,
    // highlightColor: [80, 80, 80, 50],
    // Shared props with BitmapLayer:
    bounds,
    id: `tile-sub-layer-${bounds}-${id}`,
    tileId: { x, y, z },
    // The auto setting is NEAREST at the highest resolution but LINEAR otherwise.
    interpolation: z === maxZoom ? 'nearest' : 'linear'
  });
}

const defaultProps$5 = {
  pickable: { type: 'boolean', value: true, compare: true },
  coordinateSystem: COORDINATE_SYSTEM.CARTESIAN,
  contrastLimits: { type: 'array', value: [], compare: true },
  channelsVisible: { type: 'array', value: [], compare: true },
  renderSubLayers: { type: 'function', value: renderSubLayers, compare: false },
  dtype: { type: 'string', value: 'Uint16', compare: true },
  domain: { type: 'array', value: [], compare: true },
  viewportId: { type: 'string', value: '', compare: true },
  interpolation: { type: 'number', value: null, compare: true }
};

/**
 * This layer serves as a proxy of sorts to the rendering done in renderSubLayers, reacting to viewport changes in a custom manner.
 */
class MultiscaleImageLayerBase extends TileLayer {
  /**
   * This function allows us to controls which viewport gets to update the Tileset2D.
   * This is a uniquely TileLayer issue since it updates based on viewport updates thanks
   * to its ability to handle zoom-pan loading.  Essentially, with a picture-in-picture,
   * this prevents it from detecting the update of some other viewport that is unwanted.
   */
  _updateTileset() {
    if (!this.props.viewportId) {
      super._updateTileset();
    }
    if (
      (this.props.viewportId &&
        this.context.viewport.id === this.props.viewportId) ||
      // I don't know why, but DeckGL doesn't recognize multiple views on the first pass
      // so we force update on the first pass by checking if there is a viewport in the tileset.
      !this.state.tileset._viewport
    ) {
      super._updateTileset();
    }
  }
}

MultiscaleImageLayerBase.layerName = 'MultiscaleImageLayerBase';
MultiscaleImageLayerBase.defaultProps = defaultProps$5;

const defaultProps$4 = {
  pickable: { type: 'boolean', value: true, compare: true },
  onHover: { type: 'function', value: null, compare: false },
  contrastLimits: { type: 'array', value: [], compare: true },
  channelsVisible: { type: 'array', value: [], compare: true },
  domain: { type: 'array', value: [], compare: true },
  viewportId: { type: 'string', value: '', compare: true },
  maxRequests: { type: 'number', value: 10, compare: true },
  onClick: { type: 'function', value: null, compare: true },
  refinementStrategy: { type: 'string', value: null, compare: true },
  excludeBackground: { type: 'boolean', value: false, compare: true },
  extensions: {
    type: 'array',
    value: [new ColorPaletteExtension()],
    compare: true
  }
};

/**
 * @typedef LayerProps
 * @type {object}
 * @property {Array.<Array.<number>>} contrastLimits List of [begin, end] values to control each channel's ramp function.
 * @property {Array.<boolean>} channelsVisible List of boolean values for each channel for whether or not it is visible.
 * @property {Array} loader Image pyramid. PixelSource[], where each PixelSource is decreasing in shape.
 * @property {Array} selections Selection to be used for fetching data.
 * @property {Array.<Array.<number>>=} domain Override for the possible max/min values (i.e something different than 65535 for uint16/'<u2').
 * @property {string=} viewportId Id for the current view.  This needs to match the viewState id in deck.gl and is necessary for the lens.
 * @property {String=} id Unique identifier for this layer.
 * @property {function=} onTileError Custom override for handle tile fetching errors.
 * @property {function=} onHover Hook function from deck.gl to handle hover objects.
 * @property {number=} maxRequests Maximum parallel ongoing requests allowed before aborting.
 * @property {function=} onClick Hook function from deck.gl to handle clicked-on objects.
 * @property {Object=} modelMatrix Math.gl Matrix4 object containing an affine transformation to be applied to the image.
 * @property {string=} refinementStrategy 'best-available' | 'no-overlap' | 'never' will be passed to TileLayer. A default will be chosen based on opacity.
 * @property {boolean=} excludeBackground Whether to exclude the background image. The background image is also excluded for opacity!=1.
 * @property {Array=} extensions [deck.gl extensions](https://deck.gl/docs/developer-guide/custom-layers/layer-extensions) to add to the layers.
 */

/**
 * @type {{ new <S extends string[]>(...props: import('@vivjs/types').Viv<LayerProps, S>[]) }}
 * @ignore
 */
const MultiscaleImageLayer = class extends CompositeLayer {
  renderLayers() {
    const {
      loader,
      selections,
      opacity,
      viewportId,
      onTileError,
      onHover,
      id,
      onClick,
      modelMatrix,
      excludeBackground,
      refinementStrategy
    } = this.props;
    // Get properties from highest resolution
    const { tileSize, dtype } = loader[0];
    // This is basically to invert:
    // https://github.com/visgl/deck.gl/pull/4616/files#diff-4d6a2e500c0e79e12e562c4f1217dc80R128
    // The z level can be wrong for showing the correct scales because of the calculation deck.gl does
    // so we need to invert it for fetching tiles and minZoom/maxZoom.
    const getTileData = async ({ index: { x, y, z }, signal }) => {
      // Early return if no selections
      if (!selections || selections.length === 0) {
        return null;
      }

      // I don't fully undertstand why this works, but I have a sense.
      // It's basically to cancel out:
      // https://github.com/visgl/deck.gl/pull/4616/files#diff-4d6a2e500c0e79e12e562c4f1217dc80R128,
      // which felt odd to me to beign with.
      // The image-tile example works without, this but I have a feeling there is something
      // going on with our pyramids and/or rendering that is different.
      const resolution = Math.round(-z);
      const getTile = selection => {
        const config = { x, y, selection, signal };
        return loader[resolution].getTile(config);
      };

      try {
        /*
         * Try to request the tile data. The pixels sources can throw
         * special SIGNAL_ABORTED string that we pick up in the catch
         * block to return null to deck.gl.
         *
         * This means that our pixels sources _always_ have the same
         * return type, and optional throw for performance.
         */
        const tiles = await Promise.all(selections.map(getTile));

        const tile = {
          data: tiles.map(d => d.data),
          width: tiles[0].width,
          height: tiles[0].height
        };

        if (isInterleaved(loader[resolution].shape)) {
          tile.data = tile.data[0];
          if (tile.data.length === tile.width * tile.height * 3) {
            // This indicates the data is RGB but it will be converted to RGBA
            tile.format = 'rgba8unorm';
          }
          // can just return early, no need  to check for webgl2
          return tile;
        }

        return tile;
      } catch (err) {
        /*
         * Signal is aborted. We handle the custom value thrown
         * by our pixel sources here and return falsy to deck.gl.
         */
        if (err === SIGNAL_ABORTED) {
          return null;
        }

        // We should propagate all other thrown values/errors
        throw err;
      }
    };

    const { height, width } = getImageSize(loader[0]);
    const tiledLayer = new MultiscaleImageLayerBase(this.props, {
      id: `Tiled-Image-${id}`,
      getTileData,
      dtype,
      tileSize,
      // If you scale a matrix up or down, that is like zooming in or out.  zoomOffset controls
      // how the zoom level you fetch tiles at is offset, allowing us to fetch higher resolution tiles
      // while at a lower "absolute" zoom level.  If you didn't use this prop, an image that is scaled
      // up would always look "low resolution" no matter the level of the image pyramid you are looking at.
      zoomOffset: Math.round(
        Math.log2(modelMatrix ? modelMatrix.getScale()[0] : 1)
      ),
      extent: [0, 0, width, height],
      // See the above note within for why the use of zoomOffset and the rounding necessary.
      minZoom: Math.round(-(loader.length - 1)),
      maxZoom: 0,
      // We want a no-overlap caching strategy with an opacity < 1 to prevent
      // multiple rendered sublayers (some of which have been cached) from overlapping
      refinementStrategy:
        refinementStrategy || (opacity === 1 ? 'best-available' : 'no-overlap'),
      // TileLayer checks `changeFlags.updateTriggersChanged.getTileData` to see if tile cache
      // needs to be re-created. We want to trigger this behavior if the loader changes.
      // https://github.com/uber/deck.gl/blob/3f67ea6dfd09a4d74122f93903cb6b819dd88d52/modules/geo-layers/src/tile-layer/tile-layer.js#L50
      updateTriggers: {
        getTileData: [loader, selections]
      },
      onTileError: onTileError || loader[0].onTileError
    });

    // This gives us a background image and also solves the current
    // minZoom funny business.  We don't use it for the background if we have an opacity
    // paramteter set to anything but 1, but we always use it for situations where
    // we are zoomed out too far.
    const lowestResolution = loader[loader.length - 1];
    const implementsGetRaster =
      typeof lowestResolution.getRaster === 'function';
    const layerModelMatrix = modelMatrix ? modelMatrix.clone() : new Matrix4();
    const baseLayer =
      implementsGetRaster &&
      !excludeBackground &&
      new ImageLayer(this.props, {
        id: `Background-Image-${id}`,
        loader: lowestResolution,
        modelMatrix: layerModelMatrix.scale(2 ** (loader.length - 1)),
        visible: !viewportId || this.context.viewport.id === viewportId,
        onHover,
        onClick,
        // Background image is nicest when LINEAR in my opinion.
        interpolation: 'linear',
        onViewportLoad: null
      });
    const layers = [baseLayer, tiledLayer];
    return layers;
  }
};

MultiscaleImageLayer.layerName = 'MultiscaleImageLayer';
MultiscaleImageLayer.defaultProps = defaultProps$4;

const defaultProps$3 = {
  pickable: { type: 'boolean', value: true, compare: true },
  loader: {
    type: 'object',
    value: {
      getRaster: async () => ({ data: [], height: 0, width: 0 }),
      getRasterSize: () => ({ height: 0, width: 0 }),
      dtype: '<u2'
    },
    compare: true
  },
  id: { type: 'string', value: '', compare: true },
  boundingBox: {
    type: 'array',
    value: [
      [0, 0],
      [0, 1],
      [1, 1],
      [1, 0]
    ],
    compare: true
  },
  boundingBoxColor: { type: 'array', value: [255, 0, 0], compare: true },
  boundingBoxOutlineWidth: { type: 'number', value: 1, compare: true },
  viewportOutlineColor: { type: 'array', value: [255, 190, 0], compare: true },
  viewportOutlineWidth: { type: 'number', value: 2, compare: true },
  overviewScale: { type: 'number', value: 1, compare: true },
  zoom: { type: 'number', value: 1, compare: true },
  extensions: {
    type: 'array',
    value: [new ColorPaletteExtension()],
    compare: true
  }
};

/**
 * @typedef LayerProps
 * @type {Object}
 * @property {Array.<Array.<number>>} contrastLimits List of [begin, end] values to control each channel's ramp function.
 * @property {Array.<boolean>} channelsVisible List of boolean values for each channel for whether or not it is visible.
 * @property {Array} loader PixelSource[]. Assumes multiscale if loader.length > 1.
 * @property {Array} selections Selection to be used for fetching data.
 * @property {Array.<number>=} boundingBoxColor [r, g, b] color of the bounding box (default: [255, 0, 0]).
 * @property {number=} boundingBoxOutlineWidth Width of the bounding box in px (default: 1).
 * @property {Array.<number>=} viewportOutlineColor [r, g, b] color of the outline (default: [255, 190, 0]).
 * @property {number=} viewportOutlineWidth Viewport outline width in px (default: 2).
 * @property {String=} id Unique identifier for this layer.
 * @property {Array=} extensions [deck.gl extensions](https://deck.gl/docs/developer-guide/custom-layers/layer-extensions) to add to the layers.
 */

/**
 * @type {{ new <S extends string[]>(...props: import('@vivjs/types').Viv<LayerProps, S>[]) }}
 * @ignore
 */
const OverviewLayer = class extends CompositeLayer {
  renderLayers() {
    const {
      loader,
      id,
      zoom,
      boundingBox,
      boundingBoxColor,
      boundingBoxOutlineWidth,
      viewportOutlineColor,
      viewportOutlineWidth,
      overviewScale
    } = this.props;

    const { width, height } = getImageSize(loader[0]);
    const z = loader.length - 1;
    const lowestResolution = loader[z];

    const overview = new ImageLayer(this.props, {
      id: `viewport-${id}`,
      modelMatrix: new Matrix4().scale(2 ** z * overviewScale),
      loader: lowestResolution
    });
    const boundingBoxOutline = new PolygonLayer({
      id: `bounding-box-overview-${id}`,
      coordinateSystem: COORDINATE_SYSTEM.CARTESIAN,
      data: [boundingBox],
      getPolygon: f => f,
      filled: false,
      stroked: true,
      getLineColor: boundingBoxColor,
      getLineWidth: boundingBoxOutlineWidth * 2 ** zoom
    });
    const viewportOutline = new PolygonLayer({
      id: `viewport-outline-${id}`,
      coordinateSystem: COORDINATE_SYSTEM.CARTESIAN,
      data: [
        [
          [0, 0],
          [width * overviewScale, 0],
          [width * overviewScale, height * overviewScale],
          [0, height * overviewScale]
        ]
      ],
      getPolygon: f => f,
      filled: false,
      stroked: true,
      getLineColor: viewportOutlineColor,
      getLineWidth: viewportOutlineWidth * 2 ** zoom
    });
    const layers = [overview, boundingBoxOutline, viewportOutline];
    return layers;
  }
};

OverviewLayer.layerName = 'OverviewLayer';
OverviewLayer.defaultProps = defaultProps$3;

function getPosition(boundingBox, position, length) {
  const viewWidth = boundingBox[2][0] - boundingBox[0][0];
  const viewHeight = boundingBox[2][1] - boundingBox[0][1];
  switch (position) {
    case 'bottom-right': {
      const yCoord = boundingBox[2][1] - viewHeight * length;
      const xLeftCoord = boundingBox[2][0] - viewWidth * length;
      return [yCoord, xLeftCoord];
    }
    case 'top-right': {
      const yCoord = boundingBox[0][1] + viewHeight * length;
      const xLeftCoord = boundingBox[2][0] - viewWidth * length;
      return [yCoord, xLeftCoord];
    }
    case 'top-left': {
      const yCoord = boundingBox[0][1] + viewHeight * length;
      const xLeftCoord = boundingBox[0][0] + viewWidth * length;
      return [yCoord, xLeftCoord];
    }
    case 'bottom-left': {
      const yCoord = boundingBox[2][1] - viewHeight * length;
      const xLeftCoord = boundingBox[0][0] + viewWidth * length;
      return [yCoord, xLeftCoord];
    }
    default: {
      throw new Error(`Position ${position} not found`);
    }
  }
}

const defaultProps$2 = {
  pickable: { type: 'boolean', value: true, compare: true },
  viewState: {
    type: 'object',
    value: { zoom: 0, target: [0, 0, 0], width: 1, height: 1 },
    compare: true
  },
  unit: { type: 'string', value: '', compare: true },
  size: { type: 'number', value: 1, compare: true },
  position: { type: 'string', value: 'bottom-right', compare: true },
  length: { type: 'number', value: 0.085, compare: true },
  snap: { type: 'boolean', value: false, compare: true }
};
/**
 * @typedef LayerProps
 * @type {Object}
 * @property {String} unit Physical unit size per pixel at full resolution.
 * @property {Number} size Physical size of a pixel.
 * @property {Object} viewState The current viewState for the desired view.  We cannot internally use this.context.viewport because it is one frame behind:
 * https://github.com/visgl/deck.gl/issues/4504
 * @property {Array=} boundingBox Boudning box of the view in which this should render.
 * @property {string=} id Id from the parent layer.
 * @property {number=} length Value from 0 to 1 representing the portion of the view to be used for the length part of the scale bar.
 * @property {boolean} snap If true, aligns the scale bar value to predefined intervals for clearer readings, adjusting units if necessary.
 */

/**
 * @type {{ new(...props: LayerProps[]) }}
 * @ignore
 */
const ScaleBarLayer = class extends CompositeLayer {
  renderLayers() {
    const { id, unit, size, position, viewState, length, snap } = this.props;
    const boundingBox = makeBoundingBox(viewState);
    const { zoom } = viewState;
    const viewLength = boundingBox[2][0] - boundingBox[0][0];
    const barLength = viewLength * 0.05;
    // This is a good heuristic for stopping the bar tick marks from getting too small
    // and/or the text squishing up into the bar.
    const barHeight = Math.max(
      2 ** (-zoom + 1.5),
      (boundingBox[2][1] - boundingBox[0][1]) * 0.007
    );

    // Initialize values for the non-snapped case.
    let adjustedBarLength = barLength;
    let displayNumber = (barLength * size).toPrecision(5);
    let displayUnit = unit;
    if (snap) {
      // Convert `size` to meters, since `snapValue`
      // assumes the value is in meters.
      const meterSize = sizeToMeters(size, unit);
      const numUnits = barLength * meterSize;
      // Get snapped value in original units and new units.
      const [snappedOrigUnits, snappedNewUnits, snappedUnitPrefix] =
        snapValue(numUnits);
      // We adjust the bar length by using the ratio of the snapped
      // value in original units to the original value passed to `snapValue` (which is based on `meterSize`).
      adjustedBarLength = snappedOrigUnits / meterSize;
      displayNumber = snappedNewUnits;
      displayUnit = `${snappedUnitPrefix}m`;
    }

    const [yCoord, xLeftCoord] = getPosition(boundingBox, position, length);
    const xRightCoord = xLeftCoord + barLength;

    const isLeft = position.endsWith('-left');

    const lengthBar = new LineLayer({
      id: `scale-bar-length-${id}`,
      coordinateSystem: COORDINATE_SYSTEM.CARTESIAN,
      data: [
        [
          [isLeft ? xLeftCoord : xRightCoord - adjustedBarLength, yCoord],
          [isLeft ? xLeftCoord + adjustedBarLength : xRightCoord, yCoord]
        ]
      ],
      getSourcePosition: d => d[0],
      getTargetPosition: d => d[1],
      getWidth: 2,
      getColor: [220, 220, 220]
    });
    const tickBoundsLeft = new LineLayer({
      id: `scale-bar-height-left-${id}`,
      coordinateSystem: COORDINATE_SYSTEM.CARTESIAN,
      data: [
        [
          [
            isLeft ? xLeftCoord : xRightCoord - adjustedBarLength,
            yCoord - barHeight
          ],
          [
            isLeft ? xLeftCoord : xRightCoord - adjustedBarLength,
            yCoord + barHeight
          ]
        ]
      ],
      getSourcePosition: d => d[0],
      getTargetPosition: d => d[1],
      getWidth: 2,
      getColor: [220, 220, 220]
    });
    const tickBoundsRight = new LineLayer({
      id: `scale-bar-height-right-${id}`,
      coordinateSystem: COORDINATE_SYSTEM.CARTESIAN,
      data: [
        [
          [
            isLeft ? xLeftCoord + adjustedBarLength : xRightCoord,
            yCoord - barHeight
          ],
          [
            isLeft ? xLeftCoord + adjustedBarLength : xRightCoord,
            yCoord + barHeight
          ]
        ]
      ],
      getSourcePosition: d => d[0],
      getTargetPosition: d => d[1],
      getWidth: 2,
      getColor: [220, 220, 220]
    });
    const textLayer = new TextLayer({
      id: `units-label-layer-${id}`,
      coordinateSystem: COORDINATE_SYSTEM.CARTESIAN,
      data: [
        {
          text: `${displayNumber}${displayUnit}`,
          position: [
            isLeft
              ? xLeftCoord + barLength * 0.5
              : xRightCoord - barLength * 0.5,
            yCoord + barHeight * 4
          ]
        }
      ],
      getColor: [220, 220, 220, 255],
      getSize: 12,
      fontFamily: DEFAULT_FONT_FAMILY,
      sizeUnits: 'meters',
      sizeScale: 2 ** -zoom,
      characterSet: [
        ...displayUnit.split(''),
        ...range(10).map(i => String(i)),
        '.',
        'e',
        '+'
      ]
    });
    return [lengthBar, tickBoundsLeft, tickBoundsRight, textLayer];
  }
};

ScaleBarLayer.layerName = 'ScaleBarLayer';
ScaleBarLayer.defaultProps = defaultProps$2;

var fs = `\
#version 300 es
precision highp int;
precision highp float;
precision highp SAMPLER_TYPE;

uniform highp SAMPLER_TYPE volume0;
uniform highp SAMPLER_TYPE volume1;
uniform highp SAMPLER_TYPE volume2;
uniform highp SAMPLER_TYPE volume3;
uniform highp SAMPLER_TYPE volume4;
uniform highp SAMPLER_TYPE volume5;

uniform vec3 scaledDimensions;

uniform mat4 scale;

uniform vec3 normals[NUM_PLANES];
uniform float distances[NUM_PLANES];

// color
uniform vec3 colors[6];

// slices
uniform vec2 xSlice;
uniform vec2 ySlice;
uniform vec2 zSlice;

// range
uniform vec2 contrastLimits[6];

in vec3 vray_dir;
flat in vec3 transformed_eye;
out vec4 color;

vec2 intersect_box(vec3 orig, vec3 dir) {
	vec3 box_min = vec3(xSlice[0], ySlice[0], zSlice[0]);
	vec3 box_max = vec3(xSlice[1], ySlice[1], zSlice[1]);
	vec3 inv_dir = 1. / dir;
	vec3 tmin_tmp = (box_min - orig) * inv_dir;
	vec3 tmax_tmp = (box_max - orig) * inv_dir;
	vec3 tmin = min(tmin_tmp, tmax_tmp);
	vec3 tmax = max(tmin_tmp, tmax_tmp);
	float t0 = max(tmin.x, max(tmin.y, tmin.z));
  float t1 = min(tmax.x, min(tmax.y, tmax.z));
  vec2 val = vec2(t0, t1);
	return val;
}

float linear_to_srgb(float x) {
	if (x <= 0.0031308f) {
		return 12.92f * x;
	}
	return 1.055f * pow(x, 1.f / 2.4f) - 0.055f;
}

// Pseudo-random number gen from
// http://www.reedbeta.com/blog/quick-and-easy-gpu-random-numbers-in-d3d11/
// with some tweaks for the range of values
float wang_hash(int seed) {
	seed = (seed ^ 61) ^ (seed >> 16);
	seed *= 9;
	seed = seed ^ (seed >> 4);
	seed *= 0x27d4eb2d;
	seed = seed ^ (seed >> 15);
	return float(seed % 2147483647) / float(2147483647);
}


void main(void) {
	// Step 1: Normalize the view ray
	vec3 ray_dir = normalize(vray_dir);

	// Step 2: Intersect the ray with the volume bounds to find the interval
	// along the ray overlapped by the volume.
	vec2 t_hit = intersect_box(transformed_eye, ray_dir);
	if (t_hit.x > t_hit.y) {
		discard;
	}
	// We don't want to sample voxels behind the eye if it's
	// inside the volume, so keep the starting point at or in front
	// of the eye
	t_hit.x = max(t_hit.x, 0.);

	// Step 3: Compute the step size to march through the volume grid
	vec3 dt_vec = 1. / (scale * vec4(abs(ray_dir), 1.)).xyz;
	float dt = 1. * min(dt_vec.x, min(dt_vec.y, dt_vec.z));

	float offset = wang_hash(int(gl_FragCoord.x + 640. * gl_FragCoord.y));

	// Step 4: Starting from the entry point, march the ray through the volume
	// and sample it
	vec3 p = transformed_eye + (t_hit.x + offset * dt) * ray_dir;

	// TODO: Probably want to stop this process at some point to improve performance when marching down the edges.
	_BEFORE_RENDER
	for (float t = t_hit.x; t < t_hit.y; t += dt) {
		// Check if this point is on the "positive" side or "negative" side of the plane - only show positive.
		float canShow = 1.;
		for (int i = 0; i < NUM_PLANES; i += 1) {
			canShow *= max(0., sign(dot(normals[i], p) + distances[i]));
		}
		// Do not show coordinates outside 0-1 box.
		// Something about the undefined behavior outside the box causes the additive blender to 
		// render some very odd artifacts.
		float canShowXCoordinate = max(p.x - 0., 0.) * max(1. - p.x , 0.);
		float canShowYCoordinate = max(p.y - 0., 0.) * max(1. - p.y , 0.);
		float canShowZCoordinate = max(p.z - 0., 0.) * max(1. - p.z , 0.);
		float canShowCoordinate = float(ceil(canShowXCoordinate * canShowYCoordinate * canShowZCoordinate));
		canShow = canShowCoordinate * canShow;
		float intensityValue0 = float(texture(volume0, p).r);
		DECKGL_PROCESS_INTENSITY(intensityValue0, contrastLimits[0], 0);
		intensityValue0 = canShow * intensityValue0;
		float intensityValue1 = float(texture(volume1, p).r);
		DECKGL_PROCESS_INTENSITY(intensityValue1, contrastLimits[1], 1);
		intensityValue1 = canShow * intensityValue1;
		float intensityValue2 = float(texture(volume2, p).r);
  		DECKGL_PROCESS_INTENSITY(intensityValue2, contrastLimits[2], 2);
		intensityValue2 = canShow * intensityValue2;
		float intensityValue3 = float(texture(volume3, p).r);
  		DECKGL_PROCESS_INTENSITY(intensityValue3, contrastLimits[3], 3);
		intensityValue3 = canShow * intensityValue3;
    	float intensityValue4 = float(texture(volume4, p).r);
  		DECKGL_PROCESS_INTENSITY(intensityValue4, contrastLimits[4], 4);
		intensityValue4 = canShow * intensityValue4;
		float intensityValue5 = float(texture(volume5, p).r);
  		DECKGL_PROCESS_INTENSITY(intensityValue5, contrastLimits[5], 5);
		intensityValue5 = canShow * intensityValue5;

		_RENDER

		p += ray_dir * dt;
	}
	_AFTER_RENDER
  color.r = linear_to_srgb(color.r);
  color.g = linear_to_srgb(color.g);
  color.b = linear_to_srgb(color.b);
}
`;

var vs = `\
#version 300 es
#define SHADER_NAME xr-layer-vertex-shader

// Unit-cube vertices
in vec3 positions;

// Eye position - last column of the inverted view matrix
uniform vec3 eye_pos;
// Projection matrix
uniform mat4 proj;
// Model Matrix
uniform mat4 model;
// View Matrix
uniform mat4 view;
// A matrix for scaling in the model space before any transformations.
// This projects the unit cube up to match the "pixel size" multiplied by the physical size ratio, if provided.
uniform mat4 scale;
uniform mat4 resolution;


out vec3 vray_dir;
flat out vec3 transformed_eye;

void main() {

  // Step 1: Standard MVP transformation (+ the scale matrix) to place the positions on your 2D screen ready for rasterization + fragment processing.
  gl_Position = proj * view * model * scale * resolution * vec4(positions, 1.);

  // Step 2: Invert the eye back from world space to the normalized 0-1 cube world space because ray casting on the fragment shader runs in 0-1 space.
  // Geometrically, the transformed_eye is a position relative to the 0-1 normalized vertices, which themselves are the inverse of the model + scale trasnformation.
  // See below for an example which does not involve a scale transformation, for simplicity, but motivates geometrically the needed transformation on eye_pos.
  /*
  This first diagram is a skewed volume (i.e a "shear" model matrix applied) top down with the eye marked as #, all in world space
       ^
    ___|__
    \\  |  \\
     \\ |   \\
      \\|____\\
       | 
       | 
       |
       #

  This next diagram shows the volume after the inverse model matrix has placed it back in model coordinates, but the eye still in world space. 
       ^
    ___|___
    |  |  |
    |  |  |
    |__|__|
       |
       |
       |
       #

  Finally, we apply the inverse model matrix transformation to the eye as well to bring it too into world space.
  Notice that the ray here matches the "voxels" through which the first ray also passes, as desired.
         ^
    ____/__
    |  /  |
    | /   |
    |/____|
    /
   /
  /
 #
  */
  transformed_eye = (inverse(resolution) * inverse(scale) * inverse(model) * (vec4(eye_pos, 1.))).xyz;

  // Step 3: Rays are from eye to vertices so that they get interpolated over the fragments.
  vray_dir = positions - transformed_eye;
}
`;

function _nullishCoalesce$1(lhs, rhsFn) { if (lhs != null) { return lhs; } else { return rhsFn(); } } function _optionalChain$8(ops) { let lastAccessLHS = undefined; let value = ops[0]; let i = 1; while (i < ops.length) { const op = ops[i]; const fn = ops[i + 1]; i += 2; if ((op === 'optionalAccess' || op === 'optionalCall') && value == null) { return undefined; } if (op === 'access' || op === 'optionalAccess') { lastAccessLHS = value; value = fn(value); } else if (op === 'call' || op === 'optionalCall') { value = fn((...args) => value.call(lastAccessLHS, ...args)); lastAccessLHS = undefined; } } return value; }
const channelsModule = {
  name: 'channel-intensity-module',
  fs: `\
    float apply_contrast_limits(float intensity, vec2 contrastLimits) {
      float contrastLimitsAppliedToIntensity = (intensity - contrastLimits[0]) / max(0.0005, (contrastLimits[1] - contrastLimits[0]));
      return max(0., contrastLimitsAppliedToIntensity);
    }
  `
};

// biome-ignore format: Avoid reformatting to keep the rows clear
const CUBE_STRIP = [
	1, 1, 0,
	0, 1, 0,
	1, 1, 1,
	0, 1, 1,
	0, 0, 1,
	0, 1, 0,
	0, 0, 0,
	1, 1, 0,
	1, 0, 0,
	1, 1, 1,
	1, 0, 1,
	0, 0, 1,
	1, 0, 0,
	0, 0, 0
];
const NUM_PLANES_DEFAULT = 1;

const defaultProps$1 = {
  pickable: false,
  coordinateSystem: COORDINATE_SYSTEM.CARTESIAN,
  channelData: { type: 'object', value: {}, compare: true },
  contrastLimits: { type: 'array', value: [], compare: true },
  dtype: { type: 'string', value: 'Uint8', compare: true },
  xSlice: { type: 'array', value: null, compare: true },
  ySlice: { type: 'array', value: null, compare: true },
  zSlice: { type: 'array', value: null, compare: true },
  clippingPlanes: { type: 'array', value: [], compare: true },
  resolutionMatrix: { type: 'object', value: new Matrix4(), compare: true },
  channelsVisible: { type: 'array', value: [], compare: true },
  extensions: {
    type: 'array',
    value: [new ColorPalette3DExtensions.AdditiveBlendExtension()],
    compare: true
  }
};

function getRenderingAttrs() {
  const values = getDtypeValues('Float32');
  return {
    ...values,
    sampler: values.sampler.replace('2D', '3D'),
    cast: data => new Float32Array(data)
  };
}

function getRenderingFromExtensions(extensions) {
  let rendering = {};
  extensions.forEach(extension => {
    rendering = extension.rendering;
  });
  if (!rendering._RENDER) {
    throw new Error(
      'XR3DLayer requires at least one extension to define opts.rendering as an object with _RENDER as a property at the minimum.'
    );
  }
  return rendering;
}

/**
 * @typedef LayerProps
 * @type {Object}
 * @property {Array.<Array.<number>>} contrastLimits List of [begin, end] values to control each channel's ramp function.
 * @property {Array.<boolean>} channelsVisible List of boolean values for each channel for whether or not it is visible.
 * @property {string} dtype Dtype for the layer.
 * @property {Array.<Array.<number>>=} domain Override for the possible max/min values (i.e something different than 65535 for uint16/'<u2').
 * @property {Object=} modelMatrix A column major affine transformation to be applied to the volume.
 * @property {Array.<number>=} xSlice 0-width (physical coordinates) interval on which to slice the volume.
 * @property {Array.<number>=} ySlice 0-height (physical coordinates) interval on which to slice the volume.
 * @property {Array.<number>=} zSlice 0-depth (physical coordinates) interval on which to slice the volume.
 * @property {Array.<Object>=} clippingPlanes List of math.gl [Plane](https://math.gl/modules/culling/docs/api-reference/plane) objects.
 * @property {Object=} resolutionMatrix Matrix for scaling the volume based on the (downsampled) resolution being displayed.
 * @property {Array=} extensions [deck.gl extensions](https://deck.gl/docs/developer-guide/custom-layers/layer-extensions) to add to the layers - default is AdditiveBlendExtension from ColorPalette3DExtensions.
 */

/**
 * @type {{ new <S extends string[]>(...props: import('@vivjs/types').Viv<LayerProps>[]) }}
 * @ignore
 */
const XR3DLayer = class extends Layer {
  initializeState() {
    const { device } = this.context;
    // This tells WebGL how to read row data from the texture.  For example, the default here is 4 (i.e for RGBA, one byte per channel) so
    // each row of data is expected to be a multiple of 4.  This setting (i.e 1) allows us to have non-multiple-of-4 row sizes.  For example, for 2 byte (16 bit data),
    // we could use 2 as the value and it would still work, but 1 also works fine (and is more flexible for 8 bit - 1 byte - textures as well).
    // https://stackoverflow.com/questions/42789896/webgl-error-arraybuffer-not-big-enough-for-request-in-case-of-gl-luminance
    device.setParametersWebGL({
      [GL.UNPACK_ALIGNMENT]: 1,
      [GL.PACK_ALIGNMENT]: 1
    });
    const programManager = ShaderAssembler.getDefaultShaderAssembler();
    const processStr =
      'fs:DECKGL_PROCESS_INTENSITY(inout float intensity, vec2 contrastLimits, int channelIndex)';
    if (!programManager._hookFunctions.includes(processStr)) {
      programManager.addShaderHook(processStr);
    }
  }

  _isHookDefinedByExtensions(hookName) {
    const { extensions } = this.props;
    return _optionalChain$8([extensions, 'optionalAccess', _ => _.some, 'call', _2 => _2(e => {
      const shaders = e.getShaders();
      if (shaders) {
        const { inject = {}, modules = [] } = shaders;
        const definesInjection = inject[hookName];
        const moduleDefinesInjection = modules.some(m => _optionalChain$8([m, 'optionalAccess', _3 => _3.inject, 'optionalAccess', _4 => _4[hookName]]));
        return definesInjection || moduleDefinesInjection;
      }
      return false;
    })]);
  }

  /**
   * This function compiles the shaders and the projection module.
   */
  getShaders() {
    const { clippingPlanes, extensions } = this.props;
    const { sampler } = getRenderingAttrs();
    const { _BEFORE_RENDER, _RENDER, _AFTER_RENDER } =
      getRenderingFromExtensions(extensions);
    const extensionDefinesDeckglProcessIntensity =
      this._isHookDefinedByExtensions('fs:DECKGL_PROCESS_INTENSITY');
    const newChannelsModule = { inject: {}, ...channelsModule };
    if (!extensionDefinesDeckglProcessIntensity) {
      newChannelsModule.inject['fs:DECKGL_PROCESS_INTENSITY'] = `
        intensity = apply_contrast_limits(intensity, contrastLimits);
      `;
    }
    return super.getShaders({
      vs,
      fs: fs
        .replace('_BEFORE_RENDER', _BEFORE_RENDER)
        .replace('_RENDER', _RENDER)
        .replace('_AFTER_RENDER', _AFTER_RENDER),
      defines: {
        SAMPLER_TYPE: sampler,
        NUM_PLANES: String(clippingPlanes.length || NUM_PLANES_DEFAULT)
      },
      modules: [newChannelsModule]
    });
  }

  /**
   * This function finalizes state by clearing all textures from the WebGL context
   */
  finalizeState() {
    super.finalizeState();

    if (this.state.textures) {
      Object.values(this.state.textures).forEach(tex => _optionalChain$8([tex, 'optionalAccess', _5 => _5.delete, 'call', _6 => _6()]));
    }
  }

  /**
   * This function updates state by retriggering model creation (shader compilation and attribute binding)
   * and loading any textures that need be loading.
   */
  updateState({ props, oldProps, changeFlags }) {
    // setup model first
    if (
      changeFlags.extensionsChanged ||
      props.colormap !== oldProps.colormap ||
      props.renderingMode !== oldProps.renderingMode ||
      props.clippingPlanes.length !== oldProps.clippingPlanes.length
    ) {
      const { device } = this.context;
      if (this.state.model) {
        this.state.model.destroy();
      }
      this.setState({ model: this._getModel(device) });
    }
    if (
      props.channelData &&
      _optionalChain$8([props, 'optionalAccess', _7 => _7.channelData, 'optionalAccess', _8 => _8.data]) !== _optionalChain$8([oldProps, 'optionalAccess', _9 => _9.channelData, 'optionalAccess', _10 => _10.data])
    ) {
      this.loadTexture(props.channelData);
    }
  }

  /**
   * This function creates the luma.gl model.
   */
  _getModel(gl) {
    if (!gl) {
      return null;
    }
    return new Model(gl, {
      ...this.getShaders(),
      geometry: new Geometry({
        topology: 'triangle-strip',
        attributes: {
          positions: new Float32Array(CUBE_STRIP)
        }
      })
    });
  }

  /**
   * This function runs the shaders and draws to the canvas
   */
  draw(opts) {
    const { uniforms } = opts;
    const { textures, model, scaleMatrix } = this.state;
    const {
      contrastLimits,
      xSlice,
      ySlice,
      zSlice,
      modelMatrix,
      channelsVisible,
      domain,
      dtype,
      clippingPlanes,
      resolutionMatrix
    } = this.props;
    const { viewMatrix, viewMatrixInverse, projectionMatrix } =
      this.context.viewport;
    if (textures && model && scaleMatrix) {
      const paddedContrastLimits = padContrastLimits({
        contrastLimits,
        channelsVisible,
        domain,
        dtype
      });
      const invertedScaleMatrix = scaleMatrix.clone().invert();
      const invertedResolutionMatrix = resolutionMatrix.clone().invert();
      const paddedClippingPlanes = padWithDefault(
        clippingPlanes.map(p =>
          p
            .clone()
            .transform(invertedScaleMatrix)
            .transform(invertedResolutionMatrix)
        ),
        new Plane([1, 0, 0]),
        clippingPlanes.length || NUM_PLANES_DEFAULT
      );
      // Need to flatten for shaders.
      const normals = paddedClippingPlanes.flatMap(plane => plane.normal);
      const distances = paddedClippingPlanes.map(plane => plane.distance);

      model.setUniforms(
        {
          ...uniforms,
          contrastLimits: paddedContrastLimits,
          xSlice: new Float32Array(
            xSlice
              ? xSlice.map(i => i / scaleMatrix[0] / resolutionMatrix[0])
              : [0, 1]
          ),
          ySlice: new Float32Array(
            ySlice
              ? ySlice.map(i => i / scaleMatrix[5] / resolutionMatrix[5])
              : [0, 1]
          ),
          zSlice: new Float32Array(
            zSlice
              ? zSlice.map(i => i / scaleMatrix[10] / resolutionMatrix[10])
              : [0, 1]
          ),
          eye_pos: new Float32Array([
            viewMatrixInverse[12],
            viewMatrixInverse[13],
            viewMatrixInverse[14]
          ]),
          view: viewMatrix,
          proj: projectionMatrix,
          scale: scaleMatrix,
          resolution: resolutionMatrix,
          model: modelMatrix || new Matrix4(),
          normals,
          distances
        },
        { disableWanings: false }
      );
      model.setBindings(textures);
      model.draw(this.context.renderPass);
    }
  }

  /**
   * This function loads all textures from incoming resolved promises/data from the loaders by calling `dataToTexture`
   */
  loadTexture(channelData) {
    const textures = {
      volume0: null,
      volume1: null,
      volume2: null,
      volume3: null,
      volume4: null,
      volume5: null
    };
    if (this.state.textures) {
      Object.values(this.state.textures).forEach(tex => _optionalChain$8([tex, 'optionalAccess', _11 => _11.delete, 'call', _12 => _12()]));
    }
    if (
      channelData &&
      Object.keys(channelData).length > 0 &&
      channelData.data
    ) {
      const { height, width, depth } = channelData;
      channelData.data.forEach((d, i) => {
        textures[`volume${i}`] = this.dataToTexture(d, width, height, depth);
      }, this);
      // null textures will throw errors, so we just set unused channels to the first texture for now.
      for (const key in textures) {
        if (!textures.volume0) throw new Error('Bad texture state!');
        if (!textures[key]) textures[key] = textures.volume0;
      }
      this.setState({
        textures,
        scaleMatrix: new Matrix4().scale(
          this.props.physicalSizeScalingMatrix.transformPoint([
            width,
            height,
            depth
          ])
        )
      });
    }
  }

  /**
   * This function creates textures from the data
   */
  dataToTexture(data, width, height, depth) {
    const attrs = getRenderingAttrs();
    const texture = this.context.device.createTexture({
      width,
      height,
      depth,
      dimension: '3d',
      data: _nullishCoalesce$1(_optionalChain$8([attrs, 'access', _13 => _13.cast, 'optionalCall', _14 => _14(data)]), () => ( data)),
      format: attrs.format,
      mipmaps: false,
      sampler: {
        minFilter: 'linear',
        magFilter: 'linear',
        addressModeU: 'clamp-to-edge',
        addressModeV: 'clamp-to-edge',
        addressModeW: 'clamp-to-edge'
      }
    });
    return texture;
  }
};

XR3DLayer.layerName = 'XR3DLayer';
XR3DLayer.defaultProps = defaultProps$1;

/* global globalThis */

/**
 * Creates a single continguous TypedArray that can visualized as a volume in 3D space where the y-axis going up is positive,
 * the x-axis going right is positive, and the z-axis coming out of the screen is positive.
 * To do this, and keep the orientation, we must anti-diagonally transpose each slice of raster data so that the (0, 0) data point is transformed
 * to the top right.  If you start the camera looking at the 0th slice (or rotate from looking at the final slice) in 3D, this becomes more apparent.
 * Of note here is that in 2D rendering, the y-axis is positive in the downward direction.
 *
 * @param {object} props
 * @param {object} props.source PixelSource
 * @param {object} props.selection A single selection for the PixelSource
 * @param {object} props.onUpdate A callback for progress that is called twice during the loading of each plane, once when the promsie resolves and once when it is loaded into the final contiguous buffer.
 * @param {object} props.downsampleDepth This is the number by which to downsample on the z direction, usually `2 ** resolution` where `resolution` is that of the `PixelSource` in the image pyramid.
 * The idea here is to get every `downsampleDepth` raster slice so that proper scaling is maintained (just liek a 2D image pyramid).
 * @return {TypedArray}
 * @ignore
 */
async function getVolume({
  source,
  selection,
  onUpdate = () => {},
  downsampleDepth = 1,
  signal
}) {
  const { shape, labels, dtype } = source;
  const { height, width } = getImageSize(source);
  const depth = shape[labels.indexOf('z')];
  const depthDownsampled = Math.max(1, Math.floor(depth / downsampleDepth));
  const rasterSize = height * width;
  const name = `${dtype}Array`;
  const TypedArray = globalThis[name];
  const volumeData = new TypedArray(rasterSize * depthDownsampled);
  await Promise.all(
    new Array(depthDownsampled).fill(0).map(async (_, z) => {
      const depthSelection = {
        ...selection,
        z: z * downsampleDepth
      };
      const { data: rasterData } = await source.getRaster({
        selection: depthSelection,
        signal
      });
      let r = 0;
      onUpdate();
      // For now this process fills in each raster plane anti-diagonally transposed.
      // This is to ensure that the image looks right in three dimensional space.
      while (r < rasterSize) {
        const volIndex = z * rasterSize + (rasterSize - r - 1);
        const rasterIndex =
          ((width - r - 1) % width) + width * Math.floor(r / width);
        volumeData[volIndex] = rasterData[rasterIndex];
        r += 1;
      }
      onUpdate();
    })
  );
  return {
    data: volumeData,
    height,
    width,
    depth: depthDownsampled
  };
}

const getTextLayer = (text, viewport, id) => {
  return new TextLayer({
    id: `text-${id}`,
    coordinateSystem: COORDINATE_SYSTEM.CARTESIAN,
    data: [
      {
        text,
        position: viewport.position
      }
    ],
    getColor: [220, 220, 220, 255],
    getSize: 25,
    sizeUnits: 'meters',
    sizeScale: 2 ** -viewport.zoom,
    fontFamily: 'Helvetica'
  });
};

function _optionalChain$7(ops) { let lastAccessLHS = undefined; let value = ops[0]; let i = 1; while (i < ops.length) { const op = ops[i]; const fn = ops[i + 1]; i += 2; if ((op === 'optionalAccess' || op === 'optionalCall') && value == null) { return undefined; } if (op === 'access' || op === 'optionalAccess') { lastAccessLHS = value; value = fn(value); } else if (op === 'call' || op === 'optionalCall') { value = fn((...args) => value.call(lastAccessLHS, ...args)); lastAccessLHS = undefined; } } return value; }
const defaultProps = {
  pickable: false,
  coordinateSystem: COORDINATE_SYSTEM.CARTESIAN,
  contrastLimits: { type: 'array', value: [], compare: true },
  channelsVisible: { type: 'array', value: [], compare: true },
  selections: { type: 'array', value: [], compare: true },
  resolution: { type: 'number', value: 0, compare: true },
  domain: { type: 'array', value: [], compare: true },
  loader: {
    type: 'object',
    value: [
      {
        getRaster: async () => ({ data: [], height: 0, width: 0 }),
        dtype: 'Uint16',
        shape: [1],
        labels: ['z']
      }
    ],
    compare: true
  },
  xSlice: { type: 'array', value: null, compare: true },
  ySlice: { type: 'array', value: null, compare: true },
  zSlice: { type: 'array', value: null, compare: true },
  clippingPlanes: { type: 'array', value: [], compare: true },
  onUpdate: { type: 'function', value: () => {}, compare: true },
  useProgressIndicator: { type: 'boolean', value: true, compare: true },
  extensions: {
    type: 'array',
    value: [new ColorPalette3DExtensions.AdditiveBlendExtension()],
    compare: true
  }
};

/**
 * @typedef LayerProps
 * @type {Object}
 * @property {Array.<Array.<number>>} contrastLimits List of [begin, end] values to control each channel's ramp function.
 * @property {Array.<boolean>} channelsVisible List of boolean values for each channel for whether or not it is visible.
 * @property {Array} loader PixelSource[]. Represents an N-dimensional image.
 * @property {Array} selections Selection to be used for fetching data.
 * @property {Array.<Array.<number>>=} domain Override for the possible max/min values (i.e something different than 65535 for uint16/'<u2').
 * @property {number=} resolution Resolution at which you would like to see the volume and load it into memory (0 highest, loader.length -1 the lowest default 0)
 * @property {Object=} modelMatrix A column major affine transformation to be applied to the volume.
 * @property {Array.<number>=} xSlice 0-width (physical coordinates) interval on which to slice the volume.
 * @property {Array.<number>=} ySlice 0-height (physical coordinates) interval on which to slice the volume.
 * @property {Array.<number>=} zSlice 0-depth (physical coordinates) interval on which to slice the volume.
 * @property {function=} onViewportLoad Function that gets called when the data in the viewport loads.
 * @property {Array.<Object>=} clippingPlanes List of math.gl [Plane](https://math.gl/modules/culling/docs/api-reference/plane) objects.
 * @property {boolean=} useProgressIndicator Whether or not to use the default progress text + indicator (default is true)
 * @property {function=} onUpdate A callback to be used for getting updates of the progress, ({ progress }) => {}
 * @property {Array=} extensions [deck.gl extensions](https://deck.gl/docs/developer-guide/custom-layers/layer-extensions) to add to the layers - default is AdditiveBlendExtension from ColorPalette3DExtensions.
 */

/**
 * @type {{ new <S extends string[]>(...props: import('@vivjs/types').Viv<LayerProps, S>[]) }}
 * @ignore
 */
const VolumeLayer = class extends CompositeLayer {
  clearState() {
    this.setState({
      height: null,
      width: null,
      depth: null,
      data: null,
      physicalSizeScalingMatrix: null,
      resolutionMatrix: null,
      progress: 0,
      abortController: null
    });
  }

  finalizeState() {
    this.state.abortController.abort();
  }

  updateState({ oldProps, props }) {
    const loaderChanged = props.loader !== oldProps.loader;
    const resolutionChanged = props.resolution !== oldProps.resolution;
    const selectionsChanged = props.selections !== oldProps.selections;
    // Only fetch new data to render if loader has changed
    if (resolutionChanged) {
      // Clear last volume.
      this.clearState();
    }
    if (loaderChanged || selectionsChanged || resolutionChanged) {
      const {
        loader,
        selections = [],
        resolution,
        onViewportLoad
      } = this.props;
      const source = loader[resolution];
      let progress = 0;
      const totalRequests =
        (source.shape[source.labels.indexOf('z')] >> resolution) *
        selections.length;
      const onUpdate = () => {
        progress += 0.5 / totalRequests;
        if (this.props.onUpdate) {
          this.props.onUpdate({ progress });
        }
        this.setState({ progress });
      };
      const abortController = new AbortController();
      this.setState({ abortController });
      const { signal } = abortController;
      const volumePromises = selections.map(selection =>
        getVolume({
          selection,
          source,
          onUpdate,
          downsampleDepth: 2 ** resolution,
          signal
        })
      );
      const physicalSizeScalingMatrix = getPhysicalSizeScalingMatrix(
        loader[resolution]
      );

      Promise.all(volumePromises).then(volumes => {
        if (onViewportLoad) {
          onViewportLoad(volumes);
        }
        const volume = {
          data: volumes.map(d => d.data),
          width: _optionalChain$7([volumes, 'access', _ => _[0], 'optionalAccess', _2 => _2.width]),
          height: _optionalChain$7([volumes, 'access', _3 => _3[0], 'optionalAccess', _4 => _4.height]),
          depth: _optionalChain$7([volumes, 'access', _5 => _5[0], 'optionalAccess', _6 => _6.depth])
        };

        this.setState({
          ...volume,
          physicalSizeScalingMatrix,
          resolutionMatrix: new Matrix4().scale(2 ** resolution)
        });
      });
    }
  }

  renderLayers() {
    const { loader, id, resolution, useProgressIndicator } = this.props;
    const { dtype } = loader[resolution];
    const {
      data,
      width,
      height,
      depth,
      progress,
      physicalSizeScalingMatrix,
      resolutionMatrix
    } = this.state;
    if (!(width && height) && useProgressIndicator) {
      const { viewport } = this.context;
      return getTextLayer(
        `Loading Volume ${String((progress || 0) * 100).slice(0, 5)}%...`,
        viewport,
        id
      );
    }
    return new XR3DLayer(this.props, {
      channelData: { data, width, height, depth },
      id: `XR3DLayer-${0}-${height}-${width}-${0}-${resolution}-${id}`,
      physicalSizeScalingMatrix,
      parameters: {
        [GL.CULL_FACE]: true,
        [GL.CULL_FACE_MODE]: GL.FRONT,
        [GL.DEPTH_TEST]: false,
        blendFunc: [GL.SRC_ALPHA, GL.ONE],
        blend: true
      },
      resolutionMatrix,
      dtype
    });
  }
};

VolumeLayer.layerName = 'VolumeLayer';
VolumeLayer.defaultProps = defaultProps;

/**
 * This class generates a layer and a view for use in the VivViewer
 * @param {Object} args
 * @param {string} args.id id for this VivView.
 * @param {Object} args.height Width of the view.
 * @param {Object} args.width Height of the view.
 * @param {string} args.id Id for the current view
 * @param {number=} args.x X (top-left) location on the screen for the current view
 * @param {number=} args.y Y (top-left) location on the screen for the current view
 */
class VivView {
  constructor({ id, x = 0, y = 0, height, width }) {
    this.width = width;
    this.height = height;
    this.id = id;
    this.x = x;
    this.y = y;
  }

  /**
   * Create a DeckGL view based on this class.
   * @returns {View} The DeckGL View for this class.
   */
  getDeckGlView() {
    return new OrthographicView({
      controller: true,
      id: this.id,
      height: this.height,
      width: this.width,
      x: this.x,
      y: this.y
    });
  }

  /**
   * Create a viewState for this class, checking the id to make sure this class and veiwState match.
   * @param {Object} args
   * @param {object} [args.viewState] incoming ViewState object from deck.gl update.
   * @param {object} [args.oldViewState] old ViewState object from deck.gl.
   * @param {object} [args.currentViewState] current ViewState object in react state.
   * @returns {?object} ViewState for this class (or null by default if the ids do not match).
   */
  filterViewState({ viewState }) {
    const { id, height, width } = this;
    return viewState.id === id ? { height, width, ...viewState } : null;
  }

  /**
   * Create a layer for this instance.
   * @param {Object} args
   * @param {Object<string,Object>} args.viewStates ViewStates for all current views.
   * @param {Object} args.props Props for this instance.
   * @returns {Layer} Instance of a layer.
   */
  getLayers({ viewStates, props }) {}
}

function _optionalChain$6(ops) { let lastAccessLHS = undefined; let value = ops[0]; let i = 1; while (i < ops.length) { const op = ops[i]; const fn = ops[i + 1]; i += 2; if ((op === 'optionalAccess' || op === 'optionalCall') && value == null) { return undefined; } if (op === 'access' || op === 'optionalAccess') { lastAccessLHS = value; value = fn(value); } else if (op === 'call' || op === 'optionalCall') { value = fn((...args) => value.call(lastAccessLHS, ...args)); lastAccessLHS = undefined; } } return value; }
function getVivId(id) {
  return `-#${id}#`;
}

/**
 * Create an initial view state that centers the image in the viewport at the zoom level that fills the dimensions in `viewSize`.
 * @param {Object} loader (PixelSource[] | PixelSource)
 * @param {Object} viewSize { height, width } object giving dimensions of the viewport for deducing the right zoom level to center the image.
 * @param {Object=} zoomBackOff A positive number which controls how far zoomed out the view state is from filling the entire viewport (default is 0 so the image fully fills the view).
 * SideBySideViewer and PictureInPictureViewer use .5 when setting viewState automatically in their default behavior, so the viewport is slightly zoomed out from the image
 * filling the whole screen.  1 unit of zoomBackOff (so a passed-in value of 1) corresponds to a 2x zooming out.
 * @param {Boolean=} use3d Whether or not to return a view state that can be used with the 3d viewer
 * @param {Boolean=} modelMatrix If using a transformation matrix, passing it in here will allow this function to properly center the volume.
 * @returns {Object} A default initial view state that centers the image within the view: { target: [x, y, 0], zoom: -zoom }.
 */
function getDefaultInitialViewState(
  loader,
  viewSize,
  // biome-ignore lint/style/useDefaultParameterLast: Public API requires zoomBackOff to be the third parameter
  zoomBackOff = 0,
  // biome-ignore lint/style/useDefaultParameterLast: Public API requires use3d to be the fourth parameter
  use3d = false,
  modelMatrix
) {
  const source = Array.isArray(loader) ? loader[0] : loader;
  const { width: pixelWidth, height: pixelHeight } = getImageSize(source);
  const scale = (modelMatrix || new Matrix4()).getScale();
  const [trueWidth, trueHeight] = [
    scale[0] * pixelWidth,
    scale[1] * pixelHeight
  ];
  const depth = source.shape[source.labels.indexOf('z')];
  const zoom =
    Math.log2(
      Math.min(viewSize.width / trueWidth, viewSize.height / trueHeight)
    ) - zoomBackOff;
  const physicalSizeScalingMatrix = getPhysicalSizeScalingMatrix(source);
  const loaderInitialViewState = {
    target: (modelMatrix || new Matrix4()).transformPoint(
      (use3d ? physicalSizeScalingMatrix : new Matrix4()).transformPoint([
        pixelWidth / 2,
        pixelHeight / 2,
        use3d ? depth / 2 : 0
      ])
    ),
    zoom
  };
  return loaderInitialViewState;
}

/**
 * Creates the layers for viewing an image in detail.
 * @param {String} id The identifier of the view.
 * @param {Object} props The layer properties.
 * @returns {Array} An array of layers.
 */
function getImageLayer(id, props) {
  const { loader } = props;
  // Grab name of PixelSource if a class instance (works for Tiff & Zarr).
  const sourceName = _optionalChain$6([loader, 'access', _ => _[0], 'optionalAccess', _2 => _2.constructor, 'optionalAccess', _3 => _3.name]);

  // Create at least one layer even without selections so that the tests pass.
  const Layer = loader.length > 1 ? MultiscaleImageLayer : ImageLayer;
  const layerLoader = loader.length > 1 ? loader : loader[0];

  return new Layer({
    ...props,
    id: `${sourceName}${getVivId(id)}`,
    viewportId: id,
    loader: layerLoader
  });
}

const OVERVIEW_VIEW_ID = 'overview';

class OverviewController extends Controller {
  constructor(props) {
    super(props);
    this.events = ['click'];
  }

  handleEvent(event) {
    if (event.type !== 'click') {
      return;
    }
    let [x, y] = this.getCenter(event);
    const { width, height, zoom, scale } = this.props;
    if (x < 0 || y < 0 || x > width || y > height) {
      return;
    }
    const scaleFactor = 1 / (2 ** zoom * scale);
    x *= scaleFactor;
    y *= scaleFactor;
    if (this.onViewStateChange) {
      this.onViewStateChange({ viewState: { target: [x, y, 0] } });
    }
  }
}

/**
 * This class generates a OverviewLayer and a view for use in the VivViewer as an overview to a Detailview (they must be used in conjection).
 * From the base class VivView, only the initialViewState argument is used.  This class uses private methods to position its x and y from the
 * additional arguments:
 * @param {Object} args
 * @param {Object} args.id for thie VivView
 * @param {Object} args.loader PixelSource[], where each PixelSource is decreasing in shape. If length == 1, not multiscale.
 * @param {number} args.detailHeight Height of the detail view.
 * @param {number} args.detailWidth Width of the detail view.
 * @param {number} [args.scale] Scale of this viewport relative to the detail. Default is .2.
 * @param {number} [args.margin] Margin to be offset from the the corner of the other viewport. Default is 25.
 * @param {string} [args.position] Location of the viewport - one of "bottom-right", "top-right", "top-left", "bottom-left."  Default is 'bottom-right'.
 * @param {number} [args.minimumWidth] Absolute lower bound for how small the viewport should scale. Default is 150.
 * @param {number} [args.maximumWidth] Absolute upper bound for how large the viewport should scale. Default is 350.
 * @param {number} [args.minimumHeight] Absolute lower bound for how small the viewport should scale. Default is 150.
 * @param {number} [args.maximumHeight] Absolute upper bound for how large the viewport should scale. Default is 350.
 * @param {Boolean} [args.clickCenter] Click to center the default view. Default is true.
 * */
class OverviewView extends VivView {
  constructor({
    id,
    loader,
    detailHeight,
    detailWidth,
    scale = 0.2,
    margin = 25,
    position = 'bottom-right',
    minimumWidth = 150,
    maximumWidth = 350,
    minimumHeight = 150,
    maximumHeight = 350,
    clickCenter = true
  }) {
    super({ id });
    this.margin = margin;
    this.loader = loader;
    this.position = position;
    this.detailHeight = detailHeight;
    this.detailWidth = detailWidth;
    this._setHeightWidthScale({
      detailWidth,
      detailHeight,
      scale,
      minimumWidth,
      maximumWidth,
      minimumHeight,
      maximumHeight
    });
    this._setXY();
    this.clickCenter = clickCenter;
  }

  /**
   * Set the image-pixel scale and height and width based on detail view.
   */
  _setHeightWidthScale({
    detailWidth,
    detailHeight,
    scale,
    minimumWidth,
    maximumWidth,
    minimumHeight,
    maximumHeight
  }) {
    const numLevels = this.loader.length;
    const { width: rasterWidth, height: rasterHeight } = getImageSize(
      this.loader[0]
    );

    this._imageWidth = rasterWidth;
    this._imageHeight = rasterHeight;

    if (rasterWidth > rasterHeight) {
      const heightWidthRatio = rasterHeight / rasterWidth;
      this.width = Math.min(
        maximumWidth,
        Math.max(detailWidth * scale, minimumWidth)
      );
      this.height = this.width * heightWidthRatio;
      this.scale = (2 ** (numLevels - 1) / rasterWidth) * this.width;
    } else {
      const widthHeightRatio = rasterWidth / rasterHeight;
      this.height = Math.min(
        maximumHeight,
        Math.max(detailHeight * scale, minimumHeight)
      );
      this.width = this.height * widthHeightRatio;
      this.scale = (2 ** (numLevels - 1) / rasterHeight) * this.height;
    }
  }

  /**
   * Set the x and y (top left corner) of this overview relative to the detail.
   */
  _setXY() {
    const { height, width, margin, position, detailWidth, detailHeight } = this;
    switch (position) {
      case 'bottom-right': {
        this.x = detailWidth - width - margin;
        this.y = detailHeight - height - margin;
        break;
      }
      case 'top-right': {
        this.x = detailWidth - width - margin;
        this.y = margin;
        break;
      }
      case 'top-left': {
        this.x = margin;
        this.y = margin;
        break;
      }
      case 'bottom-left': {
        this.x = margin;
        this.y = detailHeight - height - margin;
        break;
      }
      default: {
        throw new Error(
          `overviewLocation prop needs to be one of ['bottom-right', 'top-right', 'top-left', 'bottom-left']`
        );
      }
    }
  }

  getDeckGlView() {
    const { scale, clickCenter } = this;
    const controller = clickCenter && { type: OverviewController, scale };
    return new OrthographicView({
      controller,
      id: this.id,
      height: this.height,
      width: this.width,
      x: this.x,
      y: this.y,
      clear: true
    });
  }

  filterViewState({ viewState }) {
    // Scale the view as the overviewScale changes with screen resizing - basically, do not react to any view state changes.
    const { _imageWidth, _imageHeight, scale } = this;
    return {
      ...viewState,
      height: this.height,
      width: this.width,
      id: this.id,
      target: [(_imageWidth * scale) / 2, (_imageHeight * scale) / 2, 0],
      zoom: -(this.loader.length - 1)
    };
  }

  getLayers({ viewStates, props }) {
    const { detail, overview } = viewStates;
    if (!detail) {
      throw new Error('Overview requires a viewState with id detail');
    }
    // Scale the bounding box.
    const boundingBox = makeBoundingBox(detail).map(coords =>
      coords.map(e => e * this.scale)
    );
    const overviewLayer = new OverviewLayer(props, {
      id: getVivId(this.id),
      boundingBox,
      overviewScale: this.scale,
      zoom: -overview.zoom
    });
    return [overviewLayer];
  }
}

function _optionalChain$5(ops) { let lastAccessLHS = undefined; let value = ops[0]; let i = 1; while (i < ops.length) { const op = ops[i]; const fn = ops[i + 1]; i += 2; if ((op === 'optionalAccess' || op === 'optionalCall') && value == null) { return undefined; } if (op === 'access' || op === 'optionalAccess') { lastAccessLHS = value; value = fn(value); } else if (op === 'call' || op === 'optionalCall') { value = fn((...args) => value.call(lastAccessLHS, ...args)); lastAccessLHS = undefined; } } return value; }
const DETAIL_VIEW_ID = 'detail';

/**
 * This class generates a MultiscaleImageLayer and a view for use in the VivViewer as a detailed view.
 * It takes the same arguments for its constructor as its base class VivView plus the following:
 * @param {Object} args
 * @param {boolean=} args.snapScaleBar If true, aligns the scale bar value to predefined intervals
 * for clearer readings, adjusting units if necessary. By default, false.
 * @param {number=} args.x X (top-left) location on the screen for the current view
 * @param {number=} args.y Y (top-left) location on the screen for the current view
 * @param {number} args.height Width of the view.
 * @param {number} args.width Height of the view.
 * @param {string} args.id id of the View
 * */
class DetailView extends VivView {
  constructor({ id, x = 0, y = 0, height, width, snapScaleBar = false }) {
    super({ id, x, y, height, width });
    this.snapScaleBar = snapScaleBar;
  }

  getLayers({ props, viewStates }) {
    const { loader } = props;
    const { id, height, width } = this;
    const layerViewState = viewStates[id];
    const layers = [getImageLayer(id, props)];

    // Inspect the first pixel source for physical sizes
    if (_optionalChain$5([loader, 'access', _ => _[0], 'optionalAccess', _2 => _2.meta, 'optionalAccess', _3 => _3.physicalSizes, 'optionalAccess', _4 => _4.x])) {
      const { size, unit } = loader[0].meta.physicalSizes.x;
      layers.push(
        new ScaleBarLayer({
          id: getVivId(id),
          loader,
          unit,
          size,
          snap: this.snapScaleBar,
          viewState: { ...layerViewState, height, width }
        })
      );
    }

    return layers;
  }

  filterViewState({ viewState, currentViewState }) {
    if (viewState.id === OVERVIEW_VIEW_ID) {
      const { target } = viewState;
      if (target) {
        return { ...currentViewState, target };
      }
    }
    return super.filterViewState({ viewState });
  }
}

function _optionalChain$4(ops) { let lastAccessLHS = undefined; let value = ops[0]; let i = 1; while (i < ops.length) { const op = ops[i]; const fn = ops[i + 1]; i += 2; if ((op === 'optionalAccess' || op === 'optionalCall') && value == null) { return undefined; } if (op === 'access' || op === 'optionalAccess') { lastAccessLHS = value; value = fn(value); } else if (op === 'call' || op === 'optionalCall') { value = fn((...args) => value.call(lastAccessLHS, ...args)); lastAccessLHS = undefined; } } return value; }/**
 * This class generates a MultiscaleImageLayer and a view for use in the SideBySideViewer.
 * It is linked with its other views as controlled by `linkedIds`, `zoomLock`, and `panLock` parameters.
 * It takes the same arguments for its constructor as its base class VivView plus the following:
 * @param {Object} args
 * @param {Array<String>} args.linkedIds Ids of the other views to which this could be locked via zoom/pan.
 * @param {Boolean} args.panLock Whether or not we lock pan.
 * @param {Boolean} args.zoomLock Whether or not we lock zoom.
 * @param {Array=} args.viewportOutlineColor Outline color of the border (default [255, 255, 255])
 * @param {number=} args.viewportOutlineWidth Default outline width (default 10)
 * @param {boolean=} args.snapScaleBar If true, aligns the scale bar value to predefined intervals
 * for clearer readings, adjusting units if necessary. By default, false.
 * @param {number=} args.x X (top-left) location on the screen for the current view
 * @param {number=} args.y Y (top-left) location on the screen for the current view
 * @param {number} args.height Width of the view.
 * @param {number} args.width Height of the view.
 * @param {string} args.id id of the View
 * */
class SideBySideView extends VivView {
  constructor({
    id,
    x = 0,
    y = 0,
    height,
    width,
    linkedIds = [],
    panLock = true,
    zoomLock = true,
    viewportOutlineColor = [255, 255, 255],
    viewportOutlineWidth = 10,
    snapScaleBar = false
  }) {
    super({ id, x, y, height, width });
    this.linkedIds = linkedIds;
    this.panLock = panLock;
    this.zoomLock = zoomLock;
    this.viewportOutlineColor = viewportOutlineColor;
    this.viewportOutlineWidth = viewportOutlineWidth;
    this.snapScaleBar = snapScaleBar;
  }

  filterViewState({ viewState, oldViewState, currentViewState }) {
    const { id: viewStateId } = viewState;
    const { id, linkedIds, panLock, zoomLock } = this;
    if (
      oldViewState &&
      linkedIds.indexOf(viewStateId) !== -1 &&
      (zoomLock || panLock)
    ) {
      const thisViewState = {
        height: currentViewState.height,
        width: currentViewState.width,
        target: [],
        zoom: null
      };
      const [currentX, currentY] = currentViewState.target;
      if (zoomLock) {
        const dZoom = viewState.zoom - oldViewState.zoom;
        thisViewState.zoom = currentViewState.zoom + dZoom;
      } else {
        thisViewState.zoom = currentViewState.zoom;
      }
      if (panLock) {
        const [oldX, oldY] = oldViewState.target;
        const [newX, newY] = viewState.target;
        const dx = newX - oldX;
        const dy = newY - oldY;
        thisViewState.target.push(currentX + dx);
        thisViewState.target.push(currentY + dy);
      } else {
        thisViewState.target.push(currentX);
        thisViewState.target.push(currentY);
      }
      return {
        id,
        target: thisViewState.target,
        zoom: thisViewState.zoom,
        height: thisViewState.height,
        width: thisViewState.width
      };
    }
    return viewState.id === id
      ? {
          id,
          target: viewState.target,
          zoom: viewState.zoom,
          height: viewState.height,
          width: viewState.width
        }
      : {
          id,
          target: currentViewState.target,
          zoom: currentViewState.zoom,
          height: currentViewState.height,
          width: currentViewState.width
        };
  }

  getLayers({ props, viewStates }) {
    const { loader } = props;
    const { id, viewportOutlineColor, viewportOutlineWidth, height, width } =
      this;
    const layerViewState = viewStates[id];
    const boundingBox = makeBoundingBox({ ...layerViewState, height, width });
    const layers = [getImageLayer(id, props)];

    const border = new PolygonLayer({
      id: `viewport-outline-${getVivId(id)}`,
      coordinateSystem: COORDINATE_SYSTEM.CARTESIAN,
      data: [boundingBox],
      getPolygon: f => f,
      filled: false,
      stroked: true,
      getLineColor: viewportOutlineColor,
      getLineWidth: viewportOutlineWidth * 2 ** -layerViewState.zoom
    });
    layers.push(border);

    if (_optionalChain$4([loader, 'access', _ => _[0], 'optionalAccess', _2 => _2.meta, 'optionalAccess', _3 => _3.physicalSizes, 'optionalAccess', _4 => _4.x])) {
      const { size, unit } = loader[0].meta.physicalSizes.x;
      layers.push(
        new ScaleBarLayer({
          id: getVivId(id),
          loader,
          unit,
          size,
          snap: this.snapScaleBar,
          viewState: { ...layerViewState, height, width }
        })
      );
    }

    return layers;
  }
}

/**
 * This class generates a VolumeLayer and a view for use in the VivViewer as volumetric rendering.
 * @param {Object} args
 * @param {Array<number>} args.target Centered target for the camera (used if useFixedAxis is true)
 * @param {Boolean} args.useFixedAxis Whether or not to fix the axis of the camera.
 * */
class VolumeView extends VivView {
  constructor({ target, useFixedAxis, ...args }) {
    super(args);
    this.target = target;
    this.useFixedAxis = useFixedAxis;
  }

  getDeckGlView() {
    const { height, width, id, x, y } = this;
    return new OrbitView({
      id,
      controller: true,
      height,
      width,
      x,
      y,
      orbitAxis: 'Y'
    });
  }

  filterViewState({ viewState }) {
    const { id, target, useFixedAxis } = this;
    return viewState.id === id
      ? {
          ...viewState,
          // fix the center of the camera if desired
          target: useFixedAxis ? target : viewState.target
        }
      : null;
  }

  getLayers({ props }) {
    const { loader } = props;
    const { id } = this;

    const layers = [
      new VolumeLayer(props, {
        id: `${loader.type}${getVivId(id)}`
      })
    ];

    return layers;
  }
}

const _jsxFileName$3 = "/Users/swarchol/Research/viv/packages/viewers/src/VivViewer.jsx"; function _nullishCoalesce(lhs, rhsFn) { if (lhs != null) { return lhs; } else { return rhsFn(); } } function _optionalChain$3(ops) { let lastAccessLHS = undefined; let value = ops[0]; let i = 1; while (i < ops.length) { const op = ops[i]; const fn = ops[i + 1]; i += 2; if ((op === 'optionalAccess' || op === 'optionalCall') && value == null) { return undefined; } if (op === 'access' || op === 'optionalAccess') { lastAccessLHS = value; value = fn(value); } else if (op === 'call' || op === 'optionalCall') { value = fn((...args) => value.call(lastAccessLHS, ...args)); lastAccessLHS = undefined; } } return value; }
const areViewStatesEqual = (viewState, otherViewState) => {
  return (
    otherViewState === viewState ||
    (_optionalChain$3([viewState, 'optionalAccess', _ => _.zoom]) === _optionalChain$3([otherViewState, 'optionalAccess', _2 => _2.zoom]) &&
      _optionalChain$3([viewState, 'optionalAccess', _3 => _3.rotationX]) === _optionalChain$3([otherViewState, 'optionalAccess', _4 => _4.rotationX]) &&
      _optionalChain$3([viewState, 'optionalAccess', _5 => _5.rotationOrbit]) === _optionalChain$3([otherViewState, 'optionalAccess', _6 => _6.rotationOrbit]) &&
      equal(_optionalChain$3([viewState, 'optionalAccess', _7 => _7.target]), _optionalChain$3([otherViewState, 'optionalAccess', _8 => _8.target])))
  );
};

/**
 * @typedef viewStateChangeProps
 * @type {object}
 * @property {string} args.viewId
 * @property {object} args.viewState
 * @property {object} args.oldViewState
 * @ignore
 */

/**
 * @callback ViewStateChange
 * @param {viewStateChangeProps} args
 * @ignore
 */

/**
 * @callback Hover
 * @param {Object} info
 * @param {Object} event
 * @ignore
 */

/**
 * @callback HandleValue
 * @param {Array.<number>} valueArray pixel values for the image under the hover location
 * @ignore
 */

/**
 * @callback HandleCoordinate
 * @param {Object} coordnate The coordinate in the image from which the values are picked.
 * @ignore
 */

/**
 * @typedef HoverHooks
 * @type {object}
 * @property {HandleValue} handleValue
 * @property {HandleCoordinate} handleCoordinate
 * @ignore
 */
class VivViewerWrapper extends React.PureComponent {
  constructor(props) {
    super(props);
    this.state = {
      viewStates: {}
    };
    const { viewStates } = this.state;
    const { views, viewStates: initialViewStates } = this.props;
    views.forEach(view => {
      viewStates[view.id] = view.filterViewState({
        viewState: initialViewStates.find(v => v.id === view.id)
      });
    });
    this._onViewStateChange = this._onViewStateChange.bind(this);
    this.layerFilter = this.layerFilter.bind(this);
    this.onHover = this.onHover.bind(this);
  }

  /**
   * This prevents only the `draw` call of a layer from firing,
   * but not other layer lifecycle methods.  Nonetheless, it is
   * still useful.
   * @param {object} args
   * @param {object} args.layer Layer being updated.
   * @param {object} args.viewport Viewport being updated.
   * @returns {boolean} Whether or not this layer should be drawn in this viewport.
   */
  layerFilter({ layer, viewport }) {
    return layer.id.includes(getVivId(viewport.id));
  }

  /**
   * This updates the viewState as a callback to the viewport changing in DeckGL
   * (hence the need for storing viewState in state).
   */
  _onViewStateChange({ viewId, viewState, interactionState, oldViewState }) {
    // Save the view state and trigger rerender.
    const { views, onViewStateChange } = this.props;
    viewState =
      _optionalChain$3([onViewStateChange, 'optionalCall', _9 => _9({
        viewId,
        viewState,
        interactionState,
        oldViewState
      })]) || viewState;
    this.setState(prevState => {
      const viewStates = {};
      views.forEach(view => {
        const currentViewState = prevState.viewStates[view.id];
        viewStates[view.id] = view.filterViewState({
          viewState: { ...viewState, id: viewId },
          oldViewState,
          currentViewState
        });
      });
      return { viewStates };
    });
    return viewState;
  }

  componentDidUpdate(prevProps) {
    const { props } = this;
    const { views } = props;
    // Only update state if the previous viewState prop does not match the current one
    // so that people can update viewState
    const viewStates = { ...this.state.viewStates };
    let anyChanged = false;
    views.forEach(view => {
      const currViewState = _optionalChain$3([props, 'access', _10 => _10.viewStates, 'optionalAccess', _11 => _11.find, 'call', _12 => _12(
        viewState => viewState.id === view.id
      )]);
      if (!currViewState) {
        return;
      }
      const prevViewState = _optionalChain$3([prevProps, 'access', _13 => _13.viewStates, 'optionalAccess', _14 => _14.find, 'call', _15 => _15(
        viewState => viewState.id === view.id
      )]);
      if (areViewStatesEqual(currViewState, prevViewState)) {
        return;
      }
      anyChanged = true;
      const { height, width } = view;
      viewStates[view.id] = view.filterViewState({
        viewState: {
          ...currViewState,
          height,
          width,
          id: view.id
        }
      });
    });
    if (anyChanged) {
      this.setState({ viewStates });
    }
  }

  /**
   * This updates the viewStates' height and width with the newest height and
   * width on any call where the viewStates changes (i.e resize events),
   * using the previous state (falling back on the view's initial state) for target x and y, zoom level etc.
   */
  static getDerivedStateFromProps(props, prevState) {
    const { views, viewStates: viewStatesProps } = props;
    // Update internal viewState on view changes as well as height and width changes.
    // Maybe we should add x/y too?
    if (
      views.some(
        view =>
          !prevState.viewStates[view.id] ||
          view.height !== prevState.viewStates[view.id].height ||
          view.width !== prevState.viewStates[view.id].width
      )
    ) {
      const viewStates = {};
      views.forEach(view => {
        const { height, width } = view;
        const currentViewState = prevState.viewStates[view.id];
        viewStates[view.id] = view.filterViewState({
          viewState: {
            ...(currentViewState ||
              viewStatesProps.find(v => v.id === view.id)),
            height,
            width,
            id: view.id
          }
        });
      });
      return { viewStates };
    }
    return prevState;
  }

  onHover(info, event) {
    const { tile, coordinate, sourceLayer: layer } = info;
    const { onHover, hoverHooks } = this.props;
    if (onHover) {
      onHover(info, event);
    }
    if (!hoverHooks || !coordinate || !layer) {
      return null;
    }
    const { handleValue = () => {}, handleCoordnate = () => {} } = hoverHooks;
    let hoverData;
    // Tiled layer needs a custom layerZoomScale.
    if (layer.id.includes('Tiled')) {
      if (!_optionalChain$3([tile, 'optionalAccess', _16 => _16.content])) {
        return null;
      }
      const {
        content,
        bbox,
        index: { z }
      } = tile;
      if (!content.data || !bbox) {
        return null;
      }
      const { data, width, height } = content;
      const { left, right, top, bottom } = bbox;
      const bounds = [
        left,
        data.height < layer.tileSize ? height : bottom,
        data.width < layer.tileSize ? width : right,
        top
      ];
      if (!data) {
        return null;
      }
      // The zoomed out layer needs to use the fixed zoom at which it is rendered.
      const layerZoomScale = Math.max(1, 2 ** Math.round(-z));
      const dataCoords = [
        Math.floor((coordinate[0] - bounds[0]) / layerZoomScale),
        Math.floor((coordinate[1] - bounds[3]) / layerZoomScale)
      ];
      const coords = dataCoords[1] * width + dataCoords[0];
      hoverData = data.map(d => d[coords]);
    } else {
      const { channelData } = layer.props;
      if (!channelData) {
        return null;
      }
      const { data, width, height } = channelData;
      if (!data || !width || !height) {
        return null;
      }
      const bounds = [0, height, width, 0];
      // Using floor means that as we zoom out, we are scaling by the zoom just passed, not the one coming.
      const { zoom } = layer.context.viewport;
      const layerZoomScale = Math.max(1, 2 ** Math.floor(-zoom));
      const dataCoords = [
        Math.floor((coordinate[0] - bounds[0]) / layerZoomScale),
        Math.floor((coordinate[1] - bounds[3]) / layerZoomScale)
      ];
      const coords = dataCoords[1] * width + dataCoords[0];
      hoverData = data.map(d => d[coords]);
    }
    handleValue(hoverData);
    handleCoordnate(coordinate);
  }

  /**
   * This renders the layers in the DeckGL context.
   */
  _renderLayers() {
    const { onHover } = this;
    const { viewStates } = this.state;
    const { views, layerProps } = this.props;
    return views.map((view, i) =>
      view.getLayers({
        viewStates,
        props: {
          ...layerProps[i],
          onHover
        }
      })
    );
  }

  render() {
    const { views, randomize, useDevicePixels = true, deckProps } = this.props;
    const { viewStates } = this.state;
    const deckGLViews = views.map(view => view.getDeckGlView());
    // DeckGL seems to use the first view more than the second for updates
    // so this forces it to use the others more evenly.  This isn't perfect,
    // but I am not sure what else to do.  The DeckGL render hooks don't help,
    // but maybe useEffect() would help?  I couldn't work it out as
    // The issue is that I'm not sure how React would distinguish between forced updates
    // from permuting the views array and "real" updates like zoom/pan.
    // I tried keeping a counter but I couldn't figure out resetting it
    // without triggering a re-render.
    if (randomize) {
      const random = Math.random();
      const holdFirstElement = deckGLViews[0];
      // weight has to go to 1.5 because we use Math.round().
      const randomWieghted = random * 1.49;
      const randomizedIndex = Math.round(randomWieghted * (views.length - 1));
      deckGLViews[0] = deckGLViews[randomizedIndex];
      deckGLViews[randomizedIndex] = holdFirstElement;
    }
    return (
      React.createElement(DeckGL, {
        ...(_nullishCoalesce(deckProps, () => ( {}))),
        layerFilter: this.layerFilter,
        layers: 
          _optionalChain$3([deckProps, 'optionalAccess', _17 => _17.layers]) === undefined
            ? [...this._renderLayers()]
            : [...this._renderLayers(), ...deckProps.layers]
        ,
        onViewStateChange: this._onViewStateChange,
        views: deckGLViews,
        viewState: viewStates,
        useDevicePixels: useDevicePixels,
        getCursor: ({ isDragging }) => {
          return isDragging ? 'grabbing' : 'crosshair';
        }, __self: this, __source: {fileName: _jsxFileName$3, lineNumber: 297}}
      )
    );
  }
}

/**
 * This component wraps the DeckGL component.
 * @param {Object} props
 * @param {Array} props.layerProps  Props for the layers in each view.
 * @param {boolean} [props.randomize] Whether or not to randomize which view goes first (for dynamic rendering of multiple linked views).
 * @param {Array.<import('../views').VivView>} props.views Various `VivView`s to render.
 * @param {Array.<object>} props.viewStates List of objects like [{ target: [x, y, 0], zoom: -zoom, id: 'left' }, { target: [x, y, 0], zoom: -zoom, id: 'right' }]
 * @param {ViewStateChange} [props.onViewStateChange] Callback that returns the deck.gl view state (https://deck.gl/docs/api-reference/core/deck#onviewstatechange).
 * @param {Hover} [props.onHover] Callback that returns the picking info and the event (https://deck.gl/docs/api-reference/core/layer#onhover
 *     https://deck.gl/docs/developer-guide/interactivity#the-picking-info-object)
 * @param {HoverHooks} [props.hoverHooks] Object including utility hooks - an object with key handleValue like { handleValue: (valueArray) => {}, handleCoordinate: (coordinate) => {} } where valueArray
 * has the pixel values for the image under the hover location and coordinate is the coordinate in the image from which the values are picked.
 * @param {Object} [props.deckProps] Additional options used when creating the DeckGL component.  See [the deck.gl docs.](https://deck.gl/docs/api-reference/core/deck#initialization-settings).  `layerFilter`, `layers`, `onViewStateChange`, `views`, `viewState`, `useDevicePixels`, and `getCursor` are already set.
 */
const VivViewer = props => React.createElement(VivViewerWrapper, { ...props, __self: undefined, __source: {fileName: _jsxFileName$3, lineNumber: 331}} );

const _jsxFileName$2 = "/Users/swarchol/Research/viv/packages/viewers/src/PictureInPictureViewer.jsx"; function _optionalChain$2(ops) { let lastAccessLHS = undefined; let value = ops[0]; let i = 1; while (i < ops.length) { const op = ops[i]; const fn = ops[i + 1]; i += 2; if ((op === 'optionalAccess' || op === 'optionalCall') && value == null) { return undefined; } if (op === 'access' || op === 'optionalAccess') { lastAccessLHS = value; value = fn(value); } else if (op === 'call' || op === 'optionalCall') { value = fn((...args) => value.call(lastAccessLHS, ...args)); lastAccessLHS = undefined; } } return value; }
/**
 * This component provides a component for an overview-detail VivViewer of an image (i.e picture-in-picture).
 * @param {Object} props
 * @param {Array} props.contrastLimits List of [begin, end] values to control each channel's ramp function.
 * @param {Array} props.colors List of [r, g, b] values for each channel.
 * @param {Array} props.channelsVisible List of boolean values for each channel for whether or not it is visible.
 * @param {string} [props.colormap] String indicating a colormap (default: '').  The full list of options is here: https://github.com/glslify/glsl-colormap#glsl-colormap
 * @param {Array} props.loader The data source for the viewer, PixelSource[]. If loader.length > 1, data is assumed to be multiscale.
 * @param {Array} props.selections Selection to be used for fetching data.
 * @param {Object} props.overview Allows you to pass settings into the OverviewView: { scale, margin, position, minimumWidth, maximumWidth,
 * boundingBoxColor, boundingBoxOutlineWidth, viewportOutlineColor, viewportOutlineWidth}.  See http://viv.gehlenborglab.org/#overviewview for defaults.
 * @param {Boolean} props.overviewOn Whether or not to show the OverviewView.
 * @param {import('./VivViewer').HoverHooks} [props.hoverHooks] Object including utility hooks - an object with key handleValue like { handleValue: (valueArray) => {}, handleCoordinate: (coordinate) => {} } where valueArray
 * has the pixel values for the image under the hover location and coordinate is the coordinate in the image from which the values are picked.
 * @param {Array} [props.viewStates] Array of objects like [{ target: [x, y, 0], zoom: -zoom, id: DETAIL_VIEW_ID }] for setting where the viewer looks (optional - this is inferred from height/width/loader
 * internally by default using getDefaultInitialViewState).
 * @param {number} props.height Current height of the component.
 * @param {number} props.width Current width of the component.
 * @param {Array} [props.extensions] [deck.gl extensions](https://deck.gl/docs/developer-guide/custom-layers/layer-extensions) to add to the layers.
 * @param {Boolean} [props.clickCenter] Click to center the default view. Default is true.
 * @param {boolean} [props.lensEnabled] Whether or not to use the lens (deafult false). Must be used with the `LensExtension` in the `extensions` prop.
 * @param {number} [props.lensSelection] Numeric index of the channel to be focused on by the lens (default 0). Must be used with the `LensExtension` in the `extensions` prop.
 * @param {number} [props.lensRadius] Pixel radius of the lens (default: 100). Must be used with the `LensExtension` in the `extensions` prop.
 * @param {Array} [props.lensBorderColor] RGB color of the border of the lens (default [255, 255, 255]). Must be used with the `LensExtension` in the `extensions` prop.
 * @param {number} [props.lensBorderRadius] Percentage of the radius of the lens for a border (default 0.02). Must be used with the `LensExtension` in the `extensions` prop.
 * @param {Array} [props.transparentColor] An RGB (0-255 range) color to be considered "transparent" if provided.
 * In other words, any fragment shader output equal transparentColor (before applying opacity) will have opacity 0.
 * This parameter only needs to be a truthy value when using colormaps because each colormap has its own transparent color that is calculated on the shader.
 * Thus setting this to a truthy value (with a colormap set) indicates that the shader should make that color transparent.
 * @param {boolean} [props.snapScaleBar] If true, aligns the scale bar value to predefined intervals
 * for clearer readings, adjusting units if necessary. By default, false.
 * @param {import('./VivViewer').ViewStateChange} [props.onViewStateChange] Callback that returns the deck.gl view state (https://deck.gl/docs/api-reference/core/deck#onviewstatechange).
 * @param {import('./VivViewer').Hover} [props.onHover] Callback that returns the picking info and the event (https://deck.gl/docs/api-reference/core/layer#onhover
 *     https://deck.gl/docs/developer-guide/interactivity#the-picking-info-object)
 * @param {function} [props.onViewportLoad] Function that gets called when the data in the viewport loads.
 * @param {Object} [props.deckProps] Additional options used when creating the DeckGL component.  See [the deck.gl docs.](https://deck.gl/docs/api-reference/core/deck#initialization-settings).  `layerFilter`, `layers`, `onViewStateChange`, `views`, `viewState`, `useDevicePixels`, and `getCursor` are already set.
 */

const PictureInPictureViewer = props => {
  const {
    loader,
    contrastLimits,
    colors,
    channelsVisible,
    viewStates: viewStatesProp,
    colormap,
    overview,
    overviewOn,
    selections,
    hoverHooks = { handleValue: () => {}, handleCoordinate: () => {} },
    height,
    width,
    lensEnabled = false,
    lensSelection = 0,
    lensRadius = 100,
    lensBorderColor = [255, 255, 255],
    lensBorderRadius = 0.02,
    clickCenter = true,
    transparentColor,
    snapScaleBar = false,
    onViewStateChange,
    onHover,
    onViewportLoad,
    extensions = [new ColorPaletteExtension()],
    deckProps
  } = props;
  const detailViewState = _optionalChain$2([viewStatesProp, 'optionalAccess', _ => _.find, 'call', _2 => _2(v => v.id === DETAIL_VIEW_ID)]);
  // biome-ignore lint/correctness/useExhaustiveDependencies: Carried over from eslint, without explanation.
  const baseViewState = React.useMemo(() => {
    return (
      detailViewState ||
      getDefaultInitialViewState(loader, { height, width }, 0.5)
    );
  }, [loader, detailViewState]);

  const detailView = new DetailView({
    id: DETAIL_VIEW_ID,
    height,
    width,
    snapScaleBar
  });
  const layerConfig = {
    loader,
    contrastLimits,
    colors,
    channelsVisible,
    selections,
    onViewportLoad,
    colormap,
    lensEnabled,
    lensSelection,
    lensRadius,
    lensBorderColor,
    lensBorderRadius,
    extensions,
    transparentColor
  };
  const views = [detailView];
  const layerProps = [layerConfig];
  const viewStates = [{ ...baseViewState, id: DETAIL_VIEW_ID }];
  if (overviewOn && loader) {
    // It's unclear why this is needed because OverviewView.filterViewState sets "zoom" and "target".
    const overviewViewState = _optionalChain$2([viewStatesProp, 'optionalAccess', _3 => _3.find, 'call', _4 => _4(
      v => v.id === OVERVIEW_VIEW_ID
    )]) || { ...baseViewState, id: OVERVIEW_VIEW_ID };
    const overviewView = new OverviewView({
      id: OVERVIEW_VIEW_ID,
      loader,
      detailHeight: height,
      detailWidth: width,
      clickCenter,
      ...overview
    });
    views.push(overviewView);
    layerProps.push({ ...layerConfig, lensEnabled: false });
    viewStates.push(overviewViewState);
  }
  if (!loader) return null;
  return (
    React.createElement(VivViewer, {
      layerProps: layerProps,
      views: views,
      viewStates: viewStates,
      hoverHooks: hoverHooks,
      onViewStateChange: onViewStateChange,
      onHover: onHover,
      deckProps: deckProps, __self: undefined, __source: {fileName: _jsxFileName$2, lineNumber: 131}}
    )
  );
};

const _jsxFileName$1 = "/Users/swarchol/Research/viv/packages/viewers/src/SideBySideViewer.jsx"; function _optionalChain$1(ops) { let lastAccessLHS = undefined; let value = ops[0]; let i = 1; while (i < ops.length) { const op = ops[i]; const fn = ops[i + 1]; i += 2; if ((op === 'optionalAccess' || op === 'optionalCall') && value == null) { return undefined; } if (op === 'access' || op === 'optionalAccess') { lastAccessLHS = value; value = fn(value); } else if (op === 'call' || op === 'optionalCall') { value = fn((...args) => value.call(lastAccessLHS, ...args)); lastAccessLHS = undefined; } } return value; }
/**
 * This component provides a side-by-side VivViewer with linked zoom/pan.
 * @param {Object} props
 * @param {Array} props.contrastLimits List of [begin, end] values to control each channel's ramp function.
 * @param {Array} props.colors List of [r, g, b] values for each channel.
 * @param {Array} props.channelsVisible List of boolean values for each channel for whether or not it is visible.
 * @param {string} [props.colormap] String indicating a colormap (default: '').  The full list of options is here: https://github.com/glslify/glsl-colormap#glsl-colormap
 * @param {Array} props.loader This data source for the viewer. PixelSource[]. If loader.length > 1, data is assumed to be multiscale.
 * @param {Array} props.selections Selection to be used for fetching data.
 * @param {Boolean} props.zoomLock Whether or not lock the zooms of the two views.
 * @param {Boolean} props.panLock Whether or not lock the pans of the two views.
 * @param {Array} [props.viewStates] List of objects like [{ target: [x, y, 0], zoom: -zoom, id: 'left' }, { target: [x, y, 0], zoom: -zoom, id: 'right' }] for initializing where the viewer looks (optional - this is inferred from height/width/loader
 * internally by default using getDefaultInitialViewState).
 * @param {number} props.height Current height of the component.
 * @param {number} props.width Current width of the component.
 * @param {Array} [props.extensions] [deck.gl extensions](https://deck.gl/docs/developer-guide/custom-layers/layer-extensions) to add to the layers.
 * @param {boolean} [props.lensEnabled] Whether or not to use the lens deafult (false).
 * @param {number} [props.lensSelection] Numeric index of the channel to be focused on by the lens (default 0).
 * @param {Array} [props.lensBorderColor] RGB color of the border of the lens (default [255, 255, 255]).
 * @param {number} [props.lensBorderRadius] Percentage of the radius of the lens for a border (default 0.02).
 * @param {number} [props.lensRadius] Pixel radius of the lens (default: 100).
 * @param {Array} [props.transparentColor] An RGB (0-255 range) color to be considered "transparent" if provided.
 * In other words, any fragment shader output equal transparentColor (before applying opacity) will have opacity 0.
 * This parameter only needs to be a truthy value when using colormaps because each colormap has its own transparent color that is calculated on the shader.
 * Thus setting this to a truthy value (with a colormap set) indicates that the shader should make that color transparent.
 * @param {boolean} [props.snapScaleBar] If true, aligns the scale bar value to predefined intervals
 * for clearer readings, adjusting units if necessary. By default, false.
 * @param {import('./VivViewer').ViewStateChange} [props.onViewStateChange] Callback that returns the deck.gl view state (https://deck.gl/docs/api-reference/core/deck#onviewstatechange).
 * @param {import('./VivViewer').Hover} [props.onHover] Callback that returns the picking info and the event (https://deck.gl/docs/api-reference/core/layer#onhover
 *     https://deck.gl/docs/developer-guide/interactivity#the-picking-info-object)
 * @param {Object} [props.deckProps] Additional options used when creating the DeckGL component.  See [the deck.gl docs.](https://deck.gl/docs/api-reference/core/deck#initialization-settings).  `layerFilter`, `layers`, `onViewStateChange`, `views`, `viewState`, `useDevicePixels`, and `getCursor` are already set.
 */
const SideBySideViewer = props => {
  const {
    loader,
    contrastLimits,
    colors,
    channelsVisible,
    viewStates: viewStatesProp,
    colormap,
    panLock,
    selections,
    zoomLock,
    height,
    width,
    lensEnabled = false,
    lensSelection = 0,
    lensRadius = 100,
    lensBorderColor = [255, 255, 255],
    lensBorderRadius = 0.02,
    transparentColor,
    snapScaleBar = false,
    onViewStateChange,
    onHover,
    onViewportLoad,
    extensions = [new ColorPaletteExtension()],
    deckProps
  } = props;
  const leftViewState = _optionalChain$1([viewStatesProp, 'optionalAccess', _ => _.find, 'call', _2 => _2(v => v.id === 'left')]);
  const rightViewState = _optionalChain$1([viewStatesProp, 'optionalAccess', _3 => _3.find, 'call', _4 => _4(v => v.id === 'right')]);
  // biome-ignore lint/correctness/useExhaustiveDependencies: Ignore carried over from eslint, without explanation.
  const viewStates = React.useMemo(() => {
    if (leftViewState && rightViewState) {
      return viewStatesProp;
    }
    const defaultViewState = getDefaultInitialViewState(
      loader,
      { height, width: width / 2 },
      0.5
    );
    return [
      leftViewState || { ...defaultViewState, id: 'left' },
      rightViewState || { ...defaultViewState, id: 'right' }
    ];
  }, [loader, leftViewState, rightViewState]);

  const detailViewLeft = new SideBySideView({
    id: 'left',
    linkedIds: ['right'],
    panLock,
    zoomLock,
    height,
    width: width / 2,
    snapScaleBar
  });
  const detailViewRight = new SideBySideView({
    id: 'right',
    x: width / 2,
    linkedIds: ['left'],
    panLock,
    zoomLock,
    height,
    width: width / 2,
    snapScaleBar
  });
  const layerConfig = {
    loader,
    contrastLimits,
    colors,
    channelsVisible,
    selections,
    onViewportLoad,
    colormap,
    lensEnabled,
    lensSelection,
    lensRadius,
    lensBorderColor,
    lensBorderRadius,
    extensions,
    transparentColor
  };
  const views = [detailViewRight, detailViewLeft];
  const layerProps = [layerConfig, layerConfig];
  return loader ? (
    React.createElement(VivViewer, {
      layerProps: layerProps,
      views: views,
      randomize: true,
      onViewStateChange: onViewStateChange,
      onHover: onHover,
      viewStates: viewStates,
      deckProps: deckProps, __self: undefined, __source: {fileName: _jsxFileName$1, lineNumber: 120}}
    )
  ) : null;
};

const _jsxFileName = "/Users/swarchol/Research/viv/packages/viewers/src/VolumeViewer.jsx"; function _optionalChain(ops) { let lastAccessLHS = undefined; let value = ops[0]; let i = 1; while (i < ops.length) { const op = ops[i]; const fn = ops[i + 1]; i += 2; if ((op === 'optionalAccess' || op === 'optionalCall') && value == null) { return undefined; } if (op === 'access' || op === 'optionalAccess') { lastAccessLHS = value; value = fn(value); } else if (op === 'call' || op === 'optionalCall') { value = fn((...args) => value.call(lastAccessLHS, ...args)); lastAccessLHS = undefined; } } return value; }
/**
 * This component provides a volumetric viewer that provides provides volume-ray-casting.
 * @param {Object} props
 * @param {Array} props.contrastLimits List of [begin, end] values to control each channel's ramp function.
 * @param {Array} [props.colors] List of [r, g, b] values for each channel - necessary if using one of the ColorPalette3DExtensions extensions.
 * @param {Array} props.channelsVisible List of boolean values for each channel for whether or not it is visible.
 * @param {string} [props.colormap] String indicating a colormap (default: '').  The full list of options is here: https://github.com/glslify/glsl-colormap#glsl-colormap - necessary if using one of the AdditiveColormap3DExtensions extensions.
 * @param {Array} props.loader This data source for the viewer. PixelSource[]. If loader.length > 1, data is assumed to be multiscale.
 * @param {Array} props.selections Selection to be used for fetching data
 * @param {Array} [props.resolution] Resolution at which you would like to see the volume and load it into memory (0 highest, loader.length - 1 the lowest with default loader.length - 1)
 * @param {import('./VivViewer').ViewStateChange} [props.onViewStateChange] Callback that returns the deck.gl view state (https://deck.gl/docs/api-reference/core/deck#onviewstatechange).
 * @param {Object} [props.modelMatrix] A column major affine transformation to be applied to the volume.
 * @param {Array} [props.xSlice] 0-1 interval on which to slice the volume.
 * @param {Array} [props.ySlice] 0-1 interval on which to slice the volume.
 * @param {Array} [props.zSlice] 0-1 interval on which to slice the volume.
 * @param {function} [props.onViewportLoad] Function that gets called when the data in the viewport loads.
 * @param {Array} [props.viewStates] List of objects like [{ target: [x, y, z], zoom: -zoom, id: '3d' }] for initializing where the viewer looks (optional - this is inferred from height/width/loader
 * internally by default using getDefaultInitialViewState).
 * @param {number} props.height Current height of the component.
 * @param {number} props.width Current width of the component.
 * @param {Array.<Object>} [props.clippingPlanes] List of math.gl [Plane](https://math.gl/modules/culling/docs/api-reference/plane) objects.
 * @param {Boolean} [props.useFixedAxis] Whether or not to fix the axis of the camera (default is true).
 * @param {Array=} extensions [deck.gl extensions](https://deck.gl/docs/developer-guide/custom-layers/layer-extensions) to add to the layers - default is AdditiveBlendExtension from ColorPalette3DExtensions.
 */

const VolumeViewer = props => {
  const {
    loader,
    contrastLimits,
    colors,
    channelsVisible,
    selections,
    colormap,
    resolution = Math.max(0, loader.length - 1),
    modelMatrix,
    onViewStateChange,
    xSlice = null,
    ySlice = null,
    zSlice = null,
    onViewportLoad,
    height: screenHeight,
    width: screenWidth,
    viewStates: viewStatesProp,
    clippingPlanes = [],
    useFixedAxis = true,
    extensions = [new ColorPalette3DExtensions.AdditiveBlendExtension()]
  } = props;
  const volumeViewState = _optionalChain([viewStatesProp, 'optionalAccess', _ => _.find, 'call', _2 => _2(state => _optionalChain([state, 'optionalAccess', _3 => _3.id]) === '3d')]);
  // FIXME: This ignore is carried over from eslint, without description. Why ignore deps?
  // biome-ignore lint/correctness/useExhaustiveDependencies: Carried over from eslint, without description.
  const initialViewState = React.useMemo(() => {
    if (volumeViewState) {
      return volumeViewState;
    }
    const viewState = getDefaultInitialViewState(
      loader,
      { height: screenHeight, width: screenWidth },
      1,
      true,
      modelMatrix
    );
    return {
      ...viewState,
      rotationX: 0,
      rotationOrbit: 0
    };
  }, [loader, resolution, modelMatrix]);
  const viewStates = [volumeViewState || { ...initialViewState, id: '3d' }];
  const volumeView = new VolumeView({
    id: '3d',
    target: viewStates[0].target,
    useFixedAxis
  });
  const layerConfig = {
    loader,
    contrastLimits,
    colors,
    channelsVisible,
    selections,
    colormap,
    xSlice,
    ySlice,
    zSlice,
    resolution,
    extensions,
    modelMatrix,
    // Slightly delay to avoid issues with a render in the middle of a deck.gl layer state update.
    onViewportLoad: () => setTimeout(onViewportLoad, 0),
    clippingPlanes
  };
  const views = [volumeView];
  const layerProps = [layerConfig];
  // useDevicePixels false to improve performance: https://deck.gl/docs/developer-guide/performance#common-issues
  return loader ? (
    React.createElement(VivViewer, {
      layerProps: layerProps,
      views: views,
      viewStates: viewStates,
      onViewStateChange: onViewStateChange,
      useDevicePixels: false, __self: undefined, __source: {fileName: _jsxFileName, lineNumber: 101}}
    )
  ) : null;
};

export { AdditiveColormap3DExtensions, AdditiveColormapExtension, BitmapLayer, COLORMAPS, ColorPalette3DExtensions, ColorPaletteExtension, DETAIL_VIEW_ID, DTYPE_VALUES, DetailView, ImageLayer, LensExtension, MAX_CHANNELS, MultiscaleImageLayer, OVERVIEW_VIEW_ID, OverviewLayer, OverviewView, PictureInPictureViewer, RENDERING_MODES, SIGNAL_ABORTED, ScaleBarLayer, SideBySideView, SideBySideViewer, TiffPixelSource, VivView, VivViewer, VolumeLayer, VolumeView, VolumeViewer, XR3DLayer, XRLayer, ZarrPixelSource, getChannelStats, getDefaultInitialViewState, getImageSize, isInterleaved, loadBioformatsZarr, loadMultiTiff, loadOmeTiff, loadOmeZarr };
