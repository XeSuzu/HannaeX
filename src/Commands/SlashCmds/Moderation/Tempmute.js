const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, MessageFlags } = require('discord.js');

// ===============================
// Función para convertir "10m" → ms
// ===============================
function convertirTiempo(tiempo) {
    const cantidad = parseInt(tiempo); // Número (ej: 10)
    const unidad = tiempo.slice(-1);   // Última letra (ej: m, h)
    if (isNaN(cantidad)) return null;

    switch (unidad) {
        case 's': return cantidad * 1000;               // Segundos
        case 'm': return cantidad * 60 * 1000;           // Minutos
        case 'h': return cantidad * 60 * 60 * 1000;      // Horas
        case 'd': return cantidad * 24 * 60 * 60 * 1000; // Días
        default: return null;
    }
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('tempmute')
        .setDescription('🔇 Mutea temporalmente a un usuario usando un rol')
        .addUserOption(option =>
            option.setName('usuario')
                .setDescription('👤 Usuario a mutear')
                .setRequired(true)
        )
        .addStringOption(option =>
            option.setName('tiempo')
                .setDescription('⏳ Duración (ej: 10m, 1h, 1d)')
                .setRequired(true)
        )
        .addStringOption(option =>
            option.setName('razon')
                .setDescription('📝 Razón del mute')
                .setRequired(false)
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers), // Asegura que solo moderadores puedan usarlo

    async execute(interaction) {
        // ===============================
        // Variables iniciales
        // ===============================
        const usuario = interaction.options.getUser('usuario');
        const tiempo = interaction.options.getString('tiempo');
        const razon = interaction.options.getString('razon') || 'Sin razón especificada';

        const miembro = await interaction.guild.members.fetch(usuario.id);

        // ===============================
        // Validaciones de jerarquía y usuario
        // ===============================
        // El bot ya no necesita validar si tiene 'ManageRoles' porque lo pusimos como 'setDefaultMemberPermissions'
        // Esto previene que el bot responda al comando si no tiene los permisos,
        // lo cual es una mejora de seguridad y usabilidad.

        if (miembro.roles.highest.position >= interaction.guild.members.me.roles.highest.position) {
            return interaction.reply({ 
                content: '❌ No puedo mutear a este usuario por su jerarquía. ¡Es demasiado poderoso!', 
                flags: MessageFlags.Ephemeral 
            });
        }

        if (usuario.id === interaction.user.id) {
            return interaction.reply({ 
                content: '❌ No puedes mutearte a ti mismo. ¡Quiérete un poquito! 💖', 
                flags: MessageFlags.Ephemeral 
            });
        }

        if (usuario.id === interaction.guild.ownerId) {
            return interaction.reply({ 
                content: '❌ No puedes mutear al dueño del servidor. ¡Es el jefe! 👑', 
                flags: MessageFlags.Ephemeral 
            });
        }

        // ===============================
        // Crear o buscar rol de mute
        // ===============================
        let rolMute = interaction.guild.roles.cache.find(r => r.name === 'Muted');
        if (!rolMute) {
            try {
                // Creamos el rol y lo configuramos en todos los canales de forma síncrona
                await interaction.reply({ content: 'Creando rol de mute... ⚙️', flags: MessageFlags.Ephemeral });
                rolMute = await interaction.guild.roles.create({
                    name: 'Muted',
                    color: '#2f3136',
                    permissions: [], // El rol no necesita permisos de moderación
                    reason: 'Rol de mute para silenciar usuarios'
                });

                // Bloquear mensajes y voz en todos los canales
                for (const [id, canal] of interaction.guild.channels.cache) {
                    await canal.permissionOverwrites.edit(rolMute, {
                        SendMessages: false,
                        Speak: false,
                        AddReactions: false
                    });
                }
            } catch (err) {
                console.error('Error al crear el rol de mute:', err);
                return interaction.editReply({ content: '❌ Hubo un error al crear el rol de mute. Revisa los permisos del bot.', flags: MessageFlags.Ephemeral });
            }
        }

        if (miembro.roles.cache.has(rolMute.id)) {
            return interaction.reply({ 
                content: '❌ Este usuario ya está muteado. ¡No le des más besitos! 💋', 
                flags: MessageFlags.Ephemeral 
            });
        }

        // ===============================
        // Convertir tiempo a milisegundos
        // ===============================
        const msTiempo = convertirTiempo(tiempo);
        if (!msTiempo) {
            return interaction.reply({ 
                content: '❌ Formato de tiempo inválido. Usa s, m, h o d (Ej: 10m, 1h)', 
                flags: MessageFlags.Ephemeral 
            });
        }

        // ===============================
        // Asignar el mute
        // ===============================
        try {
            await miembro.roles.add(rolMute, `Muteado por ${interaction.user.tag} - Razón: ${razon}`);

            // Embed de confirmación
            const embedMute = new EmbedBuilder()
                .setColor('#ff0000')
                .setTitle('🔇 Usuario muteado')
                .setDescription(`**${usuario.tag}** fue muteado temporalmente.`)
                .addFields(
                    { name: '⏳ Duración', value: tiempo, inline: true },
                    { name: '📝 Razón', value: razon, inline: true },
                    { name: '👮 Moderador', value: interaction.user.tag, inline: true }
                )
                .setThumbnail(usuario.displayAvatarURL({ dynamic: true }))
                .setFooter({ text: 'Moderación | TempMute', iconURL: interaction.guild.iconURL() })
                .setTimestamp();

            await interaction.reply({ embeds: [embedMute] });

            // ===============================
            // Programar desmute automático
            // ===============================
            setTimeout(async () => {
                if (miembro.roles.cache.has(rolMute.id)) {
                    await miembro.roles.remove(rolMute, 'Tiempo de mute finalizado');

                    const embedUnmute = new EmbedBuilder()
                        .setColor('#00ff00')
                        .setTitle('🔊 Usuario desmuteado')
                        .setDescription(`**${usuario.tag}** ahora puede hablar. ¡Qué alegría! 😊`)
                        .setTimestamp();
                    
                    // Usamos followUp para responder después de la respuesta inicial
                    await interaction.followUp({ embeds: [embedUnmute] });
                }
            }, msTiempo);

        } catch (err) {
            console.error('Error al mutear al usuario:', err);
            return interaction.reply({ 
                content: '❌ Ocurrió un error al mutear. Revisa mi jerarquía de roles o mis permisos. ¡Soy solo un gatito indefenso! 😿', 
                flags: MessageFlags.Ephemeral 
            });
        }
    }
};
