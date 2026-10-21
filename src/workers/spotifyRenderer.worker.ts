import { parentPort } from "worker_threads";
import {
  renderSpotifyCard,
  SpotifyCardData,
} from "../Renderers/spotifyRenderer";

if (!parentPort) throw new Error("Este archivo debe correr como worker thread");

parentPort.on("message", async (data: SpotifyCardData) => {
  try {
    const buffer = await renderSpotifyCard(data);
    parentPort!.postMessage({ ok: true, buffer });
  } catch (err) {
    parentPort!.postMessage({ ok: false, error: String(err) });
  }
});
