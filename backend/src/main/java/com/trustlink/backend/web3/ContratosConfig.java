package com.trustlink.backend.web3;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.web3j.crypto.Credentials;
import org.web3j.protocol.Web3j;
import org.web3j.protocol.http.HttpService;
import org.web3j.tx.gas.ContractGasProvider;
import org.web3j.tx.gas.StaticGasProvider;

import java.math.BigInteger;

/**
 * Configuracion de la conexion a Arbitrum Sepolia via Web3j.
 * <p>
 * IMPORTANTE: las direcciones de los contratos y la clave privada de la
 * wallet del backend se leen de application.properties / variables de
 * entorno. Despues de correr contracts/deploy_arbitrum_sepolia.js,
 * copien las direcciones generadas en deployed_addresses.json a
 * application.properties (trustlink.contracts.escrow-address y
 * trustlink.contracts.reputation-address).
 */
@Configuration
public class ContratosConfig {

    @Value("${trustlink.web3.rpc-url}")
    private String rpcUrl;

    @Value("${trustlink.web3.backend-private-key}")
    private String backendPrivateKey;

    @Bean
    public Web3j web3j() {
        return Web3j.build(new HttpService(rpcUrl));
    }

    @Bean
    public Credentials backendCredentials() {
        return Credentials.create(backendPrivateKey);
    }

    @Bean
    public ContractGasProvider gasProvider() {
        // Se usa un StaticGasProvider con límites explícitos en vez de
        // DefaultGasProvider: el límite por defecto de Web3j (4,300,000)
        // puede quedarse corto para transacciones que ademas emiten un
        // evento y mintean un SBT (confirmarEntrega llama internamente a
        // TrustLinkReputation.registrarVentaExitosa). Arbitrum Sepolia
        // tiene gas muy barato, asi que ser generoso aqui no es un
        // problema de costo — evita fallos de "out of gas" en la demo.
        BigInteger gasPrice = BigInteger.valueOf(100_000_000L); // 0.1 gwei, tipico en Arbitrum
        BigInteger gasLimit = BigInteger.valueOf(3_000_000L);
        return new StaticGasProvider(gasPrice, gasLimit);
    }
}
