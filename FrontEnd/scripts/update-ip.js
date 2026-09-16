const fs = require('fs');
const path = require('path');
const os = require('os');

function getLocalIp() {
  const nets = os.networkInterfaces();
  for (const name of Object.keys(nets)) {
    for (const net of nets[name]) {
      // Priorizar interfaces Wi-Fi o Ethernet activas (IPv4 no interna)
      if (net.family === 'IPv4' && !net.internal) {
        if (name.startsWith('en') || name.startsWith('wl') || name.startsWith('eth')) {
          return net.address;
        }
      }
    }
  }
  // Si no encuentra por nombre de interfaz, toma la primera IPv4 externa
  for (const name of Object.keys(nets)) {
    for (const net of nets[name]) {
      if (net.family === 'IPv4' && !net.internal) {
        return net.address;
      }
    }
  }
  return null;
}

const envPath = path.join(__dirname, '..', '.env');
let currentEnv = '';
if (fs.existsSync(envPath)) {
  currentEnv = fs.readFileSync(envPath, 'utf8');
}

// Si el usuario configuró un túnel explícito (HTTPS / ngrok / Cloudflare), no sobreescribir
if (currentEnv.includes('https://') || currentEnv.includes('ngrok') || currentEnv.includes('trycloudflare')) {
  console.log('🌐 [IP Auto-Detect] Se detectó un túnel o URL remota en .env, manteniéndolo intacto.');
  process.exit(0);
}

const ip = getLocalIp();
if (ip) {
  console.log(`🌐 [IP Auto-Detect] IP local actual de tu Mac: ${ip}`);
  console.log(`📡 [IP Auto-Detect] Expo y la app conectarán automáticamente a http://${ip}:3000/api`);
} else {
  console.warn('⚠️ [IP Auto-Detect] No se detectó una IP externa activa.');
}
