package com.trustlink.backend.service;

import com.trustlink.backend.entity.*;
import com.trustlink.backend.repository.OrdenEscrowRepository;
import com.trustlink.backend.repository.ProductoRepository;
import com.trustlink.backend.repository.ReputacionVendedorRepository;
import com.trustlink.backend.web3.EscrowWeb3Service;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.web3j.protocol.core.methods.response.TransactionReceipt;

import java.math.BigDecimal;
import java.math.BigInteger;
import java.math.RoundingMode;
import java.security.SecureRandom;
import java.time.LocalDateTime;

/**
 * Orquesta el ciclo completo de una compra: crea la orden en la base de
 * datos, dispara la transaccion real en el contrato TrustLinkEscrow
 * (Arbitrum Sepolia), y sincroniza el resultado. Esta es la pieza que
 * conecta "lo que ve el usuario en la web" con "lo que realmente pasa
 * on-chain", tal como describe el pitch.
 * <p>
 * Tasa de conversion Soles -> ETH: en el MVP se usa una tasa fija
 * configurable (trustlink.tasa-cambio.soles-por-eth) en vez de consultar
 * un oraculo de precios real, para que la demo sea predecible — esto
 * queda declarado explicitamente, igual que otras simplificaciones del
 * MVP mencionadas en el pitch (dependencia de backend, origen del capital).
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class EscrowOrquestadorService {

    private final OrdenEscrowRepository ordenRepository;
    private final ProductoRepository productoRepository;
    private final ReputacionVendedorRepository reputacionRepository;
    private final EscrowWeb3Service escrowWeb3Service;
    private final ScoringService scoringService;

    private static final BigDecimal TASA_SOLES_POR_ETH = new BigDecimal("15000"); // valor fijo de demo
    private static final SecureRandom RANDOM = new SecureRandom();

    public static class CompraException extends RuntimeException {
        public CompraException(String mensaje) { super(mensaje); }
        public CompraException(String mensaje, Throwable causa) { super(mensaje, causa); }
    }

    /**
     * Genera un código de confirmación de entrega, tipo código de delivery.
     */
    private String generarCodigoConfirmacion() {
        int codigo = 100000 + RANDOM.nextInt(900000);
        return String.valueOf(codigo);
    }

    /**
     * Comprador solicita un producto: crea la orden en el contrato de
     * Escrow (transacción real en Arbitrum Sepolia) y guarda el registro
     * local con el código de confirmación que se le muestra al comprador.
     */
    @Transactional
    public OrdenEscrow crearOrdenDeCompra(Usuario comprador, Long productoId) {
        Producto producto = productoRepository.findById(productoId)
                .orElseThrow(() -> new CompraException("Producto no encontrado"));

        if (producto.getVendedor().getId().equals(comprador.getId())) {
            throw new CompraException("No puedes comprarte tu propio producto");
        }

        String codigo = generarCodigoConfirmacion();
        BigDecimal montoEth = producto.getPrecioSoles()
                .divide(TASA_SOLES_POR_ETH, 18, RoundingMode.HALF_UP);
        BigInteger montoWei = montoEth.multiply(new BigDecimal("1000000000000000000")).toBigInteger();

        String vendedorWallet = producto.getVendedor().getWalletAddress();

        EscrowWeb3Service.OrdenCreadaResultado resultado;
        try {
            resultado = escrowWeb3Service.crearOrden(vendedorWallet, codigo, montoWei);
        } catch (Exception e) {
            log.error("Error al crear orden on-chain", e);
            throw new CompraException("No se pudo crear la orden en la blockchain. Intenta de nuevo.", e);
        }

        OrdenEscrow orden = OrdenEscrow.builder()
                .ordenIdOnChain(resultado.ordenIdOnChain().longValueExact())
                .comprador(comprador)
                .vendedor(producto.getVendedor())
                .producto(producto)
                .montoSoles(producto.getPrecioSoles())
                .montoEth(montoEth)
                .codigoConfirmacion(codigo)
                .estado(EstadoOrden.EN_CUSTODIA)
                .txHashCreacion(resultado.txHash())
                .plazoConfirmacion(LocalDateTime.now().plusHours(72))
                .build();

        return ordenRepository.save(orden);
    }

    /**
     * Comprador confirma la entrega ingresando el código. Dispara la
     * transacción real de liberación de pago en el contrato y, si tiene
     * éxito, sincroniza el estado local y actualiza la reputación del
     * vendedor (equivalente a lo que el contrato hace automáticamente
     * al emitir el SBT).
     */
    @Transactional
    public OrdenEscrow confirmarEntrega(Usuario comprador, Long ordenLocalId, String codigoIngresado) {
        OrdenEscrow orden = ordenRepository.findById(ordenLocalId)
                .orElseThrow(() -> new CompraException("Orden no encontrada"));

        if (!orden.getComprador().getId().equals(comprador.getId())) {
            throw new CompraException("No tienes permiso sobre esta orden");
        }
        if (orden.getEstado() != EstadoOrden.EN_CUSTODIA) {
            throw new CompraException("Esta orden ya no está en custodia");
        }
        if (!orden.getCodigoConfirmacion().equals(codigoIngresado.trim())) {
            throw new CompraException("El código de confirmación es incorrecto");
        }

        TransactionReceipt receipt;
        try {
            BigInteger ordenIdOnChain = BigInteger.valueOf(requireOrdenIdOnChain(orden));
            receipt = escrowWeb3Service.confirmarEntrega(ordenIdOnChain, codigoIngresado.trim());
        } catch (Exception e) {
            log.error("Error al confirmar entrega on-chain", e);
            throw new CompraException("No se pudo confirmar la entrega en la blockchain. Intenta de nuevo.", e);
        }

        orden.setEstado(EstadoOrden.LIBERADO);
        orden.setTxHashLiberacion(receipt.getTransactionHash());
        ordenRepository.save(orden);

        actualizarReputacionTrasVenta(orden.getVendedor(), orden.getComprador());

        return orden;
    }

    /**
     * Actualiza el cache local de reputacion tras una venta exitosa
     * (equivalente a lo que hace TrustLinkReputation.registrarVentaExitosa
     * on-chain — aqui se refleja localmente para que el panel de score
     * se sienta instantáneo sin depender de una nueva llamada RPC).
     */
    private void actualizarReputacionTrasVenta(Usuario vendedor, Usuario comprador) {
        ReputacionVendedor rep = reputacionRepository.findByUsuario(vendedor)
                .orElseGet(() -> ReputacionVendedor.builder().usuario(vendedor).build());

        rep.setVentasExitosas(rep.getVentasExitosas() + 1);

        // Un vendedor suma un "comprador distinto" solo la primera vez que
        // ese comprador específico le compra algo (esta orden ya se guardó
        // como LIBERADO justo antes de llamar este método, así que contar
        // <= 1 significa "esta es la primera compra de este comprador").
        long vecesDeEsteComprador = ordenRepository.findByVendedorOrderByCreadoEnDesc(vendedor).stream()
                .filter(o -> o.getEstado() == EstadoOrden.LIBERADO)
                .filter(o -> o.getComprador().getId().equals(comprador.getId()))
                .count();
        if (vecesDeEsteComprador <= 1) {
            rep.setCompradoresDistintos(rep.getCompradoresDistintos() + 1);
        }

        reputacionRepository.save(rep);
        scoringService.recalcularYGuardar(vendedor);
    }

    @Transactional
    public OrdenEscrow reportarDisputa(Usuario usuario, Long ordenLocalId) {
        OrdenEscrow orden = ordenRepository.findById(ordenLocalId)
                .orElseThrow(() -> new CompraException("Orden no encontrada"));

        boolean esParte = orden.getComprador().getId().equals(usuario.getId())
                || orden.getVendedor().getId().equals(usuario.getId());
        if (!esParte) {
            throw new CompraException("No tienes permiso sobre esta orden");
        }
        if (orden.getEstado() != EstadoOrden.EN_CUSTODIA) {
            throw new CompraException("Esta orden ya no está en custodia");
        }

        try {
            BigInteger ordenIdOnChain = BigInteger.valueOf(requireOrdenIdOnChain(orden));
            escrowWeb3Service.reportarDisputa(ordenIdOnChain);
        } catch (Exception e) {
            log.error("Error al reportar disputa on-chain", e);
            throw new CompraException("No se pudo reportar la disputa en la blockchain.", e);
        }

        orden.setEstado(EstadoOrden.EN_DISPUTA);
        return ordenRepository.save(orden);
    }

    public java.util.List<OrdenEscrow> misCompras(Usuario comprador) {
        return ordenRepository.findByCompradorOrderByCreadoEnDesc(comprador);
    }

    public java.util.List<OrdenEscrow> misVentas(Usuario vendedor) {
        return ordenRepository.findByVendedorOrderByCreadoEnDesc(vendedor);
    }

    public OrdenEscrow obtenerOrden(Long id) {
        return ordenRepository.findById(id)
                .orElseThrow(() -> new CompraException("Orden no encontrada"));
    }

    /**
     * Devuelve el ordenId real del contrato on-chain, o falla ruidosamente
     * si no está seteado — esto solo puede pasar si la orden se creó
     * antes de este fix, o si crearOrdenDeCompra() falló en un punto raro
     * a mitad de la transacción. Preferimos fallar claro a usar un id
     * incorrecto en silencio (ver EscrowWeb3Service.crearOrden).
     */
    private long requireOrdenIdOnChain(OrdenEscrow orden) {
        Long id = orden.getOrdenIdOnChain();
        if (id == null) {
            throw new CompraException(
                    "Esta orden no tiene un id on-chain registrado (orden #" + orden.getId() +
                    "). No se puede operar sobre ella en el contrato.");
        }
        return id;
    }
}
