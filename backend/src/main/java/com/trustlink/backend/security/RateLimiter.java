package com.trustlink.backend.security;

import org.springframework.stereotype.Component;

import java.time.Instant;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicInteger;

/**
 * Rate limiter simple en memoria (suficiente para el MVP de hackathon;
 * en produccion se movería a Redis). Limita intentos de login fallidos y
 * solicitudes de recuperacion de contraseña por email, para mitigar
 * fuerza bruta y abuso del envio de correos.
 * <p>
 * Nota de diseño: se limita por email normalizado, no por IP, porque en
 * el entorno de demo (todos probando desde la misma red del hackathon)
 * limitar por IP bloquearia a todo el equipo entre si.
 */
@Component
public class RateLimiter {

    private static final int MAX_INTENTOS_LOGIN = 5;
    private static final long VENTANA_LOGIN_MS = 15 * 60 * 1000L; // 15 minutos

    private static final int MAX_SOLICITUDES_RESET = 3;
    private static final long VENTANA_RESET_MS = 60 * 60 * 1000L; // 1 hora

    private record Contador(AtomicInteger intentos, long inicioVentana) {}

    private final ConcurrentHashMap<String, Contador> loginPorEmail = new ConcurrentHashMap<>();
    private final ConcurrentHashMap<String, Contador> resetPorEmail = new ConcurrentHashMap<>();

    public boolean permitirIntentoLogin(String email) {
        return permitir(loginPorEmail, normalizar(email), MAX_INTENTOS_LOGIN, VENTANA_LOGIN_MS);
    }

    public void registrarIntentoLoginFallido(String email) {
        registrar(loginPorEmail, normalizar(email), VENTANA_LOGIN_MS);
    }

    public void limpiarIntentosLogin(String email) {
        loginPorEmail.remove(normalizar(email));
    }

    public boolean permitirSolicitudReset(String email) {
        return permitir(resetPorEmail, normalizar(email), MAX_SOLICITUDES_RESET, VENTANA_RESET_MS);
    }

    public void registrarSolicitudReset(String email) {
        registrar(resetPorEmail, normalizar(email), VENTANA_RESET_MS);
    }

    private String normalizar(String email) {
        return email == null ? "" : email.trim().toLowerCase();
    }

    private boolean permitir(ConcurrentHashMap<String, Contador> mapa, String clave, int max, long ventanaMs) {
        Contador c = mapa.get(clave);
        if (c == null) return true;
        if (Instant.now().toEpochMilli() - c.inicioVentana() > ventanaMs) {
            mapa.remove(clave);
            return true;
        }
        return c.intentos().get() < max;
    }

    private void registrar(ConcurrentHashMap<String, Contador> mapa, String clave, long ventanaMs) {
        long ahora = Instant.now().toEpochMilli();
        mapa.compute(clave, (k, existente) -> {
            if (existente == null || ahora - existente.inicioVentana() > ventanaMs) {
                return new Contador(new AtomicInteger(1), ahora);
            }
            existente.intentos().incrementAndGet();
            return existente;
        });
    }
}
