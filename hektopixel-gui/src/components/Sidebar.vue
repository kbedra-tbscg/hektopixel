<template>
    <essential-link title="Queue" caption="Edit animations queue" icon="playlist_add" link="/" />
    <essential-link title="Record" caption="Record animation from screen" link="screen" icon="videocam" />
    <canvas class="q-ma-lg" id="preview" />
    <div>
      <q-badge v-if="connected.value && boardStatus.value &&boardStatus.value.recording" color="red" floating>Recording</q-badge>
      <q-badge v-if="connected.value && boardStatus.value && boardStatus.value.playing" color="green" floating>Playing</q-badge>
    </div>
</template>

<script>
import EssentialLink from './EssentialLink';

export default {
  components: {EssentialLink},
  inject: ['connected', 'boardStatus', 'boardPreview'],
  watch: {
    boardPreview: {
      handler(newValue) {
        const myImageData = new ImageData(newValue.value, 20, 15)
        this.prev.putImageData(this.scaleImageData(this.prev, myImageData, 10), 0, 0)
      },
      deep: true
    }
  },
  methods: {
    scaleImageData(c, imageData, scale) {
      let scaled = c.createImageData(imageData.width * scale, imageData.height * scale);

      for (let row = 0; row < imageData.height; row++) {
        for (let col = 0; col < imageData.width; col++) {
          let sourcePixel = [
            imageData.data[(row * imageData.width + col) * 4 + 0],
            imageData.data[(row * imageData.width + col) * 4 + 1],
            imageData.data[(row * imageData.width + col) * 4 + 2],
            imageData.data[(row * imageData.width + col) * 4 + 3]
          ];
          for (let y = 0; y < scale; y++) {
            let destRow = row * scale + y;
            for (let x = 0; x < scale; x++) {
              let destCol = col * scale + x;
              for (let i = 0; i < 4; i++) {
                scaled.data[(destRow * scaled.width + destCol) * 4 + i] =
                  sourcePixel[i];
              }
            }
          }
        }
      }

      return scaled;
    },
  },
  mounted() {
    const canvas = document.getElementById("preview");
    this.prev = canvas.getContext("2d");
    this.prev.canvas.width = 200
    this.prev.canvas.height = 150
  }
}
</script>
<style>
#preview {
  border: solid 1px black;
}
</style>
