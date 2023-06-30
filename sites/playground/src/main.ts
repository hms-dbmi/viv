/* eslint-disable */
// @ts-ignore
import * as THREE from "three";

/* eslint-disable */
import * as loaders from '@vivjs/loaders';

// TODO: move into loaders / public interface?
import { getVolume } from '@vivjs/layers/src/volume-layer/utils.js';

//https://viv-demo.storage.googleapis.com/2018-12-18_ASY_H2B_bud_05_3D_8_angles.ome.tif
//
// let url = new URL(
//   'https://viv-demo.storage.googleapis.com/brain.pyramid.ome.tif'
// );
// let { data: resolutions, metadata } = await loaders.loadOmeTiff(url.href);
//
// console.log({ resolutions, metadata });
//
// for (let [i, resolution] of Object.entries(resolutions)) {
//   let dims = Object.fromEntries(
//     resolution.labels.map((label: string, i: number) => [
//       label,
//       resolution.shape[i]
//     ])
//   );
//   console.log(i, dims);
// }
//
// let pre = Object.assign(document.createElement('pre'), {
//   textContent: 'loading volume ...'
// });
//
// document.body.appendChild(pre);
//
// // lowest resolution
// let resolution = resolutions.length - 1;
//
// let volume = await getVolume({
//   source: resolutions[resolution],
//   selection: { t: 0, c: 0 }, // corresponds to the first channel of the first timepoint
//   downsampleDepth: 2 ** resolution,
//   onUpdate({ z, total }: { z: number; total: number }) {
//     pre.textContent = `loading volume ... ${z}/${total} (${(z / total).toFixed(
//       2
//     )}%)`;
//   }
// });
//
// console.log(volume);
//
// let { data, ...dimensions } = volume;
// pre.textContent = `loaded volume.\n${JSON.stringify(dimensions, null, 2)}`;

// Get into Three Js with the Volume and initialize a custom shader with DVR (Can be taken from the ScrollyVis Project)
let volViz = Object.assign(document.createElement('canvas'), {});
document.body.appendChild(volViz);

volViz.style.width = "500px"
volViz.style.background = "black"
volViz.style.display = "block"
volViz.style.height = "500px"

let camera, renderer, directionallight;
let scene = new THREE.Scene();

camera = new THREE.PerspectiveCamera(45, 500 / 500, 1, 1000);
camera.position.x = 0;
camera.position.y = 0;
camera.position.z = 100;

directionallight = new THREE.DirectionalLight(0xffffff, 1);
directionallight.position.set(1, 1, 1).normalize();
camera.add(directionallight);
scene.add(camera);
var geometry = new THREE.BoxGeometry(20, 20, 20);
for (var i = 0; i < 200; i++) {
  var object = new THREE.Mesh(geometry, new THREE.MeshLambertMaterial({ color: Math.random() * 0xffffff }));
  object.position.x = Math.random() * 800 - 400;
  object.position.y = Math.random() * 800 - 400;
  object.position.z = Math.random() * 800 - 400;
  scene.add(object);
}
renderer = new THREE.WebGLRenderer({ antialias: true, canvas: volViz });
renderer.setSize(500, 500);
renderer.setClearColor("#79bff3", 1);
renderer.setPixelRatio(window.devicePixelRatio);

renderer.render(scene, camera)
