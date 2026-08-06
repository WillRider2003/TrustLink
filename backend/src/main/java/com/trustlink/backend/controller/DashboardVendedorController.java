package com.trustlink.backend.controller;

import com.trustlink.backend.entity.EstadoOrden;
import com.trustlink.backend.entity.OrdenEscrow;
import com.trustlink.backend.entity.Usuario;
import com.trustlink.backend.repository.OrdenEscrowRepository;
import com.trustlink.backend.security.UsuarioPrincipal;
import com.trustlink.backend.service.ExportacionService;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * Dashboard del vendedor: métricas de sus ventas, gráfico por estado y
 * en el tiempo, y exportación a PDF/Excel/CSV (rango máximo 6 meses,
 * igual que el panel de auditoría del superadmin).
 */
@Controller
@RequestMapping("/marketplace/dashboard")
@RequiredArgsConstructor
public class DashboardVendedorController {

    private static final int MAX_MESES_RANGO = 6;

    private final OrdenEscrowRepository ordenRepository;
    private final ExportacionService exportacionService;

    @GetMapping
    public String dashboard(@RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate desde,
                             @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate hasta,
                             Model model,
                             @AuthenticationPrincipal UsuarioPrincipal principal) {
        if (!principal.getUsuario().isVendedorAprobado()) {
            return "redirect:/vendedor/solicitud";
        }

        LocalDate[] rango = normalizarRango(desde, hasta);
        List<OrdenEscrow> ordenes = ordenRepository.findByVendedorAndCreadoEnBetweenOrderByCreadoEnDesc(
                principal.getUsuario(), rango[0].atStartOfDay(), rango[1].atTime(23, 59, 59));

        BigDecimal totalVendido = ordenes.stream()
                .filter(o -> o.getEstado() == EstadoOrden.LIBERADO)
                .map(OrdenEscrow::getMontoSoles)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        Map<String, Long> porEstado = ordenes.stream()
                .collect(Collectors.groupingBy(o -> o.getEstado().name(), Collectors.counting()));

        Map<String, BigDecimal> porDia = ordenes.stream()
                .filter(o -> o.getEstado() == EstadoOrden.LIBERADO)
                .collect(Collectors.groupingBy(
                        o -> o.getCreadoEn().toLocalDate().toString(),
                        Collectors.reducing(BigDecimal.ZERO, OrdenEscrow::getMontoSoles, BigDecimal::add)));

        model.addAttribute("ordenes", ordenes);
        model.addAttribute("totalVendido", totalVendido);
        model.addAttribute("cantidadVentas", ordenes.stream().filter(o -> o.getEstado() == EstadoOrden.LIBERADO).count());
        model.addAttribute("porEstado", porEstado);
        model.addAttribute("porDia", porDia);
        model.addAttribute("desde", rango[0]);
        model.addAttribute("hasta", rango[1]);
        model.addAttribute("maxMeses", MAX_MESES_RANGO);
        return "marketplace/dashboard";
    }

    @GetMapping("/exportar/csv")
    public ResponseEntity<byte[]> exportarCsv(@RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate desde,
                                               @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate hasta,
                                               @AuthenticationPrincipal UsuarioPrincipal principal) {
        LocalDate[] rango = normalizarRango(desde, hasta);
        List<OrdenEscrow> ordenes = obtenerOrdenes(principal.getUsuario(), rango);
        byte[] contenido = exportacionService.ventasACsv(ordenes);
        return archivoAdjunto(contenido, "trustlink_ventas_" + rango[0] + "_a_" + rango[1] + ".csv", "text/csv");
    }

    @GetMapping("/exportar/excel")
    public ResponseEntity<byte[]> exportarExcel(@RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate desde,
                                                 @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate hasta,
                                                 @AuthenticationPrincipal UsuarioPrincipal principal) {
        LocalDate[] rango = normalizarRango(desde, hasta);
        List<OrdenEscrow> ordenes = obtenerOrdenes(principal.getUsuario(), rango);
        byte[] contenido = exportacionService.ventasAExcel(ordenes);
        return archivoAdjunto(contenido, "trustlink_ventas_" + rango[0] + "_a_" + rango[1] + ".xlsx",
                "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    }

    @GetMapping("/exportar/pdf")
    public ResponseEntity<byte[]> exportarPdf(@RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate desde,
                                               @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate hasta,
                                               @AuthenticationPrincipal UsuarioPrincipal principal) {
        LocalDate[] rango = normalizarRango(desde, hasta);
        List<OrdenEscrow> ordenes = obtenerOrdenes(principal.getUsuario(), rango);
        String rangoTexto = rango[0] + " a " + rango[1];
        byte[] contenido = exportacionService.ventasAPdf(ordenes, principal.getUsuario().getNombreCompleto(), rangoTexto);
        return archivoAdjunto(contenido, "trustlink_ventas_" + rango[0] + "_a_" + rango[1] + ".pdf", "application/pdf");
    }

    private List<OrdenEscrow> obtenerOrdenes(Usuario vendedor, LocalDate[] rango) {
        return ordenRepository.findByVendedorAndCreadoEnBetweenOrderByCreadoEnDesc(
                vendedor, rango[0].atStartOfDay(), rango[1].atTime(23, 59, 59));
    }

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
