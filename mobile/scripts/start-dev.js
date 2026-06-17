const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const http = require('http');

function fetchTunnels() {
  return new Promise((resolve, reject) => {
    const req = http.get('http://127.0.0.1:4040/api/tunnels', (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(e);
        }
      });
    });
    req.on('error', reject);
    req.setTimeout(2000, () => {
      req.destroy();
      reject(new Error('Timeout'));
    });
  });
}

function updateEnvFile(filePath, replacements) {
  if (!fs.existsSync(filePath)) {
    console.warn(`⚠️  Warning: File not found: ${filePath}`);
    return;
  }
  let content = fs.readFileSync(filePath, 'utf8');
  let changed = false;
  
  for (const [key, value] of Object.entries(replacements)) {
    const regex = new RegExp(`^${key}=.*`, 'm');
    if (regex.test(content)) {
      content = content.replace(regex, `${key}=${value}`);
      changed = true;
    } else {
      content += `\n${key}=${value}`;
      changed = true;
    }
  }
  
  if (changed) {
    fs.writeFileSync(filePath, content);
    console.log(`✅ Updated ${path.basename(path.dirname(filePath))}/${path.basename(filePath)}`);
  }
}

async function main() {
  console.log('🔍 Checking if ngrok is running...');
  let tunnelsData;
  try {
    tunnelsData = await fetchTunnels();
  } catch (e) {
    console.log('🚀 Ngrok is not running. Starting ngrok in the background (port 8000)...');
    // Start ngrok in background
    const ngrokProcess = spawn('ngrok', ['http', '8000'], {
      detached: true,
      stdio: 'ignore'
    });
    ngrokProcess.unref();
    
    // Wait for ngrok to start
    console.log('⏳ Waiting for ngrok to initialize...');
    for (let i = 0; i < 10; i++) {
      await new Promise(r => setTimeout(r, 1000));
      try {
        tunnelsData = await fetchTunnels();
        if (tunnelsData && tunnelsData.tunnels && tunnelsData.tunnels.length > 0) {
          break;
        }
      } catch (err) {}
    }
  }

  if (!tunnelsData || !tunnelsData.tunnels || tunnelsData.tunnels.length === 0) {
    console.error('❌ Failed to get ngrok tunnels. Please check if ngrok is installed correctly.');
    process.exit(1);
  }

  const httpsTunnel = tunnelsData.tunnels.find(t => t.public_url && t.public_url.startsWith('https://'));
  if (!httpsTunnel) {
    console.error('❌ No HTTPS tunnel found in ngrok.');
    process.exit(1);
  }

  const ngrokUrl = httpsTunnel.public_url;
  const wssUrl = ngrokUrl.replace('https://', 'wss://');
  console.log(`\n🔗 Ngrok URL found: ${ngrokUrl}\n`);

  // Update mobile/.env
  updateEnvFile(path.join(__dirname, '..', '.env'), {
    'EXPO_PUBLIC_API_URL': `${ngrokUrl}/api/v1`,
    'EXPO_PUBLIC_WS_URL': wssUrl
  });

  // Update studynest_be/.env
  updateEnvFile(path.join(__dirname, '..', '..', 'studynest_be', '.env'), {
    'BACKEND_URL': ngrokUrl
  });

  console.log('\n📱 Starting Expo (pnpm expo start -c)...\n');
  const expoProcess = spawn('pnpm', ['expo', 'start', '-c'], {
    cwd: path.join(__dirname, '..'),
    stdio: 'inherit',
    shell: true
  });

  expoProcess.on('close', (code) => {
    process.exit(code);
  });
}

main();
