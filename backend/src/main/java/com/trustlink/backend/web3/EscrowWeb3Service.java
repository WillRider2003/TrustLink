package com.trustlink.backend.web3;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.web3j.abi.FunctionEncoder;
import org.web3j.abi.datatypes.Address;
import org.web3j.abi.datatypes.Bool;
import org.web3j.abi.datatypes.Function;
import org.web3j.abi.datatypes.generated.Bytes32;
import org.web3j.abi.datatypes.generated.Uint256;
import org.web3j.crypto.Credentials;
import org.web3j.crypto.RawTransaction;
import org.web3j.crypto.TransactionEncoder;
import org.web3j.protocol.Web3j;
import org.web3j.protocol.core.DefaultBlockParameterName;
import org.web3j.protocol.core.methods.response.EthGetTransactionCount;
import org.web3j.protocol.core.methods.response.EthSendTransaction;
import org.web3j.protocol.core.methods.response.TransactionReceipt;
import org.web3j.tx.gas.ContractGasProvider;
import org.web3j.utils.Numeric;

import java.math.BigInteger;
import java.util.Collections;
import java.util.Optional;

/**
 * Servicio de interaccion con el contrato TrustLinkEscrow desplegado en
 * Arbitrum Sepolia, usando llamadas Web3j de bajo nivel (Function +
 * FunctionEncoder) en vez de un wrapper generado por web3j-cli — el
 * generador de wrappers de web3j-cli no estaba disponible en el entorno
 * donde se preparo este proyecto (requiere red que estaba bloqueada), asi
 * que se escribio directamente contra la API base de Web3j, que es
 * exactamente lo que el generador produce por debajo.
 * <p>
 * Todas las transacciones que escriben en el contrato (crearOrden,
 * confirmarEntrega, etc.) las firma y envia la wallet del BACKEND
 * (credentials del application.properties), actuando en nombre del
 * usuario final — asi el usuario nunca necesita gas propio ni firmar
 * nada manualmente ("wallet embebida" / cuenta invisible, tal como
 * describe el pitch).
 */
@Service
@Slf4j
@RequiredArgsConstructor
public class EscrowWeb3Service {

    private final Web3j web3j;
    private final Credentials backendCredentials;
    private final ContractGasProvider gasProvider;

    @Value("${trustlink.contracts.escrow-address}")
    private String escrowAddress;

    @Value("${trustlink.web3.chain-id}")
    private long chainId;

    /** Calcula el hash keccak256 de un codigo de confirmacion, igual que hace el contrato. */
    public String hashCodigo(String codigo) {
        // El contrato usa keccak256(abi.encodePacked(string)) — equivalente
        // a Solidity keccak256(bytes(codigo)).
        return org.web3j.crypto.Hash.sha3String(codigo);
    }

    /**
     * Crea una orden de escrow: el backend envia la transaccion en nombre
     * del comprador, con el monto en ETH de testnet especificado.
     * <p>
     * IMPORTANTE: espera el recibo y extrae el ordenId REAL asignado por
     * el contrato desde el evento OrdenCreada — este id lo genera el
     * contrato de forma autoincremental (empieza en 1) y NO tiene por
     * qué coincidir con el id de la fila en la base de datos local. Usar
     * el id local como si fuera el id on-chain es un bug: rompe
     * confirmarEntrega/reportarDisputa en cuanto haya más de una orden
     * en el sistema con ids desalineados.
     *
     * @return un registro con el hash de la transacción y el ordenId real on-chain
     */
    public record OrdenCreadaResultado(String txHash, BigInteger ordenIdOnChain) {}

    public OrdenCreadaResultado crearOrden(String direccionVendedor, String codigoConfirmacion, BigInteger montoWei) throws Exception {
        String codigoHash = hashCodigo(codigoConfirmacion);

        Function funcion = new Function(
                "crearOrden",
                java.util.Arrays.asList(
                        new Address(direccionVendedor),
                        new Bytes32(Numeric.hexStringToByteArray(codigoHash))
                ),
                Collections.emptyList()
        );

        String txHash = enviarTransaccion(funcion, montoWei);
        TransactionReceipt receipt = esperarRecibo(txHash);

        // Evento: OrdenCreada(uint256 indexed ordenId, address indexed comprador,
        //                     address indexed vendedor, uint256 monto, uint256 plazoConfirmacion)
        // Los parametros "indexed" quedan como topics[1], topics[2], topics[3]
        // en el primer log emitido por el contrato de Escrow durante esta tx.
        BigInteger ordenIdOnChain = extraerOrdenIdDeEvento(receipt);

        return new OrdenCreadaResultado(txHash, ordenIdOnChain);
    }

