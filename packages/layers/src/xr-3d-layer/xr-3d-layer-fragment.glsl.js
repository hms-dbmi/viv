export default `\
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
