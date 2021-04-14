#version 300 es
precision highp int;
precision highp float;
precision highp sampler3D;

uniform highp sampler3D volume0;
uniform highp sampler3D volume1;
uniform highp sampler3D volume2;
uniform highp sampler3D volume3;
uniform highp sampler3D volume4;
uniform highp sampler3D volume5;

uniform vec3 scaledDimensions;

uniform mat4 scale;

// range
uniform vec2 sliderValues[6];

// color
uniform vec3 colorValues[6];

// slices
uniform vec2 xSlice;
uniform vec2 ySlice;
uniform vec2 zSlice;

in vec3 vray_dir;
flat in vec3 transformed_eye;
out vec4 color;

vec2 intersect_box(vec3 orig, vec3 dir) {
	const vec3 box_min = vec3(0);
	const vec3 box_max = vec3(1);
	vec3 inv_dir = 1.0 / dir;
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

vec3 hsv2rgb(vec3 c)
{
    vec4 K = vec4(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);
    vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
    return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);
}

vec3 rgb2hsv(vec3 rgb) {
 	float Cmax = max(rgb.r, max(rgb.g, rgb.b));
 	float Cmin = min(rgb.r, min(rgb.g, rgb.b));
 	float delta = Cmax - Cmin;

 	vec3 hsv = vec3(0., 0., Cmax);

 	if (Cmax > Cmin) {
 		hsv.y = delta / Cmax;

 		if (rgb.r == Cmax) {
      hsv.x = (rgb.g - rgb.b) / delta;
    }
 		else {
 			if (rgb.g == Cmax){
        hsv.x = 2. + (rgb.b - rgb.r) / delta;
      }
 			else {
        hsv.x = 4. + (rgb.r - rgb.g) / delta;
      }
 		}
 		hsv.x = fract(hsv.x / 6.);
 	}
 	return hsv;
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
	t_hit.x = max(t_hit.x, 0.0);

	// Step 3: Compute the step size to march through the volume grid
	vec3 dt_vec = 1.0 / (scale * vec4(abs(ray_dir), 1.0)).xyz;
	float dt = 1.0 * min(dt_vec.x, min(dt_vec.y, dt_vec.z));

	float offset = wang_hash(int(gl_FragCoord.x + 640.0 * gl_FragCoord.y));

	// Step 4: Starting from the entry point, march the ray through the volume
	// and sample it
	vec3 p = transformed_eye + (t_hit.x + offset * dt) * ray_dir;

	// TODO: Probably want to stop this process at some point to improve performance when marching down the edges.
	_BEFORE_RENDER
	for (float t = t_hit.x; t < t_hit.y; t += dt) {
		float canShowXCoordinate = max(p.x - xSlice[0], 0.0) * max(xSlice[1] - p.x , 0.0);
		float canShowYCoordinate = max(p.y - ySlice[0], 0.0) * max(ySlice[1] - p.y , 0.0);
		float canShowZCoordinate = max(p.z - zSlice[0], 0.0) * max(zSlice[1] - p.z , 0.0);
		float canShowCoordinate = float(ceil(canShowXCoordinate * canShowYCoordinate * canShowZCoordinate));
    float intensityValue0 = canShowCoordinate * sample_and_apply_sliders(volume0, p, sliderValues[0]);
    float intensityValue1 = canShowCoordinate * sample_and_apply_sliders(volume1, p, sliderValues[1]);
		float intensityValue2 = canShowCoordinate * sample_and_apply_sliders(volume2, p, sliderValues[2]);
		float intensityValue3 = canShowCoordinate * sample_and_apply_sliders(volume3, p, sliderValues[3]);
    float intensityValue4 = canShowCoordinate * sample_and_apply_sliders(volume4, p, sliderValues[4]);
		float intensityValue5 = canShowCoordinate * sample_and_apply_sliders(volume5, p, sliderValues[5]);

		_RENDER

		p += ray_dir * dt;
	}
	_AFTER_RENDER
  color.r = linear_to_srgb(color.r);
  color.g = linear_to_srgb(color.g);
  color.b = linear_to_srgb(color.b);
}
