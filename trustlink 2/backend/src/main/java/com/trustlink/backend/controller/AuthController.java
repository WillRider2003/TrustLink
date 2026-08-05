package com.trustlink.backend.controller;

import com.trustlink.backend.dto.PasswordResetDTOs;
import com.trustlink.backend.dto.RegistroDTO;
import com.trustlink.backend.security.RateLimiter;
import com.trustlink.backend.service.AuthService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.validation.BindingResult;
import org.springframework.web.bind.annotation.*;

@Controller
@RequestMapping("/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;
    private final RateLimiter rateLimiter;

    @GetMapping("/login")
    public String login() {
        return "auth/login";
    }

    @GetMapping("/registro")
    public String mostrarRegistro(Model model) {
        model.addAttribute("registroDTO", new RegistroDTO());
        return "auth/registro";
    }

    @PostMapping("/registro")
    public String registrar(@Valid @ModelAttribute RegistroDTO registroDTO,
                             BindingResult result,
                             Model model) {
        if (result.hasErrors()) {
            return "auth/registro";
        }

        try {
            authService.registrar(registroDTO);
            model.addAttribute("registroExitoso", true);
            return "auth/login";
        } catch (AuthService.EmailYaRegistradoException e) {
            model.addAttribute("errorGeneral", e.getMessage());
            return "auth/registro";
        } catch (AuthService.ContrasenasNoCoincidenException e) {
            model.addAttribute("errorGeneral", e.getMessage());
            return "auth/registro";
        }
    }

    @GetMapping("/recuperar")
    public String mostrarSolicitarRecuperacion(Model model) {
        model.addAttribute("solicitarDTO", new PasswordResetDTOs.SolicitarDTO());
        return "auth/recuperar-solicitar";
    }

    @PostMapping("/recuperar")
    public String solicitarRecuperacion(@Valid @ModelAttribute("solicitarDTO") PasswordResetDTOs.SolicitarDTO dto,
                                         BindingResult result,
                                         Model model) {
        if (result.hasErrors()) {
            return "auth/recuperar-solicitar";
        }

        if (!rateLimiter.permitirSolicitudReset(dto.getEmail())) {
            model.addAttribute("errorGeneral", "Demasiados intentos. Espera un momento antes de volver a intentar.");
            return "auth/recuperar-solicitar";
        }
        rateLimiter.registrarSolicitudReset(dto.getEmail());

        var tokenOpt = authService.solicitarRecuperacion(dto.getEmail());

        // Siempre mostramos el mismo mensaje exista o no la cuenta, para
        // no revelar si el correo está registrado.
        model.addAttribute("solicitudEnviada", true);

        // En modo demo (sin SMTP configurado), mostramos el enlace
        // directamente en pantalla para que el flujo se pueda probar
        // sin depender de un correo real llegando.
        tokenOpt.ifPresent(token -> model.addAttribute("tokenDemo", token));

        return "auth/recuperar-solicitar";
    }

    @GetMapping("/recuperar/confirmar")
    public String mostrarConfirmarRecuperacion(@RequestParam String token, Model model) {
        PasswordResetDTOs.ConfirmarDTO dto = new PasswordResetDTOs.ConfirmarDTO();
        dto.setToken(token);
        model.addAttribute("confirmarDTO", dto);
        return "auth/recuperar-confirmar";
    }

    @PostMapping("/recuperar/confirmar")
    public String confirmarRecuperacion(@Valid @ModelAttribute("confirmarDTO") PasswordResetDTOs.ConfirmarDTO dto,
                                         BindingResult result,
                                         Model model) {
        if (result.hasErrors()) {
            return "auth/recuperar-confirmar";
        }

        try {
            authService.confirmarRecuperacion(dto.getToken(), dto.getNuevaContrasena(), dto.getConfirmarContrasena());
            model.addAttribute("cambioExitoso", true);
            return "auth/login";
        } catch (AuthService.TokenInvalidoException | AuthService.ContrasenasNoCoincidenException e) {
            model.addAttribute("errorGeneral", e.getMessage());
            return "auth/recuperar-confirmar";
        }
    }
}
