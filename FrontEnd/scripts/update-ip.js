const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');

/**
 * Resuelve la dirección IPv4 local activa de la máquina anfitriona.
 * Detecta interfaces Wi-Fi o Ethernet externas prioritarias.
 */
function getLocalIp() {
  const nets = os.networkInterfaces();
  const allInterfaces = Object.entries(nets).flatMap(([name, list]) =>
    (list || []).map((net) => ({ name, address: net.address, family: net.family, internal: net.internal }))
  );

  const ipv4List = allInterfaces.filter(
    (net) => (net.family === 'IPv4' || net.family === 4) && !net.internal
  );

  const preferred = ipv4List.find((net) =>
    /^(en|wl|eth)/i.test(net.name)
  );

  return preferred?.address || ipv4List[0]?.address || null;
}

/**
 * Punto de entrada del script de detección automática de IP local.
 */
function main() {
  const envPath = path.join(__dirname, '..', '.env');
  let currentEnv = '';

  try {
    if (fs.existsSync(envPath)) {
      currentEnv = fs.readFileSync(envPath, 'utf8');
    }
  } catch (error) {
    console.warn('⚠️ [IP Auto-Detect] No se pudo leer el archivo .env:', error);
  }

  // Si el usuario configuró un túnel explícito (HTTPS / ngrok / Cloudflare), no sobreescribir
  if (currentEnv.includes('https://') || currentEnv.includes('ngrok') || currentEnv.includes('trycloudflare')) {
    console.log('🌐 [IP Auto-Detect] Se detectó un túnel o URL remota en .env, manteniéndolo intacto.');
    return;
  }

  const ip = getLocalIp();
  if (ip) {
    console.log(`🌐 [IP Auto-Detect] Conectado con la IP: ${ip}`);
    console.log(`📡 [IP Auto-Detect] Expo y la app conectarán automáticamente a http://${ip}:3000/api`);
  } else {
    console.warn('⚠️ [IP Auto-Detect] No se detectó una IP externa activa.');
  }
}

main();
