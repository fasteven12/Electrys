// Common functionality for all pages
document.addEventListener('DOMContentLoaded', function() {
  // Initialize dropdown menus
  const dropdowns = document.querySelectorAll('.dropdown');
  dropdowns.forEach(dropdown => {
    dropdown.addEventListener('mouseenter', function() {
      this.querySelector('.dropdown-menu').style.opacity = '1';
      this.querySelector('.dropdown-menu').style.visibility = 'visible';
    });
    
    dropdown.addEventListener('mouseleave', function() {
      this.querySelector('.dropdown-menu').style.opacity = '0';
      this.querySelector('.dropdown-menu').style.visibility = 'hidden';
    });
  });
  
  // Smooth scrolling for anchor links
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function(e) {
      e.preventDefault();
      document.querySelector(this.getAttribute('href')).scrollIntoView({
        behavior: 'smooth'
      });
    });
  });
});

// Almacenamiento de datos en memoria
const consumoData = {
    historial: [],
    config: {
        co2PorKwh: 0.15, // Factor de emisión de CO2 para la red eléctrica colombiana (kg CO2/kWh)
        promedioColombia: 150 // Consumo residencial promedio en Colombia (kWh/mes)
    }
};

// Costos de kWh por estrato y consumo de subsistencia
const costoUnitarioBase = 900; // Costo de referencia (Estrato 4)
const limiteConsumoSubsidiado = 130; // Límite de consumo subsidiado en kWh/mes

const preciosKwhPorEstrato = {
    1: costoUnitarioBase * (1 - 0.60), // 60% de subsidio
    2: costoUnitarioBase * (1 - 0.50), // 50% de subsidio
    3: costoUnitarioBase * (1 - 0.15), // 15% de subsidio
    4: costoUnitarioBase,
    5: costoUnitarioBase * (1 + 0.20), // 20% de contribución
    6: costoUnitarioBase * (1 + 0.20)  // 20% de contribución
};

// Inicialización de gráfico
let pieChart;

function inicializarGraficos() {
    const resultadoContainer = document.getElementById('resultado');
    if (resultadoContainer.querySelector('.charts-container')) return;

    const chartsContainer = document.createElement('div');
    chartsContainer.className = 'charts-container';
    chartsContainer.style.marginTop = '40px';
    chartsContainer.style.paddingTop = '20px';
    chartsContainer.style.borderTop = '1px solid #eee';
    
    chartsContainer.innerHTML = `
        <h3 style="text-align: center; margin-bottom: 20px;">
            <i class="fas fa-chart-pie"></i> Visualización del Consumo
        </h3>
        <div style="display: flex; justify-content: center;">
            <div style="width: 100%; max-width: 400px;">
                <h4 style="text-align: center;"><i class="fas fa-chart-pie"></i> Distribución por Dispositivo</h4>
                <canvas id="pieChart"></canvas>
            </div>
        </div>
    `;
    
    resultadoContainer.appendChild(chartsContainer);
    
    const ctxPie = document.getElementById('pieChart').getContext('2d');
    pieChart = new Chart(ctxPie, {
        type: 'pie',
        data: {
            labels: ['No hay datos'],
            datasets: [{ data: [1], backgroundColor: ['#e0e0e0'] }]
        },
        options: {
            responsive: true,
            plugins: {
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const label = context.label || '';
                            const value = context.raw || 0;
                            const total = context.dataset.data.reduce((a, b) => a + b, 0);
                            const percentage = total > 0 ? Math.round((value / total) * 100) : 0;
                            return `${label}: ${value.toFixed(2)} kWh (${percentage}%)`;
                        }
                    }
                }
            }
        }
    });
}

// Función para actualizar gráfico de torta
function actualizarGraficos() {
    if (!pieChart) return;
    
    // Gráfico de Torta (Pie Chart)
    const consumoPorDispositivo = consumoData.historial.reduce((acc, curr) => {
        const nombre = curr.dispositivo.charAt(0).toUpperCase() + curr.dispositivo.slice(1);
        acc[nombre] = (acc[nombre] || 0) + curr.consumo_kwh;
        return acc;
    }, {});
    
    const labelsPie = Object.keys(consumoPorDispositivo);
    const dataPie = Object.values(consumoPorDispositivo);
    
    pieChart.data.labels = labelsPie.length > 0 ? labelsPie : ['No hay datos'];
    pieChart.data.datasets[0].data = dataPie.length > 0 ? dataPie : [1];
    pieChart.data.datasets[0].backgroundColor = labelsPie.length > 0 ? [
        '#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', 
        '#9966FF', '#FF9F40', '#8AC24A', '#607D8B',
        '#E91E63', '#00BCD4', '#9C27B0', '#3F51B5'
    ] : ['#e0e0e0'];
    pieChart.update();
}


