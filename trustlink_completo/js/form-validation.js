/**
 * VALIDACIÓN DE FORMULARIOS EN VIVO
 * -----------------------------------------------------------------
 * En vez de mostrar un alert() o un mensaje de error después de
 * enviar el formulario, cada campo se valida mientras el usuario
 * escribe: el borde del input se pone verde (correcto) o rojo
 * (incorrecto), y opcionalmente aparece un mensaje corto debajo.
 *
 * Requiere que exista en el CSS:
 *   .field-input-wrap.valid input   -> borde verde
 *   .field-input-wrap.invalid input -> borde rojo
 *   .field-hint-msg.show            -> mensaje visible
 */

/**
 * Aplica el estado visual (válido/inválido/neutral) a un input.
 * @param {HTMLInputElement} input
 * @param {boolean|null} isValid - true=válido, false=inválido, null=neutral (campo vacío, sin marcar todavía)
 */
function tlSetFieldState(input, isValid) {
  const wrap = input.closest('.field-input-wrap') || input.parentElement;
  wrap.classList.remove('valid', 'invalid');
  if (isValid === true) wrap.classList.add('valid');
  else if (isValid === false) wrap.classList.add('invalid');
}

/**
 * Conecta un input a una función validadora, actualizando el borde
 * y un mensaje de ayuda mientras el usuario escribe (con un pequeño
 * debounce para no marcar en rojo en cada tecla mientras aún escribe).
 */
function tlLiveValidate(inputId, validatorFn, msgId, mensajeError) {
  const input = document.getElementById(inputId);
  const msgEl = msgId ? document.getElementById(msgId) : null;
  if (!input) return;

  let timer = null;

  function evaluar() {
    const v = input.value;
    if (v.trim() === '') {
      tlSetFieldState(input, null);
      if (msgEl) { msgEl.textContent = ''; msgEl.classList.remove('show'); }
      return;
    }
    const ok = validatorFn(v);
    tlSetFieldState(input, ok);
    if (msgEl) {
      msgEl.textContent = ok ? '' : mensajeError;
      msgEl.classList.toggle('show', !ok);
    }
  }

  input.addEventListener('input', () => {
    clearTimeout(timer);
    timer = setTimeout(evaluar, 250);
  });
  input.addEventListener('blur', evaluar);
}

/**
 * Revisa las 3 reglas de contraseña pedidas: 8+ caracteres, 1 número,
 * 1 mayúscula. Devuelve un objeto con cada regla evaluada por
 * separado, para poder marcar cada ítem del checklist visual.
 */
function tlCheckPasswordRules(password) {
  return {
    length: password.length >= 8,
    number: /\d/.test(password),
    upper: /[A-ZÁÉÍÓÚÑ]/.test(password),
  };
}

/** Marca un <li> del checklist de contraseña como cumplido o no. */
function tlSetRequirement(liId, ok) {
  const li = document.getElementById(liId);
  if (!li) return;
  li.dataset.ok = ok ? 'true' : 'false';
}

/**
 * Validador específico de DNI peruano: exactamente 8 dígitos
 * numéricos, nada más (sin letras, sin guiones, sin espacios).
 */
function tlValidarDNI(valor) {
  return /^\d{8}$/.test(valor.trim());
}
