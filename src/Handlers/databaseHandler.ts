import mongoose from 'mongoose';

// Exportamos la función usando la sintaxis moderna de TypeScript
export default () => {
    // Verificamos si la URI de la base de datos está presente en el .env
    if (!process.env.MONGO_URI) {
        console.error("❌ Error: Falta la variable MONGO_URI en el archivo .env");
        // Cerramos el proceso si no podemos encontrar la URI para evitar errores futuros.
        return process.exit(1);
    }

    // Intentamos conectar a la base de datos
    mongoose.connect(process.env.MONGO_URI)
        .then(() => {
            console.log("✅ ¡Base de datos conectada con éxito!");
        })
        .catch((err: any) => { // Añadimos un tipo al error capturado
            console.error("❌ Error de conexión a la base de datos:", err);
            process.exit(1);
        });
};