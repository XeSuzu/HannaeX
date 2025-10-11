const axios = require("axios");

async function buscarEnGoogle(consulta) {
    const apiKey = process.env.GOOGLE_SEARCH_API_KEY;
    const searchEngineId = process.env.SEARCH_ENGINE_ID;
    const url = `https://www.googleapis.com/customsearch/v1?key=${apiKey}&cx=${searchEngineId}&q=${encodeURIComponent(consulta)}`;

    try {
        const response = await axios.get(url);
        const searchResults = response.data.items; 
        if (!searchResults || searchResults.length === 0) {
            return "No se encontraron resultados.";
        }
        return searchResults[0].snippet;
    } catch (error) {
        console.error("Error en buscarEnGoogle:", error);
        return "Hubo un error al contactar el servicio de búsqueda de Google.";
    }
}

module.exports = { buscarEnGoogle };