import crypto from "crypto";

export class FieldEncryptionService {
  private static cachedKey: Buffer | null = null;
  private static keyEvaluated = false;

  public static getKeyBuffer(): Buffer | null {
    if (this.keyEvaluated) {
      return this.cachedKey;
    }

    const rawKey = process.env.DATABASE_ENCRYPTION_KEY?.trim();
    if (!rawKey) {
      this.cachedKey = null;
      this.keyEvaluated = true;
      return null;
    }

    try {
      if (/^[0-9a-fA-F]{64}$/.test(rawKey)) {
        this.cachedKey = Buffer.from(rawKey, "hex");
      } else if (rawKey.length === 32) {
        this.cachedKey = Buffer.from(rawKey, "utf8");
      } else {
        console.warn(
          "[FieldEncryptionService] DATABASE_ENCRYPTION_KEY inválida: debe tener 64 caracteres hexadecimales (32 bytes). Modo sin cifrado activo.",
        );
        this.cachedKey = null;
      }
    } catch (err) {
      console.error("[FieldEncryptionService] Error interpretando DATABASE_ENCRYPTION_KEY:", err);
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
   * Si la clave no está disponible o el texto ya está cifrado, se devuelve tal cual.
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
      return plaintext;
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
    } catch (err) {
      console.error("[FieldEncryptionService] Error cifrando campo:", err);
      return plaintext;
    }
  }

  /**
   * Descifra una cadena cifrada con AES-256-GCM.
   * Si la cadena no está cifrada (datos legados), se retorna directamente sin alterar.
   */
  public static decrypt(cipherOrPlain: string): string {
    if (!cipherOrPlain || typeof cipherOrPlain !== "string") {
      return cipherOrPlain;
    }

    if (!this.isEncrypted(cipherOrPlain)) {
      return cipherOrPlain;
    }

    const key = this.getKeyBuffer();
    if (!key) {
      console.warn("[FieldEncryptionService] No se puede descifrar sin DATABASE_ENCRYPTION_KEY.");
      return "[Dato cifrado protegido]";
    }

    try {
      const parts = cipherOrPlain.split(":");
      if (parts.length !== 5) {
        return cipherOrPlain;
      }

      const [, , ivHex, tagHex, dataHex] = parts;
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
      return "[Dato cifrado no recuperable]";
    }
  }
}
