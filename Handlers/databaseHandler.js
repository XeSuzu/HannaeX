const mongoose = require('mongoose');

module.exports = () => {
    // Verificamos si la URI de la base de datos está presente
    if (!process.env.MONGO_URI) {
        console.error("❌ Error: Falta la variable MONGO_URI en el archivo .env");
        // Cerramos el proceso si no podemos conectar, para evitar errores futuros.
        return process.exit(1);
    }

    // Intentamos conectar a la base de datos
    mongoose.connect(process.env.MONGO_URI)
        .then(() => {
            console.log("✅ ¡Base de datos conectada con éxito!");
        })
        .catch(err => {
            console.error("❌ Error de conexión a la base de datos:", err);
            process.exit(1);
        });
};