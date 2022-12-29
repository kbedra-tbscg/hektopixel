<template>
  <q-layout view="lHh lpr lFf">

    <q-header elevated>
      <q-toolbar>
        <q-btn dense flat round icon="menu" @click="toggleLeftDrawer"/>

        <q-toolbar-title>
          Hektopixel GUI
        </q-toolbar-title>
        <q-avatar square :color="connected ? 'green' : 'red'" text-color="white" :icon="connected ? 'link' : 'link_off' " class="q-mr-md">
          <q-tooltip>
            Websocket connection
          </q-tooltip>
        </q-avatar>
        <q-avatar square color="teal" text-color="white" icon="people">
          <q-tooltip>
            Number of clients connected
          </q-tooltip>
          <q-badge v-if="connected && boardStatus" color="red" floating>{{ boardStatus.clientsConnected }}</q-badge>
        </q-avatar>
      </q-toolbar>
    </q-header>

    <q-drawer show-if-above v-model="leftDrawerOpen" side="left" bordered>
      <sidebar/>
    </q-drawer>

    <q-page-container>
      <router-view/>
    </q-page-container>

  </q-layout>
</template>
<script>
import { defineComponent, ref, provide } from "vue";
import Sidebar from "components/Sidebar";

export default defineComponent({
  name: "App",
  components: {Sidebar},
  setup() {
    const leftDrawerOpen = ref(false)
    let connection = null
    const connected = ref(false)
    const boardStatus = ref(null)
    const boardPreview = ref(null)

    provide('connected', connected)
    provide('boardStatus', boardStatus)
    provide('boardPreview', boardPreview)

    const start = function() {
      console.log('Starting connection to WebSocket Server')
      connection = new WebSocket('wss://' + window.location.hostname + '/led')

      connection.onerror = function (err) {
        console.log('Websocket error...' ,err)
      }

      connection.onopen = function() {
        console.log('Successfully connected to websocket server')
        connected.value = true
      }

      connection.onmessage = function(event) {
        if (typeof event.data === 'string'){
          const message = JSON.parse(event.data);
          if (message) {
            boardStatus.value = message.status
          }
          console.log('Got message:', JSON.parse(event.data))
        } else { // preview
          const arrayBuffer = event.data.arrayBuffer();
          arrayBuffer.then((data) => {
            const uint8View = new Uint8Array(data);
            boardPreview.value = new Uint8ClampedArray(300 * 4)
            for (let i = 0; i < 300; i++) {
              boardPreview.value[(i * 4)] = uint8View[(i * 3)]
              boardPreview.value[(i * 4) + 1] = uint8View[(i * 3) + 1]
              boardPreview.value[(i * 4) + 2] = uint8View[(i * 3) + 2]
              boardPreview.value[(i * 4) + 3] = 255
            }
          })
        }
      }

      connection.onclose = function(){
        connected.value = false
        // Try to reconnect in 5 seconds
        console.log('Websocket connection closed, trying to reconnect in 5s ...')
        setTimeout(function(){start()}, 5000)
      };
    }

    const send = function (value) {
      connection.send(value)
    }

    provide('send', send)

    // expose to template and other options API hooks
    return {
      connected,
      boardStatus,
      boardPreview,
      start,
      leftDrawerOpen,
      toggleLeftDrawer () {
        leftDrawerOpen.value = !leftDrawerOpen.value
      }
    }
  },
  mounted() {
    this.start()
  }
});
</script>
