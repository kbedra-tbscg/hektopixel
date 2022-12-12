const { WebSocketServer } = require('ws')
const udp = require('dgram')
const fs = require('fs')

const https = require('https');
const express = require('express');

const app = express();
app.use(express.static('hektopixel-gui/dist/spa'));
app.get('/', function(req, res) {
  return res.end('<p>This server serves up static files.</p>');
});

const options = {
  key: fs.readFileSync('cert/key.pem', 'utf8'),
  cert: fs.readFileSync('cert/cert.pem', 'utf8'),
  passphrase: ''
};
const server = https.createServer(options, app);

server.listen(443);
console.log('Static http server started at :443')

// creating a client socket to wled
const wled = udp.createSocket('udp4');
const wledPort = 19446;
const wledIp = '172.24.1.21';
const animationsDir = 'animations'

function wledSend(frame) {
  const translated = Buffer.alloc(900)
  const boardWidth = 20
  for (let i = 0; i < 300; i++) {
    const line = Math.floor(i/boardWidth)
    const pixel = i % boardWidth;
    const odd = (line % 2) === 0;
    if (odd) {
      translated[(i*3)] = frame[(i*3)]
      translated[(i*3)+1] = frame[(i*3)+1]
      translated[(i*3)+2] = frame[(i*3)+2]
    } else {
      const y = i+19-(pixel*2);
      translated[(i*3)] = frame[(y*3)]
      translated[(i*3)+1] = frame[(y*3)+1]
      translated[(i*3)+2] = frame[(y*3)+2]
    }
  }
  wled.send(translated,wledPort,wledIp,function(error){
    if(error){
      wled.close();
    }
  });
}

const status = {
  playing: false,
}

const sockserver = new WebSocketServer({ port: 8081 });
console.log('Websocket server started at :8081')

sockserver.on('connection', (ws) => {
  console.log('New client connected!');
  let stream = null;
  let recordTimeout = null;

  function sendFiles() {
    fs.readdir(animationsDir, function (err, files) {
      //handling error
      if (err) {
        return console.log('Unable to scan directory: ' + err);
      }
      ws.send(JSON.stringify({files}))
    });
  }

  sendFiles()

  ws.on('message', function message(data) {
    const cmd = data.subarray(0, 1).readInt8(0);
    switch (cmd) {
      case 1: // frame
        const frame = data.subarray(1, 901);
        if (stream) {
          stream.write(frame);
        }
        ws.send(frame)
        wledSend(frame)
        break;
      case 2: // record to file
        if (!stream) {
          console.log('Start record')
          const timestamp = Date.now();
          stream = fs.createWriteStream(animationsDir + '/' + timestamp + '.dat', {flags: 'a'});
          recordTimeout = setTimeout(() => {
            if (stream) {
              console.log('Recording timeout')
              stream.end()
              stream = null
            }
          }, 60 * 1000)
        }
      break;
      case 3: // stop recording
        console.log('Stop record')
        stream.end()
        stream = null
        break;
      case 4:
        const file = data.subarray(1, data.length);
        const filename = file.toString()
        try {
          if (fs.existsSync(animationsDir + '/' + filename) && filename !== '') {
            console.log('playing file', filename);
            if (!status.playing) {
              status.playing = true
              function readFile() {
                fs.open(animationsDir + '/' + filename, 'r', function (err, fd) {
                  if (err) throw err;

                  function readNextChunk() {
                    let CHUNK_SIZE = 900
                    let buffer = Buffer.alloc(CHUNK_SIZE)

                    if (!status.playing) {
                      console.log('closing file');
                      fs.close(fd, function (err) {
                        if (err) throw err;
                      });
                      return;
                    }

                    fs.read(fd, buffer, 0, CHUNK_SIZE, null, function (err, nread) {
                      if (err) throw err;

                      if (nread === 0) { // done reading file, do any necessary finalization steps
                        fs.close(fd, function (err) {
                          if (err) throw err;
                        });
                        readFile();
                        return;
                      }

                      let data;
                      if (nread < CHUNK_SIZE)
                        data = buffer.slice(0, nread);
                      else
                        data = buffer;

                      setTimeout(() => {
                        ws.send(data)
                        wledSend(data)
                        readNextChunk();
                      }, 1000 / 25)
                    });
                  }

                  readNextChunk();
                });
              }
              readFile()
            }
          } else {
            console.log('file does not exist')
          }
        } catch(err) {
          console.error(err)
        }


        break;
      case 5: //stop animation
        status.playing = false
        break;
      default:
        console.warn('unknown command')
    }
  });

  ws.on('close', () => console.log('Client has disconnected!'));
});