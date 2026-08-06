package com.trustlink.backend.service;

import com.trustlink.backend.entity.EstadoOrden;
import com.trustlink.backend.entity.OrdenEscrow;
import com.trustlink.backend.entity.TipoAccionAuditoria;
import com.trustlink.backend.entity.Usuario;
import com.trustlink.backend.repository.OrdenEscrowRepository;
import com.trustlink.backend.repository.ProductoRepository;
import com.trustlink.backend.repository.UsuarioRepository;
import com.trustlink.backend.web3.EscrowWeb3Service;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigInteger;
import java.util.List;

@Service
@RequiredArgsConstructor
public class AdminService {

    private final UsuarioRepository usuarioRepository;
    private final OrdenEscrowRepository ordenRepository;
    private final ProductoRepository productoRepository;
    private final EscrowWeb3Service escrowWeb3Service;
    private final AuditoriaService auditoriaService;

    public record Metricas(
            long totalUsuarios,
            long totalProductos,
            long ordenesEnCustodia,
            long ordenesLiberadas,
            long ordenesEnDisputa,
            long usuariosBaneados
    ) {}

    public Metricas obtenerMetricas() {
        List<Usuario> usuarios = usuarioRepository.findAll();
        List<OrdenEscrow> ordenes = ordenRepository.findAll();

        return new Metricas(
                usuarios.size(),
                productoRepository.count(),
                ordenes.stream().filter(o -> o.getEstado() == EstadoOrden.EN_CUSTODIA).count(),
                ordenes.stream().filter(o -> o.getEstado() == EstadoOrden.LIBERADO).count(),
                ordenes.stream().filter(o -> o.getEstado() == EstadoOrden.EN_DISPUTA).count(),
                usuarios.stream().filter(Usuario::isBaneado).count()
        );
    }

    public List<Usuario> listarUsuarios() {
        return usuarioRepository.findAll();
    }

    public List<Usuario> buscarUsuarios(String query) {
        return usuarioRepository.buscar(query);
    }

    public List<OrdenEscrow> listarDisputas() {
        return ordenRepository.findAllByOrderByCreadoEnDesc().stream()
                .filter(o -> o.getEstado() == EstadoOrden.EN_DISPUTA)
                .toList();
    }

    @Transactional
    public void banear(Usuario admin, Long usuarioId, String motivo) {
        Usuario usuario = usuarioRepository.findById(usuarioId)
                .orElseThrow(() -> new IllegalArgumentException("Usuario no encontrado"));
        usuario.setBaneado(true);
        usuario.setMotivoBaneo(motivo);
        usuarioRepository.save(usuario);
        auditoriaService.registrar(admin, TipoAccionAuditoria.USUARIO_BANEADO, "Usuario", usuario.getId(),
                admin.getEmail() + " baneó a " + usuario.getEmail() + " (motivo: " + motivo + ")");
    }

    @Transactional
    public void desbanear(Usuario admin, Long usuarioId) {
        Usuario usuario = usuarioRepository.findById(usuarioId)
                .orElseThrow(() -> new IllegalArgumentException("Usuario no encontrado"));
        usuario.setBaneado(false);
        usuario.setMotivoBaneo(null);
        usuarioRepository.save(usuario);
        auditoriaService.registrar(admin, TipoAccionAuditoria.USUARIO_DESBANEADO, "Usuario", usuario.getId(),
                admin.getEmail() + " desbaneó a " + usuario.getEmail());
    }

    /**
     * Resuelve una disputa on-chain (llama al owner del contrato Escrow,
     * que es la wallet del backend — ver EscrowWeb3Service). El
     * superadmin decide manualmente a favor de quién, tal como describe
     * la sección de riesgos del pitch.
     */
    @Transactional
    public void resolverDisputa(Usuario admin, Long ordenLocalId, boolean liberarAlVendedor) {
        OrdenEscrow orden = ordenRepository.findById(ordenLocalId)
                .orElseThrow(() -> new IllegalArgumentException("Orden no encontrada"));

        try {
            BigInteger ordenIdOnChain = BigInteger.valueOf(
                    requireOrdenIdOnChain(orden));
            escrowWeb3Service.resolverDisputa(ordenIdOnChain, liberarAlVendedor);
        } catch (Exception e) {
            throw new RuntimeException("No se pudo resolver la disputa on-chain", e);
        }

        orden.setEstado(liberarAlVendedor ? EstadoOrden.LIBERADO : EstadoOrden.REEMBOLSADO);
        ordenRepository.save(orden);
        auditoriaService.registrar(admin, TipoAccionAuditoria.ORDEN_DISPUTA_RESUELTA, "OrdenEscrow", orden.getId(),
                admin.getEmail() + " resolvió la disputa de la orden #" + orden.getId()
                        + " a favor de " + (liberarAlVendedor ? "el vendedor" : "el comprador"));
    }

    private long requireOrdenIdOnChain(OrdenEscrow orden) {
        Long id = orden.getOrdenIdOnChain();
        if (id == null) {
            throw new IllegalStateException(
                    "Esta orden no tiene un id on-chain registrado (orden #" + orden.getId() + ")");
        }
        return id;
    }
}
