// Services/geniusLyrics.js (Versión Profesional con la librería)

const { Client } = require("genius-lyrics");
// La librería necesita la API Key para funcionar
const geniusClient = new Client(process.env.GENIUS_API_KEY);

async function buscarLetraGenius(artista, cancion) {
  if (!cancion) return null;

  try {
    const searchQuery = artista ? `${cancion} ${artista}` : cancion;
    console.log(`[Genius] Buscando con la librería: "${searchQuery}"`);

    // La librería se encarga de todo: buscar y elegir la mejor canción
    const searches = await geniusClient.songs.search(searchQuery);
    const song = searches[0];

    if (!song) {
      console.log(`[Genius] La librería no encontró la canción.`);
      return null;
    }

    // La librería también se encarga del scraping y la limpieza
    const lyrics = await song.lyrics();
    console.log(`[Genius] Letra encontrada para "${song.fullTitle}"`);

    // Hacemos una pequeña limpieza final para el formato del embed
    const cleanedLyrics = lyrics
        .replace(/\[.*?\]/g, (match) => `\n**${match}**\n`)
        .replace(/\n{3,}/g, '\n\n')
        .trim();

    return cleanedLyrics;

  } catch (error) {
    console.error(`[Genius] Error usando la librería genius-lyrics:`, error.message);
    return null;
  }
}

module.exports = { buscarLetraGenius };