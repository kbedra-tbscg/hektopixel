const { WebSocketServer } = require('ws')
const fs = require('fs')
const https = require('https')
const express = require('express')
const { wledSend } = require('./udpsender')
const { getAnimationFiles, getStream, readFileStream } = require('./filehandler')

const app = express()

app.use(express.static('hektopixel-gui/dist/spa'))
app.get('/', (req, res) => res.end('<p>This server serves up static files.</p>'))

const options = {
  key: fs.readFileSync('cert/key.pem', 'utf8'),
  cert: fs.readFileSync('cert/cert.pem', 'utf8'),
  passphrase: ''
}
const server = https.createServer(options, app)

const status = {
  playing: false, // is playing animation
  recording: false, // is recording frames
  queue: ['1670501243714.dat'], // animations queue
  animationFiles: [], // available animation files
  clientsConnected: 0 // connected clients
}

const sockserver = new WebSocketServer({ server, path: '/led' })

sockserver.broadcast = function broadcast(msg) {
  sockserver.clients.forEach((client) => {
    client.send(msg)
  })
}

function sendStatus() {
  sockserver.broadcast(JSON.stringify({ status }))
}

function updateFiles() {
  getAnimationFiles().then((files) => {
    console.log('new file')
    status.animationFiles = files
    sendStatus()
  })
}

updateFiles()

function sendFrame(frame) {
  sockserver.broadcast(frame)
  wledSend(frame)
}

function playNextAnimation() {
  if (status.queue.length) {
    const filename = status.queue.shift()
    status.queue.push(filename)
    console.log('playing animation', filename)
    const stream = readFileStream(filename)
    stream.on('data', (chunk) => {
      if (status.playing) {
        sendFrame(chunk)
        stream.pause();
        setTimeout(() => {
          stream.resume()
        }, 1000 / 25)
      } else {
        stream.destroy()
      }
    })
    stream.on('end', () => {
      console.log('end')
      stream.destroy()
      playNextAnimation()
    })
  } else {
    status.playing = false
    sendStatus()
  }
}

sockserver.on('connection', (ws) => {
  console.log('New client connected!')
  status.clientsConnected++
  sendStatus()

  let stream = null // stream obj for recording
  let recordTimeout = null

  ws.on('message', (data) => {
    const cmd = data.subarray(0, 1).readInt8(0)
    switch (cmd) {
      case 1: // single frame
        const frame = data.subarray(1, 901)
        if (stream) {
          stream.write(frame)
        }
        sendFrame(frame)
        break
      case 2: // record to file
        if (!stream) {
          console.log('Start record')
          status.playing = false
          status.recording = true
          sendStatus()
          stream = getStream()
          recordTimeout = setTimeout(() => {
            if (stream) {
              console.log('Recording timeout')
              stream.end()
              stream = null
            }
          }, 60 * 1000)
        }
        break
      case 3: // stop recording
        console.log('Stop record')
        status.recording = false
        if (stream) {
          if (recordTimeout) clearTimeout(recordTimeout)
          stream.end()
          stream = null
        }
        updateFiles()
        break
      case 4: // start animation queue
        if (!status.playing && !status.recording) {
          status.playing = true
          sendStatus()
          playNextAnimation()
        }
        break
      case 5: // stop animation queue
        status.playing = false
        sendStatus()
        break
      case 6: // add animation to queue
        status.queue.push(data.subarray(1, data.length).toString())
        sendStatus()
        break
      case 7: // remove animation from queue
        const filename = data.subarray(1, data.length).toString()
        const index = status.queue.indexOf(filename)
        if (index !== -1) {
          status.queue.splice(index, 1)
          sendStatus()
        }
        break
      default:
        console.warn('unknown command')
    }
  })

  ws.on('close', () => {
    console.log('Client has disconnected!')
    status.clientsConnected--
  })
})

server.listen(443)
console.log('Static https server, and websocket started')
