<template>
  <q-page class="flex flex-center q-pa-lg">
    <div>Status:
      <q-badge v-if="status.playing" color="blue">Playing</q-badge>
      <q-badge v-if="status.recording" color="red">Recording</q-badge>
    </div>
    <div>Clients connected: {{ status.clientsConnected }}</div>

    <q-btn color="primary" @click="sendCommand(2)">Record</q-btn>
    <q-btn color="primary" @click="sendCommand(3)">Stop Recording</q-btn>
    <q-btn color="primary" @click="sendCommand(4)">Play Animation Queue</q-btn>
    <q-btn color="primary" @click="sendCommand(5)">Stop animation Queue</q-btn>
    <q-btn color="primary" @click="sendFrame">Send Frame</q-btn>

    <q-btn v-for="(file,index) in status.animationFiles" :key="index" color="primary" @click="addAnimation(file)">Add animation {{ file }}</q-btn>
    <div>
      Queue:
      <q-btn v-for="(file,index) in status.queue" :key="index" color="primary" @click="removeAnimation(file)">Remove animation {{ file }}</q-btn>
    </div>


    <q-slider v-model="left" :min="-2000" :max="0"/>
    <q-slider v-model="top" :min="-1000" :max="0"/>
    <q-btn color="primary" @click="changeZoom(1.1)">Z+1</q-btn>
    <q-btn color="primary" @click="changeZoom(0.9)">Z-1</q-btn>
    <q-btn color="primary" @click="startCapture">Capture</q-btn>
    <q-btn color="primary" @click="stopCapture">Stop capture</q-btn>
    <canvas id="hektopix" />
    <canvas id="preview" />
    <video id="video" autoplay></video>
  </q-page>

</template>

<script>
import { defineComponent } from "vue";

export default defineComponent({
  name: "PageIndex",
  methods: {
    scaleImageData(c, imageData, scale) {
      let scaled = c.createImageData(imageData.width * scale, imageData.height * scale);

      for(let row = 0; row < imageData.height; row++) {
        for(let col = 0; col < imageData.width; col++) {
          let sourcePixel = [
            imageData.data[(row * imageData.width + col) * 4 + 0],
            imageData.data[(row * imageData.width + col) * 4 + 1],
            imageData.data[(row * imageData.width + col) * 4 + 2],
            imageData.data[(row * imageData.width + col) * 4 + 3]
          ];
          for(let y = 0; y < scale; y++) {
            let destRow = row * scale + y;
            for(let x = 0; x < scale; x++) {
              let destCol = col * scale + x;
              for(let i = 0; i < 4; i++) {
                scaled.data[(destRow * scaled.width + destCol) * 4 + i] =
                  sourcePixel[i];
              }
            }
          }
        }
      }

      return scaled;
    },
    stopCapture() {
      let tracks = this.video.srcObject.getTracks();
      tracks.forEach((track) => track.stop());
      this.video.srcObject = null;
    },
    async startCapture() {
      const displayMediaOptions = {
        audio: false
      };
      try {
        this.video.srcObject = await navigator.mediaDevices.getDisplayMedia(displayMediaOptions);
      } catch (err) {
        console.error(`Error: ${err}`);
      }
    },
    sendCommand(cmd_val, param) {
      const enc = new TextEncoder();
      const text = enc.encode(param)
      const cmd = new Uint8Array([cmd_val]);
      this.connection.send(this.concatTypedArrays(cmd,text))
    },
    concatTypedArrays(a, b) { // a, b TypedArray of same type
      let c = new (a.constructor)(a.length + b.length);
      c.set(a, 0);
      c.set(b, a.length);
      return c;
    },
    changeZoom(z) {
      this.ctx.scale(z,z);
    },
    addAnimation: function(filename) {
      this.sendCommand(6,filename)
    },
    removeAnimation: function(filename) {
      this.sendCommand(7,filename)
    },
    sendFrame: function() {
      if (!this.video.paused && !this.video.ended) {
        this.ctx.drawImage(this.video, this.left, this.top);
        setTimeout(this.sendFrame, 1000 / 25); // drawing at 25fps
      }

      let buffer = new ArrayBuffer(300*3+1);
      const dataView = new DataView(buffer);
      const dataArray = this.ctx.getImageData(0, 0, 20, 15);
      dataView.setUint8(0,1);
      for (let i = 0; i < 300; i++) {
        dataView.setUint8((i*3)+1, dataArray.data[(i*4)] % 256)
        dataView.setUint8((i*3)+2, dataArray.data[(i*4)+1] % 256)
        dataView.setUint8((i*3)+3, dataArray.data[(i*4)+2] % 256)
      }
      this.connection.send(buffer)
    }
  },
  mounted() {
    const canvas = document.getElementById("hektopix");
    this.ctx = canvas.getContext("2d");
    this.ctx.rect(0, 0, 200, 150);

    this.ctx.fillStyle = '#000000';
    this.ctx.fillRect(0, 0, 20, 15);

    this.ctx.beginPath();
    this.ctx.moveTo(0, 0);
    this.ctx.lineTo(20, 0);
    this.ctx.strokeStyle = '#ff0000';
    this.ctx.stroke();

    this.ctx.beginPath();
    this.ctx.moveTo(0, 0);
    this.ctx.lineTo(0, 15);
    this.ctx.strokeStyle = '#00FF00';
    this.ctx.stroke();

    this.ctx.beginPath();
    this.ctx.moveTo(0, 0);
    this.ctx.lineTo(20, 15);
    this.ctx.strokeStyle = '#0000FF';
    this.ctx.stroke();

    this.video = document.getElementById('video');
    this.video.crossOrigin = "Anonymous"
    this.video.addEventListener('play', this.sendFrame, 0);

    const canvas2 = document.getElementById("preview");
    const prev = canvas2.getContext("2d");
    prev.canvas.width = 200
    prev.canvas.height = 150

    console.log("Starting connection to WebSocket Server")
    this.connection = new WebSocket('wss://' + window.location.hostname + '/led')

    this.connection.onmessage = function(event) {
      if (typeof event.data === 'string'){
        const message = JSON.parse(event.data);
        if (message) {
          this.status = message.status
        }
        console.log('Got message:', JSON.parse(event.data))
      } else {
        const arrayBuffer = event.data.arrayBuffer();
        arrayBuffer.then((data) => {
          const uint8View = new Uint8Array(data);
          const previewData = new Uint8ClampedArray(300 * 4)
          for (let i = 0; i < 300; i++) {
            previewData[(i * 4)] = uint8View[(i * 3)]
            previewData[(i * 4) + 1] = uint8View[(i * 3) + 1]
            previewData[(i * 4) + 2] = uint8View[(i * 3) + 2]
            previewData[(i * 4) + 3] = 255
          }
          const myImageData = new ImageData(previewData, 20, 15)
          prev.putImageData(this.scaleImageData(prev, myImageData, 10), 0, 0)
        });
      }
    }.bind(this)

    this.connection.onopen = function(event) {
      console.log(event)
      console.log("Successfully connected to the echo websocket server...")
    }
  },
  data() {
    return {
      left: 0,
      top: 0,
      status: {
        playing: false, // is playing animation
        recording: false, // is recording frames
        queue: [], // animations queue
        animationFiles: [], // available animation files
        clientsConnected: 0 // connected clients
      }
    }
  },
});
</script>
<style>
#hektopix, #preview {
  border: solid 1px black;
}
#video {
  border: solid 1px red;
  max-width: 300px;
}
</style>
