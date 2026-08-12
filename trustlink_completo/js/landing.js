/**
 * Interactividad de la landing informativa. Todo es cosmético
 * (animaciones de conteo, reveal al hacer scroll, pasos interactivos por scroll y clic)
 */

function tlCountUp(el, target, duration = 1400, decimals = 0, prefix = '', suffix = '') {
  const start = performance.now();
  function tick(now) {
    const progress = Math.min((now - start) / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3); // ease-out cubic
    const value = target * eased;
    el.textContent = prefix + value.toFixed(decimals).replace(/\B(?=(\d{3})+(?!\d))/g, ',') + suffix;
    if (progress < 1) requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
}

// Mantenemos la función global por si hacen clic manual en los pasos
window.switchStep = function(stepNumber) {
  document.querySelectorAll('.tl-interactive-step').forEach(step => {
    step.classList.remove('active');
  });
  const activeStep = document.querySelector(`.tl-interactive-step[data-step="${stepNumber}"]`);
  if (activeStep) activeStep.classList.add('active');

  document.querySelectorAll('.tl-step-view').forEach(view => {
    view.classList.remove('active');
  });
  const targetView = document.getElementById(`view-step-${stepNumber}`);
  if (targetView) targetView.classList.add('active');

  const progressLine = document.getElementById('progressLine');
  if (progressLine) {
    if(stepNumber === 1) progressLine.style.height = '0%';
    if(stepNumber === 2) progressLine.style.height = '50%';
    if(stepNumber === 3) progressLine.style.height = '100%';
  }
};

// --- ALGORITMO DE SCROLL ULTRA FLUIDO ESTILO SENTHORA ---
window.addEventListener('scroll', () => {
  const container = document.querySelector('.tl-interactive-container');
  const progressLine = document.getElementById('progressLine');
  const steps = document.querySelectorAll('.tl-interactive-step');
  
  if (!container || !progressLine) return;

  const rect = container.getBoundingClientRect();
  const windowHeight = window.innerHeight;

  // Definimos las zonas exactas donde empieza y termina la interacción en pantalla
  const entryPoint = windowHeight * 0.8; 
  const exitPoint = windowHeight * 0.2; 
  const totalDrivingDistance = entryPoint - exitPoint;

  // Calculamos la posición actual del scroll relativa al contenedor
  let currentPosition = entryPoint - rect.top;
  
  // Convertimos la posición a un porcentaje continuo entre 0 y 1
  let progress = currentPosition / (rect.height + totalDrivingDistance * 0.3);
  progress = Math.max(0, Math.min(1, progress)); 

  // 1. Crecimiento milimétrico directo pegado al recorrido del mouse
  progressLine.style.height = `${progress * 100}%`;

  // 2. Activación orgánica de vistas según el avance real del recorrido
  let currentStep = 1;
  if (progress >= 0.33 && progress < 0.66) {
    currentStep = 2;
  } else if (progress >= 0.66) {
    currentStep = 3;
  }

  // Solo alteramos el DOM si el paso realmente cambió (optimiza rendimiento)
  const currentActiveStep = document.querySelector('.tl-interactive-step.active');
  if (!currentActiveStep || parseInt(currentActiveStep.dataset.step) !== currentStep) {
    
    steps.forEach(s => s.classList.remove('active'));
    const stepToActivate = document.querySelector(`.tl-interactive-step[data-step="${currentStep}"]`);
    if (stepToActivate) stepToActivate.classList.add('active');

    document.querySelectorAll('.tl-step-view').forEach(v => v.classList.remove('active'));
    const viewToActivate = document.getElementById(`view-step-${currentStep}`);
    if (viewToActivate) viewToActivate.classList.add('active');
  }
});

document.addEventListener('DOMContentLoaded', () => {
  // Fuerza el arranque en el paso 1 al cargar la página
  if (document.getElementById('view-step-1')) {
    window.switchStep(1);
  }

  // Contadores animados de la sección de stats
  const statEls = document.querySelectorAll('[data-countup]');
  const statObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const el = entry.target;
        const target = parseFloat(el.dataset.countup);
        const decimals = parseInt(el.dataset.decimals || '0', 10);
        const prefix = el.dataset.prefix || '';
        const suffix = el.dataset.suffix || '';
        tlCountUp(el, target, 1400, decimals, prefix, suffix);
        statObserver.unobserve(el);
      }
    });
  }, { threshold: 0.4 });
  statEls.forEach(el => statObserver.observe(el));

  // Reveal suave de secciones al entrar en viewport
  const revealEls = document.querySelectorAll('.tl-reveal');
  const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.style.opacity = '1';
        entry.target.style.transform = 'translateY(0)';
        revealObserver.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12 });
  revealEls.forEach(el => {
    el.style.opacity = '0';
    el.style.transform = 'translateY(24px)';
    el.style.transition = 'opacity .7s ease, transform .7s ease';
    revealObserver.observe(el);
  });
}); // ¡AQUÍ ESTABA EL ERROR! Se cerró correctamente el DOMContentLoaded

