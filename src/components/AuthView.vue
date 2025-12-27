<script setup>
import { ref, computed } from 'vue'
import api from '../services/api'

const props = defineProps({
  type: String
})

const emit = defineEmits(['navigate'])

const isLogin = computed(() => props.type === 'login')
const isLoading = ref(false)
const error = ref('')

// Form fields
const email = ref('')
const password = ref('')
const name = ref('')
const username = ref('')

const handleSubmit = async () => {
  isLoading.value = true
  error.value = ''

  try {
    if (isLogin.value) {
      // Login
      const response = await api.auth.login({
        username: username.value,
        password: password.value,
      })

      // Store tokens
      localStorage.setItem('access_token', response.data.access)
      localStorage.setItem('refresh_token', response.data.refresh)

      // Navigate to dashboard
      emit('navigate', 'dashboard')
    } else {
      // Register
      const names = name.value.split(' ')
      const firstName = names[0] || ''
      const lastName = names.slice(1).join(' ') || ''

      await api.auth.register({
        username: username.value,
        email: email.value,
        password: password.value,
        password2: password.value,
        first_name: firstName,
        last_name: lastName,
      })

      // After registration, login automatically
      const loginResponse = await api.auth.login({
        username: username.value,
        password: password.value,
      })

      localStorage.setItem('access_token', loginResponse.data.access)
      localStorage.setItem('refresh_token', loginResponse.data.refresh)

      emit('navigate', 'dashboard')
    }
  } catch (err) {
    console.error('Authentication error:', err)
    if (err.response?.data) {
      // Extract error messages from Django response
      const errors = err.response.data
      error.value = Object.values(errors).flat().join(', ')
    } else {
      error.value = 'An error occurred. Please try again.'
    }
  } finally {
    isLoading.value = false
  }
}
</script>

<template>
  <!-- Add error display after the title -->
  <div v-if="error" class="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
    <p class="text-sm text-red-600">{{ error }}</p>
  </div>

  <!-- Add username field for both login and signup -->
  <div>
    <label class="block text-sm font-medium text-slate-700 mb-2">Username</label>
    <input 
      v-model="username"
      type="text" 
      class="w-full px-4 py-3 rounded-lg border border-slate-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-50 transition-all outline-none" 
      placeholder="Enter your username" 
      required
    >
  </div>

  <!-- Keep existing form fields -->
</template>