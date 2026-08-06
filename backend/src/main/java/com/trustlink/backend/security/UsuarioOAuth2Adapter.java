package com.trustlink.backend.security;

import com.trustlink.backend.entity.Usuario;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.oauth2.core.user.OAuth2User;

import java.util.Map;

/**
 * Extiende UsuarioPrincipal (el que usa todo el resto del código vía
 * @AuthenticationPrincipal UsuarioPrincipal) agregándole los atributos
 * que Spring Security espera de un OAuth2User. Así los controllers no
 * necesitan saber si alguien entró con contraseña local o con Google —
 * siempre reciben el mismo UsuarioPrincipal con su Usuario real adentro.
 */
public class UsuarioOAuth2Adapter extends UsuarioPrincipal implements OAuth2User {

    private final Map<String, Object> atributos;

    public UsuarioOAuth2Adapter(Usuario usuario, Map<String, Object> atributos) {
        super(usuario);
        this.atributos = atributos;
    }

    @Override
    public Map<String, Object> getAttributes() {
        return atributos;
    }

    @Override
    public java.util.Collection<? extends GrantedAuthority> getAuthorities() {
        return super.getAuthorities();
    }

    @Override
    public String getName() {
        return getUsuario().getEmail();
    }
}