// --- EFECTOS PREMIUM DE PRIMERA VISTA REFINADOS ---
window.addEventListener('scroll', () => {
  const navbar = document.querySelector('.tl-nav');
  const heroGlow = document.getElementById('heroBgGlow');
  const scrollPos = window.scrollY;

  // 1. CONTROL DEL MENÚ SUPERIOR DE CRISTAL (ESTILO SENTHORA)
  if (navbar) {
    if (scrollPos > 20) {
      navbar.classList.add('scrolled'); // Inyecta el fondo de cristal, desenfoque y borde
    } else {
      navbar.classList.remove('scrolled'); // Remueve todo y vuelve a verse integrado/invisible
    }
  }

  // 2. EFECTO DE FONDO INTERACTIVO (ESTILO PROLIBU)
  if (heroGlow && scrollPos < window.innerHeight) {
    const yTranslate = scrollPos * 0.2;
    const hueRotation = (scrollPos * 0.08) % 360;
    heroGlow.style.transform = `translateY(${yTranslate}px) scale(${1 + (scrollPos * 0.0003)})`;
    heroGlow.style.filter = `hue-rotate(${hueRotation}deg) saturate(${100 + (scrollPos * 0.1)}%)`;
  }
});


// --- CALCULADORA DINÁMICA DEL GOTA A GOTA ---
window.runUsuryEngine = function() {
  const input = document.getElementById('borrowAmount');
  const display = document.getElementById('usuryTotal');
  if (!input || !display) return;

  let value = parseFloat(input.value);
  if (isNaN(value) || value <= 0) {
    display.textContent = "S/ 0.00";
    return;
  }

  // Tasa promedio de retorno de cobro diario mafioso (30% sobre el capital prestado)
  let totalWithUsury = value * 1.30;
  display.textContent = "S/ " + totalWithUsury.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
};

// --- ANIMACIÓN DE GRÁFICOS INTERACTIVOS AL HACER SCROLL ---
document.addEventListener('DOMContentLoaded', () => {
  // Inicializar la calculadora
  if (document.getElementById('borrowAmount')) window.runUsuryEngine();

  const showcase = document.querySelector('.tl-ins-showcase');
  if (!showcase) return;

  const chartObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
     if (entry.isIntersecting) {
        // --- 1. ENTRA EN PANTALLA (Animar) ---
        
        // Donut SVG
        const formalSeg = document.querySelector('.formal-seg');
        const informalSeg = document.querySelector('.informal-seg');
        if (formalSeg) formalSeg.style.strokeDasharray = '121.7 408.4';
        if (informalSeg) informalSeg.style.strokeDasharray = '286.7 408.4';

        // Barras
        document.querySelectorAll('.tl-bar-fill').forEach(bar => {
          const targetHeight = bar.style.getPropertyValue('--bar-h');
          bar.style.height = targetHeight;
        });

        // Vectores
        const pathSuccess = document.querySelector('.path-success');
        const pathLeak = document.querySelector('.path-leak');
        if (pathSuccess) pathSuccess.style.strokeDashoffset = '0';
        if (pathLeak) pathLeak.style.strokeDashoffset = '0';

      } else {
        // --- 2. SALE DE PANTALLA (Reiniciar a 0) ---
        
        // Reiniciar Donut SVG
        const formalSeg = document.querySelector('.formal-seg');
        const informalSeg = document.querySelector('.informal-seg');
        if (formalSeg) formalSeg.style.strokeDasharray = '0 408.4';
        if (informalSeg) informalSeg.style.strokeDasharray = '0 408.4';

        // Reiniciar Barras
        document.querySelectorAll('.tl-bar-fill').forEach(bar => {
          bar.style.height = '0';
        });

        // Reiniciar Vectores (Asegúrate de que el valor inicial coincida con tu CSS, usualmente es 100 o 1000)
        const pathSuccess = document.querySelector('.path-success');
        const pathLeak = document.querySelector('.path-leak');
        if (pathSuccess) pathSuccess.style.strokeDashoffset = '1000';
        if (pathLeak) pathLeak.style.strokeDashoffset = '1000';
      }
    });
  }, { threshold: 0.25 }); // Se dispara cuando el 25% de los gráficos están visibles en pantalla

  chartObserver.observe(showcase);
});

