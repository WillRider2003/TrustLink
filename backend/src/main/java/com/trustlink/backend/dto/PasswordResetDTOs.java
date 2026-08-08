package com.trustlink.backend.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

public class PasswordResetDTOs {

    @Data
    public static class SolicitarDTO {
        @NotBlank
        @Email
        private String email;
    }

    @Data
    public static class ConfirmarDTO {
        @NotBlank
        private String token;

        @NotBlank
        @Size(min = 8, message = "La contraseña debe tener al menos 8 caracteres")
        private String nuevaContrasena;

        @NotBlank
        private String confirmarContrasena;
    }
}
