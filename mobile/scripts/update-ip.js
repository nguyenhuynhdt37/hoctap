const fs = require('fs')
const os = require('os')
const path = require('path')

function getLocalIp() {
  const interfaces = os.networkInterfaces()
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address
      }
    }
  }
  return 'localhost'
}

function updateEnvFile(envPath: string): string | null {
  if (!fs.existsSync(envPath)) return null

  let content = fs.readFileSync(envPath, 'utf8')
  const localIp = getLocalIp()

  const regex = /^(EXPO_PUBLIC_API_URL=http:\/\/)([0-9.]+)(:\d+.*)$/m
  const updated = content.replace(regex, (_match, prefix, _oldIp, suffix) => {
    return `${prefix}${localIp}${suffix}`
  })

  if (content !== updated) {
    fs.writeFileSync(envPath, updated)
    return localIp
  }
  return null
}

function updateBackendEnv(envPath: string): string | null {
  if (!fs.existsSync(envPath)) return null

  let content = fs.readFileSync(envPath, 'utf8')
  const localIp = getLocalIp()

  let updated = content.replace(
    /^(BACKEND_URL=http:\/\/)([0-9.]+)(:\d+.*)$/m,
    (_m, p, _o, s) => `${p}${localIp}${s}`
  )
  updated = updated.replace(
    /http:\/\/[0-9.]+(:\d+)/g,
    (m, port) => `http://${localIp}${port}`
  )

  if (content !== updated) {
    fs.writeFileSync(envPath, updated)
    return localIp
  }
  return null
}

function run() {
  const mobileEnv = path.join(__dirname, '../.env')
  const backendEnv = path.join(__dirname, '../../backend/.env')

  const mobileIp = updateEnvFile(mobileEnv)
  if (mobileIp) {
    console.log(`✅ Updated mobile/.env: EXPO_PUBLIC_API_URL → ${mobileIp}`)
  } else {
    console.log(`ℹ️  mobile/.env up to date (${getLocalIp()})`)
  }

  const backendIp = updateBackendEnv(backendEnv)
  if (backendIp) {
    console.log(`✅ Updated backend/.env: BACKEND_URL & CORS_ORIGINS → ${backendIp}`)
  }
}

// CLI mode
run()

// Export cho import từ code
module.exports = { updateEnvFile, updateBackendEnv, getLocalIp }
