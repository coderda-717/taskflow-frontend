<script setup>
import { ref, computed, onMounted } from 'vue'
import api from '../services/api'

const emit = defineEmits(['navigate', 'showToast'])

// Initialize tasks as an empty array to prevent filter errors
const tasks = ref([])
const currentView = ref('all')
const showAddTaskModal = ref(false)
const showSettingsModal = ref(false)
const showMobileMenu = ref(false)
const isLoading = ref(false)
const user = ref(null)

const newTask = ref({
  title: '',
  description: '',
  default_category: 'other',
  date: new Date().toISOString().split('T')[0],
  time: '',
  priority: 'medium'
})

const userSettings = ref({
  first_name: '',
  last_name: '',
  email: '',
  username: '',
  current_password: '',
  new_password: '',
  confirm_password: ''
})

const showPasswordFields = ref(false)

const currentDate = computed(() => 
  new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })
)

const filteredTasks = computed(() => {
  // Safeguard: ensure tasks.value is always an array
  if (!Array.isArray(tasks.value)) {
    console.warn('tasks.value is not an array:', tasks.value)
    return []
  }
  
  const today = new Date().toISOString().split('T')[0]
  
  switch(currentView.value) {
    case 'today':
      return tasks.value.filter(task => task.date === today)
    case 'upcoming':
      return tasks.value.filter(task => task.date >= today && task.status !== 'completed')
    case 'completed':
      return tasks.value.filter(task => task.status === 'completed')
    case 'pending':
      return tasks.value.filter(task => task.status === 'pending')
    default:
      return tasks.value
  }
})

const completedCount = computed(() => 
  Array.isArray(tasks.value) ? tasks.value.filter(task => task.status === 'completed').length : 0
)

const pendingCount = computed(() => 
  Array.isArray(tasks.value) ? tasks.value.filter(task => task.status === 'pending').length : 0
)

const overdueCount = computed(() => {
  if (!Array.isArray(tasks.value)) return 0
  const today = new Date().toISOString().split('T')[0]
  return tasks.value.filter(task => 
    task.date < today && task.status !== 'completed'
  ).length
})

const greeting = computed(() => {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 18) return 'Good afternoon'
  return 'Good evening'
})

const userName = computed(() => {
  if (user.value?.first_name) return user.value.first_name
  if (user.value?.username) return user.value.username
  return 'User'
})

const showToast = (message, type = 'success') => {
  emit('showToast', { message, type })
}

const formatDate = (dateStr) => {
  const date = new Date(dateStr)
  const today = new Date()
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)
  
  if (dateStr === today.toISOString().split('T')[0]) {
    return 'Today'
  } else if (dateStr === tomorrow.toISOString().split('T')[0]) {
    return 'Tomorrow'
  } else {
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  }
}

const loadTasks = async () => {
  isLoading.value = true
  
  try {
    const response = await api.tasks.getAll()
    console.log('API Response:', response.data)
    
    // Handle different response formats
    if (Array.isArray(response.data)) {
      tasks.value = response.data
    } else if (response.data && Array.isArray(response.data.results)) {
      // Handle paginated response
      tasks.value = response.data.results
    } else {
      console.error('Unexpected API response format:', response.data)
      tasks.value = []
      showToast('Unexpected data format received', 'error')
    }
    
    console.log('Tasks loaded:', tasks.value.length)
  } catch (error) {
    console.error('Error loading tasks:', error)
    console.error('Error details:', error.response?.data)
    tasks.value = []
    
    if (error.response?.status === 401) {
      showToast('Session expired. Please login again.', 'error')
      setTimeout(() => emit('navigate', 'login'), 2000)
    } else {
      showToast('Failed to load tasks', 'error')
    }
  } finally {
    isLoading.value = false
  }
}

const loadUserProfile = () => {
  try {
    const userData = localStorage.getItem('user_data')
    if (userData) {
      user.value = JSON.parse(userData)
      userSettings.value = {
        first_name: user.value.first_name || '',
        last_name: user.value.last_name || '',
        email: user.value.email || '',
        username: user.value.username || '',
        current_password: '',
        new_password: '',
        confirm_password: ''
      }
    }
  } catch (error) {
    console.error('Error loading user profile:', error)
    user.value = { username: 'User' }
  }
}

