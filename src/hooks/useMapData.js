import { useEffect, useState } from "react";

export function useMapData() {
  const [state, setState] = useState({
    data: null,
    topology: null,
    error: null,
  });

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      fetch("./data/metro.json").then((response) => {
        if (!response.ok) throw new Error("无法加载福州地铁数据");
        return response.json();
      }),
      fetch("./data/fuzhou-districts.topo.json").then((response) => {
        if (!response.ok) throw new Error("无法加载福州行政区图");
        return response.json();
      }),
    ])
      .then(([data, topology]) => {
        if (cancelled) return;
        setState({ data, topology, error: null });
      })
      .catch((error) => {
        if (cancelled) return;
        console.error(error);
        setState({ data: null, topology: null, error });
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return state;
}
