/* eslint-disable */
import * as loaders from "@vivjs/loaders";

// TODO: move into loaders / public interface?
import { getVolume } from "@vivjs/layers/src/volume-layer/utils.js";

let url = new URL(
	"https://viv-demo.storage.googleapis.com/brain.pyramid.ome.tif",
);
let { data: resolutions, metadata } = await loaders.loadOmeTiff(url.href);

console.log({ resolutions, metadata });

for (let [i, resolution] of Object.entries(resolutions)) {
	let dims = Object.fromEntries(
		resolution.labels.map((
			label: string,
			i: number,
		) => [label, resolution.shape[i]]),
	);
	console.log(i, dims);
}

let pre = Object.assign(document.createElement("pre"), {
	textContent: "loading volume ...",
});

document.body.appendChild(pre);

// lowest resolution
let resolution = resolutions.length - 1;

let volume = await getVolume({
	source: resolutions[resolution],
	selection: { t: 0, c: 0 }, // corresponds to the first channel of the first timepoint
	downsampleDepth: 2 ** resolution,
	onUpdate({ z, total }: { z: number; total: number }) {
    pre.textContent = `loading volume ... ${z}/${total} (${(z / total).toFixed(2)}%)`;
	},
});

console.log(volume);

let { data, ...dimensions } = volume;
pre.textContent = `loaded volume.\n${JSON.stringify(dimensions, null, 2)}`;
