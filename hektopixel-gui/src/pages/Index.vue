<template>
  <q-page class="q-pa-md">
    <q-btn color="primary" @click="sendCommand(4)">Play Animation Queue</q-btn>
    <q-btn color="primary" @click="sendCommand(5)">Stop animation Queue</q-btn>
    <div v-if="boardStatus.value">
      <q-btn v-for="(file,index) in boardStatus.value.animationFiles" :key="index" color="primary" @click="addAnimation(file)">Add animation {{ file }}</q-btn>
      <div>
        Queue:
        <q-btn v-for="(file,index) in boardStatus.value.queue" :key="index" color="primary" @click="removeAnimation(file)">Remove animation {{ file }}</q-btn>
      </div>
    </div>
  </q-page>
</template>

<script>
import { defineComponent } from "vue";

export default defineComponent({
  name: "PageIndex",
  inject: ['boardStatus', 'send'],
  methods: {
    sendCommand(cmd_val, param) {
      const enc = new TextEncoder();
      const text = enc.encode(param)
      const cmd = new Uint8Array([cmd_val]);
      this.send(this.concatTypedArrays(cmd,text))
    },
    concatTypedArrays(a, b) { // a, b TypedArray of same type
      let c = new (a.constructor)(a.length + b.length);
      c.set(a, 0);
      c.set(b, a.length);
      return c;
    },
    addAnimation: function(filename) {
      this.sendCommand(6,filename)
    },
    removeAnimation: function(filename) {
      this.sendCommand(7,filename)
    },
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
#hektopix {
  border: solid 1px black;
}
#video {
  border: solid 1px red;
  max-width: 300px;
}
</style>
