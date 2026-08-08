package com.trustlink.backend.service;

import com.trustlink.backend.entity.ReputacionVendedor;
import com.trustlink.backend.entity.Usuario;
import com.trustlink.backend.repository.ReputacionVendedorRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

/**
 * Calcula el score de reputacion 0-100 con una formula simple y
 * transparente, tal como se recomendo en TrustLink_MVP_Recomendado.pdf:
 * "pondera volumen de ventas + numero de compradores distintos" — nada
 * de Machine Learning, para que sea explicable al jurado en 30 segundos
 * y facil de auditar por el propio vendedor.
 * <p>
 * Formula: 60% peso al volumen de ventas (saturado en 20 ventas = tope),
 * 40% peso a la diversidad de compradores (saturado en 10 compradores
 * distintos = tope). Esto castiga a un vendedor que solo le vende
 * siempre al mismo comprador (posible anillo de fraude simple).
 */
@Service
@RequiredArgsConstructor
public class ScoringService {

    private static final int TOPE_VENTAS = 20;
    private static final int TOPE_COMPRADORES = 10;
    private static final double PESO_VOLUMEN = 0.6;
    private static final double PESO_DIVERSIDAD = 0.4;

    private final ReputacionVendedorRepository reputacionRepository;

    public int calcularScore(int ventasExitosas, int compradoresDistintos) {
        double componenteVolumen = Math.min(1.0, ventasExitosas / (double) TOPE_VENTAS);
        double componenteDiversidad = Math.min(1.0, compradoresDistintos / (double) TOPE_COMPRADORES);

        double score = (componenteVolumen * PESO_VOLUMEN + componenteDiversidad * PESO_DIVERSIDAD) * 100;
        return (int) Math.round(score);
    }

    /**
     * Recalcula y persiste el score de un vendedor a partir de su cache
     * local de reputacion (ventasExitosas y compradoresDistintos, que se
     * actualizan cuando se confirma una entrega — ver EscrowOrquestadorService).
     */
    public ReputacionVendedor recalcularYGuardar(Usuario vendedor) {
        ReputacionVendedor rep = reputacionRepository.findByUsuario(vendedor)
                .orElseGet(() -> ReputacionVendedor.builder().usuario(vendedor).build());

        int nuevoScore = calcularScore(rep.getVentasExitosas(), rep.getCompradoresDistintos());
        rep.setScoreActual(nuevoScore);
        return reputacionRepository.save(rep);
    }

    /**
     * Techo de credito sugerido segun el score, tal como se explico en el
     * pitch: microcreditos progresivos (S/50 -> S/100 -> ...).
     */
    public java.math.BigDecimal techoDeCredito(int score) {
        if (score < 20) return java.math.BigDecimal.ZERO;
        if (score < 40) return new java.math.BigDecimal("50");
        if (score < 60) return new java.math.BigDecimal("100");
        if (score < 80) return new java.math.BigDecimal("200");
        return new java.math.BigDecimal("350");
    }
}
