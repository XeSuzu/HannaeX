import { Client as GeniusClient, Song } from "genius-lyrics";
import 'dotenv/config';

// Inicializamos el cliente. Si la clave no existe, el constructor arrojará un error.
let geniusClient: GeniusClient;
if (process.env.GENIUS_API_KEY) {
    geniusClient = new GeniusClient(process.env.GENIUS_API_KEY);
} else {
    console.error("❌ Falta la variable de entorno GENIUS_API_KEY para el servicio de letras.");
}

/**
 * Busca la letra de una canción usando la librería genius-lyrics.
 * @param artista El nombre del artista (opcional).
 * @param cancion El nombre de la canción.
 * @returns La letra de la canción formateada, o null si no se encuentra.
 */
export async function buscarLetraGenius(artista: string | null, cancion: string): Promise<string | null> {
    if (!cancion || !geniusClient) return null;

    try {
        const searchQuery = artista ? `${cancion} ${artista}` : cancion;
        console.log(`[Genius] Buscando con la librería: "${searchQuery}"`);

        // La librería se encarga de buscar y elegir la mejor canción.
        // searches será un array de objetos tipo 'Song'.
        const searches: Song[] = await geniusClient.songs.search(searchQuery);
        const song: Song | undefined = searches[0];

        if (!song) {
            console.log(`[Genius] La librería no encontró la canción.`);
            return null;
        }

        // La librería también se encarga del scraping y la limpieza.
        const lyrics: string = await song.lyrics();
        console.log(`[Genius] Letra encontrada para "${song.fullTitle}"`);

        // Hacemos una pequeña limpieza final para el formato del embed.
        const cleanedLyrics = lyrics
            .replace(/\[.*?\]/g, (match) => `\n**${match}**\n`)
            .replace(/\n{3,}/g, '\n\n')
            .trim();

        return cleanedLyrics;

    } catch (error: any) {
        console.error(`[Genius] Error usando la librería genius-lyrics:`, error.message);
        return null;
    }
}