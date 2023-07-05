/* eslint-disable */
// @ts-ignore
import * as THREE from "three";
// @ts-ignore
import { VRButton } from 'three/examples/jsm/webxr/VRButton';
import {VolumeRenderShader1} from '../jsm/shaders/VolumeShader.js';
import {Volume} from "../jsm/misc/Volume.js";
import {Arcball} from './arcball';

/* eslint-disable */
import * as loaders from '@vivjs/loaders';

// TODO: move into loaders / public interface?
import { getVolume } from '@vivjs/layers/src/volume-layer/utils.js';

// https://viv-demo.storage.googleapis.com/2018-12-18_ASY_H2B_bud_05_3D_8_angles.ome.tif
// 'https://viv-demo.storage.googleapis.com/brain.pyramid.ome.tif'
let url = new URL(
  'https://viv-demo.storage.googleapis.com/2018-12-18_ASY_H2B_bud_05_3D_8_angles.ome.tif'
);
let { data: resolutions, metadata } = await loaders.loadOmeTiff(url.href);

console.log({ resolutions, metadata });

for (let [i, resolution] of Object.entries(resolutions)) {
  let dims = Object.fromEntries(
    resolution.labels.map((label: string, i: number) => [
      label,
      resolution.shape[i]
    ])
  );
  // console.log(i, dims);
}

let pre = Object.assign(document.createElement('pre'), {
  textContent: 'loading volume ...'
});

document.body.appendChild(pre);

// lowest resolution
let resolution = resolutions.length - 1;

let volumeOrigin = await getVolume({
  source: resolutions[resolution],
  selection: { t: 0, c: 0 }, // corresponds to the first channel of the first timepoint
  downsampleDepth: 2 ** resolution,
  onUpdate({ z, total }: { z: number; total: number }) {
    pre.textContent = `loading volume ... ${z}/${total} (${(z / total).toFixed(
      2
    )}%)`;
  }
});

// console.log(volume);

let { data, ...dimensions } = volumeOrigin;
pre.textContent = `loaded volume.\n${JSON.stringify(dimensions, null, 2)}`;

console.log(volumeOrigin);
console.log(volumeOrigin.data.length)

/*** RENDERING FOLLOWS FROM HERE
 *
 */

let volume = new Volume();
volume.xLength = volumeOrigin.height;
volume.yLength = volumeOrigin.width;
volume.zLength = volumeOrigin.depth;
volume.data = volumeOrigin.data;

// Get into Three Js with the Volume and initialize a custom shader with DVR (Can be taken from the ScrollyVis Project)
let container = Object.assign(document.createElement('div'), {});
document.body.appendChild(container);
container.style.height = "500px";
var canvas = document.createElement('canvas');

// get the min and max intensities
var min_max = volume.computeMinMax();
var min = min_max[0];
var max = min_max[1];

console.log(min + " " + max)

var dataASFloat32 = new Float32Array(volume.data.length);
for (var i = 0; i < volume.data.length; i++) {
  dataASFloat32 [i] = (volume.data[i] - min) / Math.sqrt(Math.pow(max, 2) - Math.pow(min, 2));
}
volume.data = dataASFloat32;
min_max = volume.computeMinMax();

console.log("after min max: " + min_max)
console.log(volumeOrigin)
console.log(volume)

let scene = new THREE.Scene();
var context = canvas.getContext('webgl2', {alpha: false, antialias: false});
let renderer = new THREE.WebGLRenderer({canvas: canvas, context: context});
renderer.setPixelRatio(window.devicePixelRatio);
renderer.setSize(container.offsetWidth, container.offsetHeight);
while (container.childNodes.length > 0) {
  container.removeChild(container.childNodes[0]);
}
container.appendChild(renderer.domElement);
var h = 500; // frustum height
var aspect = container.offsetWidth / container.offsetHeight;
let camera = new THREE.OrthographicCamera(-h * aspect / 2,
  h * aspect / 2,
  h / 2,
  -h / 2,
  1,
  100000);
camera.position.set(0, 0, 500);
camera.up.set(0, 0, 1); // In our data, z is up
// camera.zoom = 1.8;
let volconfig = {clim1: 0.15, clim2: 0.8, renderstyle: 'dvr' , isothreshold: 0.15, opacity: 1.0, colormap: 'viridis'};

// @ts-ignore
var texture = new THREE.Data3DTexture(volume.data, volume.xLength, volume.yLength, volume.zLength);
texture.format = THREE.RedFormat;
texture.type = THREE.FloatType;
texture.minFilter = texture.magFilter = THREE.LinearFilter;
texture.unpackAlignment = 1;
texture.needsUpdate = true;

// Colormap textures
let cmtextures = {
  viridis: new THREE.TextureLoader().load('textures/cm_viridis.png'),
  gray: new THREE.TextureLoader().load('textures/cm_gray.png')
};

// Material
var shader = VolumeRenderShader1;
var uniforms = THREE.UniformsUtils.clone(shader.uniforms);
uniforms["u_data"].value = texture;
uniforms["u_size"].value.set(volume.xLength, volume.yLength, volume.zLength);
uniforms["u_clim"].value.set(volconfig.clim1, volconfig.clim2);
uniforms["u_renderstyle"].value = volconfig.renderstyle === 'mip' ? 0 : volconfig.renderstyle === 'iso' ? 1 : 2; // 0: MIP, 1: ISO
uniforms["u_renderthreshold"].value = volconfig.isothreshold; // For ISO renderstyle
uniforms["u_opacity"].value = volconfig.opacity;
// @ts-ignore
uniforms["u_cmdata"].value = cmtextures[volconfig.colormap];

let material = new THREE.ShaderMaterial({
  uniforms: uniforms,
  vertexShader: shader.vertexShader,
  fragmentShader: shader.fragmentShader,
  side: THREE.BackSide, // The volume shader uses the backface as its "reference point"
  blending: THREE.NormalBlending,
  transparent: true,
});
material.customProgramCacheKey = function () {
  return '1';
};
// THREE.Mesh
var geometry = new THREE.BoxGeometry(volume.xLength, volume.yLength, volume.zLength);
geometry.translate(volume.xLength / 2 - 0.5, volume.yLength / 2 - 0.5, volume.zLength / 2 - 0.5);
var mesh = new THREE.Mesh(geometry, material);
mesh.scale.set(1,1,4);
mesh.position.set(-volume.xLength / 2, -volume.yLength / 2, -volume.zLength / 2); //if gi
scene.add(mesh)

camera.updateProjectionMatrix();
// renderer.render(scene,camera)

let arcball = new Arcball(renderer, camera, scene, container, mesh);
container.addEventListener('mousedown', (event) => {
  arcball.onDocumentMouseDown(event)
}, false);
container.addEventListener('mouseup', (event) => {
  arcball.onDocumentMouseUp(event);
}, false);
container.addEventListener('mousemove', (event) => {
  arcball.onDocumentMouseMove(event)
}, false);
container.addEventListener('wheel', (event) => {
  arcball.onDocumentMouseWheel(event);
}, false);
arcball.animate()


document.body.appendChild( VRButton.createButton( renderer ) );
renderer.xr.enabled = true;
