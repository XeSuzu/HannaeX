export class Sanitizer {
    /**
     * Limpia un texto de caracteres peligrosos o invisibles
     */
    static clean(text: string): string {
        if (!text) return '';

        return text
            // 1. Elimina etiquetas HTML/XML para evitar inyecciones
            .replace(/<[^>]*>?/gm, '')
            // 2. Elimina caracteres de control o invisibles que rompen formatos
            .replace(/[\u0000-\u001F\u007F-\u009F\u200B-\u200D\uFEFF]/g, '')
            // 3. Recorta espacios en blanco innecesarios
            .trim();
    }

    /**
     * Versión estricta para nombres de usuario o IDs
     */
    static alphaNumeric(text: string): string {
        return text.replace(/[^a-zA-Z0-9]/g, '');
    }

    /**
     * Escapa caracteres especiales para evitar problemas con Markdown de Discord
     */
    static escapeMarkdown(text: string): string {
        return text.replace(/([*_~`|>])/g, '\\$1');
    }

    /**
     * Limpia menciones a todos/aquí y caracteres no imprimibles
     */
    static basicClean(text?: string): string {
        if (!text) return '';
        return text
            .replace(/@everyone/gi, '@\u200beveryone')
            .replace(/@here/gi, '@\u200bhere')
            .replace(/[^\x20-\x7E\u00A0-\uFFFF]/g, '') // eliminar control chars
            .trim();
    }
}