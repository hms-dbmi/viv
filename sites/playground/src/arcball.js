export class Arcball {
  constructor(renderer, camera, scene, window, object) {
    this.arcCamera = camera;
    this.arcScene = scene;
    this.arcRenderer = renderer;
    this.arcWindow = window;
    this.type = -1;
    this.arcObject = object;
    this.firstTime = true;
  }

  // Declares the start of a click
  onDocumentMouseDown(event) {
    this.isClicking = true;
    this.mousePositionStart = [((event.offsetX - this.arcWindow.offsetWidth) / this.arcWindow.offsetWidth + 1) * 2 - 1,
      (((event.offsetY - this.arcWindow.offsetHeight) / this.arcWindow.offsetHeight) * -2) - 1];
    this.objectPositionStart = [this.arcObject.position.x, this.arcObject.position.y];
    this.objectRotationStart = [this.arcObject.rotation.x, this.arcObject.rotation.y];
    this.type = event.button;
  }

// Declares the ending of a click
  onDocumentMouseUp(event) {
    this.isClicking = false;
  }

  onDocumentMouseWheel(event) {
    if (event.deltaY < 0) {
      this.arcCamera.zoom *= 1.25;
    }
    if (event.deltaY > 0) {
      if (this.arcCamera.zoom > 0.1)
        this.arcCamera.zoom /= 1.25;
    }
    this.arcCamera.updateProjectionMatrix();
    this.arcRenderer.render(this.arcScene, this.arcCamera);
  }

  onDocumentMouseMove(event) {
    this.mousePosition = [((event.offsetX - this.arcWindow.offsetWidth) / this.arcWindow.offsetWidth + 1) * 2 - 1,
      (((event.offsetY - this.arcWindow.offsetHeight) / this.arcWindow.offsetHeight) * -2) - 1];

  }

  set object(object) {
    this.arcObject = object;
  }

  animate() {
    // requestAnimationFrame(() => this.animate());
    if (this.isClicking) {
      this.mouseVector = [this.mousePosition[0] - this.mousePositionStart[0], this.mousePosition[1] - this.mousePositionStart[1]];
      if (this.type === 1) {
        this.arcObject.position.x = this.objectPositionStart[0] + this.mouseVector[0] * 1 / this.arcCamera.zoom * 200;
        this.arcObject.position.y = this.objectPositionStart[1] + this.mouseVector[1] * 1 / this.arcCamera.zoom * 200;
        // arcObject.object.position.setZ(mouseEvent.z);
      } else if (this.type === 0) {
        let posX = this.arcObject.position.x, posY = this.arcObject.position.y;
        this.arcObject.position.x = 0;
        this.arcObject.position.y = 0;
        this.arcObject.rotation.x = this.objectRotationStart[0] + this.mouseVector[1] * Math.PI;
        this.arcObject.rotation.y = this.objectRotationStart[1] - this.mouseVector[0] * Math.PI;
        this.arcObject.position.x = posX;
        this.arcObject.position.y = posY;
      }
      this.arcRenderer.render(this.arcScene, this.arcCamera);
    } else if (this.firstTime) {
      this.arcRenderer.render(this.arcScene, this.arcCamera);
      this.arcRenderer.setAnimationLoop(() => this.animate());
    }
  }

}

