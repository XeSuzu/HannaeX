import { Client as GeniusClient } from "genius-lyrics";
import 'dotenv/config';

const geniusClient = process.env.GENIUS_API_KEY ? new GeniusClient(process.env.GENIUS_API_KEY) : null;

// ⚡ CACHÉ EN MEMORIA: Guarda hasta 50 canciones para respuesta instantánea
const lyricsCache = new Map<string, string>();

export async function buscarLetraGenius(artista: string | null, cancion: string): Promise<string | null> {
    if (!cancion || !geniusClient) return null;

    const queryLimpia = `${cancion} ${artista || ""}`.replace(/-/g, " ").replace(/\s+/g, " ").toLowerCase().trim();

    // 🏎️ Verificar si ya la buscamos recientemente
    if (lyricsCache.has(queryLimpia)) {
        console.log(`[Genius] ⚡ Caché hit para: ${queryLimpia}`);
        return lyricsCache.get(queryLimpia)!;
    }

    try {
        // Ponemos un límite de tiempo de 8 segundos para la búsqueda
        const searchPromise = geniusClient.songs.search(queryLimpia);
        const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error("Timeout")), 8000));

        const searches: any = await Promise.race([searchPromise, timeoutPromise]);
        
        if (!searches || searches.length === 0) return null;

        const song = searches[0];
        const lyrics = await song.lyrics(false);
        
        if (!lyrics) return null;

        let cleanedLyrics = lyrics
            .replace(/\[(.*?)\]/g, "\n**[$1]**\n")
            .replace(/\n{3,}/g, '\n\n')
            .trim();

        if (cleanedLyrics.length > 3800) {
            cleanedLyrics = cleanedLyrics.substring(0, 3800) + "\n\n*(... Letra muy larga)*";
        }

        // 💾 Guardar en caché antes de devolver
        if (lyricsCache.size > 50) lyricsCache.clear(); // Limpiar si crece mucho
        lyricsCache.set(queryLimpia, cleanedLyrics);

        return cleanedLyrics;

    } catch (error: any) {
        console.error(`[Genius] Error: ${error.message}`);
        return null;
    }
}