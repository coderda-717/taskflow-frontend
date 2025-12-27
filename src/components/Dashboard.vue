<script setup>
import { ref, computed, onMounted } from 'vue'
import api from '../services/api'

const emit = defineEmits(['navigate'])

const tasks = ref([])
const currentView = ref('today')
const showAddTaskModal = ref(false)
const showNotification = ref(false)
const notificationMessage = ref('')
const isLoading = ref(false)

const newTask = ref({
  title: '',
  description: '',
  default_category: 'other',
  date: new Date().toISOString().split('T')[0],
  time: '',
  priority: 'medium'
})

const currentDate = computed(() => 
  new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })
)

const todayTasks = computed(() => {
  const today = new Date().toISOString().split('T')[0]
  return tasks.value.filter(task => task.date === today)
})

const completedCount = computed(() => 
  tasks.value.filter(task => task.status === 'completed').length
)

const pendingCount = computed(() => 
  tasks.value.filter(task => task.status === 'pending').length
)

const showToast = (message) => {
  notificationMessage.value = message
  showNotification.value = true
  setTimeout(() => {
    showNotification.value = false
  }, 2500)
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
    if (currentView.value === 'today') {
      const response = await api.tasks.getToday()
      tasks.value = response.data
    } else {
      const response = await api.tasks.getAll()
      tasks.value = response.data
    }
  } catch (error) {
    console.error('Error loading tasks:', error)
    showToast('Failed to load tasks')
  } finally {
    isLoading.value = false
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
    showToast('Task added successfully')
  } catch (error) {
    console.error('Error adding task:', error)
    showToast('Failed to add task')
  }
}

const toggleTask = async (id) => {
  try {
    const response = await api.tasks.toggleStatus(id)
    const taskIndex = tasks.value.findIndex(t => t.id === id)
    if (taskIndex !== -1) {
      tasks.value[taskIndex] = response.data
    }
    showToast(response.data.status === 'completed' ? 'Task completed!' : 'Task reopened')
  } catch (error) {
    console.error('Error toggling task:', error)
    showToast('Failed to update task')
  }
}

const deleteTask = async (id) => {
  try {
    await api.tasks.delete(id)
    tasks.value = tasks.value.filter(t => t.id !== id)
    showToast('Task deleted')
  } catch (error) {
    console.error('Error deleting task:', error)
    showToast('Failed to delete task')
  }
}

const logout = () => {
  localStorage.removeItem('access_token')
  localStorage.removeItem('refresh_token')
  emit('navigate', 'login')
}

onMounted(() => {
  loadTasks()
})
</script>

