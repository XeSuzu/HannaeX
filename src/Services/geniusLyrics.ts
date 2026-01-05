import { Client as GeniusClient } from "genius-lyrics";
import 'dotenv/config';

// Inicializamos el cliente de forma segura ✨
const geniusClient = process.env.GENIUS_API_KEY 
    ? new GeniusClient(process.env.GENIUS_API_KEY) 
    : null;

if (!geniusClient) {
    console.warn("⚠️ Advertencia: GENIUS_API_KEY no encontrada. El buscador de letras estará desactivado, nya~");
}

/**
 * Busca la letra de una canción en Genius 🎵
 */
export async function buscarLetraGenius(artista: string | null, cancion: string): Promise<string | null> {
    // Si no hay canción o el cliente no se inició, regresamos null con cariño 🐾
    if (!cancion || !geniusClient) return null;

    try {
        const searchQuery = artista ? `${cancion} ${artista}` : cancion;
        console.log(`[Genius] Buscando letra para: "${searchQuery}"`);

        const searches = await geniusClient.songs.search(searchQuery);
        const song = searches[0];

        if (!song) {
            console.log(`[Genius] No encontré nada para "${searchQuery}" 😿`);
            return null;
        }

        // Obtenemos la letra (la librería hace el scraping)
        const lyrics = await song.lyrics();
        
        if (!lyrics) return null;

        // --- LIMPIEZA KAWAII ---
        let cleanedLyrics = lyrics
            // Resaltamos las secciones como [Intro], [Chorus] en negrita ✨
            .replace(/\[(.*?)\]/g, "\n**[$1]**\n")
            // Quitamos espacios excesivos
            .replace(/\n{3,}/g, '\n\n')
            .trim();

        // Seguridad: Si la letra es gigantesta, la cortamos para no romper el Embed de Discord
        if (cleanedLyrics.length > 3800) {
            cleanedLyrics = cleanedLyrics.substring(0, 3800) + "\n\n*(... Letra demasiado larga para mostrarse completa, nya~)*";
        }

        return cleanedLyrics;

    } catch (error: any) {
        console.error(`[Genius] Error en el servicio de letras:`, error.message);
        return null;
    }
}