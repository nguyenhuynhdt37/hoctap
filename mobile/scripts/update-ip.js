const fs = require('fs')
const os = require('os')
const path = require('path')

const BACKEND_PORT = process.env.BACKEND_PORT || '8001'

function getLocalIp() {
  const interfaces = os.networkInterfaces()
  const entries = Object.entries(interfaces)
  const ignored = /vmware|virtual|vethernet|wsl|docker|hyper-v|loopback/i
  const preferred = /wi-?fi|wireless|ethernet|en0|en1|eth0/i

  function findIp(filter) {
    for (const [name, addresses] of entries) {
      if (!filter(name)) continue
      for (const iface of addresses || []) {
        if (iface.family === 'IPv4' && !iface.internal) {
          return iface.address
        }
      }
    }
    return null
  }

  const preferredIp = findIp((name) => preferred.test(name) && !ignored.test(name))
  if (preferredIp) return preferredIp

  for (const [name, addresses] of entries) {
    if (ignored.test(name)) continue
    for (const iface of addresses || []) {
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address
      }
    }
  }

  return 'localhost'
}

function upsertEnv(content, key, value) {
  const regex = new RegExp(`^${key}=.*`, 'm')
  if (regex.test(content)) return content.replace(regex, `${key}=${value}`)
  return `${content.trimEnd()}\n${key}=${value}\n`
}

function updateEnvFile(envPath) {
  if (!fs.existsSync(envPath)) return null

  const localIp = getLocalIp()
  const apiUrl = `http://${localIp}:${BACKEND_PORT}/api/v1`
  const wsUrl = `ws://${localIp}:${BACKEND_PORT}`
  const content = fs.readFileSync(envPath, 'utf8')

  let updated = upsertEnv(content, 'EXPO_PUBLIC_API_URL', apiUrl)
  updated = upsertEnv(updated, 'EXPO_PUBLIC_WS_URL', wsUrl)

  if (content !== updated) {
    fs.writeFileSync(envPath, updated)
    return localIp
  }

  return null
}

function updateBackendEnv(envPath) {
  if (!fs.existsSync(envPath)) return null

  const localIp = getLocalIp()
  const backendUrl = `http://${localIp}:${BACKEND_PORT}`
  const content = fs.readFileSync(envPath, 'utf8')
  const updated = upsertEnv(content, 'BACKEND_URL', backendUrl)

  if (content !== updated) {
    fs.writeFileSync(envPath, updated)
    return localIp
  }

  return null
}

function run() {
  const mobileEnv = path.join(__dirname, '../.env')
  const backendEnv = path.join(__dirname, '../../studynest_be/.env')

  const mobileIp = updateEnvFile(mobileEnv)
  if (mobileIp) {
    console.log(`Updated mobile/.env: API/WS -> ${mobileIp}:${BACKEND_PORT}`)
  } else {
    console.log(`mobile/.env up to date (${getLocalIp()}:${BACKEND_PORT})`)
  }

  const backendIp = updateBackendEnv(backendEnv)
  if (backendIp) {
    console.log(`Updated studynest_be/.env: BACKEND_URL -> ${backendIp}:${BACKEND_PORT}`)
  }
}

run()

module.exports = { updateEnvFile, updateBackendEnv, getLocalIp }