    /**
     * Extrae el ordenId (primer topic indexado del evento OrdenCreada)
     * del recibo de la transacción. Busca el log cuya dirección coincide
     * con el contrato de Escrow, para no confundirse si en el futuro
     * la misma tx emite eventos de otros contratos.
     */
    private BigInteger extraerOrdenIdDeEvento(TransactionReceipt receipt) {
        for (var log : receipt.getLogs()) {
            if (log.getAddress().equalsIgnoreCase(escrowAddress) && log.getTopics().size() >= 2) {
                // topics[0] = firma del evento, topics[1] = ordenId (primer indexed)
                String ordenIdHex = log.getTopics().get(1);
                return Numeric.toBigInt(ordenIdHex);
            }
        }
        throw new RuntimeException("No se pudo leer el ordenId del evento OrdenCreada. " +
                "Verifica que trustlink.contracts.escrow-address coincida con el contrato desplegado.");
    }

    /**
     * Confirma la entrega de una orden. Devuelve el recibo de la
     * transaccion para que el llamador pueda verificar el estado on-chain
     * (util para saber si el pago se liberó realmente).
     */
    public TransactionReceipt confirmarEntrega(BigInteger ordenId, String codigo) throws Exception {
        Function funcion = new Function(
                "confirmarEntrega",
                java.util.Arrays.asList(
                        new Uint256(ordenId),
                        new org.web3j.abi.datatypes.Utf8String(codigo)
                ),
                Collections.emptyList()
        );

        String txHash = enviarTransaccion(funcion, BigInteger.ZERO);
        return esperarRecibo(txHash);
    }

    public TransactionReceipt liberarPorTimeout(BigInteger ordenId) throws Exception {
        Function funcion = new Function(
                "liberarPorTimeout",
                java.util.Arrays.asList(new Uint256(ordenId)),
                Collections.emptyList()
        );
        String txHash = enviarTransaccion(funcion, BigInteger.ZERO);
        return esperarRecibo(txHash);
    }

    public TransactionReceipt reportarDisputa(BigInteger ordenId) throws Exception {
        Function funcion = new Function(
                "reportarDisputa",
                java.util.Arrays.asList(new Uint256(ordenId)),
                Collections.emptyList()
        );
        String txHash = enviarTransaccion(funcion, BigInteger.ZERO);
        return esperarRecibo(txHash);
    }

    public TransactionReceipt resolverDisputa(BigInteger ordenId, boolean liberarAlVendedor) throws Exception {
        Function funcion = new Function(
                "resolverDisputa",
                java.util.Arrays.asList(new Uint256(ordenId), new Bool(liberarAlVendedor)),
                Collections.emptyList()
        );
        String txHash = enviarTransaccion(funcion, BigInteger.ZERO);
        return esperarRecibo(txHash);
    }

    /**
     * Firma y envia una transaccion al contrato de Escrow usando la
     * wallet del backend, con nonce obtenido fresco de la red en cada
     * llamada (evita el problema de nonce desincronizado observado
     * durante las pruebas locales — ver notas en contracts/test_all_in_one.js).
     */
    private String enviarTransaccion(Function funcion, BigInteger valorWei) throws Exception {
        String encodedFunction = FunctionEncoder.encode(funcion);

        EthGetTransactionCount countResp = web3j.ethGetTransactionCount(
                backendCredentials.getAddress(), DefaultBlockParameterName.PENDING
        ).send();
        BigInteger nonce = countResp.getTransactionCount();

        RawTransaction rawTransaction = RawTransaction.createTransaction(
                nonce,
                gasProvider.getGasPrice(),
                gasProvider.getGasLimit(),
                escrowAddress,
                valorWei,
                encodedFunction
        );

        byte[] signedMessage = TransactionEncoder.signMessage(rawTransaction, chainId, backendCredentials);
        String hexValue = Numeric.toHexString(signedMessage);

        EthSendTransaction response = web3j.ethSendRawTransaction(hexValue).send();

        if (response.hasError()) {
            throw new RuntimeException("Error enviando transacción: " + response.getError().getMessage());
        }

        return response.getTransactionHash();
    }

    /** Espera (polling simple) a que la transacción tenga recibo confirmado. */
    private TransactionReceipt esperarRecibo(String txHash) throws Exception {
        Optional<TransactionReceipt> receipt = Optional.empty();
        int intentos = 0;
        while (receipt.isEmpty() && intentos < 40) {
            receipt = web3j.ethGetTransactionReceipt(txHash).send().getTransactionReceipt();
            if (receipt.isEmpty()) {
                Thread.sleep(1500);
                intentos++;
            }
        }
        return receipt.orElseThrow(() -> new RuntimeException("Timeout esperando recibo de " + txHash));
    }
}
