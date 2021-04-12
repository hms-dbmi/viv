Viv has the capability to do volume ray-casting on in-memory volumetric data. It also exposes an API for applying arbitrary affine transformations to the volume when rendering. Napari is another popular tool for doing both of these, but there are some key differences. Viv follows the [convention of 3D graphics](https://northstar-www.dartmouth.edu/doc/idl/html_6.2/Coordinates_of_3-D_Graphics.html) to first have the x-axis running left-right across the screen, then the y-axis running up and down, and then the z-axis running into and out of the screen (all following the right-hand-rule for standard orientation). Napari orients volumes in order to respect broadcasting conventions with `numpy` - that is their [axis order is actually `zyx`](https://scikit-image.org/docs/dev/user_guide/numpy_images.html#coordinate-conventions), which is the reverse of Viv.

If you have a homogeneous matrix that you are using in Napari, the best way to make it usable in Viv is to go back through the steps by which you got the matrix, reversing your z and x operations. However, if this is not possible, the following steps should produce something that looks identical as it swaps the row and column space (i.e you want to change the order of both how the matrix interprets its inputs and how it affects its outputs):

```python
import numpy as np
viv_transform = napari_transform.copy()
viv_transform[[2,0],3] = viv_transform[[0,2],3]
exchange_mat = np.array(
  [
    [0,0,1],
    [0,1,0],
    [1,0,0]
  ]
)
viv_transform[:3,:3] = exchange_mat @ viv_transform[:3,:3] @ exchange_mat
```

If you would like more information, please visit our [github page](https://github.com/hms-dbmi/viv/blob/master/docs/3D_RENDERING_IN_DEPTH.md).
