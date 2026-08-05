package com.trustlink.backend.entity;

import jakarta.persistence.*;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * Usuario de TrustLink. Puede comprar y vender (no hay cuentas separadas
 * de comprador/vendedor). El superadmin (superadmin@trustlink.com) es un
 * Usuario mas con rol SUPERADMIN, sembrado por defecto en la base de datos.
 */
@Entity
@Table(name = "usuarios")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Usuario {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @NotBlank
    @Email
    @Column(nullable = false, unique = true, length = 150)
    private String email;

    /** Hash BCrypt de la contraseña. Nunca se guarda en texto plano. */
    @NotBlank
    @Column(nullable = false)
    private String contrasenaHash;

    @NotBlank
    @Column(nullable = false, length = 80)
    private String nombre;

    @NotBlank
    @Column(nullable = false, length = 80)
    private String apellido;

    @Column(length = 20)
    private String telefono;

    /** Ruta relativa de la foto de perfil dentro de /uploads/perfiles/. */
    @Column(name = "foto_url", length = 255)
    private String fotoUrl;

    /**
     * Direccion de wallet EVM asociada al usuario. En el MVP se genera
     * automaticamente (modo "wallet embebida", el usuario nunca ve la
     * clave privada) — ver Web3AccountService.
     */
    @Column(name = "wallet_address", length = 42, unique = true)
    private String walletAddress;

    /**
     * Clave privada de la wallet embebida, cifrada en reposo con AES antes
     * de guardarse (ver CryptoUtil). Nunca se expone al frontend ni se
     * loguea. Es analoga al "account abstraction" mencionado en el pitch:
     * el usuario nunca ve esto, solo aprueba acciones con su contraseña.
     */
    @Column(name = "wallet_private_key_cifrada", columnDefinition = "TEXT")
    private String walletPrivateKeyCifrada;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    @Builder.Default
    private Rol rol = Rol.USUARIO;

    @Builder.Default
    @Column(nullable = false)
    private boolean baneado = false;

    @Column(length = 255)
    private String motivoBaneo;

    @Builder.Default
    @Column(nullable = false)
    private boolean emailVerificado = false;

    @Builder.Default
    @Column(nullable = false)
    private LocalDateTime creadoEn = LocalDateTime.now();

    private LocalDateTime actualizadoEn;

    @PreUpdate
    public void preUpdate() {
        this.actualizadoEn = LocalDateTime.now();
    }

    public String getNombreCompleto() {
        return nombre + " " + apellido;
    }
}
