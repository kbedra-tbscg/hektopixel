const udp = require('dgram')

// creating a client socket to wled
const wled = udp.createSocket('udp4')
const wledPort = 19446
const wledIp = '172.24.1.21'

function wledSend(frame) {
  const translated = Buffer.alloc(900)
  const boardWidth = 20
  for (let i = 0; i < 300; i++) {
    const line = Math.floor(i / boardWidth)
    const pixel = i % boardWidth
    const odd = (line % 2) === 0
    if (odd) {
      translated[(i * 3)] = frame[(i * 3)]
      translated[(i * 3) + 1] = frame[(i * 3) + 1]
      translated[(i * 3) + 2] = frame[(i * 3) + 2]
    } else {
      const y = i + 19 - (pixel * 2)
      translated[(i * 3)] = frame[(y * 3)]
      translated[(i * 3) + 1] = frame[(y * 3) + 1]
      translated[(i * 3) + 2] = frame[(y * 3) + 2]
    }
  }
  wled.send(translated, wledPort, wledIp, (error) => {
    if (error) {
      wled.close()
    }
  })
}

module.exports = { wledSend }
