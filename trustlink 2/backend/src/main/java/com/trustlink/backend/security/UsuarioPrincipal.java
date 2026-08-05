package com.trustlink.backend.security;

import com.trustlink.backend.entity.Rol;
import com.trustlink.backend.entity.Usuario;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;

import java.util.Collection;
import java.util.List;

/**
 * Adaptador entre nuestra entidad Usuario y el UserDetails que Spring
 * Security necesita. Un usuario baneado no puede autenticarse
 * (isEnabled() = false) — es el mecanismo real detras del "banear
 * usuarios" del panel de superadmin.
 */
public class UsuarioPrincipal implements UserDetails {

    private final Usuario usuario;

    public UsuarioPrincipal(Usuario usuario) {
        this.usuario = usuario;
    }

    public Usuario getUsuario() {
        return usuario;
    }

    public Long getId() {
        return usuario.getId();
    }

    @Override
    public Collection<? extends GrantedAuthority> getAuthorities() {
        if (usuario.getRol() == Rol.SUPERADMIN) {
            return List.of(new SimpleGrantedAuthority("ROLE_SUPERADMIN"), new SimpleGrantedAuthority("ROLE_USUARIO"));
        }
        return List.of(new SimpleGrantedAuthority("ROLE_USUARIO"));
    }

    @Override
    public String getPassword() {
        return usuario.getContrasenaHash();
    }

    @Override
    public String getUsername() {
        return usuario.getEmail();
    }

    @Override
    public boolean isAccountNonExpired() {
        return true;
    }

    @Override
    public boolean isAccountNonLocked() {
        // Un usuario baneado queda "bloqueado" a nivel de autenticacion:
        // no puede iniciar sesion aunque su contraseña sea correcta.
        return !usuario.isBaneado();
    }

    @Override
    public boolean isCredentialsNonExpired() {
        return true;
    }

    @Override
    public boolean isEnabled() {
        return !usuario.isBaneado();
    }
}
