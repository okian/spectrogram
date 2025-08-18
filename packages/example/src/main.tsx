import React from "react";
import ReactDOM from "react-dom/client";
import {
  Spectrogram,
  DEFAULT_SPECTRO_META,
  generateSineWaveFrames,
} from "@spectro/viewer";

function App() {
  return (
    <Spectrogram
      onReady={(api) => {
        api.setMeta(DEFAULT_SPECTRO_META);
        api.pushFrames(generateSineWaveFrames(DEFAULT_SPECTRO_META, 5));
      }}
      config={{ width: 300, height: 150 }}
    />
  );
}

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
