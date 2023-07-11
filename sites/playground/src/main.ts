/* eslint-disable */
// @ts-ignore
import * as THREE from "three";
// @ts-ignore
import { VRButton } from 'three/examples/jsm/webxr/VRButton';
import {VolumeRenderShaderPerspective} from '../jsm/shaders/VolumeShaderPerspective.js';
import {Volume} from "../jsm/misc/Volume.js";
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';

/* eslint-disable */
import * as loaders from '@vivjs/loaders';

// TODO: move into loaders / public interface?
import { getVolume } from '@vivjs/layers/src/volume-layer/utils.js';

// @ts-expect-error
import cmGrayTextureUrl from '../textures/cm_gray.png';
// @ts-expect-error
import cmViridisTextureUrl from '../textures/cm_viridis.png';

// https://viv-demo.storage.googleapis.com/2018-12-18_ASY_H2B_bud_05_3D_8_angles.ome.tif
// 'https://viv-demo.storage.googleapis.com/brain.pyramid.ome.tif'
let url = new URL(
  'https://viv-demo.storage.googleapis.com/2018-12-18_ASY_H2B_bud_05_3D_8_angles.ome.tif'
);
let { data: resolutions, metadata } = await loaders.loadOmeTiff(url.href);

// console.log({ resolutions, metadata });

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

// console.log(volumeOrigin);
// console.log(volumeOrigin.data.length)

/**************************************************************
 * ************************************************************
 * ************************************************************
 * **********    RENDERING FOLLOWS FROM HERE    ***************
 * ************************************************************
 * ************************************************************
 * ************************************************************
 */

export function getBoxSize(volumeSize: THREE.Vector3, voxelSize: THREE.Vector3)
{
  const s = volumeSize[0] * voxelSize[0];
  const boxWidth = 1;
  const boxHeight = volumeSize[1] * voxelSize[1] / s;
  const boxDepth = volumeSize[2] * voxelSize[2] / s;
  const boxSize = [boxWidth, boxHeight, boxDepth];
  return boxSize;
}

let volume = new Volume();
volume.xLength = volumeOrigin.height;
volume.yLength = volumeOrigin.width;
volume.zLength = volumeOrigin.depth;
volume.data = volumeOrigin.data;

// Get into Three Js with the Volume and initialize a custom shader with DVR (Can be taken from the ScrollyVis Project)
let container = Object.assign(document.createElement('div'), {});
document.body.appendChild(container);
container.style.height = "1000px";
container.style.background = "black";
// get the min and max intensities
var min_max = volume.computeMinMax();
var min = min_max[0];
var max = min_max[1];

var dataASFloat32 = new Float32Array(volume.data.length);
for (var i = 0; i < volume.data.length; i++) {
  dataASFloat32 [i] = (volume.data[i] - min) / Math.sqrt(Math.pow(max, 2) - Math.pow(min, 2));
}
volume.data = dataASFloat32;
min_max = volume.computeMinMax();

let scene = new THREE.Scene();
const renderer = new THREE.WebGLRenderer({antialias: true});
renderer.setClearColor("#000000");
renderer.setPixelRatio(window.devicePixelRatio);
renderer.setSize(container.offsetWidth, container.offsetHeight);
container.appendChild(renderer.domElement);

var user = new THREE.Group();
user.position.set(0,0,0);
const camera = new THREE.PerspectiveCamera( 45, container.offsetWidth/container.offsetHeight, 0.01, 100000);
camera.position.set(0, 0, 500);
camera.up.set(0,0,1);
user.add(camera);

// camera.zoom = 1.8;
let volconfig = {clim1: 0.2, clim2: 0.8, renderstyle: 'dvr' , isothreshold: 0.15, opacity: 1.0, colormap: 'viridis'};

// @ts-ignore
var texture = new THREE.Data3DTexture(volume.data, volume.xLength, volume.yLength, volume.zLength);
texture.format = THREE.RedFormat;
texture.type = THREE.FloatType;
texture.generateMipmaps = false;
texture.minFilter = texture.magFilter = THREE.LinearFilter;
// texture.unpackAlignment = 1;
texture.needsUpdate = true;

// Colormap textures
let cmtextures = {
  viridis: new THREE.TextureLoader().load(cmViridisTextureUrl),
  gray: new THREE.TextureLoader().load(cmGrayTextureUrl)
};

// Material
var shader = VolumeRenderShaderPerspective;
var uniforms = THREE.UniformsUtils.clone(shader.uniforms);
// uniforms["u_data"].value = texture;
uniforms["boxSize"].value.set(volume.xLength, volume.yLength, volume.zLength);
uniforms["volumeTex"].value = texture;
uniforms["near"].value = 0.01;
uniforms["far"].value = 100000;
uniforms["alphaScale"].value = 1.0;
uniforms["dtScale"].value = 1;
uniforms["finalGamma"].value = 4.5;
uniforms["useVolumeMirrorX"].value = false;
uniforms["u_size"].value.set(volume.xLength, volume.yLength, volume.zLength);
uniforms["u_clim"].value.set(volconfig.clim1, volconfig.clim2);
// uniforms["u_renderstyle"].value = volconfig.renderstyle === 'mip' ? 0 : volconfig.renderstyle === 'iso' ? 1 : 2; // 0: MIP, 1: ISO
// uniforms["u_renderthreshold"].value = volconfig.isothreshold; // For ISO renderstyle
// uniforms["u_opacity"].value = volconfig.opacity;
// @ts-ignore
uniforms["u_cmdata"].value = cmtextures[volconfig.colormap];

let material = new THREE.ShaderMaterial({
  uniforms: uniforms,
  vertexShader: shader.vertexShader,
  fragmentShader: shader.fragmentShader,
  side: THREE.BackSide, // The volume shader uses the backface as its "reference point"
  // blending: THREE.NormalBlending,
  // transparent: true,
});
material.needsUpdate = true;
material.customProgramCacheKey = function () {
  return '1';
};
// THREE.Mesh
var geometry = new THREE.BoxGeometry(volume.xLength, volume.yLength, volume.zLength);
var mesh = new THREE.Mesh(geometry, material);
mesh.scale.set(1,1,4);
scene.add(mesh)

scene.add(user);
camera.updateProjectionMatrix();

const controls = new OrbitControls( camera, renderer.domElement );
controls.update();
document.body.appendChild(VRButton.createButton( renderer ) );
renderer.xr.enabled = true;
renderer.setAnimationLoop(() => animate());

renderer.xr.addEventListener("sessionstart", () => {
  renderer.xr.getCamera().position.copy( camera.position);
  renderer.xr.getCamera().lookAt( camera.target );
});


function animate() {
  controls.update();
  renderer.render( scene, camera );
}
