import crypto from "crypto";

export class FieldEncryptionService {
  private static cachedKey: Buffer | null = null;
  private static keyEvaluated = false;

  /**
   * Valida estrictamente la clave de cifrado AES-256-GCM.
   * Si la clave no está configurada o es inválida, lanza un error controlado (fail-closed).
   * La clave debe ser de exactamente 32 bytes (64 caracteres hexadecimales o 32 bytes UTF-8).
   */
  public static validateOrThrow(customKey?: string): Buffer {
    const rawKey = (customKey ?? process.env.DATABASE_ENCRYPTION_KEY)?.trim();
    if (!rawKey) {
      throw new Error(
        "[FieldEncryptionService] DATABASE_ENCRYPTION_KEY no configurada. Política fail-closed: el sistema requiere una clave válida para operar con datos sensibles cifrados.",
      );
    }

    if (/^[0-9a-fA-F]{64}$/.test(rawKey)) {
      return Buffer.from(rawKey, "hex");
    }

    if (Buffer.byteLength(rawKey, "utf8") === 32) {
      return Buffer.from(rawKey, "utf8");
    }

    throw new Error(
      `[FieldEncryptionService] DATABASE_ENCRYPTION_KEY inválida: debe tener exactamente 32 bytes (64 caracteres hex o 32 bytes UTF-8). Longitud recibida: ${rawKey.length} caracteres.`,
    );
  }

  /**
   * Obtiene el Buffer de la clave de cifrado evaluando el entorno.
   * Si la clave es inválida o ausente, retorna null y registra el fallo de forma segura.
   */
  public static getKeyBuffer(): Buffer | null {
    if (this.keyEvaluated) {
      return this.cachedKey;
    }

    try {
      this.cachedKey = this.validateOrThrow();
    } catch (err: any) {
      console.error(
        "[FieldEncryptionService] Fallo en validación de clave de cifrado:",
        err?.message || "Clave no válida",
      );
      this.cachedKey = null;
    }

    this.keyEvaluated = true;
    return this.cachedKey;
  }

  /**
   * Restablece el caché de la clave (útil para pruebas unitarias y rotación en caliente).
   */
  public static resetKeyCache(): void {
    this.cachedKey = null;
    this.keyEvaluated = false;
  }

  public static hasKey(): boolean {
    return this.getKeyBuffer() !== null;
  }

  public static isEncrypted(value: unknown): boolean {
    return typeof value === "string" && value.startsWith("enc:v1:");
  }

  /**
   * Cifra una cadena con AES-256-GCM.
   * Comportamiento estricto fail-closed:
   * Si la clave no está disponible o el cifrado falla, LANZA UNA EXCEPCIÓN.
   * Se prohíbe terminantemente retornar texto plano como mecanismo de degradación.
   */
  public static encrypt(plaintext: string): string {
    if (!plaintext || typeof plaintext !== "string") {
      return plaintext;
    }

    if (this.isEncrypted(plaintext)) {
      return plaintext;
    }

    const key = this.getKeyBuffer();
    if (!key) {
      throw new Error(
        "[FieldEncryptionService] Fallo fail-closed: No se puede cifrar el dato porque DATABASE_ENCRYPTION_KEY es inválida o inexistente. Prohibido persistir datos sensibles en texto plano.",
      );
    }

    try {
      const iv = crypto.randomBytes(12);
      const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);

      const ciphertext = Buffer.concat([
        cipher.update(plaintext, "utf8"),
        cipher.final(),
      ]);
      const authTag = cipher.getAuthTag();

      return `enc:v1:${iv.toString("hex")}:${authTag.toString("hex")}:${ciphertext.toString("hex")}`;
    } catch (err: any) {
      console.error(
        "[FieldEncryptionService] Fallo en operación de cifrado AES-256-GCM. Abortando persistencia.",
      );
      throw new Error(
        `[FieldEncryptionService] Cifrado fallido: ${err?.message || "Error interno del cifrador"}`,
      );
    }
  }

  /**
   * Descifra una cadena cifrada con AES-256-GCM.
   * Si la cadena no está cifrada (datos legados preexistentes), se retorna para evitar pérdida de datos.
   * Si la cadena está cifrada, valida la integridad de los componentes y la etiqueta de autenticación (AuthTag).
   */
  public static decrypt(cipherOrPlain: string): string {
    if (!cipherOrPlain || typeof cipherOrPlain !== "string") {
      return cipherOrPlain;
    }

    if (!this.isEncrypted(cipherOrPlain)) {
      // Datos legados anteriores a la implementación del cifrado
      return cipherOrPlain;
    }

    const key = this.getKeyBuffer();
    if (!key) {
      console.warn(
        "[FieldEncryptionService] No se puede descifrar el registro sin una DATABASE_ENCRYPTION_KEY válida.",
      );
      return "[Dato cifrado protegido]";
    }

    try {
      const parts = cipherOrPlain.split(":");
      if (parts.length !== 5) {
        return "[Dato cifrado no recuperable]";
      }

      const [, , ivHex, tagHex, dataHex] = parts;
      if (!ivHex || !tagHex || !dataHex || ivHex.length !== 24 || tagHex.length !== 32) {
        return "[Dato cifrado no recuperable]";
      }

      const iv = Buffer.from(ivHex, "hex");
      const authTag = Buffer.from(tagHex, "hex");
      const encryptedData = Buffer.from(dataHex, "hex");

      const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
      decipher.setAuthTag(authTag);

      const decrypted = Buffer.concat([
        decipher.update(encryptedData),
        decipher.final(),
      ]);

      return decrypted.toString("utf8");
    } catch {
      console.error(
        "[FieldEncryptionService] Error durante el descifrado: fallo de autenticidad (AuthTag inválido o datos manipulados).",
      );
      return "[Dato cifrado no recuperable]";
    }
  }
}
