package com.trustlink.backend;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableAsync;

/**
 * TrustLink — Marketplace con escrow y credito progresivo on-chain para
 * vendedores informales, potenciado con IA y desplegado en Arbitrum.
 * <p>
 * BUIDL Hackathon, Arbitrum Track.
 */
@SpringBootApplication
@EnableAsync
public class TrustLinkBackendApplication {

    public static void main(String[] args) {
        SpringApplication.run(TrustLinkBackendApplication.class, args);
    }
}