// Calculator functionality
function setupCalculator() {
  const calculatorForm = document.getElementById('consumoForm');
  if (!calculatorForm) return;

  const powerValues = {
    nevera: 200, tv: 150, computador: 300, aire: 1500, lavadora: 500,
    secadora: 3000, horno: 2000, portatil: 50, consola: 150, ventilador: 100,
    calefactor: 2000, bombillo: 10, halogena: 50, licuadora: 400
  };

  document.getElementById('electrodomestico').addEventListener('change', function() {
    const customPowerGroup = document.getElementById('custom-power-group');
    if (this.value === 'otro') {
      customPowerGroup.style.display = 'block';
      document.getElementById('potencia').required = true;
    } else {
      customPowerGroup.style.display = 'none';
      document.getElementById('potencia').required = false;
    }
  });

  calculatorForm.addEventListener('submit', function(e) {
    e.preventDefault();
    
    const estrato = document.getElementById('estrato').value;
    const electrodomestico = document.getElementById('electrodomestico').value;
    let potencia;
    
    if (electrodomestico === 'otro') {
      potencia = parseFloat(document.getElementById('potencia').value);
    } else {
      potencia = powerValues[electrodomestico];
    }
    
    const horas = parseFloat(document.getElementById('horas').value);
    const dias = parseFloat(document.getElementById('dias').value);
    const cantidad = parseInt(document.getElementById('cantidad').value) || 1;
    
    const consumoKwh = (horas * potencia * dias * cantidad) / 1000;
    
    let costo;
    const precioSubsidiado = preciosKwhPorEstrato[estrato];
    const precioPleno = preciosKwhPorEstrato[4];

    if (consumoKwh > limiteConsumoSubsidiado && estrato <= 3) {
      const consumoExcedente = consumoKwh - limiteConsumoSubsidiado;
      costo = (limiteConsumoSubsidiado * precioSubsidiado) + (consumoExcedente * precioPleno);
    } else {
      costo = consumoKwh * precioSubsidiado;
    }

    const co2 = consumoKwh * consumoData.config.co2PorKwh;
    
    document.getElementById('consumo-result').textContent = `${consumoKwh.toFixed(1)} kWh`;
    document.getElementById('costo-result').textContent = `$${Math.round(costo).toLocaleString('es-CO')} COP`;
    document.getElementById('co2-result').textContent = `${co2.toFixed(1)} kg CO₂`;
    
    const porcentaje = (consumoKwh / consumoData.config.promedioColombia * 100).toFixed(0);
    
    document.getElementById('comparison-bar').style.width = `${Math.min(porcentaje, 100)}%`;
    document.getElementById('comparison-label').textContent = `${porcentaje}% del promedio`;
    
    let comparacionText = '';
    let savingsTips = '';
    
    if (porcentaje > 100) {
      comparacionText = `Este consumo representa el ${porcentaje}% del consumo residencial promedio en Colombia. Considera optimizar tu uso para ahorrar energía y dinero.`;
      savingsTips = `
        <h4><i class="fas fa-money-bill-alt"></i> Consejos para reducir tu consumo:</h4>
        <ul>
          <li>Revisa si tu dispositivo tiene modos de ahorro de energía</li>
          <li>Considera reducir el tiempo de uso o buscar alternativas más eficientes</li>
          <li>Desconecta el dispositivo cuando no lo uses para evitar consumo fantasma</li>
          <li>Mantén tu equipo en buen estado para optimizar su eficiencia</li>
        </ul>
      `;
    } else {
      comparacionText = `Este consumo representa el ${porcentaje}% del consumo residencial promedio en Colombia. ¡Buen trabajo manteniendo un consumo eficiente!`;
      savingsTips = `
        <h4><i class="fas fa-check-circle"></i> ¡Sigue así!</h4>
        <p>Estás consumiendo menos energía que el promedio colombiano. Considera estos consejos adicionales para mantener tu eficiencia energética:</p>
        <ul>
          <li>Sigue monitoreando tu consumo regularmente</li>
          <li>Comparte estos consejos de ahorro con familiares y amigos</li>
          <li>Considera la posibilidad de instalar paneles solares para autoconsumo</li>
        </ul>
      `;
    }
    
    document.getElementById('comparison-text').innerHTML = comparacionText;
    document.getElementById('savings-tips').innerHTML = savingsTips;
    
    document.getElementById('resultado').style.display = 'block';
    
    consumoData.historial.push({
      dispositivo: electrodomestico,
      consumo_kwh: consumoKwh,
      fecha: new Date().toISOString()
    });

    inicializarGraficos();
    actualizarGraficos();
    
    document.getElementById('resultado').scrollIntoView({ behavior: 'smooth' });
  });

  const resetBtn = document.getElementById('reset-calc');
  if (resetBtn) {
    resetBtn.addEventListener('click', function() {
      calculatorForm.reset();
      document.getElementById('custom-power-group').style.display = 'none';
      document.getElementById('resultado').style.display = 'none';
      
      // Reiniciar historial y gráficos
      consumoData.historial = [];
      if (pieChart) pieChart.destroy();
      const chartsContainer = document.querySelector('.charts-container');
      if (chartsContainer) chartsContainer.remove();
      
      document.getElementById('electrodomestico').focus();
    });
  }
}

// Initialize calculator when page loads
document.addEventListener('DOMContentLoaded', setupCalculator);