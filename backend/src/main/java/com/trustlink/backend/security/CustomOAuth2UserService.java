package com.trustlink.backend.security;

import com.trustlink.backend.entity.ProveedorAuth;
import com.trustlink.backend.entity.TipoAccionAuditoria;
import com.trustlink.backend.entity.Usuario;
import com.trustlink.backend.repository.UsuarioRepository;
import com.trustlink.backend.service.AuditoriaService;
import com.trustlink.backend.web3.Web3AccountService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.oauth2.client.userinfo.DefaultOAuth2UserService;
import org.springframework.security.oauth2.client.userinfo.OAuth2UserRequest;
import org.springframework.security.oauth2.core.OAuth2AuthenticationException;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Se ejecuta tras un login exitoso con Google. Si ya existe una cuenta
 * con ese correo, entra a esa cuenta; si no existe, crea una cuenta
 * nueva con wallet generada, igual que en el registro normal, pero sin
 * contraseña local (ver ProveedorAuth.GOOGLE).
 */
@Service
@RequiredArgsConstructor
public class CustomOAuth2UserService extends DefaultOAuth2UserService {

    private final UsuarioRepository usuarioRepository;
    private final Web3AccountService web3AccountService;
    private final AuditoriaService auditoriaService;

    @Override
    @Transactional
    public OAuth2User loadUser(OAuth2UserRequest request) throws OAuth2AuthenticationException {
        OAuth2User oauth2User = super.loadUser(request);

        String email = oauth2User.getAttribute("email");
        Boolean emailVerificado = oauth2User.getAttribute("email_verified");
        String nombreCompleto = oauth2User.getAttribute("name");
        String nombre = oauth2User.getAttribute("given_name");
        String apellido = oauth2User.getAttribute("family_name");

        if (email == null || Boolean.FALSE.equals(emailVerificado)) {
            throw new OAuth2AuthenticationException("No se pudo verificar tu correo de Google");
        }

        Usuario usuario = usuarioRepository.findByEmailIgnoreCase(email)
                .orElseGet(() -> crearDesdeGoogle(email, nombre, apellido, nombreCompleto));

        if (usuario.isBaneado()) {
            throw new OAuth2AuthenticationException("Esta cuenta está suspendida");
        }

        auditoriaService.registrar(usuario, TipoAccionAuditoria.LOGIN_EXITOSO,
                "Inicio de sesión con Google: " + usuario.getEmail());

        return new UsuarioOAuth2Adapter(usuario, oauth2User.getAttributes());
    }

    private Usuario crearDesdeGoogle(String email, String nombre, String apellido, String nombreCompleto) {
        var wallet = web3AccountService.generarWallet();

        String nombreFinal = nombre != null ? nombre : (nombreCompleto != null ? nombreCompleto : "Usuario");
        String apellidoFinal = apellido != null ? apellido : "";

        Usuario nuevo = Usuario.builder()
                .email(email.trim().toLowerCase())
                .contrasenaHash(null)
                .proveedorAuth(ProveedorAuth.GOOGLE)
                .nombre(nombreFinal)
                .apellido(apellidoFinal)
                .walletAddress(wallet.address())
                .walletPrivateKeyCifrada(wallet.privateKeyCifrada())
                .build();

        Usuario guardado = usuarioRepository.save(nuevo);
        auditoriaService.registrar(guardado, TipoAccionAuditoria.REGISTRO_USUARIO,
                "Nueva cuenta registrada vía Google: " + guardado.getEmail());
        return guardado;
    }
}
