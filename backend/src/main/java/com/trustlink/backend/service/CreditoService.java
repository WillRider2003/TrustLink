package com.trustlink.backend.service;

import com.trustlink.backend.entity.ReputacionVendedor;
import com.trustlink.backend.entity.SolicitudCredito;
import com.trustlink.backend.entity.Usuario;
import com.trustlink.backend.repository.ReputacionVendedorRepository;
import com.trustlink.backend.repository.SolicitudCreditoRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;

/**
 * Panel de crédito. Según el alcance recomendado, el techo se calcula
 * con la fórmula simple de ScoringService y no hay desembolso real
 * on-chain — se registra la solicitud igual, con estado
 * APROBADO_AUTOMATICO o RECHAZADO_EXCEDE_TECHO, como mockup auditable.
 */
@Service
@RequiredArgsConstructor
public class CreditoService {

    private final ReputacionVendedorRepository reputacionRepository;
    private final SolicitudCreditoRepository solicitudRepository;
    private final ScoringService scoringService;

    public BigDecimal techoActual(Usuario usuario) {
        int score = reputacionRepository.findByUsuario(usuario)
                .map(ReputacionVendedor::getScoreActual)
                .orElse(0);
        return scoringService.techoDeCredito(score);
    }

    public List<SolicitudCredito> historial(Usuario usuario) {
        return solicitudRepository.findByUsuarioOrderByCreadoEnDesc(usuario);
    }

    @Transactional
    public SolicitudCredito solicitar(Usuario usuario, BigDecimal monto) {
        int score = reputacionRepository.findByUsuario(usuario)
                .map(ReputacionVendedor::getScoreActual)
                .orElse(0);
        BigDecimal techo = scoringService.techoDeCredito(score);

        SolicitudCredito.EstadoCredito estado = monto.compareTo(techo) <= 0
                ? SolicitudCredito.EstadoCredito.APROBADO_AUTOMATICO
                : SolicitudCredito.EstadoCredito.RECHAZADO_EXCEDE_TECHO;

        SolicitudCredito solicitud = SolicitudCredito.builder()
                .usuario(usuario)
                .montoSolicitado(monto)
                .techoDisponibleAlMomento(techo)
                .scoreAlMomento(score)
                .estado(estado)
                .build();

        return solicitudRepository.save(solicitud);
    }
}
