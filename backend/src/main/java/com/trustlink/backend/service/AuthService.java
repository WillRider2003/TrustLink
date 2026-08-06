package com.trustlink.backend.service;

import com.trustlink.backend.dto.RegistroDTO;
import com.trustlink.backend.entity.PasswordResetToken;
import com.trustlink.backend.entity.TipoAccionAuditoria;
import com.trustlink.backend.entity.Usuario;
import com.trustlink.backend.repository.PasswordResetTokenRepository;
import com.trustlink.backend.repository.UsuarioRepository;
import com.trustlink.backend.web3.Web3AccountService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.MessageDigest;
import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.util.Base64;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final UsuarioRepository usuarioRepository;
    private final PasswordResetTokenRepository tokenRepository;
    private final PasswordEncoder passwordEncoder;
    private final Web3AccountService web3AccountService;
    private final EmailService emailService;
    private final AuditoriaService auditoriaService;

    private static final SecureRandom RANDOM = new SecureRandom();

    public static class EmailYaRegistradoException extends RuntimeException {
        public EmailYaRegistradoException() { super("Ya existe una cuenta con ese correo"); }
    }

    public static class ContrasenasNoCoincidenException extends RuntimeException {
        public ContrasenasNoCoincidenException() { super("Las contraseñas no coinciden"); }
    }

    @Transactional
    public Usuario registrar(RegistroDTO dto) {
        if (usuarioRepository.existsByEmailIgnoreCase(dto.getEmail())) {
            throw new EmailYaRegistradoException();
        }
        if (!dto.getContrasena().equals(dto.getConfirmarContrasena())) {
            throw new ContrasenasNoCoincidenException();
        }

        var wallet = web3AccountService.generarWallet();

        Usuario usuario = Usuario.builder()
                .email(dto.getEmail().trim().toLowerCase())
                .contrasenaHash(passwordEncoder.encode(dto.getContrasena()))
                .nombre(dto.getNombre().trim())
                .apellido(dto.getApellido().trim())
                .telefono(dto.getTelefono())
                .walletAddress(wallet.address())
                .walletPrivateKeyCifrada(wallet.privateKeyCifrada())
                .build();

        Usuario guardado = usuarioRepository.save(usuario);
        auditoriaService.registrar(guardado, TipoAccionAuditoria.REGISTRO_USUARIO,
                "Nueva cuenta registrada: " + guardado.getEmail());
        return guardado;
    }

    /**
     * Genera un token de recuperacion aleatorio (32 bytes de SecureRandom),
     * guarda solo su hash SHA-256 en la base de datos (nunca el token en
     * texto plano) y envia el correo. Devuelve el token en texto plano
     * SOLO para que el controlador pueda, en modo demo sin SMTP, mostrar
     * el enlace directamente en pantalla.
     */
    @Transactional
    public Optional<String> solicitarRecuperacion(String email) {
        Optional<Usuario> usuarioOpt = usuarioRepository.findByEmailIgnoreCase(email);
        if (usuarioOpt.isEmpty()) {
            // No revelamos si el correo existe o no (mitiga enumeracion de cuentas)
            return Optional.empty();
        }
        Usuario usuario = usuarioOpt.get();

        byte[] tokenBytes = new byte[32];
        RANDOM.nextBytes(tokenBytes);
        String tokenPlano = Base64.getUrlEncoder().withoutPadding().encodeToString(tokenBytes);
        String tokenHash = sha256Hex(tokenPlano);

        PasswordResetToken entidad = PasswordResetToken.builder()
                .usuarioId(usuario.getId())
                .tokenHash(tokenHash)
                .expiraEn(LocalDateTime.now().plusMinutes(30))
                .build();
        tokenRepository.save(entidad);

        emailService.enviarCorreoRecuperacion(usuario.getEmail(), usuario.getNombre(), tokenPlano);

        return Optional.of(tokenPlano);
    }

    public static class TokenInvalidoException extends RuntimeException {
        public TokenInvalidoException() { super("El enlace de recuperación no es válido o ya expiró"); }
    }

    @Transactional
    public void confirmarRecuperacion(String tokenPlano, String nuevaContrasena, String confirmarContrasena) {
        if (!nuevaContrasena.equals(confirmarContrasena)) {
            throw new ContrasenasNoCoincidenException();
        }

        String tokenHash = sha256Hex(tokenPlano);
        PasswordResetToken token = tokenRepository.findByTokenHash(tokenHash)
                .filter(PasswordResetToken::estaVigente)
                .orElseThrow(TokenInvalidoException::new);

        Usuario usuario = usuarioRepository.findById(token.getUsuarioId())
                .orElseThrow(TokenInvalidoException::new);

        usuario.setContrasenaHash(passwordEncoder.encode(nuevaContrasena));
        usuarioRepository.save(usuario);

        token.setUsado(true);
        tokenRepository.save(token);
    }

    private String sha256Hex(String texto) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(texto.getBytes(java.nio.charset.StandardCharsets.UTF_8));
            StringBuilder sb = new StringBuilder();
            for (byte b : hash) sb.append(String.format("%02x", b));
            return sb.toString();
        } catch (Exception e) {
            throw new RuntimeException(e);
        }
    }
}
