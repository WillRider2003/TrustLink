package com.trustlink.backend.controller;

import com.trustlink.backend.security.UsuarioPrincipal;
import com.trustlink.backend.service.AdminService;
import com.trustlink.backend.service.SolicitudVendedorService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.*;

@Controller
@RequestMapping("/admin")
@RequiredArgsConstructor
public class AdminController {

    private final AdminService adminService;
    private final SolicitudVendedorService solicitudVendedorService;

    @GetMapping
    public String dashboard(Model model) {
        model.addAttribute("metricas", adminService.obtenerMetricas());
        return "admin/dashboard";
    }

    @GetMapping("/usuarios")
    public String usuarios(@RequestParam(required = false) String q, Model model) {
        model.addAttribute("usuarios", (q != null && !q.isBlank())
                ? adminService.buscarUsuarios(q)
                : adminService.listarUsuarios());
        model.addAttribute("query", q);
        return "admin/usuarios";
    }

    @PostMapping("/usuarios/{id}/banear")
    public String banear(@PathVariable Long id, @RequestParam(required = false) String motivo,
                          @AuthenticationPrincipal UsuarioPrincipal principal) {
        adminService.banear(principal.getUsuario(), id, motivo != null ? motivo : "Sin motivo especificado");
        return "redirect:/admin/usuarios";
    }

    @PostMapping("/usuarios/{id}/desbanear")
    public String desbanear(@PathVariable Long id, @AuthenticationPrincipal UsuarioPrincipal principal) {
        adminService.desbanear(principal.getUsuario(), id);
        return "redirect:/admin/usuarios";
    }

    @GetMapping("/disputas")
    public String disputas(Model model) {
        model.addAttribute("disputas", adminService.listarDisputas());
        return "admin/disputas";
    }

    @PostMapping("/disputas/{id}/resolver")
    public String resolverDisputa(@PathVariable Long id, @RequestParam boolean liberarAlVendedor, Model model,
                                   @AuthenticationPrincipal UsuarioPrincipal principal) {
        try {
            adminService.resolverDisputa(principal.getUsuario(), id, liberarAlVendedor);
        } catch (Exception e) {
            model.addAttribute("errorGeneral", "No se pudo resolver la disputa: " + e.getMessage());
        }
        return "redirect:/admin/disputas";
    }

    @GetMapping("/solicitudes-vendedor")
    public String solicitudesVendedor(Model model) {
        model.addAttribute("solicitudes", solicitudVendedorService.todas());
        return "admin/solicitudes-vendedor";
    }

    @PostMapping("/solicitudes-vendedor/{id}/aprobar")
    public String aprobarSolicitudVendedor(@PathVariable Long id,
                                            @AuthenticationPrincipal UsuarioPrincipal principal,
                                            Model model) {
        try {
            solicitudVendedorService.aprobar(principal.getUsuario(), id);
        } catch (Exception e) {
            model.addAttribute("errorGeneral", "No se pudo aprobar la solicitud: " + e.getMessage());
        }
        return "redirect:/admin/solicitudes-vendedor";
    }

    @PostMapping("/solicitudes-vendedor/{id}/rechazar")
    public String rechazarSolicitudVendedor(@PathVariable Long id,
                                             @RequestParam(required = false) String motivo,
                                             @AuthenticationPrincipal UsuarioPrincipal principal,
                                             Model model) {
        try {
            solicitudVendedorService.rechazar(principal.getUsuario(), id,
                    motivo != null && !motivo.isBlank() ? motivo : "Sin motivo especificado");
        } catch (Exception e) {
            model.addAttribute("errorGeneral", "No se pudo rechazar la solicitud: " + e.getMessage());
        }
        return "redirect:/admin/solicitudes-vendedor";
    }
}
