package com.trustlink.backend.security;

import com.trustlink.backend.entity.TipoAccionAuditoria;
import com.trustlink.backend.service.AuditoriaService;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.web.authentication.SimpleUrlAuthenticationFailureHandler;
import org.springframework.stereotype.Component;

import java.io.IOException;

/**
 * Registra cada intento de login fallido en el RateLimiter. Si el correo
 * ya superó el máximo de intentos permitidos en la ventana de tiempo,
 * redirige con un mensaje distinto para que el usuario entienda que está
 * temporalmente bloqueado por seguridad, no que su contraseña esté mal
 * (evita que alguien intente fuerza bruta indefinidamente sin fricción).
 */
@Component
@RequiredArgsConstructor
public class LoginFallidoHandler extends SimpleUrlAuthenticationFailureHandler {

    private final RateLimiter rateLimiter;
    private final AuditoriaService auditoriaService;

    @Override
    public void onAuthenticationFailure(HttpServletRequest request, HttpServletResponse response,
                                         AuthenticationException exception) throws IOException, ServletException {
        String email = request.getParameter("email");

        if (email != null) {
            boolean permitido = rateLimiter.permitirIntentoLogin(email);
            rateLimiter.registrarIntentoLoginFallido(email);
            auditoriaService.registrar(null, TipoAccionAuditoria.LOGIN_FALLIDO,
                    "Intento de login fallido para " + email);

            if (!permitido) {
                setDefaultFailureUrl("/auth/login?bloqueado=true");
                super.onAuthenticationFailure(request, response, exception);
                return;
            }
        }

        setDefaultFailureUrl("/auth/login?error=true");
        super.onAuthenticationFailure(request, response, exception);
    }
}
