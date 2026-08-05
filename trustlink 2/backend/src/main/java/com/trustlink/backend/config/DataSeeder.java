package com.trustlink.backend.config;

import com.trustlink.backend.entity.Rol;
import com.trustlink.backend.entity.Usuario;
import com.trustlink.backend.repository.UsuarioRepository;
import com.trustlink.backend.web3.Web3AccountService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

/**
 * Crea la cuenta de superadmin al arrancar la aplicación, si todavía no
 * existe. Credenciales por defecto (configurables en
 * application.properties): superadmin@trustlink.com / trust2026
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class DataSeeder implements CommandLineRunner {

    private final UsuarioRepository usuarioRepository;
    private final PasswordEncoder passwordEncoder;
    private final Web3AccountService web3AccountService;

    @Value("${trustlink.superadmin.email}")
    private String superadminEmail;

    @Value("${trustlink.superadmin.password}")
    private String superadminPassword;

    @Override
    public void run(String... args) {
        if (usuarioRepository.existsByEmailIgnoreCase(superadminEmail)) {
            log.info("Superadmin ya existe, no se vuelve a crear.");
            return;
        }

        var wallet = web3AccountService.generarWallet();

        Usuario superadmin = Usuario.builder()
                .email(superadminEmail)
                .contrasenaHash(passwordEncoder.encode(superadminPassword))
                .nombre("Super")
                .apellido("Admin")
                .rol(Rol.SUPERADMIN)
                .emailVerificado(true)
                .walletAddress(wallet.address())
                .walletPrivateKeyCifrada(wallet.privateKeyCifrada())
                .build();

        usuarioRepository.save(superadmin);
        log.info("Cuenta de superadmin creada: {}", superadminEmail);
    }
}
