package com.trustlink.backend.controller;

import com.trustlink.backend.security.UsuarioPrincipal;
import com.trustlink.backend.service.SolicitudVendedorService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.*;

@Controller
@RequestMapping("/vendedor")
@RequiredArgsConstructor
public class VendedorController {

    private final SolicitudVendedorService solicitudVendedorService;

    @GetMapping("/solicitud")
    public String verFormulario(Model model, @AuthenticationPrincipal UsuarioPrincipal principal) {
        model.addAttribute("usuarioActual", principal.getUsuario());
        model.addAttribute("historial", solicitudVendedorService.historial(principal.getUsuario()));
        return "vendedor/solicitud";
    }

    @PostMapping("/solicitud")
    public String enviarSolicitud(@RequestParam String nombreNegocio,
                                   @RequestParam String tipoProductos,
                                   @RequestParam(required = false) String descripcion,
                                   @RequestParam(required = false) String informacionAdicional,
                                   @AuthenticationPrincipal UsuarioPrincipal principal,
                                   Model model) {
        try {
            solicitudVendedorService.solicitar(principal.getUsuario(), nombreNegocio, tipoProductos,
                    descripcion, informacionAdicional);
        } catch (SolicitudVendedorService.SolicitudException e) {
            model.addAttribute("errorGeneral", e.getMessage());
        }
        model.addAttribute("usuarioActual", principal.getUsuario());
        model.addAttribute("historial", solicitudVendedorService.historial(principal.getUsuario()));
        return "vendedor/solicitud";
    }
}