const addTask = async () => {
  if (!newTask.value.title.trim()) return

  try {
    const taskData = {
      title: newTask.value.title,
      description: newTask.value.description,
      default_category: newTask.value.default_category,
      date: newTask.value.date,
      time: newTask.value.time || null,
      priority: newTask.value.priority,
      status: 'pending'
    }

    const response = await api.tasks.create(taskData)
    tasks.value.unshift(response.data)
    
    newTask.value = {
      title: '',
      description: '',
      default_category: 'other',
      date: new Date().toISOString().split('T')[0],
      time: '',
      priority: 'medium'
    }
    
    showAddTaskModal.value = false
    showToast('Task added successfully! ✓')
  } catch (error) {
    console.error('Error adding task:', error)
    showToast('Failed to add task', 'error')
  }
}

const toggleTask = async (id) => {
  try {
    const response = await api.tasks.toggleStatus(id)
    const taskIndex = tasks.value.findIndex(t => t.id === id)
    if (taskIndex !== -1) {
      tasks.value[taskIndex] = response.data
    }
    showToast(response.data.status === 'completed' ? 'Task completed! 🎉' : 'Task reopened')
  } catch (error) {
    console.error('Error toggling task:', error)
    showToast('Failed to update task', 'error')
  }
}

const deleteTask = async (id) => {
  if (!confirm('Are you sure you want to delete this task?')) return
  
  try {
    await api.tasks.delete(id)
    tasks.value = tasks.value.filter(t => t.id !== id)
    showToast('Task deleted')
  } catch (error) {
    console.error('Error deleting task:', error)
    showToast('Failed to delete task', 'error')
  }
}

const updateSettings = async () => {
  try {
    // Validate password change if attempted
    if (userSettings.value.new_password) {
      if (!userSettings.value.current_password) {
        showToast('Please enter your current password', 'error')
        return
      }
      if (userSettings.value.new_password !== userSettings.value.confirm_password) {
        showToast('New passwords do not match', 'error')
        return
      }
      if (userSettings.value.new_password.length < 8) {
        showToast('New password must be at least 8 characters', 'error')
        return
      }
    }

    // Prepare update data
    const updateData = {
      first_name: userSettings.value.first_name,
      last_name: userSettings.value.last_name,
      email: userSettings.value.email,
      username: userSettings.value.username
    }

    // Add password fields if changing password
    if (userSettings.value.new_password) {
      updateData.current_password = userSettings.value.current_password
      updateData.new_password = userSettings.value.new_password
    }

    // Call API to update profile (you'll need to add this endpoint)
    try {
      await api.auth.updateProfile(updateData)
      
      // Update local storage
      const updatedUser = {
        ...user.value,
        first_name: userSettings.value.first_name,
        last_name: userSettings.value.last_name,
        email: userSettings.value.email,
        username: userSettings.value.username
      }
      
      localStorage.setItem('user_data', JSON.stringify(updatedUser))
      user.value = updatedUser
      
      // Clear password fields
      userSettings.value.current_password = ''
      userSettings.value.new_password = ''
      userSettings.value.confirm_password = ''
      showPasswordFields.value = false
      
      showSettingsModal.value = false
      showToast('Settings updated successfully! ✓')
    } catch (apiError) {
      console.error('API Error:', apiError)
      const errorMessage = apiError.response?.data?.detail || 
                          apiError.response?.data?.error ||
                          'Failed to update settings'
      showToast(errorMessage, 'error')
    }
  } catch (error) {
    console.error('Error updating settings:', error)
    showToast('Failed to update settings', 'error')
  }
}

const logout = () => {
  localStorage.removeItem('access_token')
  localStorage.removeItem('refresh_token')
  localStorage.removeItem('user_data')
  showToast('Logged out successfully. See you soon! 👋')
  setTimeout(() => {
    emit('navigate', 'login')
  }, 1000)
}

const changeView = (view) => {
  currentView.value = view
  showMobileMenu.value = false
}

const resetPasswordFields = () => {
  userSettings.value.current_password = ''
  userSettings.value.new_password = ''
  userSettings.value.confirm_password = ''
  showPasswordFields.value = false
}

const closeSettingsModal = () => {
  showSettingsModal.value = false
  resetPasswordFields()
}

onMounted(() => {
  loadUserProfile()
  loadTasks()
})
</script>

