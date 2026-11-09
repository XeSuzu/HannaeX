export type KeywordCategory =
  | "anime"
  | "gaming"
  | "sports"
  | "economy"
  | "tech"
  | "news"
  | "temporal"
  | "intent"
  | "general"
  | "music";

export interface TaxonomyGroup {
  category: KeywordCategory;
  patterns: RegExp[];
  weight: number;
}

export const KEYWORD_TAXONOMY: TaxonomyGroup[] = [
  {
    category: "temporal",
    weight: 1.0,
    patterns: [
      /\b(202[3-9]|ayer|hoy|anoche|manana|semana|mes|ano|actual|nuevo|nueva|ultim[oa]s?|reciente|recientes|proxim[oa]s?|ahora)\b/i,
    ],
  },
  {
    category: "anime",
    weight: 1.2,
    patterns: [
      // Formatos de animación y lectura
      /\b(manga|manhwa|manhua|anime|pelicula|peliculas|film|movie|movies|ova|ovas|novela ligera|light novel|webtoon)\b/i,
      // Estados, emisión, ciclos y secuelas
      /\b(estado|emision|transmision|se transmite[ns]?|dias? de transmision|s[1-9]|t[1-9]|temporada|season|cours?|cap|caps|ep|eps|capitulo|capitulos|episodio|episodios|final|finalizo|termino|concluyo|acabo|estreno|estrenos|salio|sale|lanzamiento|lanzamientos|disponible|confirmad[oa]|anunciad[oa]|cancelad[oa]|retrasad[oa]|pospuest[oa]|hiatus|pausa|descanso|break|parate|regreso|regresa|vuelve|vuelta|retorno)\b/i,
      // Estudios y autores representativos
      /\b(mappa|ufotable|wit|toei|bones|cloverworks|madhouse|shaft|trigger|kyoto animation|a-1 pictures|fujimoto|oda|gege|tite kubo|togashi)\b/i,
      // Obras populares frecuentes
      /\b(chainsawman|chainsaw man|jujutsu kaisen|jjk|frieren|one piece|bleach|demon slayer|kimetsu|boku no hero|my hero academia|solo leveling|sololeveling|black clover|haikyuu|hunter x hunter|hxh|shingeki|attack on titan)\b/i,
    ],
  },
  {
    category: "sports",
    weight: 1.2,
    patterns: [
      // Resultados y partidos
      /\b(resultado|resultados|marcador|partido|partidos|vs|versus|goles?|tabla|posiciones|clasificacion|campeon|campeonato|copa|torneo|liga|fecha|puntos|penales)\b/i,
      // Equipos y eventos deportivos clásicos
      /\b(boca|boca juniors|river|river plate|madrid|real madrid|barca|barcelona|clasico|derbi|astillero|seleccion|champions|libertadores|sudamericana|mundial)\b/i,
      // Intenciones de programación deportiva
      /\b(cuando juega|contra quien|rival|rivales|fixture|a que hora juega)\b/i,
    ],
  },
  {
    category: "economy",
    weight: 1.1,
    patterns: [
      // Cotizaciones, divisas y finanzas
      /\b(precio|precios|cotizacion|cotizaciones|valor|dolar|euro|crypto|bitcoin|ethereum|eth|btc|acciones|stock|costo|cuanto|cuantos|inflacion|compra|venta|paralelo|blue|tarjeta|mep|ccl|peso argentino|dolar hoy)\b/i,
    ],
  },
  {
    category: "gaming",
    weight: 1.1,
    patterns: [
      // Fichas técnicas, rendimiento y parches
      /\b(requisitos|especificaciones|specs|peso|tamano|cuanto pesa|fps|rendimiento|parche|update|actualizacion|dlc|expansion)\b/i,
      // Novedades, trailers y filtraciones
      /\b(trailer|trailers|teaser|teasers|filtracion|filtraciones|gameplay|leak|leaks|rumor|rumores|remake|reboot|secuela|precuela)\b/i,
      // Hardware y títulos
      /\b(switch 2|ps5 pro|steam deck|rtx 5090|rtx 4090|gpu|gta 6|gta vi|silksong|elden ring)\b/i,
    ],
  },
  {
    category: "news",
    weight: 1.0,
    patterns: [
      // Actualidad global y política
      /\b(noticia|noticias|novedad|novedades|titulares|presidente|primer ministro|elecciones|guerra|ley de)\b/i,
      // Estado de servicios y plataformas
      /\b(caido|caida|down|status|se cayo|esta caido|problemas con|servidores de|servidor de discord)\b/i,
      // Meteorología y eventos naturales
      /\b(clima|tiempo en|temperatura|pronostico|lluvia|alerta meteorologica|terremoto|sismo)\b/i,
    ],
  },
  {
    category: "intent",
    weight: 0.9,
    patterns: [
      // Verbos de búsqueda explícita o formulaciones directas
      /\b(busca|buscar|buscame|encuentra|investiga|investigar|investigame|googlea|googlear|googlealo|averigua|averiguar|informacion sobre|datos sobre|que paso|que ocurrio|que sucedio|que ha pasado|que se sabe de|cuando sale|cuando se estrena|a que hora)\b/i,
    ],
  },
  {
    category: "music",
    weight: 1.1,
    patterns: [
      // Letras, canciones, adaptaciones y romanizaciones
      /\b(letra|letras|lyrics|cancion|canciones|song|songs|ost|soundtrack|album|discografia|cantante|banda|tema musical|romanized|romaji|pinyin|traducida|traduccion)\b/i,
    ],
  },
];

export const STOPWORDS = new Set([
  "de", "la", "el", "los", "las", "un", "una", "unos", "unas", "en", "por",
  "con", "para", "sobre", "del", "al", "que", "y", "o", "a", "es", "son",
  "como", "se", "su", "sus", "mi", "mis", "tu", "tus", "lo", "me", "te",
]);

export function normalizeSearchToken(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}
