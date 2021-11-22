import Typography from '@material-ui/core/Typography';
import Toolbar from '@material-ui/core/Toolbar';

import { useImageSettingsStore, useChannelsStore, useViewerStore } from '../state';

export default function Footer() {
  const use3d = useViewerStore(store => store.use3d);
  const loader = useChannelsStore(store => store.loader);
  const pyramidResolution = useImageSettingsStore(store => store.pyramidResolution);
  const volumeResolution = useImageSettingsStore(store => store.resolution);

  const resolution = use3d ? volumeResolution : pyramidResolution;
  const level = loader[resolution];

  if (!level) return null;
  return (
    <div style={{
      position: "fixed", 
      marginTop: "calc(5% + 60px)",
      bottom: 0, 
      backgroundColor: 'black',
      color: 'white',
      width: '100%',
      paddingRight: '1em',
    }}>
      <Typography>{`${resolution + 1} / ${loader.length} – [${level.shape.join(", ")}]`}</Typography>
    </div>
  );
}
