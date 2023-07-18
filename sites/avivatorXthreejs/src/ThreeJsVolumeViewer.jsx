/* global globalThis */
import * as React from 'react';

import {Volume} from "../jsm/misc/Volume.js";
import { getImageSize } from '@hms-dbmi/viv';

import * as THREE from "three";
import { VRButton } from 'three/examples/jsm/webxr/VRButton';
import {VolumeRenderShaderPerspective} from '../jsm/shaders/VolumeShaderPerspective.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';

import cmGrayTextureUrl from '../textures/cm_gray.png';
import cmViridisTextureUrl from '../textures/cm_viridis.png';

class ThreeJsViewWrapper extends React.PureComponent {
  constructor(props) {
    super(props);
    const { layerProps, views, viewStates, useDevicePixels } = this.props;
    const {loader, channelsVisible, resolution, colors, contrastLimits} = layerProps[0];
    this.loader = loader;
    this.resolution = resolution;
  }

  // TODO: Use the imported function from VIV: Ask Trevor how to get there
  async getVolumeIntern({
                          source,
                          selection,
                          onUpdate = () => {
                          },
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
        onUpdate({ z, total: depthDownsampled, progress: 0.5 });
        // For now this process fills in each raster plane anti-diagonally transposed.
        // This is to ensure that the image looks right in three dimensional space.
        while (r < rasterSize) {
          const volIndex = z * rasterSize + (rasterSize - r - 1);
          const rasterIndex =
            ((width - r - 1) % width) + width * Math.floor(r / width);
          volumeData[volIndex] = rasterData[rasterIndex];
          r += 1;
        }
        onUpdate({ z, total: depthDownsampled, progress: 1 });
      })
    );
    return {
      data: volumeData,
      height,
      width,
      depth: depthDownsampled
    };
  }

  async getVolumeByChannel(channel){
    return this.getVolumeIntern({
      source: this.loader[this.resolution],
      selection: { t: 0, c: channel }, // corresponds to the first channel of the first timepoint
      downsampleDepth: 2 ** this.resolution,
    });
  }
  minMaxVolume(volume){
    // get the min and max intensities
    var min_max = volume.computeMinMax();
    var min = min_max[0];
    var max = min_max[1];

    var dataASFloat32 = new Float32Array(volume.data.length);
    for (var i = 0; i < volume.data.length; i++) {
      dataASFloat32 [i] = (volume.data[i] - min) / Math.sqrt(Math.pow(max, 2) - Math.pow(min, 2));
    }
    return dataASFloat32;
  }

  getVolumeFromOrigin(volumeOrigin){
    let volume = new Volume();
    volume.xLength = volumeOrigin.width;
    volume.yLength = volumeOrigin.height;
    volume.zLength = volumeOrigin.depth;
    volume.data = volumeOrigin.data;
    volume.data = this.minMaxVolume(volume);
    return volume;
  }

  getData3DTexture(volume){
    var texture = new THREE.Data3DTexture(volume.data, volume.xLength, volume.yLength, volume.zLength);
    texture.format = THREE.RedFormat;
    texture.type = THREE.FloatType;
    texture.generateMipmaps = false;
    texture.minFilter = texture.magFilter = THREE.LinearFilter;
// texture.unpackAlignment = 1;
    texture.needsUpdate = true;
    return texture;
  }

  animate() {
    if(this.translate) this.dolly.position.z = this.dolly.position.z + (this.zoomIn ? -5 : 5);
    if(this.rotate) this.objectGroup.rotateY(0.08); // Orbit the camera around the object !! Difficult !! Need to translate and change the view direction
    this.controls.update();
    this.camera.updateProjectionMatrix();
    this.renderer.render( this.scene, this.camera );
  }

  async componentDidMount() {
    // eslint-disable-next-line no-console
    let volumeOrigin = await this.getVolumeByChannel(0);
    let volume = this.getVolumeFromOrigin(volumeOrigin);
    let texture = this.getData3DTexture(volume);
    this.container = document.getElementById("ThreeJs");
    this.container.style.height = "1000px";
    this.container.style.background = "black";

    this.scene = new THREE.Scene();
    this.renderer = new THREE.WebGLRenderer({antialias: true});
    this.renderer.setClearColor("#000000");
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.setSize(this.container.offsetWidth, this.container.offsetHeight);
    this.container.appendChild(this.renderer.domElement);

    this.camera = new THREE.PerspectiveCamera( 45, this.container.offsetWidth/this.container.offsetHeight, 0.01, 100000);
    this.camera.position.set(0, 0, 500);
    this.camera.up.set(0,1,0);
    let volconfig = {clim1: 0.01, clim2: 0.7, renderstyle: 'dvr' , isothreshold: 0.15, opacity: 1.0, colormap: 'gray'};
    let cmtextures = {
      viridis: new THREE.TextureLoader().load(cmViridisTextureUrl),
      gray: new THREE.TextureLoader().load(cmGrayTextureUrl)
    };

    var shader = VolumeRenderShaderPerspective;
    var uniforms = THREE.UniformsUtils.clone(shader.uniforms);
    // uniforms["u_data"].value = texture;
    uniforms["boxSize"].value.set(volume.xLength, volume.yLength, volume.zLength);
    uniforms["volumeTex"].value = texture;
    // uniforms["volumeTex2"].value = texture2;
    // uniforms["volumeTex3"].value = texture3;
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

    const objectGroup = new THREE.Object3D();
    // THREE.Mesh
    var geometry = new THREE.BoxGeometry(volume.xLength, volume.yLength, volume.zLength);
    // geometry.scale(1,1,4);
    var mesh = new THREE.Mesh(geometry, material);
    mesh.scale.set(1,1,this.resolution+1); // TODO check if that makes sense
    objectGroup.add(mesh);
    this.scene.add(objectGroup);
    this.camera.updateProjectionMatrix();

    this.controls = new OrbitControls( this.camera, this.renderer.domElement );
    this.controls.update();
    document.body.appendChild(VRButton.createButton( this.renderer ) );
    this.renderer.xr.enabled = true;
    this.renderer.setAnimationLoop(() => this.animate());

    this.translate = false;
    this.rotate = false;
    this.zoomIn = true;

    this.dolly = new THREE.Object3D();
    this.dolly.add(this.camera);
    this.scene.add(this.dolly);

    this.renderer.xr.addEventListener('sessionstart', ()=>{
      this.dolly.position.z = 250;
    });


    this.controller = this.renderer.xr.getController(0);
    this.controller.addEventListener('selectstart', () => {
      this.translate = true;
    });
    this.controller.addEventListener('selectend', () => {
      this.translate = false;
      this.zoomIn = !this.zoomIn;
    });

    this.controller2 = this.renderer.xr.getController(1);
    this.controller2.addEventListener('selectstart', () => {
      this.rotate = true;
    });
    this.controller2.addEventListener('selectend', () => {
      this.rotate = false;
    });

  }

  render() {
    return (
      <div id="ThreeJs"></div>
    );
  }
}

const ThreeJsViewer = props => <ThreeJsViewWrapper {...props} />;
export default ThreeJsViewer;
