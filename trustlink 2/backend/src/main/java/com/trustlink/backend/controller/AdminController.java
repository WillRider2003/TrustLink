package com.trustlink.backend.controller;

import com.trustlink.backend.service.AdminService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.*;

@Controller
@RequestMapping("/admin")
@RequiredArgsConstructor
public class AdminController {

    private final AdminService adminService;

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
    public String banear(@PathVariable Long id, @RequestParam(required = false) String motivo) {
        adminService.banear(id, motivo != null ? motivo : "Sin motivo especificado");
        return "redirect:/admin/usuarios";
    }

    @PostMapping("/usuarios/{id}/desbanear")
    public String desbanear(@PathVariable Long id) {
        adminService.desbanear(id);
        return "redirect:/admin/usuarios";
    }

    @GetMapping("/disputas")
    public String disputas(Model model) {
        model.addAttribute("disputas", adminService.listarDisputas());
        return "admin/disputas";
    }

    @PostMapping("/disputas/{id}/resolver")
    public String resolverDisputa(@PathVariable Long id, @RequestParam boolean liberarAlVendedor, Model model) {
        try {
            adminService.resolverDisputa(id, liberarAlVendedor);
        } catch (Exception e) {
            model.addAttribute("errorGeneral", "No se pudo resolver la disputa: " + e.getMessage());
        }
        return "redirect:/admin/disputas";
    }
}
