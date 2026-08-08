package com.trustlink.backend.controller;

import com.trustlink.backend.entity.LogAuditoria;
import com.trustlink.backend.repository.LogAuditoriaRepository;
import com.trustlink.backend.service.ExportacionService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.format.annotation.DateTimeFormat;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

/**
 * Panel de logs de auditoría para SUPERADMIN (protegido por
 * SecurityConfig: /admin/** requiere ROLE_SUPERADMIN). Permite filtrar
 * por rango de fechas (máximo 6 meses) y exportar a CSV o Excel.
 */
@Controller
@RequestMapping("/admin/auditoria")
@RequiredArgsConstructor
public class AuditoriaController {

    private static final int MAX_MESES_RANGO = 6;

    private final LogAuditoriaRepository logRepository;
    private final ExportacionService exportacionService;

    @GetMapping
    public String listado(@RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate desde,
                           @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate hasta,
                           Model model) {
        LocalDate[] rango = normalizarRango(desde, hasta);
        List<LogAuditoria> logs = logRepository.findByCreadoEnBetweenOrderByCreadoEnDesc(
                rango[0].atStartOfDay(), rango[1].atTime(23, 59, 59));

        model.addAttribute("logs", logs);
        model.addAttribute("desde", rango[0]);
        model.addAttribute("hasta", rango[1]);
        model.addAttribute("maxMeses", MAX_MESES_RANGO);
        return "admin/auditoria";
    }

    @GetMapping("/exportar/csv")
    public ResponseEntity<byte[]> exportarCsv(@RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate desde,
                                               @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate hasta) {
        LocalDate[] rango = normalizarRango(desde, hasta);
        List<LogAuditoria> logs = logRepository.findByCreadoEnBetweenOrderByCreadoEnDesc(
                rango[0].atStartOfDay(), rango[1].atTime(23, 59, 59));

        byte[] contenido = exportacionService.logsACsv(logs);
        return archivoAdjunto(contenido, "trustlink_auditoria_" + rango[0] + "_a_" + rango[1] + ".csv", "text/csv");
    }

    @GetMapping("/exportar/excel")
    public ResponseEntity<byte[]> exportarExcel(@RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate desde,
                                                 @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate hasta) {
        LocalDate[] rango = normalizarRango(desde, hasta);
        List<LogAuditoria> logs = logRepository.findByCreadoEnBetweenOrderByCreadoEnDesc(
                rango[0].atStartOfDay(), rango[1].atTime(23, 59, 59));

        byte[] contenido = exportacionService.logsAExcel(logs);
        return archivoAdjunto(contenido, "trustlink_auditoria_" + rango[0] + "_a_" + rango[1] + ".xlsx",
                "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    }

    /**
     * Aplica los valores por defecto (últimos 30 días) y recorta el
     * rango a un máximo de 6 meses de ancho, sin importar lo que pida
     * el cliente — el límite se aplica siempre en el servidor.
     */
    private LocalDate[] normalizarRango(LocalDate desde, LocalDate hasta) {
        LocalDate finReal = hasta != null ? hasta : LocalDate.now();
        LocalDate inicioReal = desde != null ? desde : finReal.minusDays(30);

        if (inicioReal.isAfter(finReal)) {
            LocalDate tmp = inicioReal;
            inicioReal = finReal;
            finReal = tmp;
        }

        LocalDate limiteMinimo = finReal.minusMonths(MAX_MESES_RANGO);
        if (inicioReal.isBefore(limiteMinimo)) {
            inicioReal = limiteMinimo;
        }

        return new LocalDate[]{inicioReal, finReal};
    }

    private ResponseEntity<byte[]> archivoAdjunto(byte[] contenido, String nombreArchivo, String contentType) {
        HttpHeaders headers = new HttpHeaders();
        headers.add(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + nombreArchivo + "\"");
        headers.setContentType(MediaType.parseMediaType(contentType));
        return ResponseEntity.ok().headers(headers).body(contenido);
    }
}
