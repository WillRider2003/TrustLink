package com.trustlink.backend.web3;

import com.trustlink.backend.security.CryptoUtil;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.web3j.crypto.ECKeyPair;
import org.web3j.crypto.Keys;

import java.security.SecureRandom;

/**
 * Genera una wallet EVM nueva para cada usuario al registrarse
 * ("wallet embebida" / cuenta invisible del pitch: el usuario nunca ve
 * clave privada ni frase semilla, solo su correo y contraseña).
 * La clave privada se cifra con AES-GCM (ver CryptoUtil) antes de
 * guardarse en la base de datos.
 */
@Service
@RequiredArgsConstructor
public class Web3AccountService {

    private final CryptoUtil cryptoUtil;

    public record WalletGenerada(String address, String privateKeyCifrada) {}

    public WalletGenerada generarWallet() {
        try {
            ECKeyPair keyPair = Keys.createEcKeyPair();
            String address = "0x" + Keys.getAddress(keyPair);
            // BUG evitado: BigInteger.toString(16) NO rellena con ceros a la
            // izquierda. Si la clave privada generada empieza con un byte
            // bajo (ej. 0x00.. o 0x0f..), el hex resultante queda con menos
            // de 64 caracteres y la clave se corrompe al reconstruirla. Se
            // usa Numeric.toHexStringWithPrefixZeroPadded para forzar
            // siempre 64 caracteres hex (32 bytes), como espera Credentials.create().
            String privateKeyHex = org.web3j.utils.Numeric.toHexStringWithPrefixZeroPadded(
                    keyPair.getPrivateKey(), 64);
            String cifrada = cryptoUtil.cifrar(privateKeyHex);
            return new WalletGenerada(address, cifrada);
        } catch (Exception e) {
            throw new RuntimeException("No se pudo generar la wallet del usuario", e);
        }
    }
}
