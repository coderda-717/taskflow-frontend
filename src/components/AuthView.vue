<script setup>
import { ref, computed } from 'vue'
import api from '../services/api'

const props = defineProps({
  type: String
})

const emit = defineEmits(['navigate', 'showToast'])

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

      // Get user profile to store username and other details
      const profileResponse = await api.auth.getProfile()
      const userData = profileResponse.data
      localStorage.setItem('user_data', JSON.stringify(userData))

      // Show success toast
      emit('showToast', {
        message: `Welcome back, ${userData.first_name || userData.username}! 🎉`,
        type: 'success'
      })

      // Navigate to dashboard after short delay
      setTimeout(() => {
        emit('navigate', 'dashboard')
      }, 1000)
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

      // Get user profile
      const profileResponse = await api.auth.getProfile()
      const userData = profileResponse.data
      localStorage.setItem('user_data', JSON.stringify(userData))

      // Show success toast
      emit('showToast', {
        message: `Account created successfully! Welcome, ${userData.first_name || userData.username}! 🎉`,
        type: 'success'
      })

      // Navigate to dashboard
      setTimeout(() => {
        emit('navigate', 'dashboard')
      }, 1000)
    }
  } catch (err) {
    console.error('Authentication error:', err)
    let errorMessage = 'An error occurred. Please try again.'
    
    if (err.response?.data) {
      const errors = err.response.data
      if (errors.detail) {
        errorMessage = errors.detail
      } else {
        errorMessage = Object.values(errors).flat().join(', ')
      }
    } else if (err.message) {
      errorMessage = err.message
    }
    
    error.value = errorMessage
    
    // Show error toast
    emit('showToast', {
      message: errorMessage,
      type: 'error'
    })
  } finally {
    isLoading.value = false
  }
}
</script>

<template>
  <div class="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-purple-50 px-4 py-8">
    <div class="w-full max-w-md">
      <!-- Logo/Brand -->
      <div class="text-center mb-8 fade-in">
        <div class="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-600 to-purple-600 rounded-2xl mb-4 shadow-lg transform hover:scale-105 transition-transform">
          <i class="fas fa-tasks text-2xl text-white"></i>
        </div>
        <h1 class="text-3xl font-bold text-slate-800">TaskFlow</h1>
        <p class="text-slate-600 mt-2">Organize your tasks efficiently</p>
      </div>

      <!-- Auth Card -->
      <div class="bg-white rounded-2xl shadow-xl p-8 slide-up">
        <!-- Tabs -->
        <div class="flex gap-2 mb-6 bg-slate-100 p-1 rounded-lg">
          <button 
            @click="emit('navigate', 'login')"
            :class="[
              'flex-1 py-2 px-4 rounded-lg font-medium transition-all',
              isLogin ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-600 hover:text-slate-800'
            ]"
          >
            Login
          </button>
          <button 
            @click="emit('navigate', 'register')"
            :class="[
              'flex-1 py-2 px-4 rounded-lg font-medium transition-all',
              !isLogin ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-600 hover:text-slate-800'
            ]"
          >
            Sign Up
          </button>
        </div>

        <!-- Title -->
        <h2 class="text-2xl font-bold text-slate-800 mb-6">
          {{ isLogin ? 'Welcome Back' : 'Create Account' }}
        </h2>

        <!-- Error Message -->
        <div v-if="error" class="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg animate-shake">
          <div class="flex items-center gap-2">
            <i class="fas fa-exclamation-circle text-red-600"></i>
            <p class="text-sm text-red-600">{{ error }}</p>
          </div>
        </div>

        <!-- Form -->
        <form @submit.prevent="handleSubmit" class="space-y-4">
          <!-- Name (Sign Up only) -->
          <div v-if="!isLogin" class="form-group">
            <label class="block text-sm font-medium text-slate-700 mb-2">
              <i class="fas fa-user text-slate-400 mr-2"></i>Full Name
            </label>
            <input 
              v-model="name"
              type="text" 
              class="w-full px-4 py-3 rounded-lg border border-slate-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-50 transition-all outline-none" 
              placeholder="John Doe" 
              required
            >
          </div>

          <!-- Username -->
          <div class="form-group">
            <label class="block text-sm font-medium text-slate-700 mb-2">
              <i class="fas fa-at text-slate-400 mr-2"></i>Username
            </label>
            <input 
              v-model="username"
              type="text" 
              class="w-full px-4 py-3 rounded-lg border border-slate-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-50 transition-all outline-none" 
              placeholder="Enter your username" 
              required
            >
          </div>

          <!-- Email (Sign Up only) -->
          <div v-if="!isLogin" class="form-group">
            <label class="block text-sm font-medium text-slate-700 mb-2">
              <i class="fas fa-envelope text-slate-400 mr-2"></i>Email
            </label>
            <input 
              v-model="email"
              type="email" 
              class="w-full px-4 py-3 rounded-lg border border-slate-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-50 transition-all outline-none" 
              placeholder="your@email.com" 
              required
            >
          </div>

          <!-- Password -->
          <div class="form-group">
            <label class="block text-sm font-medium text-slate-700 mb-2">
              <i class="fas fa-lock text-slate-400 mr-2"></i>Password
            </label>
            <input 
              v-model="password"
              type="password" 
              class="w-full px-4 py-3 rounded-lg border border-slate-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-50 transition-all outline-none" 
              placeholder="••••••••" 
              required
            >
          </div>

          <!-- Submit Button -->
          <button 
            type="submit"
            :disabled="isLoading"
            class="w-full py-3 px-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold rounded-lg hover:from-blue-700 hover:to-purple-700 focus:ring-4 focus:ring-blue-200 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
          >
            <span v-if="!isLoading" class="flex items-center justify-center gap-2">
              {{ isLogin ? 'Login' : 'Create Account' }}
              <i :class="isLogin ? 'fas fa-sign-in-alt' : 'fas fa-user-plus'"></i>
            </span>
            <span v-else class="flex items-center justify-center">
              <i class="fas fa-spinner fa-spin mr-2"></i>
              Processing...
            </span>
          </button>
        </form>

        <!-- Footer -->
        <p class="text-center text-sm text-slate-600 mt-6">
          {{ isLogin ? "Don't have an account?" : "Already have an account?" }}
          <button 
            @click="emit('navigate', isLogin ? 'register' : 'login')"
            class="text-blue-600 hover:text-blue-700 font-medium ml-1 hover:underline"
          >
            {{ isLogin ? 'Sign Up' : 'Login' }}
          </button>
        </p>
      </div>

      <!-- Additional Info -->
      <div class="text-center mt-6 text-sm text-slate-500">
        <p>🔒 Your data is secure and encrypted</p>
      </div>
    </div>
  </div>
</template>

<style scoped>
@keyframes shake {
  0%, 100% { transform: translateX(0); }
  10%, 30%, 50%, 70%, 90% { transform: translateX(-5px); }
  20%, 40%, 60%, 80% { transform: translateX(5px); }
}

.animate-shake {
  animation: shake 0.5s;
}

.form-group {
  animation: slideInUp 0.3s ease-out;
}

@keyframes slideInUp {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>