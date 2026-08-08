package com.trustlink.backend.security;

import com.trustlink.backend.entity.TipoAccionAuditoria;
import com.trustlink.backend.service.AuditoriaService;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.security.web.authentication.SavedRequestAwareAuthenticationSuccessHandler;
import org.springframework.stereotype.Component;

import java.io.IOException;

/**
 * Tras un login exitoso, limpia el contador de intentos fallidos de ese
 * correo en el RateLimiter — si no se limpiara, un usuario que se
 * equivocó de contraseña un par de veces y luego entra bien seguiría
 * acumulando intentos "fantasma" contra el límite de la próxima vez que
 * de casualidad vuelva a fallar.
 */
@Component
@RequiredArgsConstructor
public class LoginExitosoHandler extends SavedRequestAwareAuthenticationSuccessHandler {

    private final RateLimiter rateLimiter;
    private final AuditoriaService auditoriaService;

    @Override
    public void onAuthenticationSuccess(HttpServletRequest request, HttpServletResponse response,
                                         Authentication authentication) throws ServletException, IOException {
        String email = request.getParameter("email");
        if (email != null) {
            rateLimiter.limpiarIntentosLogin(email);
        }
        Object principal = authentication.getPrincipal();
        if (principal instanceof UsuarioPrincipal up) {
            auditoriaService.registrar(up.getUsuario(), TipoAccionAuditoria.LOGIN_EXITOSO,
                    "Inicio de sesión de " + up.getUsuario().getEmail());
        }
        setDefaultTargetUrl("/marketplace");
        setAlwaysUseDefaultTargetUrl(true);
        super.onAuthenticationSuccess(request, response, authentication);
    }
}
