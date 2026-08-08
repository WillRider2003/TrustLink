package com.trustlink.backend.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * Token de un solo uso para recuperacion de contraseña. Se genera con
 * SecureRandom, se guarda como hash SHA-256 (nunca en texto plano) y
 * expira a los 30 minutos, siguiendo el mismo endurecimiento de
 * seguridad aplicado previamente al sistema de QuintaOla (rate limiting,
 * expiracion corta, hash del token en vez de texto plano).
 */
@Entity
@Table(name = "password_reset_tokens")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PasswordResetToken {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "usuario_id", nullable = false)
    private Long usuarioId;

    /** SHA-256 del token real que se envia por correo/se muestra al usuario. */
    @Column(name = "token_hash", nullable = false, unique = true, length = 64)
    private String tokenHash;

    @Column(nullable = false)
    private LocalDateTime expiraEn;

    @Builder.Default
    @Column(nullable = false)
    private boolean usado = false;

    @Builder.Default
    @Column(nullable = false)
    private LocalDateTime creadoEn = LocalDateTime.now();

    public boolean estaVigente() {
        return !usado && LocalDateTime.now().isBefore(expiraEn);
    }
}
