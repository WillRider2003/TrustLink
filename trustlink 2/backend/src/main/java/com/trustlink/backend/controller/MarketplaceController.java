package com.trustlink.backend.controller;

import com.trustlink.backend.entity.OrdenEscrow;
import com.trustlink.backend.entity.Usuario;
import com.trustlink.backend.security.UsuarioPrincipal;
import com.trustlink.backend.service.EscrowOrquestadorService;
import com.trustlink.backend.service.ProductoService;
import jakarta.validation.constraints.NotBlank;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.math.BigDecimal;
import java.util.List;

@Controller
@RequestMapping("/marketplace")
@RequiredArgsConstructor
public class MarketplaceController {

    private final ProductoService productoService;
    private final EscrowOrquestadorService escrowOrquestadorService;

    @GetMapping
    public String listado(Model model, @AuthenticationPrincipal UsuarioPrincipal principal) {
        model.addAttribute("productos", productoService.listarActivos());
        model.addAttribute("usuarioActual", principal.getUsuario());
        return "marketplace/listado";
    }

    @GetMapping("/publicar")
    public String mostrarPublicar() {
        return "marketplace/publicar";
    }

    @PostMapping("/publicar")
    public String publicar(@RequestParam String nombre,
                            @RequestParam(required = false) String descripcion,
                            @RequestParam BigDecimal precioSoles,
                            @RequestParam(required = false) MultipartFile foto,
                            @AuthenticationPrincipal UsuarioPrincipal principal,
                            Model model) {
        try {
            productoService.publicar(principal.getUsuario(), nombre, descripcion, precioSoles, foto);
            return "redirect:/marketplace";
        } catch (Exception e) {
            model.addAttribute("errorGeneral", "No se pudo publicar el producto: " + e.getMessage());
            return "marketplace/publicar";
        }
    }

    @GetMapping("/producto/{id}")
    public String detalle(@PathVariable Long id, Model model, @AuthenticationPrincipal UsuarioPrincipal principal) {
        model.addAttribute("producto", productoService.obtener(id));
        model.addAttribute("usuarioActual", principal.getUsuario());
        return "marketplace/detalle";
    }

    @PostMapping("/comprar/{productoId}")
    public String comprar(@PathVariable Long productoId,
                           @AuthenticationPrincipal UsuarioPrincipal principal,
                           Model model) {
        try {
            OrdenEscrow orden = escrowOrquestadorService.crearOrdenDeCompra(principal.getUsuario(), productoId);
            return "redirect:/marketplace/orden/" + orden.getId() + "?creada=true";
        } catch (EscrowOrquestadorService.CompraException e) {
            model.addAttribute("errorGeneral", e.getMessage());
            model.addAttribute("producto", productoService.obtener(productoId));
            return "marketplace/detalle";
        }
    }

    @GetMapping("/mis-compras")
    public String misCompras(Model model, @AuthenticationPrincipal UsuarioPrincipal principal) {
        model.addAttribute("ordenes", escrowOrquestadorService.misCompras(principal.getUsuario()));
        return "marketplace/mis-compras";
    }

    @GetMapping("/mis-ventas")
    public String misVentas(Model model, @AuthenticationPrincipal UsuarioPrincipal principal) {
        model.addAttribute("ordenes", escrowOrquestadorService.misVentas(principal.getUsuario()));
        return "marketplace/mis-ventas";
    }

    @GetMapping("/orden/{id}")
    public String verOrden(@PathVariable Long id,
                            @RequestParam(required = false) Boolean creada,
                            @RequestParam(required = false) Boolean confirmada,
                            Model model) {
        model.addAttribute("orden", escrowOrquestadorService.obtenerOrden(id));
        model.addAttribute("creada", creada != null && creada);
        model.addAttribute("confirmada", confirmada != null && confirmada);
        return "marketplace/orden-detalle";
    }

    @PostMapping("/orden/{id}/confirmar")
    public String confirmarEntrega(@PathVariable Long id,
                                    @RequestParam @NotBlank String codigo,
                                    @AuthenticationPrincipal UsuarioPrincipal principal,
                                    Model model) {
        try {
            escrowOrquestadorService.confirmarEntrega(principal.getUsuario(), id, codigo);
            return "redirect:/marketplace/orden/" + id + "?confirmada=true";
        } catch (EscrowOrquestadorService.CompraException e) {
            model.addAttribute("errorGeneral", e.getMessage());
            model.addAttribute("orden", escrowOrquestadorService.obtenerOrden(id));
            model.addAttribute("creada", false);
            model.addAttribute("confirmada", false);
            return "marketplace/orden-detalle";
        }
    }

    @PostMapping("/orden/{id}/disputa")
    public String reportarDisputa(@PathVariable Long id, @AuthenticationPrincipal UsuarioPrincipal principal) {
        escrowOrquestadorService.reportarDisputa(principal.getUsuario(), id);
        return "redirect:/marketplace/orden/" + id;
    }
}
