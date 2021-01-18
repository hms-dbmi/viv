export namespace Ome {

  interface Channel {
      active: boolean;
      color: string;
      label: string;
      window: {
        min?: number;
        max?: number;
        start: number;
        end: number;
      };
  };
    
  interface Omero {
    channels: Channel[];
    rdefs: {
      defaultT?: number;
      defaultZ?: number;
      model: string;
    };
    name?: string;
  };
    
  interface Multiscale {
    datasets: { path: string }[];
    version?: string;
  };
    
  interface RootAttrs {
    omero: Omero;
    multiscales: Multiscale[];
  };
      
}