<template>
  <div class="min-h-screen bg-slate-50">
    <!-- Header -->
    <header class="bg-white shadow-sm border-b border-slate-200 sticky top-0 z-40">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div class="flex items-center justify-between">
          <!-- Logo and User Greeting -->
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 bg-gradient-to-br from-blue-600 to-purple-600 rounded-xl flex items-center justify-center">
              <i class="fas fa-tasks text-white"></i>
            </div>
            <div>
              <h1 class="text-xl sm:text-2xl font-bold text-slate-800">
                {{ greeting }}, {{ userName }}! 👋
              </h1>
              <p class="text-xs sm:text-sm text-slate-500">{{ currentDate }}</p>
            </div>
          </div>

          <!-- Desktop Menu -->
          <div class="hidden md:flex items-center gap-3">
            <button 
              @click="showSettingsModal = true"
              class="flex items-center gap-2 px-4 py-2 text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-all"
            >
              <i class="fas fa-cog"></i>
              <span>Settings</span>
            </button>
            <button 
              @click="logout"
              class="flex items-center gap-2 px-4 py-2 text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-all"
            >
              <i class="fas fa-sign-out-alt"></i>
              <span>Logout</span>
            </button>
          </div>

          <!-- Mobile Menu Button -->
          <button 
            @click="showMobileMenu = !showMobileMenu"
            class="md:hidden p-2 text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-all"
          >
            <i :class="showMobileMenu ? 'fas fa-times' : 'fas fa-bars'" class="text-xl"></i>
          </button>
        </div>

        <!-- Mobile Menu -->
        <transition name="slide-down">
          <div v-if="showMobileMenu" class="md:hidden mt-4 pb-2 border-t border-slate-200 pt-4">
            <div class="space-y-2">
              <button 
                @click="showSettingsModal = true; showMobileMenu = false"
                class="w-full flex items-center gap-3 px-4 py-3 text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-all"
              >
                <i class="fas fa-cog w-5"></i>
                <span>Settings</span>
              </button>
              <button 
                @click="showAddTaskModal = true; showMobileMenu = false"
                class="w-full flex items-center gap-3 px-4 py-3 text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-all"
              >
                <i class="fas fa-plus w-5"></i>
                <span>Add Task</span>
              </button>
              <button 
                @click="logout"
                class="w-full flex items-center gap-3 px-4 py-3 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-all"
              >
                <i class="fas fa-sign-out-alt w-5"></i>
                <span>Logout</span>
              </button>
            </div>
          </div>
        </transition>
      </div>
    </header>

    <!-- Main Content -->
    <main class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
      <!-- Stats Cards -->
      <div class="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-6 sm:mb-8">
        <div class="bg-white rounded-xl p-4 sm:p-6 shadow-sm border border-slate-200 hover:shadow-md transition-shadow">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-slate-600 text-xs sm:text-sm font-medium">Total</p>
              <p class="text-2xl sm:text-3xl font-bold text-slate-800 mt-1 sm:mt-2">{{ tasks.length }}</p>
            </div>
            <div class="w-10 h-10 sm:w-12 sm:h-12 bg-blue-100 rounded-xl flex items-center justify-center">
              <i class="fas fa-list text-blue-600 text-lg sm:text-xl"></i>
            </div>
          </div>
        </div>

        <div class="bg-white rounded-xl p-4 sm:p-6 shadow-sm border border-slate-200 hover:shadow-md transition-shadow">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-slate-600 text-xs sm:text-sm font-medium">Completed</p>
              <p class="text-2xl sm:text-3xl font-bold text-green-600 mt-1 sm:mt-2">{{ completedCount }}</p>
            </div>
            <div class="w-10 h-10 sm:w-12 sm:h-12 bg-green-100 rounded-xl flex items-center justify-center">
              <i class="fas fa-check-circle text-green-600 text-lg sm:text-xl"></i>
            </div>
          </div>
        </div>

        <div class="bg-white rounded-xl p-4 sm:p-6 shadow-sm border border-slate-200 hover:shadow-md transition-shadow">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-slate-600 text-xs sm:text-sm font-medium">Pending</p>
              <p class="text-2xl sm:text-3xl font-bold text-orange-600 mt-1 sm:mt-2">{{ pendingCount }}</p>
            </div>
            <div class="w-10 h-10 sm:w-12 sm:h-12 bg-orange-100 rounded-xl flex items-center justify-center">
              <i class="fas fa-clock text-orange-600 text-lg sm:text-xl"></i>
            </div>
          </div>
        </div>

        <div class="bg-white rounded-xl p-4 sm:p-6 shadow-sm border border-slate-200 hover:shadow-md transition-shadow">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-slate-600 text-xs sm:text-sm font-medium">Overdue</p>
              <p class="text-2xl sm:text-3xl font-bold text-red-600 mt-1 sm:mt-2">{{ overdueCount }}</p>
            </div>
            <div class="w-10 h-10 sm:w-12 sm:h-12 bg-red-100 rounded-xl flex items-center justify-center">
              <i class="fas fa-exclamation-triangle text-red-600 text-lg sm:text-xl"></i>
            </div>
          </div>
        </div>
      </div>

      <!-- Filter Tabs -->
      <div class="bg-white rounded-xl shadow-sm border border-slate-200 p-2 mb-6 overflow-x-auto">
        <div class="flex gap-2 min-w-max">
          <button 
            @click="changeView('all')"
            :class="[
              'px-4 py-2 rounded-lg font-medium transition-all whitespace-nowrap text-sm',
              currentView === 'all' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-600 hover:bg-slate-100'
            ]"
          >
            <i class="fas fa-list mr-2"></i>All
          </button>
          <button 
            @click="changeView('today')"
            :class="[
              'px-4 py-2 rounded-lg font-medium transition-all whitespace-nowrap text-sm',
              currentView === 'today' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-600 hover:bg-slate-100'
            ]"
          >
            <i class="fas fa-calendar-day mr-2"></i>Today
          </button>
          <button 
            @click="changeView('upcoming')"
            :class="[
              'px-4 py-2 rounded-lg font-medium transition-all whitespace-nowrap text-sm',
              currentView === 'upcoming' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-600 hover:bg-slate-100'
            ]"
          >
            <i class="fas fa-arrow-right mr-2"></i>Upcoming
          </button>
          <button 
            @click="changeView('completed')"
            :class="[
              'px-4 py-2 rounded-lg font-medium transition-all whitespace-nowrap text-sm',
              currentView === 'completed' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-600 hover:bg-slate-100'
            ]"
          >
            <i class="fas fa-check-circle mr-2"></i>Done
          </button>
          <button 
            @click="changeView('pending')"
            :class="[
              'px-4 py-2 rounded-lg font-medium transition-all whitespace-nowrap text-sm',
              currentView === 'pending' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-600 hover:bg-slate-100'
            ]"
          >
            <i class="fas fa-hourglass-half mr-2"></i>Pending
          </button>
        </div>
      </div>

      <!-- Tasks Section -->
      <div class="bg-white rounded-xl shadow-sm border border-slate-200 p-4 sm:p-6">
        <div class="flex items-center justify-between mb-6">
          <h2 class="text-lg sm:text-xl font-bold text-slate-800">
            {{ currentView === 'all' ? 'All Tasks' : currentView.charAt(0).toUpperCase() + currentView.slice(1) }}
          </h2>
          <button 
            @click="showAddTaskModal = true"
            class="flex items-center gap-2 px-3 sm:px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all shadow-md text-sm sm:text-base"
          >
            <i class="fas fa-plus"></i>
            <span class="hidden sm:inline">Add Task</span>
          </button>
        </div>

        <!-- Loading State -->
        <div v-if="isLoading" class="text-center py-12">
          <i class="fas fa-spinner fa-spin text-4xl text-blue-600 mb-4"></i>
          <p class="text-slate-600 mt-4">Loading tasks...</p>
        </div>

        <!-- Empty State -->
        <div v-else-if="filteredTasks.length === 0" class="text-center py-12">
          <i class="fas fa-inbox text-5xl text-slate-300 mb-4"></i>
          <p class="text-slate-600 text-lg font-medium mb-2">No tasks found</p>
          <p class="text-slate-500 text-sm mb-4">
            {{ currentView === 'all' ? 'Create your first task to get started!' : `No ${currentView} tasks at the moment.` }}
          </p>
          <button 
            @click="showAddTaskModal = true"
            class="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all"
          >
            <i class="fas fa-plus"></i>
            Add Your First Task
          </button>
        </div>

        <!-- Task List -->
        <div v-else class="space-y-3">
          <div 
            v-for="task in filteredTasks" 
            :key="task.id"
            class="flex items-start gap-3 sm:gap-4 p-3 sm:p-4 border border-slate-200 rounded-lg hover:bg-slate-50 transition-all"
          >
            <div class="custom-checkbox mt-1">
              <input 
                type="checkbox" 
                :checked="task.status === 'completed'"
                @change="toggleTask(task.id)"
                class="hidden"
              >
              <div class="w-5 h-5 sm:w-6 sm:h-6 border-2 border-slate-300 rounded-md cursor-pointer flex items-center justify-center hover:border-blue-500 transition-colors">
                <i v-if="task.status === 'completed'" class="fas fa-check text-white text-xs"></i>
              </div>
            </div>

            <div class="flex-1 min-w-0">
              <h3 
                :class="[
                  'font-semibold text-slate-800 text-sm sm:text-base',
                  task.status === 'completed' && 'line-through text-slate-400'
                ]"
              >
                {{ task.title }}
              </h3>
              <p v-if="task.description" class="text-xs sm:text-sm text-slate-600 mt-1">
                {{ task.description }}
              </p>
              <div class="flex flex-wrap items-center gap-2 mt-2">
                <span class="text-xs text-slate-500 flex items-center gap-1">
                  <i class="fas fa-calendar"></i>
                  {{ formatDate(task.date) }}
                </span>
                <span v-if="task.time" class="text-xs text-slate-500 flex items-center gap-1">
                  <i class="fas fa-clock"></i>
                  {{ task.time }}
                </span>
                <span 
                  :class="[
                    'text-xs px-2 py-1 rounded-full font-medium',
                    task.priority === 'urgent' && 'bg-red-100 text-red-700',
                    task.priority === 'high' && 'bg-orange-100 text-orange-700',
                    task.priority === 'medium' && 'bg-blue-100 text-blue-700',
                    task.priority === 'low' && 'bg-slate-100 text-slate-700'
                  ]"
                >
                  {{ task.priority }}
                </span>
              </div>
            </div>

            <button 
              @click="deleteTask(task.id)"
              class="text-red-500 hover:text-red-700 p-2 hover:bg-red-50 rounded-lg transition-all flex-shrink-0"
            >
              <i class="fas fa-trash text-sm"></i>
            </button>
          </div>
        </div>
      </div>
    </main>

    <!-- Add Task Modal -->
    <transition name="modal">
      <div 
        v-if="showAddTaskModal"
        class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
        @click.self="showAddTaskModal = false"
      >
        <div class="bg-white rounded-2xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
          <div class="flex items-center justify-between mb-6">
            <h3 class="text-2xl font-bold text-slate-800">Add New Task</h3>
            <button 
              @click="showAddTaskModal = false"
              class="text-slate-400 hover:text-slate-600 p-1"
            >
              <i class="fas fa-times text-xl"></i>
            </button>
          </div>
          
          <form @submit.prevent="addTask" class="space-y-4">
            <div>
              <label class="block text-sm font-medium text-slate-700 mb-2">Title *</label>
              <input 
                v-model="newTask.title"
                type="text" 
                class="w-full px-4 py-3 rounded-lg border border-slate-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-50 transition-all outline-none" 
                placeholder="Task title" 
                required
              >
            </div>

            <div>
              <label class="block text-sm font-medium text-slate-700 mb-2">Description</label>
              <textarea 
                v-model="newTask.description"
                class="w-full px-4 py-3 rounded-lg border border-slate-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-50 transition-all outline-none resize-none" 
                rows="3"
                placeholder="Task description"
              ></textarea>
            </div>

            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="block text-sm font-medium text-slate-700 mb-2">Date *</label>
                <input 
                  v-model="newTask.date"
                  type="date" 
                  class="w-full px-4 py-3 rounded-lg border border-slate-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-50 transition-all outline-none" 
                  required
                >
              </div>

              <div>
                <label class="block text-sm font-medium text-slate-700 mb-2">Time</label>
                <input 
                  v-model="newTask.time"
                  type="time" 
                  class="w-full px-4 py-3 rounded-lg border border-slate-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-50 transition-all outline-none"
                >
              </div>
            </div>

            <div>
              <label class="block text-sm font-medium text-slate-700 mb-2">Priority</label>
              <select 
                v-model="newTask.priority"
                class="w-full px-4 py-3 rounded-lg border border-slate-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-50 transition-all outline-none"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>

            <div class="flex gap-3 mt-6">
              <button 
                type="button"
                @click="showAddTaskModal = false"
                class="flex-1 py-3 px-4 bg-slate-200 text-slate-700 font-semibold rounded-lg hover:bg-slate-300 transition-all"
              >
                Cancel
              </button>
              <button 
                type="submit"
                class="flex-1 py-3 px-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all shadow-lg"
              >
                Add Task
              </button>
            </div>
          </form>
        </div>
      </div>
    </transition>

    <!-- Settings Modal -->
    <transition name="modal">
      <div 
        v-if="showSettingsModal"
        class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
        @click.self="showSettingsModal = false"
      >
        <div class="bg-white rounded-2xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
          <div class="flex items-center justify-between mb-6">
            <h3 class="text-2xl font-bold text-slate-800">Settings</h3>
            <button 
              @click="showSettingsModal = false"
              class="text-slate-400 hover:text-slate-600 p-1"
            >
              <i class="fas fa-times text-xl"></i>
            </button>
          </div>
          
          <form @submit.prevent="updateSettings" class="space-y-4">
            <div>
              <label class="block text-sm font-medium text-slate-700 mb-2">
                <i class="fas fa-user mr-2 text-slate-400"></i>First Name
              </label>
              <input 
                v-model="userSettings.first_name"
                type="text" 
                class="w-full px-4 py-3 rounded-lg border border-slate-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-50 transition-all outline-none" 
                placeholder="First name"
              >
            </div>

            <div>
              <label class="block text-sm font-medium text-slate-700 mb-2">
                <i class="fas fa-user mr-2 text-slate-400"></i>Last Name
              </label>
              <input 
                v-model="userSettings.last_name"
                type="text" 
                class="w-full px-4 py-3 rounded-lg border border-slate-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-50 transition-all outline-none" 
                placeholder="Last name"
              >
            </div>

            <div>
              <label class="block text-sm font-medium text-slate-700 mb-2">
                <i class="fas fa-at mr-2 text-slate-400"></i>Username
              </label>
              <input 
                v-model="userSettings.username"
                type="text" 
                class="w-full px-4 py-3 rounded-lg border border-slate-200 bg-slate-50 cursor-not-allowed" 
                disabled
              >
              <p class="text-xs text-slate-500 mt-1">Username cannot be changed</p>
            </div>

            <div>
              <label class="block text-sm font-medium text-slate-700 mb-2">
                <i class="fas fa-envelope mr-2 text-slate-400"></i>Email
              </label>
              <input 
                v-model="userSettings.email"
                type="email" 
                class="w-full px-4 py-3 rounded-lg border border-slate-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-50 transition-all outline-none" 
                placeholder="Email address"
              >
            </div>

            <div class="flex gap-3 mt-6">
              <button 
                type="button"
                @click="showSettingsModal = false"
                class="flex-1 py-3 px-4 bg-slate-200 text-slate-700 font-semibold rounded-lg hover:bg-slate-300 transition-all"
              >
                Cancel
              </button>
              <button 
                type="submit"
                class="flex-1 py-3 px-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all shadow-lg"
              >
                Save Changes
              </button>
            </div>
          </form>

          <!-- Additional Info -->
          <div class="mt-6 p-4 bg-slate-50 rounded-lg">
            <h4 class="font-semibold text-slate-700 mb-2 flex items-center gap-2">
              <i class="fas fa-info-circle text-blue-500"></i>
              Account Info
            </h4>
            <div class="space-y-1 text-sm text-slate-600">
              <p><strong>Username:</strong> {{ user?.username || 'N/A' }}</p>
              <p><strong>Email:</strong> {{ user?.email || 'N/A' }}</p>
              <p><strong>Tasks:</strong> {{ tasks.length }} total</p>
            </div>
          </div>
        </div>
      </div>
    </transition>

    <!-- Floating Add Button (Mobile) -->
    <button 
      @click="showAddTaskModal = true"
      class="md:hidden fixed bottom-6 right-6 w-14 h-14 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-full shadow-lg hover:shadow-xl transition-all flex items-center justify-center z-30"
    >
      <i class="fas fa-plus text-xl"></i>
    </button>
  </div>
</template>

<style scoped>
.slide-down-enter-active,
.slide-down-leave-active {
  transition: all 0.3s ease;
}

.slide-down-enter-from,
.slide-down-leave-to {
  transform: translateY(-10px);
  opacity: 0;
}

.modal-enter-active,
.modal-leave-active {
  transition: all 0.3s ease;
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
  transform: scale(0.95);
}

.custom-checkbox input:checked + div {
  background-color: #3b82f6;
  border-color: #3b82f6;
}
</style>