document.addEventListener('DOMContentLoaded', () => {
  // ============================================================
  // 1. VIDEO DE FONDO DEL HERO — reproducción normal en loop
  // ------------------------------------------------------------
  // Antes había un scroll-scrub (frame a frame según el scroll)
  // que en algunos navegadores solo mostraba 1-2 fotogramas en vez
  // de moverse suave. Se vuelve al comportamiento simple: el video
  // se reproduce normal y en loop, como cualquier video de fondo.
  // ============================================================
  const video = document.getElementById('llamaVideo');
  if (video) {
    video.muted = true;
    video.loop = true;
    video.play().catch(() => {});
  }

  // ============================================================
  // 2. OBSERVADOR DE MÉTRICAS Y CONTEO NUMÉRICO
  // ============================================================
  const targetSection = document.querySelector('.tl-premium-insights');

  if (targetSection) {
    const observerOptions = {
      root: null,
      threshold: 0.25 // Se activa al ver el 25% de la sección
    };

    const observer = new IntersectionObserver((entries, obs) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          // Activa las animaciones CSS (barras y rosquilla)
          targetSection.classList.add('is-visible');

          // Dispara el conteo progresivo de los números
          animateNumbers();

          // Desconecta el observador para que no se reinicie la animación
          obs.unobserve(entry.target);
        }
      });
    }, observerOptions);

    observer.observe(targetSection);
  }

  // Función interna para animar contadores (.counter-num)
  function animateNumbers() {
    const counters = document.querySelectorAll('.counter-num');

    counters.forEach(counter => {
      const target = parseFloat(counter.getAttribute('data-target'));
      if (isNaN(target)) return;

      const suffix = counter.getAttribute('data-suffix') || '';
      const decimals = parseInt(counter.getAttribute('data-decimals') || '0', 10);
      const duration = 1600; // ms
      const stepTime = 20;
      const steps = duration / stepTime;
      const increment = target / steps;
      let current = 0;

      const timer = setInterval(() => {
        current += increment;
        if (current >= target) {
          counter.innerText = target.toFixed(decimals) + suffix;
          clearInterval(timer);
        } else {
          counter.innerText = current.toFixed(decimals) + suffix;
        }
      }, stepTime);
    });
  }
});

document.addEventListener('DOMContentLoaded', () => {
  const targetSection = document.querySelector('.tl-premium-insights');

  if (!targetSection) return;

  const observerOptions = {
    root: null,
    threshold: 0.25 // Se activa cuando el 25% de la sección es visible
  };

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        // ENTRA EN PANTALLA (Bajando o Subiendo):
        targetSection.classList.add('animate-in');
        animateNumbers();
      } else {
        // SALE DE PANTALLA:
        // Quita la animación y resetea los valores a 0 para la próxima vez
        targetSection.classList.remove('animate-in');
        resetNumbers();
      }
    });
  }, observerOptions);

  observer.observe(targetSection);
});

// Función para animar los números incrementales
function animateNumbers() {
  const counters = document.querySelectorAll('.count-up');
  const duration = 1800; // 1.8 segundos

  counters.forEach(counter => {
    const target = parseFloat(counter.getAttribute('data-target'));
    const suffix = counter.getAttribute('data-suffix') || '';
    const decimals = parseInt(counter.getAttribute('data-decimals') || (target % 1 !== 0 ? 1 : 0));
    
    // Si hay una animación previa corriendo, la cancela
    if (counter.animationFrame) {
      cancelAnimationFrame(counter.animationFrame);
    }

    let startTime = null;

    function step(timestamp) {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);
      
      // Curva de aceleración suave (easeOutExpo)
      const easeProgress = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
      const currentValue = easeProgress * target;

      counter.textContent = currentValue.toFixed(decimals).replace(/\B(?=(\d{3})+(?!\d))/g, ",") + suffix;

      if (progress < 1) {
        counter.animationFrame = window.requestAnimationFrame(step);
      }
    }

    counter.animationFrame = window.requestAnimationFrame(step);
  });
}