<template>
  <div class="min-h-screen bg-slate-50">
    <!-- Notification Toast -->
    <transition name="slide-down">
      <div v-if="showNotification" class="fixed top-4 right-4 bg-white shadow-lg rounded-lg p-4 flex items-center gap-3 z-50 border-l-4 border-green-500">
        <i class="fas fa-check-circle text-green-500 text-xl"></i>
        <p class="text-slate-700 font-medium">{{ notificationMessage }}</p>
      </div>
    </transition>

    <!-- Header -->
    <header class="bg-white shadow-sm border-b border-slate-200">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 bg-gradient-to-br from-blue-600 to-purple-600 rounded-xl flex items-center justify-center">
              <i class="fas fa-tasks text-white"></i>
            </div>
            <div>
              <h1 class="text-2xl font-bold text-slate-800">TaskFlow</h1>
              <p class="text-sm text-slate-500">{{ currentDate }}</p>
            </div>
          </div>
          <button 
            @click="logout"
            class="flex items-center gap-2 px-4 py-2 text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-all"
          >
            <i class="fas fa-sign-out-alt"></i>
            <span class="hidden sm:inline">Logout</span>
          </button>
        </div>
      </div>
    </header>

    <!-- Main Content -->
    <main class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <!-- Stats Cards -->
      <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div class="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-slate-600 text-sm font-medium">Total Tasks</p>
              <p class="text-3xl font-bold text-slate-800 mt-2">{{ tasks.length }}</p>
            </div>
            <div class="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
              <i class="fas fa-list text-blue-600 text-xl"></i>
            </div>
          </div>
        </div>

        <div class="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-slate-600 text-sm font-medium">Completed</p>
              <p class="text-3xl font-bold text-green-600 mt-2">{{ completedCount }}</p>
            </div>
            <div class="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
              <i class="fas fa-check-circle text-green-600 text-xl"></i>
            </div>
          </div>
        </div>

        <div class="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-slate-600 text-sm font-medium">Pending</p>
              <p class="text-3xl font-bold text-orange-600 mt-2">{{ pendingCount }}</p>
            </div>
            <div class="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center">
              <i class="fas fa-clock text-orange-600 text-xl"></i>
            </div>
          </div>
        </div>
      </div>

      <!-- Tasks Section -->
      <div class="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <div class="flex items-center justify-between mb-6">
          <h2 class="text-xl font-bold text-slate-800">My Tasks</h2>
          <button 
            @click="showAddTaskModal = true"
            class="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all shadow-md"
          >
            <i class="fas fa-plus"></i>
            <span>Add Task</span>
          </button>
        </div>

        <!-- Task List -->
        <div v-if="isLoading" class="text-center py-8">
          <i class="fas fa-spinner fa-spin text-3xl text-blue-600"></i>
          <p class="text-slate-600 mt-4">Loading tasks...</p>
        </div>

        <div v-else-if="tasks.length === 0" class="text-center py-12">
          <i class="fas fa-inbox text-5xl text-slate-300 mb-4"></i>
          <p class="text-slate-600">No tasks yet. Create your first task!</p>
        </div>

        <div v-else class="space-y-3">
          <div 
            v-for="task in tasks" 
            :key="task.id"
            class="flex items-center gap-4 p-4 border border-slate-200 rounded-lg hover:bg-slate-50 transition-all task-appear"
          >
            <div class="custom-checkbox">
              <input 
                type="checkbox" 
                :checked="task.status === 'completed'"
                @change="toggleTask(task.id)"
                class="hidden"
              >
              <div class="w-6 h-6 border-2 border-slate-300 rounded-md cursor-pointer flex items-center justify-center">
                <i v-if="task.status === 'completed'" class="fas fa-check text-white text-xs"></i>
              </div>
            </div>

            <div class="flex-1">
              <h3 
                :class="[
                  'font-semibold text-slate-800',
                  task.status === 'completed' && 'line-through text-slate-400'
                ]"
              >
                {{ task.title }}
              </h3>
              <p v-if="task.description" class="text-sm text-slate-600 mt-1">{{ task.description }}</p>
              <div class="flex items-center gap-3 mt-2">
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
                    'text-xs px-2 py-1 rounded-full',
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
              class="text-red-500 hover:text-red-700 p-2 hover:bg-red-50 rounded-lg transition-all"
            >
              <i class="fas fa-trash"></i>
            </button>
          </div>
        </div>
      </div>
    </main>

    <!-- Add Task Modal -->
    <div 
      v-if="showAddTaskModal"
      class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
      @click.self="showAddTaskModal = false"
    >
      <div class="bg-white rounded-2xl p-6 w-full max-w-md">
        <h3 class="text-2xl font-bold text-slate-800 mb-6">Add New Task</h3>
        
        <form @submit.prevent="addTask" class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-slate-700 mb-2">Title</label>
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
              <label class="block text-sm font-medium text-slate-700 mb-2">Date</label>
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
  </div>
</template>

<style scoped>
.slide-down-enter-active,
.slide-down-leave-active {
  transition: all 0.3s ease;
}

.slide-down-enter-from {
  transform: translateY(-100%);
  opacity: 0;
}

.slide-down-leave-to {
  transform: translateY(-100%);
  opacity: 0;
}
</style>