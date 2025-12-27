<script setup>
import { ref, onMounted } from 'vue'
import AuthView from './components/AuthView.vue'
import Dashboard from './components/Dashboard.vue'

const currentView = ref('login')

const navigate = (view) => {
  currentView.value = view
}

// Check if user is already logged in
onMounted(() => {
  const token = localStorage.getItem('access_token')
  if (token) {
    currentView.value = 'dashboard'
  }
})
</script>

<template>
  <div id="app">
    <AuthView 
      v-if="currentView === 'login' || currentView === 'register'"
      :type="currentView"
      @navigate="navigate"
    />
    <Dashboard 
      v-else-if="currentView === 'dashboard'"
      @navigate="navigate"
    />
  </div>
</template>

<style>
#app {
  width: 100%;
  min-height: 100vh;
}
</style>