// Función para reiniciar los números cuando la sección no está en pantalla
function resetNumbers() {
  const counters = document.querySelectorAll('.count-up');
  counters.forEach(counter => {
    if (counter.animationFrame) {
      cancelAnimationFrame(counter.animationFrame);
    }
    const suffix = counter.getAttribute('data-suffix') || '';
    counter.textContent = '0' + suffix;
  });
}

// 1. Alternar entre Pestañas
function switchTab(tabName) {
  // Ocultar contenidos
  document.querySelectorAll('.tl-tab-pane').forEach(pane => pane.classList.remove('active'));
  document.querySelectorAll('.tl-tab-btn').forEach(btn => btn.classList.remove('active'));

  // Activar seleccionada
  if (tabName === 'usura') {
    document.getElementById('tab-usura').classList.add('active');
    event.currentTarget.classList.add('active');
  } else {
    document.getElementById('tab-sbt').classList.add('active');
    event.currentTarget.classList.add('active');
    runSBTEngine(); // Calcular al cambiar
  }
}

// 2. Motor de Cálculo Usura (Ya existente)
function runUsuryEngine() {
  const amount = parseFloat(document.getElementById('borrowAmount').value) || 0;
  const totalUsury = amount * 1.30; // Simulación de costo gota a gota
  document.getElementById('usuryTotal').innerText = `S/ ${totalUsury.toLocaleString('es-PE', {minimumFractionDigits: 2})}`;
}

// 3. Motor de Cálculo del Score SBT (DNI de Confianza)
function runSBTEngine() {
  const sales = parseFloat(document.getElementById('salesVol').value) || 0;
  const clients = parseFloat(document.getElementById('cleanClients').value) || 0;
  const growth = parseFloat(document.getElementById('growthSlider').value) || 0;

  // Actualizar indicador del slider
  document.getElementById('sliderVal').innerText = `+${growth}%`;

  // Algoritmo de Score Predictivo (0 a 100)
  let baseScore = 30;
  let salesPoints = Math.min(30, (sales / 10000) * 30);
  let clientPoints = Math.min(25, (clients / 100) * 25);
  let growthPoints = (growth / 100) * 15;

  let totalScore = Math.round(baseScore + salesPoints + clientPoints + growthPoints);
  totalScore = Math.min(98, Math.max(15, totalScore)); // Limitar entre 15 y 98

  // Actualizar UI
  document.getElementById('sbtScore').innerText = totalScore;

  // Modificar badge según nivel
const badgeEl = document.getElementById('sbtBadge');

if (totalScore >= 76) {
  badgeEl.innerText = "Nivel: Confianza Alta (On-Chain)";
  badgeEl.style.color = "#F59E0B";
  badgeEl.style.borderColor = "rgba(245, 158, 11, 0.3)";
} else if (totalScore >= 51) {
  badgeEl.innerText = "Nivel: Confianza Media";
  badgeEl.style.color = "#34D399";
  badgeEl.style.borderColor = "rgba(52, 211, 153, 0.3)";
} else if (totalScore >= 26) {
  badgeEl.innerText = "Nivel: Básico";
  badgeEl.style.color = "#38BDF8";
  badgeEl.style.borderColor = "rgba(56, 189, 248, 0.3)";
} else {
  badgeEl.innerText = "Nivel: Inicial";
  badgeEl.style.color = "#94A3B8";
  badgeEl.style.borderColor = "rgba(148, 163, 184, 0.3)";
}

  // Actualizar texto de propuesta de valor dinámica
  document.getElementById('sbtPropText').innerHTML = 
    `Con este puntaje de <strong>${totalScore}/100</strong>, dejas de ser parte del 83% de informales sin historial y te conviertes en un candidato elegible para el crédito resiliente de TrustLink.`;
}

/* ============================================================
   COPILOTO FINANCIERO — INTERACTIVIDAD
   ============================================================ */

