<script setup>
import { ref, onMounted } from 'vue'
import AuthView from './components/AuthView.vue'
import Dashboard from './components/Dashboard.vue'

const currentView = ref('login')
const toasts = ref([])
let toastId = 0

const navigate = (view) => {
  currentView.value = view
}

const showToast = ({ message, type = 'success' }) => {
  const id = toastId++
  const toast = {
    id,
    message,
    type,
    visible: true
  }
  
  toasts.value.push(toast)
  
  // Auto remove after 3 seconds
  setTimeout(() => {
    removeToast(id)
  }, 3000)
}

const removeToast = (id) => {
  const index = toasts.value.findIndex(t => t.id === id)
  if (index !== -1) {
    toasts.value[index].visible = false
    // Remove from array after animation completes
    setTimeout(() => {
      toasts.value = toasts.value.filter(t => t.id !== id)
    }, 300)
  }
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
    <!-- Toast Container (Bottom Right) -->
    <div class="fixed bottom-4 right-4 z-[60] space-y-3 pointer-events-none">
      <transition-group name="toast">
        <div 
          v-for="toast in toasts"
          :key="toast.id"
          v-show="toast.visible"
          :class="[
            'pointer-events-auto flex items-start gap-3 px-5 py-4 rounded-lg shadow-2xl border max-w-sm',
            toast.type === 'success' && 'bg-white border-green-200',
            toast.type === 'error' && 'bg-white border-red-200',
            toast.type === 'info' && 'bg-white border-blue-200',
            toast.type === 'warning' && 'bg-white border-yellow-200'
          ]"
        >
          <!-- Icon -->
          <div class="flex-shrink-0">
            <i 
              :class="[
                'text-xl',
                toast.type === 'success' && 'fas fa-check-circle text-green-500',
                toast.type === 'error' && 'fas fa-exclamation-circle text-red-500',
                toast.type === 'info' && 'fas fa-info-circle text-blue-500',
                toast.type === 'warning' && 'fas fa-exclamation-triangle text-yellow-500'
              ]"
            ></i>
          </div>
          
          <!-- Message -->
          <div class="flex-1 min-w-0">
            <p class="text-sm font-medium text-slate-800">
              {{ toast.message }}
            </p>
          </div>
          
          <!-- Close Button -->
          <button 
            @click="removeToast(toast.id)"
            class="flex-shrink-0 text-slate-400 hover:text-slate-600 transition-colors"
          >
            <i class="fas fa-times text-sm"></i>
          </button>
        </div>
      </transition-group>
    </div>

    <!-- Main Content -->
    <AuthView 
      v-if="currentView === 'login' || currentView === 'register'"
      :type="currentView"
      @navigate="navigate"
      @showToast="showToast"
    />
    <Dashboard 
      v-else-if="currentView === 'dashboard'"
      @navigate="navigate"
      @showToast="showToast"
    />
  </div>
</template>

<style>
#app {
  width: 100%;
  min-height: 100vh;
}

/* Toast Animations */
.toast-enter-active {
  animation: slideInRight 0.3s ease-out;
}

.toast-leave-active {
  animation: slideOutRight 0.3s ease-in;
}

@keyframes slideInRight {
  from {
    transform: translateX(100%);
    opacity: 0;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
}

@keyframes slideOutRight {
  from {
    transform: translateX(0);
    opacity: 1;
  }
  to {
    transform: translateX(100%);
    opacity: 0;
  }
}
</style>