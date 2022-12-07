import { WebSocketServer } from 'ws';
import udp from 'dgram'
import fs from 'fs'

// creating a client socket to wled
const wled = udp.createSocket('udp4');
const wledPort = 19446;
const wledIp = '192.168.1.225';

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

const sockserver = new WebSocketServer({ port: 8081 });
sockserver.on('connection', (ws) => {
  console.log('New client connected!');
  let stream = null;
  let recordTimeout = null;

  function sendFiles() {
    fs.readdir('animations', function (err, files) {
      //handling error
      if (err) {
        return console.log('Unable to scan directory: ' + err);
      }
      ws.send(JSON.stringify(files))
    });
  }

  sendFiles()

  ws.on('message', function message(data) {
    console.log('data', data)
    const cmd = data.subarray(0, 1).readInt8(0);
    console.log('cmd', cmd)
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
          stream = fs.createWriteStream('animations/' + timestamp + '.dat', {flags: 'a'});
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
        // file.toString()
        console.log('playing file', file.toString());

        fs.open('animations/' + file.toString(), 'r', function(err, fd) {
          if (err) throw err;
          function readNextChunk() {
            let CHUNK_SIZE = 900
            let buffer = Buffer.alloc(CHUNK_SIZE)

            fs.read(fd, buffer, 0, CHUNK_SIZE, null, function(err, nread) {
              if (err) throw err;

              if (nread === 0) {
                // done reading file, do any necessary finalization steps

                fs.close(fd, function(err) {
                  if (err) throw err;
                });
                return;
              }

              let data;
              if (nread < CHUNK_SIZE)
                data = buffer.slice(0, nread);
              else
                data = buffer;

              // do something with `data`, then call `readNextChunk();`
              setTimeout(()=>{
                ws.send(data)
                console.log(data);
                readNextChunk();
              },1000 / 25)
              console.log(data)
            });
          }
          readNextChunk();
        });
        break;
      default:
        console.warn('unknown command')
    }
  });

  ws.on('close', () => console.log('Client has disconnected!'));
});