document.addEventListener('DOMContentLoaded', () => {

    const chatBody = document.getElementById('tl-ai-chat-body');
    const categoriesBlock = document.getElementById('tl-ai-categories');

    if (!chatBody || !categoriesBlock) {
        return;
    }


    /* Guardamos una plantilla "limpia" del menú de categorías,
       para poder volver a mostrarlo más adelante sin duplicar
       el HTML ni los datos de cada categoría. */

    const categoriesTemplate = categoriesBlock.cloneNode(true);
    categoriesTemplate.removeAttribute('id');


    /* ========================================================
       HELPERS DE SCROLL Y MENSAJES
       ======================================================== */

    function scrollToBottom() {

        requestAnimationFrame(() => {

            chatBody.scrollTop = chatBody.scrollHeight;

        });

    }


    function addUserMessage(text) {

        const msg = document.createElement('div');

        msg.className = 'tl-ai-msg-user';

        msg.textContent = text;

        chatBody.appendChild(msg);

        scrollToBottom();

        return msg;

    }


    function addBotMessage(text) {

        const msg = document.createElement('div');

        msg.className = 'tl-ai-message';

        msg.textContent = text;

        chatBody.appendChild(msg);

        scrollToBottom();

        return msg;

    }


    function addTypingIndicator() {

        const el = document.createElement('div');

        el.className = 'tl-ai-message tl-ai-typing';

        el.innerHTML = '<span></span><span></span><span></span>';

        chatBody.appendChild(el);

        scrollToBottom();

        return el;

    }


    /* ========================================================
       CONSTRUIR LA BURBUJA CON LAS PREGUNTAS DE UNA CATEGORÍA
       ======================================================== */

    function buildQuestionsBubble(category) {

        const categoryData = trustLinkQuestions[category];

        if (!categoryData) {
            return null;
        }

        const bubble = document.createElement('div');

        bubble.className = 'tl-ai-questions-bubble';


        /* Título + botón volver */

        const categoryTitle = document.createElement('div');

        categoryTitle.className = 'tl-ai-question-category-title';

        categoryTitle.innerHTML = `
            <span>${categoryData.title}</span>

            <button type="button" class="tl-ai-back-btn">
                ← Categorías
            </button>
        `;

        bubble.appendChild(categoryTitle);


        /* Lista de preguntas */

        const questionsList = document.createElement('div');

        questionsList.className = 'tl-ai-questions';

        categoryData.questions.forEach(item => {

            const questionButton = document.createElement('button');

            questionButton.type = 'button';

            questionButton.className = 'tl-ai-question-btn';

            questionButton.innerHTML = `

                <span class="tl-ai-question-icon">
                    ?
                </span>

                <span class="tl-ai-question-text">
                    ${item.question}
                </span>

                <svg
                    width="15"
                    height="15"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                    stroke-linecap="round"
                    stroke-linejoin="round">

                    <polyline points="9 18 15 12 9 6"></polyline>

                </svg>
            `;


            /* Click en una pregunta: se manda como mensaje del
               usuario y el copiloto responde debajo, como en
               cualquier chat. */

            questionButton.addEventListener('click', () => {

                addUserMessage(item.question);

                const typing = addTypingIndicator();

                setTimeout(() => {

                    typing.remove();

                    addBotMessage(item.answer);

                }, 500);

            });

            questionsList.appendChild(questionButton);

        });

        bubble.appendChild(questionsList);


        /* Botón "← Categorías": quita esta burbuja y vuelve a
           mostrar el menú principal, sin acumular contenido. */

        categoryTitle.querySelector('.tl-ai-back-btn')
            .addEventListener('click', () => {

                bubble.remove();

                showCategoriesMenu();

            });

        return bubble;

    }


    /* ========================================================
       VINCULAR LOS BOTONES DE UN MENÚ DE CATEGORÍAS
       ======================================================== */

    function bindCategoryButtons(container) {

        container.querySelectorAll('.tl-ai-category-btn').forEach(button => {

            button.addEventListener('click', () => {

                const category = button.dataset.category;

                const categoryData = trustLinkQuestions[category];

                if (!categoryData) {
                    return;
                }


                /* La categoría elegida se envía como un mensaje
                   del usuario, y el menú de categorías se retira
                   para no ir acumulando cosas en pantalla. */

                addUserMessage(categoryData.title);

                container.remove();

                const typing = addTypingIndicator();

                setTimeout(() => {

                    typing.remove();

                    const bubble = buildQuestionsBubble(category);

                    if (bubble) {
                        chatBody.appendChild(bubble);
                    }

                    scrollToBottom();

                }, 500);

            });

        });

    }


    /* ========================================================
       MOSTRAR EL MENÚ DE CATEGORÍAS (inicial o al volver)
       ======================================================== */

    function showCategoriesMenu() {

        const freshMenu = categoriesTemplate.cloneNode(true);

        bindCategoryButtons(freshMenu);

        chatBody.appendChild(freshMenu);

        scrollToBottom();

    }


    /* Vincular el menú de categorías que ya viene en el HTML */

    bindCategoryButtons(categoriesBlock);

});