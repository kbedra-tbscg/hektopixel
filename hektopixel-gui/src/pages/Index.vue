<template>
  <q-page class="flex flex-center">
    <button @click="sendMessage">Send Message</button>
    <button @click="startRecording">Rec</button>
    <button @click="stopRecording">Stop</button>
    <button @click="playAnimation">Play</button>
    <input v-model="videoUrl">
    <div>
      <canvas id="hektopix" />
    </div>
    <div>
      <canvas id="preview" />
    </div>

    <video id="video" src="http://upload.wikimedia.org/wikipedia/commons/7/79/Big_Buck_Bunny_small.ogv" controls="false"></video>
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
    startRecording: function() {
      let buffer = new ArrayBuffer(1);
      const dataView = new DataView(buffer);
      dataView.setUint8(0,2);
      this.connection.send(buffer)
    },
    stopRecording: function() {
      let buffer = new ArrayBuffer(1);
      const dataView = new DataView(buffer);
      dataView.setUint8(0,3);
      this.connection.send(buffer)
    },
    concatTypedArrays(a, b) { // a, b TypedArray of same type
      let c = new (a.constructor)(a.length + b.length);
      c.set(a, 0);
      c.set(b, a.length);
      return c;
    },
    playAnimation: function() {
      const enc = new TextEncoder();
      const text = enc.encode('1670413878597.dat')

      console.log('text', text)
      const cmd = new Uint8Array(['0x04']);
      console.log(this.concatTypedArrays(cmd,text))
      this.connection.send(this.concatTypedArrays(cmd,text))
    },
    sendMessage: function() {
      if (!this.video.paused && !this.video.ended) {
        this.ctx.drawImage(this.video, 0, 0);
        setTimeout(this.sendMessage, 1000 / 30); // drawing at 30fps
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
    this.ctx.scale(0.1,0.1);

    // Create gradient
    const grd = this.ctx.createLinearGradient(0, 0, 20, 0);
    grd.addColorStop(0, "black");
    grd.addColorStop(1, "white");

    // Fill with gradient
    this.ctx.fillStyle = grd;
    this.ctx.fillRect(0, 0, 20, 15);

    this.video = document.getElementById('video');
    this.video.crossOrigin = "Anonymous"
    this.video.addEventListener('play', this.sendMessage, 0);

    const canvas2 = document.getElementById("preview");
    const prev = canvas2.getContext("2d");
    prev.canvas.width = 200
    prev.canvas.height = 150

    console.log("Starting connection to WebSocket Server")
    this.connection = new WebSocket("ws://localhost:8081")

    this.connection.onmessage = function(event) {
      if (typeof event.data === 'string'){
        console.log('string');
        console.log(JSON.parse(event.data))
      } else {
        const arrayBuffer = event.data.arrayBuffer();
        arrayBuffer.then((data) => {
          const uint8View = new Uint8Array(data);
          console.log(uint8View);
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
  setup() {

  }
});
</script>
<style>
#hektopix, #preview {
  border: solid 1px black;
}
</style>
