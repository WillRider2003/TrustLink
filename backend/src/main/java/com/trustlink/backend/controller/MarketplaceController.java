package com.trustlink.backend.controller;

import com.trustlink.backend.entity.OrdenEscrow;
import com.trustlink.backend.entity.Usuario;
import com.trustlink.backend.security.UsuarioPrincipal;
import com.trustlink.backend.service.EscrowOrquestadorService;
import com.trustlink.backend.service.ProductoService;
import com.trustlink.backend.service.ResenaService;
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
    private final ResenaService resenaService;

    @GetMapping
    public String listado(Model model, @AuthenticationPrincipal UsuarioPrincipal principal) {
        model.addAttribute("productos", productoService.listarActivos());
        model.addAttribute("usuarioActual", principal.getUsuario());
        return "marketplace/listado";
    }

    @GetMapping("/publicar")
    public String mostrarPublicar(@AuthenticationPrincipal UsuarioPrincipal principal) {
        if (!principal.getUsuario().isVendedorAprobado()) {
            return "redirect:/vendedor/solicitud";
        }
        return "marketplace/publicar";
    }

    @PostMapping("/publicar")
    public String publicar(@RequestParam String nombre,
                            @RequestParam(required = false) String descripcion,
                            @RequestParam BigDecimal precioSoles,
                            @RequestParam(required = false) MultipartFile foto,
                            @AuthenticationPrincipal UsuarioPrincipal principal,
                            Model model) {
        if (!principal.getUsuario().isVendedorAprobado()) {
            return "redirect:/vendedor/solicitud";
        }
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
        var producto = productoService.obtener(id);
        model.addAttribute("producto", producto);
        model.addAttribute("usuarioActual", principal.getUsuario());
        model.addAttribute("resenas", resenaService.deProducto(producto));
        model.addAttribute("promedio", resenaService.promedioDeProducto(producto));
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
            var producto = productoService.obtener(productoId);
            model.addAttribute("producto", producto);
            model.addAttribute("resenas", resenaService.deProducto(producto));
            model.addAttribute("promedio", resenaService.promedioDeProducto(producto));
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
                            Model model,
                            @AuthenticationPrincipal UsuarioPrincipal principal) {
        OrdenEscrow orden = escrowOrquestadorService.obtenerOrden(id);
        model.addAttribute("orden", orden);
        model.addAttribute("creada", creada != null && creada);
        model.addAttribute("confirmada", confirmada != null && confirmada);
        model.addAttribute("usuarioActual", principal.getUsuario());
        model.addAttribute("puedeResenar", resenaService.puedeResenar(principal.getUsuario(), orden));
        return "marketplace/orden-detalle";
    }

    @PostMapping("/orden/{id}/resena")
    public String crearResena(@PathVariable Long id,
                               @RequestParam int calificacion,
                               @RequestParam(required = false) String comentario,
                               @AuthenticationPrincipal UsuarioPrincipal principal,
                               Model model) {
        try {
            resenaService.crear(principal.getUsuario(), id, calificacion, comentario);
        } catch (ResenaService.ResenaException e) {
            model.addAttribute("errorGeneral", e.getMessage());
        }
        return "redirect:/marketplace/orden/" + id;
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
            OrdenEscrow orden = escrowOrquestadorService.obtenerOrden(id);
            model.addAttribute("orden", orden);
            model.addAttribute("creada", false);
            model.addAttribute("confirmada", false);
            model.addAttribute("usuarioActual", principal.getUsuario());
            model.addAttribute("puedeResenar", resenaService.puedeResenar(principal.getUsuario(), orden));
            return "marketplace/orden-detalle";
        }
    }

    @PostMapping("/orden/{id}/disputa")
    public String reportarDisputa(@PathVariable Long id, @AuthenticationPrincipal UsuarioPrincipal principal) {
        escrowOrquestadorService.reportarDisputa(principal.getUsuario(), id);
        return "redirect:/marketplace/orden/" + id;
    }

    @PostMapping("/orden/{id}/marcar-enviado")
    public String marcarEnviado(@PathVariable Long id,
                                 @RequestParam(required = false) MultipartFile foto,
                                 @AuthenticationPrincipal UsuarioPrincipal principal,
                                 Model model) {
        try {
            escrowOrquestadorService.marcarComoEnviado(principal.getUsuario(), id, foto);
        } catch (EscrowOrquestadorService.CompraException e) {
            model.addAttribute("errorGeneral", e.getMessage());
        }
        return "redirect:/marketplace/orden/" + id;
    }
}
