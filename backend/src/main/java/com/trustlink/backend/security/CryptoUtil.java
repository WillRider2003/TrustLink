package com.trustlink.backend.security;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import javax.crypto.Cipher;
import javax.crypto.spec.GCMParameterSpec;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.security.SecureRandom;
import java.util.Base64;

/**
 * Cifra/descifra las claves privadas de las wallets embebidas con
 * AES-256-GCM antes de guardarlas en la base de datos. La clave maestra
 * viene de una variable de entorno (nunca hardcodeada) — ver
 * application.properties / TRUSTLINK_WALLET_MASTER_KEY.
 */
@Component
public class CryptoUtil {

    private static final int GCM_IV_LENGTH = 12;
    private static final int GCM_TAG_LENGTH = 128;

    private final SecretKeySpec claveMaestra;

    public CryptoUtil(@Value("${trustlink.wallet.master-key}") String masterKeyBase64) {
        byte[] keyBytes = Base64.getDecoder().decode(masterKeyBase64);
        this.claveMaestra = new SecretKeySpec(keyBytes, "AES");
    }

    public String cifrar(String textoPlano) {
        try {
            byte[] iv = new byte[GCM_IV_LENGTH];
            new SecureRandom().nextBytes(iv);

            Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
            cipher.init(Cipher.ENCRYPT_MODE, claveMaestra, new GCMParameterSpec(GCM_TAG_LENGTH, iv));
            byte[] cifrado = cipher.doFinal(textoPlano.getBytes(StandardCharsets.UTF_8));

            byte[] resultado = new byte[iv.length + cifrado.length];
            System.arraycopy(iv, 0, resultado, 0, iv.length);
            System.arraycopy(cifrado, 0, resultado, iv.length, cifrado.length);

            return Base64.getEncoder().encodeToString(resultado);
        } catch (Exception e) {
            throw new RuntimeException("Error al cifrar", e);
        }
    }

    public String descifrar(String textoCifradoBase64) {
        try {
            byte[] datos = Base64.getDecoder().decode(textoCifradoBase64);
            byte[] iv = new byte[GCM_IV_LENGTH];
            byte[] cifrado = new byte[datos.length - GCM_IV_LENGTH];
            System.arraycopy(datos, 0, iv, 0, GCM_IV_LENGTH);
            System.arraycopy(datos, GCM_IV_LENGTH, cifrado, 0, cifrado.length);

            Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
            cipher.init(Cipher.DECRYPT_MODE, claveMaestra, new GCMParameterSpec(GCM_TAG_LENGTH, iv));
            byte[] textoPlano = cipher.doFinal(cifrado);

            return new String(textoPlano, StandardCharsets.UTF_8);
        } catch (Exception e) {
            throw new RuntimeException("Error al descifrar", e);
        }
    }
}
