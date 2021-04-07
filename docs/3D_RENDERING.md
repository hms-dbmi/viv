## 3D Rendering

Viv has the capbility to do volume ray-casting on in-memory volumetric data. It also exposes an API for applying arbitrary affine transformations to the volume when rendering. Napari is another popular tool for doing both of these, but there are some key differences. Viv follows the [convention of 3D graphics](https://northstar-www.dartmouth.edu/doc/idl/html_6.2/Coordinates_of_3-D_Graphics.html) to have the x-axis running left-right across the screen, the y-axis running up and down, and the z-axis running into and out of the screen (all following the right-hand-rule for standard orientation). Napari, by contrast, has a different way of orienting volumes for two main reasons: first, it is labeless with no knowledge of what the user cosniders to be the `z` axis of the data and second, it relies on `numpy` for in memory representation of the data.

### Coordinate System

As mentioned, Viv follows the [convention of 3D graphics](https://northstar-www.dartmouth.edu/doc/idl/html_6.2/Coordinates_of_3-D_Graphics.html) with respect to the x, y, and z axes. These axes correspond exactly to the dimensions of the OME model which are labelled on the data loaders that Viv expoerts.

Napari, though, does things differently for very good reasons.

Most commonly, the layout of a `numpy` array for use in [the `python` scientific imaging compute ecosystem](https://scikit-image.org/docs/dev/user_guide/numpy_images.html#coordinate-conventions) is `zyx`:

```python
import numpy as np
vol = np.array([np.eye(4), np.eye(4) * 1, np.eye(4) * 2])
vol.shape
# (3, 4, 4)
```

In the microscopy world, for example, the above example would represent 3 z-slice images of `4x4` pixels.

When translating this to volumetric viewing, though, Napari needs to map each (unlabeled) dimension of the array to an axis in 3-space. Furthermore, in order to treat these `numpy` arrays as first-class citizens in the Napari ecosystem, Napari needs to respect the in-memory representation of the `numpy` array (which is generally `C` or row-major):

```python
vol.flatten()
# array([1., 0., 0., 0., 0., 1., 0., 0., 0., 0., 1., 0., 0., 0., 0., 1., 1.,
#        0., 0., 0., 0., 1., 0., 0., 0., 0., 1., 0., 0., 0., 0., 1., 2., 0.,
#        0., 0., 0., 2., 0., 0., 0., 0., 2., 0., 0., 0., 0., 2.])
```

However, if Napari wishes to show the volume with the correct orientation while respecting this in-memory represnetation, it is forced to buck the 3D graphics convention. As in the 2D case, Napari actually continues to treat the y-axis going down as positively oriented (as mentioned, the 3D graphics convention for the y-axis runs contrary to the convention in 2D raster graphics, where the y-axis is positively oriented in the downward direction).

But, Napari faces another hurdle, which is figuring out what the volumetric axis of the data is. Napari seems to always treat this "first dimension" of the data (i.e the `3` above) as the volumetric dimension. Accordingly, it then visualizes this first dimension on the "volumetric axis," which is the axis going into and out of the screen.

### Transformations

Because of this labelless approach, applying transformation matrices in Napari requires care. As mentioned before, the ordering of the dimensions is generally `zyx`. This ordering also applies when you apply transformation matrices. That is the first row/column of the matrix is applied to the first dimension of the data, which is usually by convention the volumetric `z` dimension. So, for example, if you wanted to rotate over the volumetric axis of the data in Napari (i.e the axis going into and out the computer screen), you would want to create a matrix as follows:

```python
from scipy.spatial.transform import Rotation as R
r = R.from_euler('x', 90, degrees=True) # NOTE: Napari rotates over x not z because scipy considers `x` as the first column/row while Napari considers the first column/row as transforming the z direction
rot_x = r.as_matrix()
rot_napari = np.eye(4)
rot_napari[:3, :3] = r.as_matrix()
```

This approach is extremely internally coherent especially with `numpy` but can be tricky because even though the convention for data layout is `zyx`, it is still very common to think about the order for orientations/matrices as `xyz` - hence the need to tell `scipy` to rotate over `x` and `z` above if you want to rotate over the volumetric axis.

By contrast Viv sticks to the graphics convention at the moment. Also, because Viv is meant to interface with the [math.gl](math.gl) ecosystem, Viv requires the input matrix to be both [homogeneous (i.e `4x4`)](https://en.wikipedia.org/wiki/Homogeneous_coordinates#Use_in_computer_graphics_and_computer_vision) and flattened in column-major order. Therefore, if you wanted to rotate over the volumetric axis in Viv you would need to do:

```python
from scipy.spatial.transform import Rotation as R
r = R.from_euler('z', 90, degrees=True) # NOTE: Because Viv respects the graphics convention, Viv and scipy agree on what `z` is.
rot = np.eye(4)
rot[:3, :3] = r.as_matrix()
list(rot.flatten('F')) # Output which can be directly used in Viv
# [2.220446049250313e-16,
#  1.0,
#  0.0,
#  0.0,
#  -1.0,
#  2.220446049250313e-16,
#  0.0,
#  0.0,
#  0.0,
#  0.0,
#  1.0,
#  0.0,
#  0.0,
#  0.0,
#  0.0,
#  1.0]
```

If you have a homogeneous matrix that you are using in Napari, the best way to make it usable in Viv is to go back through the steps by which you got the matrix, reversing your z and x operations. However, if this is not possible, the following steps should produce something that looks identical as it swaps the row and column space (i.e you want to change the order of both how the matrix interprets its inputs and how it affects its outputs):

```python
viv_transform = napari_transform.copy()
# Swap translation
viv_transform[[2,0],3] = viv_transform[[0,2],3]
# This is sort of a "Change of basis" matrix that permutes the first and last basis vectors
# https://en.wikipedia.org/wiki/Exchange_matrix
exchange_mat = np.array(
  [
    [0,0,1],
    [0,1,0],
    [1,0,0]
  ]
)
# Think about what happens if you pass a Viv-space vector in from the right - first it has its z and x axes swapped which takes it to "Napari-space," then you do the Napari transform, and then you need to reconvert that transformed vector from "Napari-space" back to the original "Viv-space".
viv_transform[:3,:3] = exchange_mat @ viv_transform[:3,:3] @ exchange_mat
```
