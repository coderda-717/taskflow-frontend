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