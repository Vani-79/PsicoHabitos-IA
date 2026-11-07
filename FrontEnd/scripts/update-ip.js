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
 * Parchea automáticamente expo-notifications para evitar que crashee en Expo Go Android
 * por el módulo nativo ausente 'ExpoTopicSubscriptionModule'.
 */
function patchExpoNotifications() {
  const targetBuild = path.join(__dirname, '..', 'node_modules', 'expo-notifications', 'build', 'TopicSubscriptionModule.android.js');
  if (fs.existsSync(targetBuild)) {
    try {
      const content = fs.readFileSync(targetBuild, 'utf8');
      if (content.includes("requireNativeModule('ExpoTopicSubscriptionModule')")) {
        const patched = content.replace(
          "import { requireNativeModule } from 'expo-modules-core';\nexport default requireNativeModule('ExpoTopicSubscriptionModule');",
          "import { requireOptionalNativeModule } from 'expo-modules-core';\nconst nativeModule = requireOptionalNativeModule('ExpoTopicSubscriptionModule');\nconst fallbackModule = { addListener: () => {}, removeListeners: () => {}, subscribeToTopicAsync: () => Promise.resolve(null), unsubscribeFromTopicAsync: () => Promise.resolve(null) };\nexport default nativeModule || fallbackModule;"
        );
        fs.writeFileSync(targetBuild, patched, 'utf8');
        console.log('🩹 [Expo Go Patch] TopicSubscriptionModule parchado para compatibilidad con Expo Go.');
      }
    } catch (e) {
      console.warn('⚠️ [Expo Go Patch] No se pudo aplicar parche a expo-notifications:', e);
    }
  }

  const channelBuild = path.join(__dirname, '..', 'node_modules', 'expo-notifications', 'build', 'setNotificationChannelAsync.android.js');
  if (fs.existsSync(channelBuild)) {
    try {
      const content = fs.readFileSync(channelBuild, 'utf8');
      if (content.includes('return await NotificationChannelManager.setNotificationChannelAsync(channelId, channel);') && !content.includes('catch {')) {
        const patched = content.replace(
          'return await NotificationChannelManager.setNotificationChannelAsync(channelId, channel);',
          'try { return await NotificationChannelManager.setNotificationChannelAsync(channelId, channel); } catch { return null; }'
        );
        fs.writeFileSync(channelBuild, patched, 'utf8');
        console.log('🩹 [Expo Go Patch] setNotificationChannelAsync protegido contra NPE en Expo Go.');
      }
    } catch (e) {
      console.warn('⚠️ [Expo Go Patch] No se pudo aplicar parche a setNotificationChannelAsync:', e);
    }
  }

  // Elimina tsconfig.json residuales dentro de expo-notifications para que VS Code no los indexe como proyectos
  const strayTsconfigs = [
    path.join(__dirname, '..', 'node_modules', 'expo-notifications', 'tsconfig.json'),
    path.join(__dirname, '..', 'node_modules', 'expo-notifications', 'plugin', 'tsconfig.json'),
  ];
  for (const file of strayTsconfigs) {
    if (fs.existsSync(file)) {
      try {
        fs.unlinkSync(file);
      } catch {}
    }
  }

  // Previene advertencias de VS Code por herencia de tsconfig en node_modules
  const moduleScriptsDir = path.join(__dirname, '..', 'node_modules', 'expo-module-scripts');
  if (!fs.existsSync(moduleScriptsDir)) {
    try {
      fs.mkdirSync(moduleScriptsDir, { recursive: true });
      fs.writeFileSync(path.join(moduleScriptsDir, 'package.json'), JSON.stringify({ name: 'expo-module-scripts', version: '1.0.0', main: 'tsconfig.base.json' }, null, 2));
      fs.writeFileSync(path.join(moduleScriptsDir, 'tsconfig.base.json'), JSON.stringify({ compilerOptions: { skipLibCheck: true } }, null, 2));
    } catch {}
  }
}

/**
 * Punto de entrada del script de detección automática de IP local.
 */
function main() {
  patchExpoNotifications();
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
